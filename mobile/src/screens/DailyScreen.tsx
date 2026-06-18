import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { SparkChart } from "../components/SparkChart";
import { CountUp } from "../components/CountUp";
import { Confetti } from "../components/Confetti";
import { HMark } from "../components/HMark";
import { ScoreRing } from "../components/ScoreRing";
import { CalibrationBar, calibrationPosition } from "../components/CalibrationBar";
import { Rise, Pop } from "../components/Animate";
import { Flame, Freeze } from "../components/Glyph";
import { ShareResultCard, shareRow } from "../components/ShareResultCard";
import { useProfile, hasPlayed, type JournalEntry, type JournalSnapshot } from "../lib/profile";
import { fetchDaily, gradeSubmission } from "../lib/api";
import { getDeviceId } from "../lib/device-id";
import { getPreferredDepth } from "../lib/prefs";
import { isProvisional } from "../lib/game/rating";
import { buildReasoning, chipsForProblem, hasReasoning } from "../lib/game/reasoning-chips";
import { conceptsForProblem } from "../lib/game/concepts";
import { COACH } from "../lib/coach";
import { verdict as getVerdict, transferableSkill, verdictToneColor } from "../lib/game/progress";
import { todayKey } from "../lib/game/seed";
import type { ChoiceId, DailyProblem, GradeResult } from "../lib/game/types";
import type { Depth } from "../lib/grade-types";
import { utcResetLabel, secsToUtcMidnight, formatCountdown } from "../lib/game/utc-reset";
import { C, F } from "../theme";

type Phase = "loading" | "commit" | "grading" | "reveal";

type NavDest = "practice" | "rank" | "journal" | "learn" | "duel";

