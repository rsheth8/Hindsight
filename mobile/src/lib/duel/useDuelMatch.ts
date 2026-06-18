/**
 * Live duel state — Ably when the server has ABLY_API_KEY, REST polling otherwise.
 * Ably only pings "updated"; clients always re-fetch authoritative state from the API.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Ably from "ably";
import { commitDuel, forfeitDuel, getDuel, getDuelRealtime, submitDuelRebuttal } from "./api";
import { DUEL_UPDATE_EVENT } from "./realtime-constants";
import type { DuelPresenceStatus } from "./presence";
import type { PublicDuelMatch } from "./types";
import type { ChoiceId } from "../game/types";

const POLL_MS = 1500;

function needsLiveSync(state?: PublicDuelMatch["state"]): boolean {
  return state === "waiting_opponent" || state === "round_active";
}

export function useDuelMatch(deviceId: string) {
  const [match, setMatchState] = useState<PublicDuelMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matchRef = useRef<PublicDuelMatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const [opponentPresence, setOpponentPresence] = useState<DuelPresenceStatus | null>(null);

  const setMatch = useCallback((m: PublicDuelMatch | null) => {
    matchRef.current = m;
    setMatchState(m);
  }, []);

  const stopPolling = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const current = matchRef.current;
    if (!current || !deviceId) return;
    try {
      const next = await getDuel(current.id, deviceId);
      matchRef.current = next;
      setMatchState(next);
    } catch {
      // transient — keep last good state
    }
  }, [deviceId]);

  const poll = useCallback(async () => {
    const current = matchRef.current;
    if (!current || !needsLiveSync(current.state)) return;
    await refresh();
    if (matchRef.current && needsLiveSync(matchRef.current.state)) {
      timer.current = setTimeout(poll, POLL_MS);
    }
  }, [refresh]);

  const startPolling = useCallback(() => {
    stopPolling();
    timer.current = setTimeout(poll, POLL_MS);
  }, [poll, stopPolling]);

  const stopAbly = useCallback(() => {
    channelRef.current = null;
    setOpponentPresence(null);
    if (ablyRef.current) {
      ablyRef.current.close();
      ablyRef.current = null;
    }
  }, []);

  useEffect(() => {
    const current = match;
    if (!current || !deviceId || !needsLiveSync(current.state)) {
      stopPolling();
      stopAbly();
      return;
    }

    let cancelled = false;
    const matchId = current.id;

    async function connectAbly() {
      const cfg = await getDuelRealtime(matchId, deviceId);
      if (cancelled) return;
      if (!cfg.enabled) {
        startPolling();
        return;
      }

      stopPolling();
      const realtime = new Ably.Realtime({
        clientId: deviceId,
        authCallback: async (_params, callback) => {
          try {
            const fresh = await getDuelRealtime(matchId, deviceId);
            if (!fresh.enabled || !fresh.tokenRequest) {
              callback("Ably unavailable", null);
              return;
            }
            callback(null, fresh.tokenRequest as unknown as Ably.TokenRequest);
          } catch (err) {
            callback(err as Ably.ErrorInfo, null);
          }
        },
      });
      ablyRef.current = realtime;

      realtime.connection.on("failed", () => {
        if (cancelled) return;
        stopAbly();
        startPolling();
      });
      realtime.connection.on("disconnected", () => {
        if (cancelled) return;
        setTimeout(() => {
          if (cancelled || ablyRef.current?.connection.state === "connected") return;
          stopAbly();
          startPolling();
        }, 5000);
      });

      const channel = realtime.channels.get(cfg.channel);
      channelRef.current = channel;
      channel.subscribe(DUEL_UPDATE_EVENT, () => {
        if (!cancelled) void refresh();
      });
      try {
        await channel.presence.enter({ status: "thinking" });
        channel.presence.subscribe((msg) => {
          if (msg.clientId === deviceId) return;
          const status = (msg.data as { status?: DuelPresenceStatus })?.status ?? "thinking";
          setOpponentPresence(status);
        });
      } catch { /* presence optional */ }
    }

    connectAbly().catch(() => {
      if (!cancelled) startPolling();
    });

    return () => {
      cancelled = true;
      stopPolling();
      stopAbly();
    };
  }, [match?.id, match?.state, deviceId, refresh, startPolling, stopAbly, stopPolling]);

  useEffect(() => {
    const ch = channelRef.current;
    const current = match;
    if (!ch || !current || current.state !== "round_active") return;
    const round = current.rounds[current.currentRound];
    const status: DuelPresenceStatus = round?.youCommitted ? "locked" : "thinking";
    ch.presence.update({ status }).catch(() => {});
  }, [match?.id, match?.currentRound, match?.rounds, match?.state]);

  const commit = useCallback(
    async (call: { choice: ChoiceId; confidence: number; reasoning: string }) => {
      const current = matchRef.current;
      if (!current) return;
      setBusy(true);
      setError(null);
      try {
        const next = await commitDuel(current.id, deviceId, call);
        setMatch(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not lock in");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [deviceId, setMatch],
  );

  const submitRebuttal = useCallback(
    async (text: string) => {
      const current = matchRef.current;
      if (!current) return;
      setBusy(true);
      setError(null);
      try {
        const next = await submitDuelRebuttal(current.id, deviceId, text);
        setMatch(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit rebuttal");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [deviceId, setMatch],
  );

  const forfeit = useCallback(async () => {
    const current = matchRef.current;
    if (!current) return;
    try {
      const next = await forfeitDuel(current.id, deviceId);
      setMatch(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resign");
    }
  }, [deviceId, setMatch]);

  const clear = useCallback(() => {
    stopPolling();
    stopAbly();
    setMatch(null);
    setError(null);
  }, [setMatch, stopAbly, stopPolling]);

  return { match, setMatch, error, setError, busy, opponentPresence, refresh, commit, submitRebuttal, forfeit, clear };
}
