import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { SparkChart } from "../components/SparkChart";
import { useProfile } from "../lib/profile";
import { getDeviceId } from "../lib/device-id";
import { buildReasoning, chipsForProblem, hasReasoning } from "../lib/game/reasoning-chips";
import {
  CLOCK_LABEL,
  CLOCK_SECONDS,
  DUEL_MODES,
  duelName,
  explainRound,
  type DuelClock,
  type DuelEdge,
  type DuelExplanation,
  type DuelMode,
  type DuelTempo,
  type PlayerSlot,
  type RoundGrade,
} from "../lib/game/duel";
import { createDuel, joinDuel, getDuelProblem, type DuelIdentity } from "../lib/duel/api";
import { useDuelMatch } from "../lib/duel/useDuelMatch";
import type { PublicDuelMatch } from "../lib/duel/types";
import type { ChoiceId, Choice, DailyProblem } from "../lib/game/types";
import { C } from "../theme";

const MODES: DuelMode[] = ["same-board", "best-of-3"];
const TEMPOS: { id: DuelTempo; label: string; sub: string }[] = [
  { id: "live", label: "Live", sub: "Both in the room" },
  { id: "hybrid", label: "Auto", sub: "Live, falls back to async" },
  { id: "async", label: "Async", sub: "Send & wait (24h)" },
];
const CLOCKS: DuelClock[] = ["blitz", "rapid", "deep"];