export function DailyScreen({ onNavigate }: { onNavigate?: (tab: NavDest) => void }) {
  const { profile, ready, record } = useProfile();
  const { width } = useWindowDimensions();
  const chartW = Math.max(280, Math.min(width, 440) - 48);

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
  const [ratingFrom, setRatingFrom] = useState(profile.rating);

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

  useEffect(() => {
    let cancelled = false;
    fetchDaily()
      .then((p) => { if (!cancelled) { setProblem(p); setPhase("commit"); } })
      .catch(() => { if (!cancelled) setError("We couldn't load today's problem. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { getPreferredDepth().then((d) => { if (d) setDepth(d); }); }, []);

  async function submit() {
    if (!choice || !problem) return;
    setRatingFrom(profile.rating);
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
      const snapshot: JournalSnapshot = {
        explanation: data.explanation,
        series: problem.series,
        continuation: data.reveal.continuation,
        horizonLabel: problem.horizonLabel,
        prompt: problem.prompt,
        problemType: problem.type,
        crowd: data.crowd,
      };
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
        snapshot,
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
    return <AlreadyPlayed entry={todayEntry} streak={profile.streak} rating={profile.rating} onNavigate={onNavigate} />;
  }

  if (phase === "reveal" && result) {
    return <Reveal problem={problem} result={result} ratingFrom={ratingFrom} streak={profile.streak} choice={choice!} confidence={confidence / 100} depth={depth} setDepth={setDepth} chartW={chartW} onNavigate={onNavigate} />;
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

      <Text style={{ marginTop: 20, fontSize: 16, color: C.fg, fontFamily: F.bodySemi }}>{problem.prompt}</Text>

      {profile.gradedCount === 0 && (
        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.07)", paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.fg, fontFamily: F.body }}>
            <Text style={{ fontFamily: F.bodySemi }}>👋 Your first call. </Text>
            Pick the outcome you&apos;d bet on, set how sure you are, and tap what you noticed — then lock it in.
          </Text>
        </View>
      )}

      <View style={{ marginTop: 12, gap: 8 }}>
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <Pressable key={c.id} onPress={() => { setChoice(c.id); Haptics.selectionAsync(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(240,197,96,0.10)" : C.card }}>
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
          <Text style={{ fontSize: 14, color: C.muted, fontFamily: F.body }}>How sure are you?</Text>
          <Text style={{ fontSize: 26, color: confColor(confidence), fontFamily: F.display, fontVariant: ["tabular-nums"] }}>{confidence}%</Text>
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
                style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(240,197,96,0.14)" : C.card2 }}>
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
        <Text style={{ fontSize: 16, color: C.accentInk, fontFamily: F.bodySemi }}>{grading ? "Grading your judgment…" : "Lock in your call"}</Text>
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <HMark size={30} />
        <View>
          <Text style={{ fontSize: 19, fontFamily: F.display, letterSpacing: -0.5 }}>
            <Text style={{ color: C.fg }}>hind</Text><Text style={{ color: C.accent }}>sight</Text>
          </Text>
          <Text style={{ fontSize: 11, color: C.muted2, marginTop: -1, fontFamily: F.body }}>Read the setup. Make the call.</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill icon={<Flame size={10} />} label="Streak" value={String(streak)} />
        {freezes > 0 && <Pill icon={<Freeze size={11} />} value={String(freezes)} />}
        <Pill label="Rating" value={prov ? `${rating}?` : String(rating)} accent />
      </View>
    </View>
  );
}

function Pill({ label, value, accent, icon }: { label?: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, minHeight: 12 }}>
        {icon}
        {label ? <Text style={{ fontSize: 9, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>{label}</Text> : null}
      </View>
      <Text style={{ fontSize: 16, color: accent ? C.accent : C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{value}</Text>
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

function Reveal({ problem, result, ratingFrom, streak, choice, confidence, depth, setDepth, chartW, onNavigate }: {
  problem: DailyProblem; result: GradeResult; ratingFrom: number; streak: number; choice: ChoiceId; confidence: number; depth: Depth; setDepth: (d: Depth) => void; chartW: number; onNavigate?: (t: NavDest) => void;
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
        <Pop style={{ marginBottom: 14 }}>
          <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: verdictToneColor(v.tone), paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, letterSpacing: 1, color: verdictToneColor(v.tone), fontFamily: F.mono }}>{v.badge}</Text>
          </View>
        </Pop>

        {/* gap-as-hero — how sure → how right (see docs/design.md §5) */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 10, letterSpacing: 0.8, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>How sure</Text>
            <Text style={{ fontSize: 48, color: C.fg, fontFamily: F.display, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{Math.round(confidence * 100)}<Text style={{ fontSize: 22 }}>%</Text></Text>
          </View>
          <Text style={{ fontSize: 24, color: C.muted2, paddingBottom: 10, fontFamily: F.body }}>→</Text>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 10, letterSpacing: 0.8, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>How right</Text>
            <Text style={{ fontSize: 48, color: C.accent, fontFamily: F.display, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{Math.round(calib * 100)}<Text style={{ fontSize: 22 }}>%</Text></Text>
          </View>
        </View>

        <View style={{ marginTop: 18, alignItems: "center" }}>
          <CalibrationBar position={calibrationPosition(confidence, result.correct)} width={chartW} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 }}>
          <CountUp from={ratingFrom} to={result.newRating} style={{ fontSize: 26, color: C.fg, fontFamily: F.display, fontVariant: ["tabular-nums"] }} />
          <Text style={{ fontSize: 13, color: result.ratingDelta >= 0 ? C.accent : C.bad, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>
            {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta}
          </Text>
          <Flame size={13} />
          <Text style={{ fontSize: 13, color: C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{streak}</Text>
        </View>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center", paddingHorizontal: 8, fontFamily: F.body }}>{v.line}</Text>
      </View>

      {/* grading rings — Outcome / Calibration / Reasoning (replaces emoji squares) */}
      <Rise delay={80}>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingVertical: 14 }}>
          <ScoreRing label="Outcome" value={1} weight="15%" color={result.correct ? C.accent : C.bad} delay={120} />
          <ScoreRing label="Calibration" value={calib} weight="45%" color={calib > 0.66 ? C.accent : calib > 0.45 ? C.warn : C.bad} delay={220} />
          <ScoreRing label="Reasoning" value={result.reasoning} weight="40%" color={result.reasoning >= 0.66 ? C.accent : result.reasoning >= 0.4 ? C.warn : C.bad} delay={320} />
        </View>
      </Rise>

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
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: isAns ? C.accent : "#3a2e1c", borderRadius: 8 }} />
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
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.07)", paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
        <Text style={{ fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontWeight: "700" }}>🎯 What you just practiced</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg, marginTop: 4 }}>{skill.title}</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 3 }}>{skill.line}</Text>
      </View>

      <Pressable onPress={share} style={{ marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: C.accent }}>
        <Text style={{ fontSize: 16, color: C.accentInk, fontFamily: F.bodySemi }}>Share result</Text>
      </Pressable>

      <NextSteps onNavigate={onNavigate} />

      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: C.muted2 }}>
        {result.crowdReal
          ? `Crowd split from ${result.crowdSampleSize} real answers today.`
          : "*Crowd split is illustrative until enough players have answered. Come back tomorrow for a fresh problem."}
      </Text>
      <Text style={{ marginTop: 8, textAlign: "center", fontSize: 10, lineHeight: 15, color: C.muted2 }}>
        Anonymized large-cap history (total return) — decision dates are balanced across up / flat / down outcomes, so the answer isn&apos;t just &ldquo;stocks go up.&rdquo;
      </Text>
    </ScrollView>
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

function AlreadyPlayed({ entry, streak, rating, onNavigate }: { entry: JournalEntry; streak: number; rating: number; onNavigate?: (t: NavDest) => void }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontSize: 12, letterSpacing: 2, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>You&apos;re done for today</Text>
      <Text style={{ fontSize: 72, color: C.accent, fontFamily: F.display, letterSpacing: -2, fontVariant: ["tabular-nums"], marginTop: 8 }}>{rating}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
        <Flame size={14} />
        <Text style={{ fontSize: 14, color: C.muted, fontFamily: F.body }}>{streak}-day streak</Text>
      </View>
      <View style={{ alignSelf: "stretch", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 24 }}>
        <Text style={{ fontSize: 14, color: C.fg, fontFamily: F.bodySemi }}>Today: {entry.company}</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, fontFamily: F.body }}>You called <Text style={{ color: C.fg, fontFamily: F.bodySemi }}>{entry.choiceLabel}</Text> at {Math.round(entry.confidence * 100)}% — {entry.correct ? "correct" : "missed"} · {entry.ratingDelta >= 0 ? "+" : ""}{entry.ratingDelta} rating.</Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: C.muted2, fontFamily: F.body }}>{entry.reasoningNotes}</Text>
      </View>
      <Countdown />
      <Text style={{ marginTop: 8, fontSize: 12, color: C.muted2, textAlign: "center", fontFamily: F.body }}>{utcResetLabel()}</Text>
      <View style={{ alignSelf: "stretch" }}>
        <NextSteps onNavigate={onNavigate} heading="While you wait" />
      </View>
    </ScrollView>
  );
}

/** Forward navigation after the daily — turns dead-ends into clear next actions. */
function NextSteps({ onNavigate, heading = "Keep sharpening" }: { onNavigate?: (t: NavDest) => void; heading?: string }) {
  if (!onNavigate) return null;
  const items: { dest: NavDest; emoji: string; label: string }[] = [
    { dest: "practice", emoji: "⚡", label: "Practice" },
    { dest: "duel", emoji: "⚔️", label: "Duel" },
    { dest: "journal", emoji: "📓", label: "Journal" },
  ];
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase", fontFamily: F.body, marginBottom: 10 }}>{heading}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map((it) => (
          <Pressable key={it.dest} onPress={() => { Haptics.selectionAsync(); onNavigate(it.dest); }}
            style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: "center", gap: 5 }}>
            <Text style={{ fontSize: 20 }}>{it.emoji}</Text>
            <Text style={{ fontSize: 12, color: C.fg, fontFamily: F.bodyMed }}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Countdown() {
  const [s, setS] = useState(secsToUtcMidnight());
  useEffect(() => { const t = setInterval(() => setS(secsToUtcMidnight()), 1000); return () => clearInterval(t); }, []);
  return <Text style={{ marginTop: 24, fontSize: 26, fontWeight: "700", color: C.fg, fontVariant: ["tabular-nums"] }}>{formatCountdown(s)}</Text>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>{children}</View>;
}

function p2(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(s: string) { return new Date(s + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
