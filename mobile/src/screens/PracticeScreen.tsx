import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { SparkChart } from "../components/SparkChart";
import { CountUp } from "../components/CountUp";
import { Confetti } from "../components/Confetti";
import { ProblemSetup } from "../components/ProblemSetup";
import { ScoreRing } from "../components/ScoreRing";
import { CalibrationBar, calibrationPosition } from "../components/CalibrationBar";
import { useProfile, type JournalEntry } from "../lib/profile";
import { fetchPractice, fetchSpecialProblem, gradeSubmission } from "../lib/api";
import { getPreferredDepth } from "../lib/prefs";
import { isProvisional } from "../lib/game/rating";
import { buildReasoning, chipsForProblem, hasReasoning } from "../lib/game/reasoning-chips";
import { conceptsForProblem } from "../lib/game/concepts";
import {
  derivePracticeFocus,
  focusLabel,
  practiceFocusBlurb,
  type PracticeFocus,
} from "../lib/game/practice";
import { verdict as getVerdict, transferableSkill, verdictToneColor } from "../lib/game/progress";
import { SPECIAL_DRILLS, isSpecialDrill, problemTypeLabel, specialRevealLine } from "../lib/game/problem-meta";
import { COACH } from "../lib/coach";
import type { ChoiceId, DailyProblem, GradeResult, ProblemType } from "../lib/game/types";
import type { Depth } from "../lib/grade-types";
import { C, F } from "../theme";

type Phase = "hub" | "loading" | "commit" | "grading" | "reveal";

