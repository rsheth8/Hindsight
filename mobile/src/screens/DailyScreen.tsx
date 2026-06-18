import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { SparkChart } from "../components/SparkChart";
import { CountUp } from "../components/CountUp";
import { Confetti } from "../components/Confetti";
import { ShareResultCard, shareRow } from "../components/ShareResultCard";
import { useProfile, hasPlayed, type JournalEntry } from "../lib/profile";
import { fetchDaily, gradeSubmission } from "../lib/api";
import { getDeviceId } from "../lib/device-id";
import { isProvisional } from "../lib/game/rating";
import { buildReasoning, chipsForProblem, hasReasoning } from "../lib/game/reasoning-chips";
import { conceptsForProblem } from "../lib/game/concepts";
import { COACH } from "../lib/coach";
import { verdict as getVerdict, transferableSkill, verdictToneColor } from "../lib/game/progress";
import { todayKey } from "../lib/game/seed";
import type { ChoiceId, DailyProblem, GradeResult } from "../lib/game/types";
import type { Depth } from "../lib/grade-types";
import { C } from "../theme";

type Phase = "loading" | "commit" | "grading" | "reveal";

export function DailyScreen() {
  const { profile, ready, record } = useProfile();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 440) - 40 - 8;

  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [showCustomReasoning, setShowCustomReasoning] = useState(false);
  const [depth, setDepth] = useState<Depth>("learn");

  const [result, setResult] = useState<GradeResult | null>(null);
  const ratingFrom = useRef(profile.rating);

  const today = todayKey();
  const playedToday = useMemo(() => hasPlayed(profile, today), [profile, today]);
  const todayEntry = useMemo(() => profile.history.find((h) => h.date === today), [profile, today]);
  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  const load = useCallback(() => {
    setError(null);
    setPhase("loading");
    fetchDaily()
      .then((p) => { setProblem(p); setPhase("commit"); })
      .catch(() => setError("We couldn't load today's problem. Check your connection and try again."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!choice || !problem) return;
    ratingFrom.current = profile.rating;
    setPhase("grading");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await gradeSubmission({
        choice,
        confidence: confidence / 100,
        reasoning,
        rating: profile.rating,
        gradedCount: profile.gradedCount,
        depth,
        deviceId: await getDeviceId(),
      });
      setResult(data);
      const entry: JournalEntry = {
        date: problem.date,
        problemId: problem.id,
        choice,
        choiceLabel: problem.choices.find((c) => c.id === choice)!.label,
        confidence: confidence / 100,
        reasoning,
        correct: data.correct,
        brier: data.brier,
        reasoningScore: data.reasoning,
        reasoningNotes: data.reasoningNotes,
        ratingDelta: data.ratingDelta,
        ratingAfter: data.newRating,
        earned: data.earned,
        ticker: data.reveal.ticker,
        company: data.reveal.company,
        forwardReturnPct: data.reveal.forwardReturnPct,
        difficulty: problem.difficulty,
        concepts: conceptsForProblem(problem),
      };
      await record(entry);
      Haptics.notificationAsync(data.earned ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      setPhase("reveal");
    } catch {
      setError("Grading failed. Try again.");
      setPhase("commit");
    }
  }

  if (error) return (
    <Centered>
      <Text style={{ fontSize: 40 }}>📉</Text>
      <Text style={{ color: C.muted, marginTop: 12, textAlign: "center", paddingHorizontal: 32 }}>{error}</Text>
      <Pressable onPress={load} style={{ marginTop: 20, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11, backgroundColor: C.accent }}>
        <Text style={{ fontWeight: "700", color: C.accentInk }}>Try again</Text>
      </Pressable>
    </Centered>
  );
  if (!ready || phase === "loading" || !problem) return <Centered><ActivityIndicator color={C.accent} size="large" /></Centered>;

  // already played → show today's result + countdown
  if (playedToday && phase !== "reveal" && todayEntry) {
    return <AlreadyPlayed entry={todayEntry} streak={profile.streak} rating={profile.rating} />;
  }

  if (phase === "reveal" && result) {
    return <Reveal problem={problem} result={result} ratingFrom={ratingFrom.current} streak={profile.streak} choice={choice!} depth={depth} setDepth={setDepth} chartW={chartW} />;
  }

  // ── commit screen ──
  const grading = phase === "grading";
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <TopBar rating={profile.rating} gradedCount={profile.gradedCount} streak={profile.streak} freezes={profile.streakFreezes ?? 1} />

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14 }}>
          <DifficultyChip d={problem.difficulty} />
          <Text style={{ fontSize: 11, color: C.muted2 }}>Anonymized · {problem.horizonLabel} ahead</Text>
        </View>
        <View style={{ paddingHorizontal: 4, paddingTop: 8, alignItems: "center" }}>
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

      <Text style={{ marginTop: 20, fontSize: 15, fontWeight: "600", color: C.fg }}>{problem.prompt}</Text>

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

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ fontSize: 14, color: C.muted }}>How sure are you?</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: confColor(confidence), fontVariant: ["tabular-nums"] }}>{confidence}%</Text>
        </View>
        <Slider style={{ marginTop: 10 }} minimumValue={33} maximumValue={99} step={1} value={confidence}
          onValueChange={(v) => setConfidence(Math.round(v))} minimumTrackTintColor={C.accent} maximumTrackTintColor={C.card2} thumbTintColor={C.fg} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ fontSize: 10, color: C.muted2 }}>33% · pure guess</Text>
          <Text style={{ fontSize: 10, color: C.muted2 }}>99% · certain</Text>
        </View>
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.fg }}>What are you seeing?</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Tap what stands out — no essay required.</Text>
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
        {!showCustomReasoning ? (
          <Pressable onPress={() => setShowCustomReasoning(true)} style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: C.muted }}>+ Add your own words</Text>
          </Pressable>
        ) : (
          <TextInput value={customReasoning} onChangeText={setCustomReasoning} multiline
            placeholder="Optional — spell out your read in your own words"
            placeholderTextColor={C.muted2}
            style={{ marginTop: 12, minHeight: 72, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.fg, textAlignVertical: "top" }} />
        )}
        {isProvisional(profile.gradedCount) && (
          <Text style={{ marginTop: 12, fontSize: 11, color: C.muted2, lineHeight: 16 }}>
            Provisional rating — thin reasoning won&apos;t sink you yet ({10 - profile.gradedCount} calls left).
          </Text>
        )}
      </View>

      <Pressable disabled={!canSubmit || grading} onPress={submit}
        style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: !canSubmit || grading ? 0.4 : 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 16, color: C.accentInk }}>{grading ? "Grading your judgment…" : "Lock in your call"}</Text>
      </Pressable>
      <Text style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: C.muted2, lineHeight: 16 }}>
        Educational only — never buy/sell advice. We grade your decision, not the outcome.
      </Text>
    </ScrollView>
  );
}