export function DuelScreen({ onExit }: { onExit: () => void }) {
  const { profile, recordDuel } = useProfile();
  const { width } = useWindowDimensions();
  const chartW = Math.max(280, Math.min(width, 440) - 48);

  const [deviceId, setDeviceId] = useState<string>("");
  useEffect(() => { getDeviceId().then(setDeviceId); }, []);

  const myName = useMemo(() => (deviceId ? duelName(deviceId) : ""), [deviceId]);
  const identity: DuelIdentity = useMemo(
    () => ({
      deviceId,
      name: myName,
      duelRating: profile.duelRating,
      duelMatchesPlayed: profile.duelMatchesPlayed,
    }),
    [deviceId, myName, profile.duelRating, profile.duelMatchesPlayed],
  );

  const { match, setMatch, error, setError, busy, commit, forfeit, clear } = useDuelMatch(deviceId);

  // lobby selections
  const [mode, setMode] = useState<DuelMode>("same-board");
  const [tempo, setTempo] = useState<DuelTempo>("live");
  const [clock, setClock] = useState<DuelClock>("rapid");
  const [creating, setCreating] = useState(false);

  // current round problem + commit form
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [loadedRound, setLoadedRound] = useState<number>(-1);
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const recordedRef = useRef(false);

  const you = match?.players.find((p) => p.id === match.you) ?? null;
  const opponent = match?.players.find((p) => p.id !== match?.you) ?? null;
  const round = match ? match.rounds[match.currentRound] : null;
  const youCommitted = round?.youCommitted ?? false;

  // Fetch the round's problem when a new active round starts.
  useEffect(() => {
    if (!match || !deviceId) return;
    if (match.state !== "round_active") return;
    if (match.currentRound === loadedRound) return;
    let cancelled = false;
    getDuelProblem(match.id, deviceId)
      .then(({ problem: p, round: rIdx }) => {
        if (cancelled) return;
        setProblem(p);
        setLoadedRound(rIdx);
        setChoice(null);
        setConfidence(70);
        setSelectedChips([]);
        setCustomReasoning("");
      })
      .catch(() => !cancelled && setError("Couldn't load the round."));
    return () => { cancelled = true; };
  }, [match, deviceId, loadedRound, setError]);

  // Persist the duel result once the match ends.
  useEffect(() => {
    if (!match || match.state !== "match_end" || recordedRef.current) return;
    const me = match.players.find((p) => p.id === match.you);
    if (!me || me.duelRatingAfter === undefined) return;
    recordedRef.current = true;
    const result = match.winnerId == null ? "draw" : match.winnerId === me.id ? "win" : "loss";
    recordDuel({ ratingAfter: me.duelRatingAfter, result });
    Haptics.notificationAsync(result === "win" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  }, [match, recordDuel]);

  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning) && !busy;

  const startMatch = useCallback(
    async (kind: "queue" | "friend") => {
      if (!deviceId) return;
      setCreating(true);
      setError(null);
      recordedRef.current = false;
      try {
        const { match: m } = await createDuel({
          mode,
          tempo,
          clock: tempo === "async" ? null : clock,
          rated: true,
          kind,
          identity,
        });
        setMatch(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start a duel.");
      } finally {
        setCreating(false);
      }
    },
    [deviceId, mode, tempo, clock, identity, setMatch, setError],
  );

  const submit = useCallback(async () => {
    if (!choice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await commit({ choice, confidence: confidence / 100, reasoning });
    } catch {
      /* error surfaced by hook */
    }
  }, [choice, confidence, reasoning, commit]);

  const leave = useCallback(() => {
    clear();
    setProblem(null);
    setLoadedRound(-1);
    recordedRef.current = false;
  }, [clear]);

  // ── routing ──
  if (!match) {
    return (
      <Lobby
        mode={mode} setMode={setMode}
        tempo={tempo} setTempo={setTempo}
        clock={clock} setClock={setClock}
        onFind={() => startMatch("queue")}
        onFriend={() => startMatch("friend")}
        creating={creating}
        error={error}
        duelRating={profile.duelRating}
        wins={profile.duelWins}
        losses={profile.duelLosses}
        myName={myName}
        onExit={onExit}
      />
    );
  }

  if (match.state === "match_end") {
    return <DuelReveal match={match} you={you} opponent={opponent} problem={problem} chartW={chartW} onRematch={() => { leave(); }} onExit={onExit} />;
  }

  if (match.state === "abandoned") {
    return (
      <Centered>
        <Text style={{ fontSize: 40 }}>🕊️</Text>
        <Text style={{ color: C.muted, marginTop: 12, textAlign: "center", paddingHorizontal: 32 }}>This match was abandoned — no opponent locked in.</Text>
        <PrimaryButton label="Back to duels" onPress={leave} />
      </Centered>
    );
  }

  if (match.state === "waiting_opponent") {
    return <Waiting match={match} onCancel={() => { void forfeit(); leave(); }} onExit={onExit} />;
  }

  // round_active
  if (youCommitted) {
    return <WaitingForOpponent match={match} opponent={opponent} onExit={onExit} />;
  }

  if (!problem) return <Centered><ActivityIndicator color={C.accent} size="large" /></Centered>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <MatchHeader match={match} you={you} opponent={opponent} onExit={onExit} />
      <RoundClock deadlineAt={round?.deadlineAt} converted={round?.convertedToAsync} />

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 14 }}>
        <View style={{ paddingHorizontal: 4, paddingTop: 12, alignItems: "center" }}>
          <SparkChart series={problem.series} width={chartW} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: C.border }}>
          {problem.metrics.map((m, i) => (
            <View key={m.label} style={{ width: "50%", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i > 1 ? 1 : 0, borderRightWidth: i % 2 === 0 ? 1 : 0, borderColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.muted }}>{m.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: C.fg, fontVariant: ["tabular-nums"] }}>{m.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={{ marginTop: 18, fontSize: 15, fontWeight: "600", color: C.fg }}>{problem.prompt}</Text>

      <View style={{ marginTop: 12, gap: 8 }}>
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <Pressable key={c.id} onPress={() => { setChoice(c.id); Haptics.selectionAsync(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.08)" : C.card }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: sel ? C.accent : C.card2 }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: sel ? C.accentInk : C.muted }}>{c.id}</Text>
              </View>
              <Text style={{ fontSize: 15, color: C.fg }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ fontSize: 14, color: C.muted }}>How sure are you?</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: confColor(confidence), fontVariant: ["tabular-nums"] }}>{confidence}%</Text>
        </View>
        <Slider style={{ marginTop: 10 }} minimumValue={33} maximumValue={99} step={1} value={confidence}
          onValueChange={(v) => setConfidence(Math.round(v))} minimumTrackTintColor={C.accent} maximumTrackTintColor={C.card2} thumbTintColor={C.fg} />
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.fg }}>What are you seeing?</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Tap what stands out — sharper read wins the round.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {chips.map((chip) => {
            const sel = selectedChips.includes(chip.label);
            return (
              <Pressable key={chip.id} onPress={() => {
                setSelectedChips((prev) => sel ? prev.filter((l) => l !== chip.label) : [...prev, chip.label]);
                Haptics.selectionAsync();
              }}
                style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.12)" : C.card2 }}>
                <Text style={{ fontSize: 13, color: sel ? C.accent : C.fg }}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput value={customReasoning} onChangeText={setCustomReasoning} multiline
          placeholder="Optional — add your own words"
          placeholderTextColor={C.muted2}
          style={{ marginTop: 12, minHeight: 56, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.fg, textAlignVertical: "top" }} />
      </View>

      {error && <Text style={{ marginTop: 12, color: C.bad, textAlign: "center", fontSize: 13 }}>{error}</Text>}

      <Pressable disabled={!canSubmit} onPress={submit}
        style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: !canSubmit ? 0.4 : 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 16, color: C.accentInk }}>{busy ? "Locking in…" : "Lock in your call"}</Text>
      </Pressable>
      <Text style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: C.muted2 }}>
        Educational only — graded on judgment, never the outcome.
      </Text>
    </ScrollView>
  );
}