function newSeed() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PracticeScreen({ onBlindReplay, onLearn }: { onBlindReplay?: () => void; onLearn?: () => void }) {
  const { profile, ready, recordPractice } = useProfile();
  const { width } = useWindowDimensions();
  const chartW = Math.max(280, Math.min(width, 440) - 48);

  const focus = useMemo(() => derivePracticeFocus(profile.history), [profile.history]);
  const [phase, setPhase] = useState<Phase>("hub");
  const [seed, setSeed] = useState(newSeed);
  const [specialType, setSpecialType] = useState<ProblemType | null>(null);
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [showCustomReasoning, setShowCustomReasoning] = useState(false);
  const [depth, setDepth] = useState<Depth>("learn");

  const [result, setResult] = useState<GradeResult | null>(null);
  const [ratingFrom, setRatingFrom] = useState(profile.rating);

  useEffect(() => { getPreferredDepth().then((d) => { if (d) setDepth(d); }); }, []);

  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  const resetRound = useCallback(() => {
    setChoice(null);
    setConfidence(70);
    setSelectedChips([]);
    setCustomReasoning("");
    setShowCustomReasoning(false);
    setResult(null);
    setError(null);
  }, []);

  const loadProblem = useCallback((nextSeed: string) => {
    resetRound();
    setSpecialType(null);
    setSeed(nextSeed);
    setPhase("loading");
    fetchPractice(nextSeed, focus)
      .then((p) => {
        setProblem(p);
        setPhase("commit");
      })
      .catch(() => {
        setError("Couldn't load a practice problem. Check your connection.");
        setPhase("hub");
      });
  }, [focus, resetRound]);

  const loadSpecial = useCallback((type: ProblemType) => {
    resetRound();
    const nextSeed = newSeed();
    setSpecialType(type);
    setSeed(nextSeed);
    setPhase("loading");
    fetchSpecialProblem(type, nextSeed)
      .then((p) => { setProblem(p); setPhase("commit"); })
      .catch(() => { setError("Couldn't load drill."); setPhase("hub"); });
  }, [resetRound]);

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
        ...(specialType ? { special: { type: specialType, seed } } : { practice: { seed, focus } }),
      });
      setResult(data);
      const entry: JournalEntry = {
        date: new Date().toISOString().slice(0, 10),
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
      await recordPractice(entry);
      Haptics.notificationAsync(data.earned ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      setPhase("reveal");
    } catch {
      setError("Grading failed. Try again.");
      setPhase("commit");
    }
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (phase === "hub") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, color: C.fg, fontFamily: F.display, letterSpacing: -0.5 }}>Practice</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>Binge mode — no streak pressure. Rating still moves; daily streak doesn&apos;t.</Text>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.accent, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontWeight: "700" }}>🎯 Targeting</Text>
          <Text style={{ marginTop: 6, fontSize: 17, fontWeight: "700", color: C.fg }}>{focusLabel(focus)}</Text>
          <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: C.muted }}>{practiceFocusBlurb(focus)}</Text>
        </View>

        <Pressable
          onPress={() => loadProblem(newSeed())}
          style={{ marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}
        >
          <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: C.accentInk }}>Read the setup</Text>
        </Pressable>

        {onBlindReplay && (
          <Pressable onPress={onBlindReplay} style={{ marginTop: 10, borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: C.fg }}>👁️ Blind replay</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Reveal the chart week-by-week, then call it.</Text>
          </Pressable>
        )}

        <Text style={{ marginTop: 24, fontSize: 14, fontWeight: "700", color: C.fg }}>Special drills</Text>
        {SPECIAL_DRILLS.map((d, i) => (
          <Pressable key={d.type} onPress={() => loadSpecial(d.type)} style={{ marginTop: i === 0 ? 10 : 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
            <Text style={{ fontWeight: "700", color: C.fg }}>{d.emoji} {d.label}</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>{d.sub}</Text>
          </Pressable>
        ))}

        {onLearn && (
          <Pressable onPress={onLearn} style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.07)" }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: C.fg }}>🧭 Hind&apos;s learning path</Text>
          </Pressable>
        )}

        {error && <Text style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: C.bad }}>{error}</Text>}

        <Text style={{ marginTop: 28, textAlign: "center", fontSize: 11, color: C.muted2 }}>
          Educational only · never buy/sell advice.
        </Text>
      </ScrollView>
    );
  }

  if (phase === "loading" || !problem) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (phase === "reveal" && result && choice) {
    const v = getVerdict(result);
    const skill = transferableSkill(problem, result);
    const r = result.reveal;
    const up = r.forwardReturnPct >= 0;
    const calib = 1 - result.brier;
    const playerLabel = problem.choices.find((c) => c.id === choice)!.label;
    const correctLabel = problem.choices.find((c) => c.id === result.answer)!.label;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {result.earned && <Confetti />}
        <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>Practice · no streak</Text>

        <View style={{ alignItems: "center", marginTop: 10 }}>
          <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: verdictToneColor(v.tone), paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14 }}>
            <Text style={{ fontSize: 12, letterSpacing: 1, color: verdictToneColor(v.tone), fontFamily: F.mono }}>{v.badge}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 10, letterSpacing: 0.8, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>How sure</Text>
              <Text style={{ fontSize: 44, color: C.fg, fontFamily: F.display, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{confidence}<Text style={{ fontSize: 20 }}>%</Text></Text>
            </View>
            <Text style={{ fontSize: 22, color: C.muted2, paddingBottom: 9, fontFamily: F.body }}>→</Text>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 10, letterSpacing: 0.8, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>How right</Text>
              <Text style={{ fontSize: 44, color: C.accent, fontFamily: F.display, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{Math.round(calib * 100)}<Text style={{ fontSize: 20 }}>%</Text></Text>
            </View>
          </View>
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <CalibrationBar position={calibrationPosition(confidence / 100, result.correct)} width={chartW} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 14 }}>
            <CountUp from={ratingFrom} to={result.newRating} style={{ fontSize: 24, color: C.fg, fontFamily: F.display, fontVariant: ["tabular-nums"] }} />
            <Text style={{ fontSize: 13, color: result.ratingDelta >= 0 ? C.accent : C.bad, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} rating</Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center", fontFamily: F.body }}>{v.line}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingVertical: 14 }}>
          <ScoreRing label="Outcome" value={1} weight="15%" color={result.correct ? C.accent : C.bad} delay={120} />
          <ScoreRing label="Calibration" value={calib} weight="45%" color={calib > 0.66 ? C.accent : calib > 0.45 ? C.warn : C.bad} delay={220} />
          <ScoreRing label="Reasoning" value={result.reasoning} weight="40%" color={result.reasoning >= 0.66 ? C.accent : result.reasoning >= 0.4 ? C.warn : C.bad} delay={320} />
        </View>

        {!result.correct && (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.warn, borderLeftWidth: 3, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
            <Text style={{ fontSize: 11, letterSpacing: 1, color: C.warn, textTransform: "uppercase", fontWeight: "700" }}>What you missed</Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: C.fg }}>
              You called <Text style={{ fontWeight: "700" }}>{playerLabel}</Text> at {confidence}% confidence.
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: C.muted }}>
              {isSpecialDrill(problem.type)
                ? specialRevealLine(problem, correctLabel)
                : (
                  <>
                    Correct answer: <Text style={{ fontWeight: "700", color: C.accent }}>{correctLabel}</Text>
                    {" "}— the stock moved {up ? "+" : ""}{r.forwardReturnPct}% over {problem.horizonLabel}.
                  </>
                )}
            </Text>
          </View>
        )}

        {isSpecialDrill(problem.type) ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
            <Text style={{ fontSize: 11, color: C.muted2 }}>{problemTypeLabel(problem.type)}</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.fg, marginTop: 4 }}>{r.company}</Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: C.muted }}>{specialRevealLine(problem, correctLabel)}</Text>
          </View>
        ) : (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
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
            <SparkChart series={problem.series} continuation={r.continuation} width={chartW} decisionDate={r.decisionDate} resolveDate={r.resolveDate} forwardReturnPct={r.forwardReturnPct} />
          </View>
          <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 11, color: C.muted2 }}>
            correct: <Text style={{ fontWeight: "700", color: C.fg }}>{correctLabel}</Text>
          </Text>
        </View>
        )}

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>{COACH.emoji} {COACH.name}&apos;s read</Text>
            <DepthToggle depth={depth} setDepth={setDepth} />
          </View>
          <Text style={{ fontSize: 14, lineHeight: 21, color: C.fg }}>{result.explanation}</Text>
          <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: C.card2, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, color: C.muted }}>
              <Text style={{ fontWeight: "700", color: C.fg }}>On your reasoning: </Text>
              {result.reasoningNotes}
            </Text>
          </View>
        </View>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.07)", paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontWeight: "700" }}>🎯 What you practiced</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg, marginTop: 4 }}>{skill.title}</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 3 }}>{skill.line}</Text>
        </View>

        <Pressable onPress={() => (specialType ? loadSpecial(specialType) : loadProblem(newSeed()))} style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: C.accentInk }}>Another one</Text>
        </Pressable>
        <Pressable onPress={() => { resetRound(); setPhase("hub"); }} style={{ marginTop: 10, paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: C.muted }}>Back to Practice hub</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const grading = phase === "grading";
  const drillLabel = specialType ? problemTypeLabel(specialType) : focusLabel(focus);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase" }}>Practice · {drillLabel}</Text>
          <Text style={{ fontSize: 13, color: C.muted }}>No streak · rating {isProvisional(profile.gradedCount) ? `${profile.rating}?` : profile.rating}</Text>
        </View>
        <Pressable onPress={() => { resetRound(); setPhase("hub"); }}>
          <Text style={{ fontSize: 13, color: C.muted }}>Exit</Text>
        </Pressable>
      </View>

      <ProblemSetup problem={problem} chartW={chartW} />

      <Text style={{ marginTop: 20, fontSize: 16, color: C.fg, fontFamily: F.bodySemi }}>{problem.prompt}</Text>

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
          <Text style={{ fontSize: 14, color: C.muted }}>How sure are you?</Text>
          <Text style={{ fontSize: 26, fontFamily: F.display, color: C.accent, fontVariant: ["tabular-nums"] }}>{confidence}%</Text>
        </View>
        <Slider style={{ marginTop: 10 }} minimumValue={33} maximumValue={99} step={1} value={confidence}
          onValueChange={(v) => setConfidence(Math.round(v))} minimumTrackTintColor={C.accent} maximumTrackTintColor={C.card2} thumbTintColor={C.fg} />
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.fg }}>What are you seeing?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {chips.map((chip) => {
            const sel = selectedChips.includes(chip.label);
            return (
              <Pressable key={chip.id} onPress={() => setSelectedChips((prev) => sel ? prev.filter((l) => l !== chip.label) : [...prev, chip.label])}
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
          <TextInput value={customReasoning} onChangeText={setCustomReasoning} multiline placeholder="Optional"
            placeholderTextColor={C.muted2}
            style={{ marginTop: 12, minHeight: 72, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.fg, textAlignVertical: "top" }} />
        )}
      </View>

      <Pressable disabled={!canSubmit || grading} onPress={submit}
        style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: !canSubmit || grading ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: C.accentInk }}>{grading ? "Grading…" : "Lock in your call"}</Text>
      </Pressable>
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