// ── sub-views ──

function TopBar({ rating, gradedCount, streak, freezes }: { rating: number; gradedCount: number; streak: number; freezes: number }) {
  const prov = isProvisional(gradedCount);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View>
        <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase" }}>Hindsight · Daily</Text>
        <Text style={{ fontSize: 13, color: C.muted }}>Read the setup. Make the call.</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="🔥 Streak" value={String(streak)} />
        {freezes > 0 && <Pill label="🧊" value={String(freezes)} />}
        <Pill label="Rating" value={prov ? `${rating}?` : String(rating)} accent />
      </View>
    </View>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" }}>
      <Text style={{ fontSize: 9, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", color: accent ? C.accent : C.fg, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function DifficultyChip({ d }: { d: number }) {
  const { label, color } = d < 0.4 ? { label: "Easy", color: C.up } : d < 0.7 ? { label: "Medium", color: C.warn } : { label: "Hard", color: C.bad };
  return (
    <View style={{ borderRadius: 999, backgroundColor: C.card2, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>● {label}</Text>
    </View>
  );
}

function confColor(c: number) {
  if (c >= 90) return C.bad;
  if (c >= 75) return C.warn;
  return C.accent;
}

function Reveal({ problem, result, ratingFrom, streak, choice, depth, setDepth, chartW }: {
  problem: DailyProblem; result: GradeResult; ratingFrom: number; streak: number; choice: ChoiceId; depth: Depth; setDepth: (d: Depth) => void; chartW: number;
}) {
  const r = result.reveal;
  const up = r.forwardReturnPct >= 0;
  const calib = 1 - result.brier;
  const v = getVerdict(result);
  const skill = transferableSkill(problem, result);
  const shareRef = useRef<View>(null);

  async function share() {
    const row = shareRow({ correct: result.correct, brier: result.brier, reasoning: result.reasoning });
    const msg = `Hindsight ${problem.date}\n${row}\nRating ${result.newRating} (${result.ratingDelta >= 0 ? "+" : ""}${result.ratingDelta}) · 🔥 ${streak}\nBetter-calibrated than I was yesterday.`;
    try {
      if (shareRef.current) {
        const uri = await captureRef(shareRef, { format: "png", quality: 1 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your result" });
          return;
        }
      }
      await Share.share({ message: msg });
    } catch { /* cancelled */ }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ position: "absolute", left: -2000, top: 0, opacity: 0 }} pointerEvents="none">
        <ShareResultCard
          ref={shareRef}
          date={problem.date}
          rating={result.newRating}
          delta={result.ratingDelta}
          streak={streak}
          correct={result.correct}
          brier={result.brier}
          reasoning={result.reasoning}
        />
      </View>
      {result.earned && <Confetti />}

      <View style={{ alignItems: "center" }}>
        <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: verdictToneColor(v.tone), paddingHorizontal: 14, paddingVertical: 5, marginBottom: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 1, color: verdictToneColor(v.tone) }}>{v.badge}</Text>
        </View>
        <CountUp from={ratingFrom} to={result.newRating} style={{ fontSize: 64, fontWeight: "800", letterSpacing: -1.5, color: result.ratingDelta >= 0 ? C.accent : C.bad, fontVariant: ["tabular-nums"] }} />
        <Text style={{ marginTop: 2, fontSize: 14, color: result.ratingDelta >= 0 ? C.accent : C.bad, fontVariant: ["tabular-nums"] }}>
          {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} rating · 🔥 {streak}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center", paddingHorizontal: 8 }}>{v.line}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
        <Score label="Outcome" emoji={result.correct ? "🟩" : "🟥"} sub={result.correct ? "Correct" : "Missed"} weight="15%" />
        <Score label="Calibration" emoji={calib > 0.8 ? "🟩" : calib > 0.55 ? "🟨" : "🟥"} sub={`Brier ${result.brier.toFixed(2)}`} weight="45%" />
        <Score label="Reasoning" emoji={result.reasoning >= 0.66 ? "🟩" : result.reasoning >= 0.4 ? "🟨" : "🟥"} sub={`${Math.round(result.reasoning * 100)}/100`} weight="40%" />
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14 }}>
          <View>
            <Text style={{ fontSize: 11, color: C.muted2 }}>It was</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.fg }}>{r.company} <Text style={{ color: C.muted }}>{problem.live ? r.ticker : "(demo)"}</Text></Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: C.muted2 }}>Next {problem.horizonLabel}</Text>
            <Text style={{ fontSize: 20, fontWeight: "700", color: up ? C.up : C.down, fontVariant: ["tabular-nums"] }}>{up ? "+" : ""}{r.forwardReturnPct}%</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 4, paddingTop: 8, alignItems: "center" }}>
          <SparkChart series={problem.series} continuation={r.continuation} width={chartW} />
        </View>
        <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 11, color: C.muted2 }}>
          {fmtDate(r.decisionDate)} → {fmtDate(r.resolveDate)} · correct: <Text style={{ fontWeight: "700", color: C.fg }}>{problem.choices.find((c) => c.id === result.answer)?.label}</Text>
        </Text>
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: C.fg }}>How players answered</Text>
          <Text style={{ fontSize: 10, color: C.muted2 }}>
            {result.crowdReal ? `real · n=${result.crowdSampleSize ?? "?"}` : "illustrative*"}
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          {problem.choices.map((c) => {
            const pct = result.crowd[c.id];
            const isAns = c.id === result.answer;
            const isMine = c.id === choice;
            return (
              <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ width: 16, fontWeight: "700", color: isMine ? C.accent : C.muted }}>{c.id}</Text>
                <View style={{ flex: 1, height: 24, borderRadius: 8, backgroundColor: C.card2, overflow: "hidden", justifyContent: "center" }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: isAns ? C.accent : "#2c3543", borderRadius: 8 }} />
                  <Text style={{ marginLeft: 8, fontSize: 11, color: isAns ? C.accentInk : C.fg }}>{c.label}</Text>
                  <Text style={{ position: "absolute", right: 8, fontSize: 11, fontWeight: "700", color: isAns ? C.accentInk : C.fg, fontVariant: ["tabular-nums"] }}>{pct}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>{COACH.emoji} {COACH.name}&apos;s read</Text>
          <DepthToggle depth={depth} setDepth={setDepth} />
        </View>
        <Text style={{ fontSize: 14, lineHeight: 21, color: C.fg }}>{result.explanation}</Text>
        <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: C.card2, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 13, color: C.muted }}><Text style={{ fontWeight: "700", color: C.fg }}>On your reasoning: </Text>{result.reasoningNotes}</Text>
        </View>
      </View>

      {/* the transferable rep — why this made you better at the real thing */}
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(94,242,176,0.06)", paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
        <Text style={{ fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontWeight: "700" }}>🎯 What you just practiced</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg, marginTop: 4 }}>{skill.title}</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 3 }}>{skill.line}</Text>
      </View>

      <Pressable onPress={share} style={{ marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: C.accent }}>
        <Text style={{ fontWeight: "700", fontSize: 16, color: C.accentInk }}>Share result</Text>
      </Pressable>
      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: C.muted2 }}>
        {result.crowdReal
          ? `Crowd split from ${result.crowdSampleSize} real answers today.`
          : "*Crowd split is illustrative until enough players have answered. Come back tomorrow for a fresh problem."}
      </Text>
    </ScrollView>
  );
}

