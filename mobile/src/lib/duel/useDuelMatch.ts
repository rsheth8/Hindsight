/**
 * Live-ish duel state via REST polling. While a match is waiting for an opponent
 * or a round is active, we poll the backend every ~1.5s so both players see each
 * other lock in near-instantly. This is the V1 transport; when the server mints
 * Ably tokens (ABLY_API_KEY) this hook can subscribe to `match:{id}` instead and
 * drop the interval. See docs/duel-design.md.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { commitDuel, forfeitDuel, getDuel } from "./api";
import type { PublicDuelMatch } from "./types";
import type { ChoiceId } from "../game/types";

const POLL_MS = 1500;

function isLive(state?: PublicDuelMatch["state"]): boolean {
  return state === "waiting_opponent" || state === "round_active";
}

export function useDuelMatch(deviceId: string) {
  const [match, setMatchState] = useState<PublicDuelMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matchRef = useRef<PublicDuelMatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const poll = useCallback(async () => {
    const current = matchRef.current;
    if (!current || !isLive(current.state)) return;
    try {
      const next = await getDuel(current.id, deviceId);
      matchRef.current = next;
      setMatchState(next);
    } catch {
      // transient — keep the last good state and try again next tick
    } finally {
      if (matchRef.current && isLive(matchRef.current.state)) {
        timer.current = setTimeout(poll, POLL_MS);
      }
    }
  }, [deviceId]);

  // (Re)start the poll loop whenever the match becomes live.
  useEffect(() => {
    stopPolling();
    if (match && isLive(match.state)) {
      timer.current = setTimeout(poll, POLL_MS);
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, match?.state]);

  const refresh = useCallback(async () => {
    const current = matchRef.current;
    if (!current) return;
    try {
      const next = await getDuel(current.id, deviceId);
      setMatch(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    }
  }, [deviceId, setMatch]);

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
    setMatch(null);
    setError(null);
  }, [setMatch, stopPolling]);

  return { match, setMatch, error, setError, busy, refresh, commit, forfeit, clear };
}