/* ── lobby ── */

function Lobby({ mode, setMode, tempo, setTempo, clock, setClock, onFind, onFriend, creating, error, duelRating, wins, losses, myName, onExit }: {
  mode: DuelMode; setMode: (m: DuelMode) => void;
  tempo: DuelTempo; setTempo: (t: DuelTempo) => void;
  clock: DuelClock; setClock: (c: DuelClock) => void;
  onFind: () => void; onFriend: () => void; creating: boolean; error: string | null;
  duelRating: number; wins: number; losses: number; myName: string; onExit: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>Duel</Text>
          <Text style={{ marginTop: 2, fontSize: 13, color: C.muted }}>Head-to-head. Sharper read wins — never returns.</Text>
        </View>
        <Pressable onPress={onExit}><Text style={{ fontSize: 14, color: C.muted }}>Done</Text></Pressable>
      </View>

      {myName ? (
        <Text style={{ marginTop: 12, fontSize: 12, color: C.muted2 }}>Playing as <Text style={{ fontWeight: "700", color: C.fg }}>{myName}</Text></Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <Stat label="Duel rating" value={String(duelRating)} accent />
        <Stat label="Wins" value={String(wins)} />
        <Stat label="Losses" value={String(losses)} />
      </View>

      <Section title="Mode">
        {MODES.map((m) => {
          const meta = DUEL_MODES[m];
          const sel = mode === m;
          return (
            <Pressable key={m} onPress={() => { setMode(m); Haptics.selectionAsync(); }}
              style={{ borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.08)" : C.card }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg }}>{meta.emoji}  {meta.name}</Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: C.muted }}>{meta.blurb}</Text>
            </Pressable>
          );
        })}
      </Section>

      <Section title="Tempo">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TEMPOS.map((t) => {
            const sel = tempo === t.id;
            return (
              <Pressable key={t.id} onPress={() => { setTempo(t.id); Haptics.selectionAsync(); }}
                style={{ flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 12, alignItems: "center", borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.08)" : C.card }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: sel ? C.accent : C.fg }}>{t.label}</Text>
                <Text style={{ marginTop: 2, fontSize: 10, color: C.muted2, textAlign: "center" }}>{t.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {tempo !== "async" && (
        <Section title="Clock">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {CLOCKS.map((cl) => {
              const sel = clock === cl;
              return (
                <Pressable key={cl} onPress={() => { setClock(cl); Haptics.selectionAsync(); }}
                  style={{ flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: "center", borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.08)" : C.card }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? C.accent : C.fg }}>{CLOCK_LABEL[cl]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      )}

      {error && <Text style={{ marginTop: 16, color: C.bad, textAlign: "center", fontSize: 13 }}>{error}</Text>}

      <Pressable disabled={creating} onPress={onFind}
        style={{ marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: creating ? 0.5 : 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 16, color: C.accentInk }}>{creating ? "Finding…" : "Find opponent"}</Text>
      </Pressable>
      <Pressable disabled={creating} onPress={onFriend}
        style={{ marginTop: 10, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
        <Text style={{ fontWeight: "700", fontSize: 15, color: C.fg }}>Challenge a friend</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ── waiting states ── */

function Waiting({ match, onCancel, onExit }: { match: PublicDuelMatch; onCancel: () => void; onExit: () => void }) {
  const isFriend = Boolean(match.challengeCode);
  async function share() {
    try {
      await Share.share({ message: `I challenged you to a ${match.modeName} duel on Hindsight. Join code: ${match.challengeCode}` });
    } catch { /* cancelled */ }
  }
  return (
    <Centered>
      <ActivityIndicator color={C.accent} size="large" />
      <Text style={{ marginTop: 18, fontSize: 18, fontWeight: "700", color: C.fg }}>
        {isFriend ? "Waiting for your friend" : "Finding an opponent…"}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 13, color: C.muted, textAlign: "center", paddingHorizontal: 40 }}>
        {isFriend ? "Send the challenge — the match starts when they join." : "Matching you with someone near your duel rating — or a quick AI opponent if no one's around."}
      </Text>
      {isFriend && (
        <>
          <View style={{ marginTop: 18, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: C.muted2, textAlign: "center" }}>JOIN CODE</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.accent, letterSpacing: 2, fontVariant: ["tabular-nums"] }}>{match.challengeCode}</Text>
          </View>
          <PrimaryButton label="Share challenge" onPress={share} />
        </>
      )}
      <Pressable onPress={onCancel} style={{ marginTop: 14 }}><Text style={{ color: C.muted }}>Cancel</Text></Pressable>
      <Pressable onPress={onExit} style={{ marginTop: 18 }}><Text style={{ color: C.muted2, fontSize: 12 }}>Back to Rank</Text></Pressable>
    </Centered>
  );
}

function WaitingForOpponent({ match, opponent, onExit }: { match: PublicDuelMatch; opponent: PlayerSlot | null; onExit: () => void }) {
  return (
    <Centered>
      <Text style={{ fontSize: 40 }}>🔒</Text>
      <Text style={{ marginTop: 14, fontSize: 18, fontWeight: "700", color: C.fg }}>Locked in</Text>
      <Text style={{ marginTop: 6, fontSize: 14, color: C.muted, textAlign: "center", paddingHorizontal: 40 }}>
        Waiting for {opponent?.name ?? "your opponent"} to make their call…
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
        <ActivityIndicator color={C.accent} />
        <Text style={{ fontSize: 13, color: C.muted2 }}>{opponent?.name ?? "Opponent"} is thinking</Text>
      </View>
      <Text style={{ marginTop: 18, fontSize: 12, color: C.muted2 }}>Round {match.currentRound + 1} of {match.roundsTotal}</Text>
      <Pressable onPress={onExit} style={{ marginTop: 24 }}><Text style={{ color: C.muted2, fontSize: 12 }}>Back to Rank</Text></Pressable>
    </Centered>
  );
}

/* ── reveal ── */

function DuelReveal({ match, you, opponent, problem, chartW, onRematch, onExit }: {
  match: PublicDuelMatch; you: PlayerSlot | null; opponent: PlayerSlot | null; problem: DailyProblem | null; chartW: number; onRematch: () => void; onExit: () => void;
}) {
  const [showOppReasoning, setShowOppReasoning] = useState(false);
  const isFriend = Boolean(match.challengeCode);
  const won = match.winnerId === match.you;
  const draw = match.winnerId == null;
  const title = draw ? "DRAW" : won ? "YOU WIN" : "YOU LOSE";
  const tone = draw ? C.warn : won ? C.accent : C.bad;
  const delta = you?.duelDelta ?? 0;
  const completedRounds = match.rounds.filter((r) => r.state === "complete");
  const lastRound = [...completedRounds].reverse()[0];
  const reveal = lastRound?.reveal;
  const up = (reveal?.forwardReturnPct ?? 0) >= 0;
  const youName = you?.name ?? "You";
  const oppName = (opponent?.name ?? "Opponent") + (opponent?.isBot ? " 🤖" : "");
  const choiceLabels = problem?.choices;

  const yg = you && lastRound ? lastRound.grades?.[you.id] : undefined;
  const og = opponent && lastRound ? lastRound.grades?.[opponent.id] : undefined;
  const lastOutcome: "win" | "loss" | "draw" =
    lastRound?.winnerId == null ? "draw" : lastRound.winnerId === match.you ? "win" : "loss";
  const explanation: DuelExplanation | null = yg && og ? explainRound(yg, og, lastOutcome) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ alignItems: "center" }}>
        <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: tone, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", letterSpacing: 1.5, color: tone }}>{title}</Text>
        </View>
        <Text style={{ marginTop: 14, fontSize: 56, fontWeight: "800", letterSpacing: -1, color: tone, fontVariant: ["tabular-nums"] }}>
          {delta >= 0 ? "+" : ""}{delta}
        </Text>
        <Text style={{ fontSize: 13, color: C.muted }}>duel rating · now {you?.duelRatingAfter ?? profileless(delta, you)}</Text>
      </View>

      {/* per-round scoreboard */}
      <View style={{ marginTop: 22, gap: 10 }}>
        {completedRounds.map((r) => {
          const ryg = you ? r.grades?.[you.id] : undefined;
          const rog = opponent ? r.grades?.[opponent.id] : undefined;
          const youWonRound = r.winnerId === match.you;
          const roundChoices = r.index === match.currentRound ? choiceLabels : undefined;
          return (
            <View key={r.index} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
              {match.roundsTotal > 1 && (
                <Text style={{ fontSize: 11, color: C.muted2, marginBottom: 8 }}>Round {r.index + 1} · {r.winnerId == null ? "draw" : youWonRound ? "you won" : "you lost"}</Text>
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <GradeCol name={`You · ${youName}`} grade={ryg} highlight={youWonRound} choices={roundChoices} />
                <GradeCol name={oppName} grade={rog} highlight={!youWonRound && r.winnerId != null} choices={roundChoices} />
              </View>
              {r.yourReasoning && ryg && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase" }}>Your call</Text>
                  <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: C.fg }}>{r.yourReasoning}</Text>
                  {ryg.reasoningNotes ? (
                    <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.muted }}>
                      <Text style={{ fontWeight: "700", color: C.fg }}>On your reasoning: </Text>{ryg.reasoningNotes}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {isFriend && lastRound?.opponentReasoning ? (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 }}>
          <Pressable onPress={() => setShowOppReasoning((v) => !v)}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.accent }}>
              {showOppReasoning ? "Hide their call" : `See ${oppName}'s call`}
            </Text>
          </Pressable>
          {showOppReasoning ? (
            <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: C.muted }}>{lastRound.opponentReasoning}</Text>
          ) : null}
        </View>
      ) : null}

      {explanation && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase" }}>
            Why{match.roundsTotal > 1 ? " — final round" : ""}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "800", color: C.fg }}>{explanation.headline}</Text>
          <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: C.muted }}>{explanation.summary}</Text>
          <View style={{ marginTop: 12, gap: 7 }}>
            {explanation.factors.map((f) => (
              <View key={f.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <Text style={{ fontSize: 13, color: edgeColor(f.edge), marginTop: 1 }}>{edgeMark(f.edge)}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: C.muted }}>
                  <Text style={{ fontWeight: "700", color: C.fg }}>{f.label}: </Text>{f.detail}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {reveal && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: C.muted2 }}>It was</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.fg }}>{reveal.company} <Text style={{ color: C.muted }}>{problem?.live ? reveal.ticker : "(demo)"}</Text></Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, color: C.muted2 }}>Forward</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: up ? C.up : C.down, fontVariant: ["tabular-nums"] }}>{up ? "+" : ""}{reveal.forwardReturnPct}%</Text>
            </View>
          </View>
          {problem && (
            <View style={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 12, alignItems: "center" }}>
              <SparkChart series={problem.series} continuation={reveal.continuation} width={chartW} />
            </View>
          )}
        </View>
      )}

      <PrimaryButton label="New duel" onPress={onRematch} />
      <Pressable onPress={onExit} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: C.muted2, fontSize: 13 }}>Back to Rank</Text></Pressable>
    </ScrollView>
  );
}