function Score({ label, emoji, sub, weight }: { label: string; emoji: string; sub: string; weight: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "700", color: C.fg }}>{label}</Text>
      <Text style={{ fontSize: 10, color: C.muted, fontVariant: ["tabular-nums"] }}>{sub}</Text>
      <Text style={{ marginTop: 2, fontSize: 9, color: C.muted2 }}>weight {weight}</Text>
    </View>
  );
}

function DepthToggle({ depth, setDepth }: { depth: Depth; setDepth: (d: Depth) => void }) {
  const opts: Depth[] = ["learn", "analyst", "quant"];
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card2, borderRadius: 8, padding: 2 }}>
      {opts.map((o) => (
        <Pressable key={o} onPress={() => setDepth(o)} style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: depth === o ? C.accent : "transparent" }}>
          <Text style={{ fontSize: 10, textTransform: "capitalize", color: depth === o ? C.accentInk : C.muted }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function AlreadyPlayed({ entry, streak, rating }: { entry: JournalEntry; streak: number; rating: number }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontSize: 12, letterSpacing: 2, color: C.muted2, textTransform: "uppercase" }}>You&apos;re done for today</Text>
      <Text style={{ fontSize: 72, fontWeight: "800", color: C.accent, fontVariant: ["tabular-nums"], marginTop: 8 }}>{rating}</Text>
      <Text style={{ marginTop: 2, fontSize: 14, color: C.muted }}>🔥 {streak}-day streak</Text>
      <View style={{ alignSelf: "stretch", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>Today: {entry.company}</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>You called <Text style={{ fontWeight: "700", color: C.fg }}>{entry.choiceLabel}</Text> at {Math.round(entry.confidence * 100)}% — {entry.correct ? "correct" : "missed"} · {entry.ratingDelta >= 0 ? "+" : ""}{entry.ratingDelta} rating.</Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: C.muted2 }}>{entry.reasoningNotes}</Text>
      </View>
      <Countdown />
      <Text style={{ marginTop: 12, fontSize: 12, color: C.muted2, textAlign: "center" }}>One problem a day keeps the rating honest. See you tomorrow.</Text>
    </ScrollView>
  );
}

function Countdown() {
  const [s, setS] = useState(secsToMidnight());
  useEffect(() => { const t = setInterval(() => setS(secsToMidnight()), 1000); return () => clearInterval(t); }, []);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return <Text style={{ marginTop: 24, fontSize: 26, fontWeight: "700", color: C.fg, fontVariant: ["tabular-nums"] }}>{p2(h)}:{p2(m)}:{p2(sec)}</Text>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>{children}</View>;
}

function p2(n: number) { return String(n).padStart(2, "0"); }
function secsToMidnight() { const now = new Date(); const mid = new Date(now); mid.setUTCHours(24, 0, 0, 0); return Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000)); }
function fmtDate(s: string) { return new Date(s + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