function GradeCol({ name, grade, highlight, choices }: { name: string; grade?: RoundGrade; highlight: boolean; choices?: Choice[] }) {
  const pickLine = gradePickLine(grade, choices);
  return (
    <View style={{ flex: 1, borderRadius: 12, backgroundColor: highlight ? "rgba(94,242,176,0.08)" : C.card2, borderWidth: 1, borderColor: highlight ? C.accent : C.border, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: highlight ? C.accent : C.fg }}>{name}</Text>
      <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "800", color: C.fg, fontVariant: ["tabular-nums"] }}>{grade ? grade.score.toFixed(2) : "—"}</Text>
      <Text style={{ fontSize: 10, color: C.muted2 }}>skill score</Text>
      {grade ? (
        <>
          {pickLine ? <Text style={{ marginTop: 6, fontSize: 11, color: C.fg }}>{pickLine}</Text> : null}
          <Text style={{ marginTop: 4, fontSize: 11, color: C.muted }}>
            {grade.forfeit ? "no call" : `${confidenceLabel(grade)} · cal ${(1 - grade.brier).toFixed(2)} · reas ${Math.round(grade.reasoning * 100)}`}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function gradePickLine(grade: RoundGrade | undefined, choices?: Choice[]): string | null {
  if (!grade || grade.forfeit || !grade.choice) return grade?.forfeit ? "No call" : null;
  const label = choices?.find((c) => c.id === grade.choice)?.label ?? grade.choice;
  return `Pick · ${label}${grade.correct ? " ✓" : ""}`;
}

function confidenceLabel(grade: RoundGrade): string {
  return `${Math.round(grade.confidence * 100)}% confident`;
}

/* ── small shared bits ── */

function MatchHeader({ match, you, opponent, onExit }: { match: PublicDuelMatch; you: PlayerSlot | null; opponent: PlayerSlot | null; onExit: () => void }) {
  const wins = match.rounds.filter((r) => r.state === "complete");
  const youWins = wins.filter((r) => r.winnerId === match.you).length;
  const oppWins = wins.filter((r) => r.winnerId && r.winnerId !== match.you).length;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: C.accent }}>{you?.name ?? "You"} <Text style={{ color: C.muted2 }}>{you?.duelRating}</Text></Text>
        {match.roundsTotal > 1 && <Text style={{ fontSize: 13, color: C.fg, fontVariant: ["tabular-nums"] }}>{youWins}–{oppWins}</Text>}
        <Text style={{ fontSize: 13, color: C.muted2 }}>vs</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: C.fg }}>{opponent?.name ?? "Opponent"}{opponent?.isBot ? " 🤖" : ""} <Text style={{ color: C.muted2 }}>{opponent?.duelRating}</Text></Text>
      </View>
      <Pressable onPress={onExit}><Text style={{ fontSize: 12, color: C.muted2 }}>Exit</Text></Pressable>
    </View>
  );
}

function RoundClock({ deadlineAt, converted }: { deadlineAt?: string; converted?: boolean }) {
  const [left, setLeft] = useState<number>(() => secsLeft(deadlineAt));
  useEffect(() => {
    setLeft(secsLeft(deadlineAt));
    const t = setInterval(() => setLeft(secsLeft(deadlineAt)), 1000);
    return () => clearInterval(t);
  }, [deadlineAt]);
  if (!deadlineAt) return null;
  const long = left > 3600;
  return (
    <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Text style={{ fontSize: 12, color: converted ? C.warn : C.muted }}>
        {converted ? "Async — opponent has time" : long ? "Time left" : "⏱ "}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: left <= 10 && !long ? C.bad : C.fg, fontVariant: ["tabular-nums"] }}>
        {long ? `${Math.round(left / 3600)}h` : fmtClock(left)}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: 12, letterSpacing: 1, color: C.muted2, textTransform: "uppercase", fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 10, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 20, fontWeight: "800", color: accent ? C.accent : C.fg, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ marginTop: 18, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", backgroundColor: C.accent }}>
      <Text style={{ fontWeight: "700", fontSize: 15, color: C.accentInk }}>{label}</Text>
    </Pressable>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 20 }}>{children}</View>;
}

function confColor(c: number) {
  if (c >= 90) return C.bad;
  if (c >= 75) return C.warn;
  return C.accent;
}

function edgeColor(edge: DuelEdge) {
  return edge === "you" ? C.accent : edge === "opponent" ? C.bad : C.muted2;
}
function edgeMark(edge: DuelEdge) {
  return edge === "you" ? "▲" : edge === "opponent" ? "▼" : "—";
}

function profileless(delta: number, you: PlayerSlot | null) {
  return you ? you.duelRating + delta : "—";
}

function secsLeft(deadlineAt?: string) {
  if (!deadlineAt) return 0;
  return Math.max(0, Math.floor((Date.parse(deadlineAt) - Date.now()) / 1000));
}
function fmtClock(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }
