import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { useProfile, type JournalEntry } from "../lib/profile";
import { fetchBlindReplay, gradeSubmission } from "../lib/api";
import { buildReasoning, chipsForProblem, hasReasoning } from "../lib/game/reasoning-chips";
import { conceptsForProblem } from "../lib/game/concepts";
import { derivePracticeFocus, focusLabel } from "../lib/game/practice";
import { verdict as getVerdict, transferableSkill, verdictToneColor } from "../lib/game/progress";
import { COACH } from "../lib/coach";
import type { ConceptId } from "../lib/game/concept-types";
import type { ChoiceId, DailyProblem, GradeResult } from "../lib/game/types";
import type { Depth } from "../lib/grade-types";
import { C } from "../theme";

type Phase = "play" | "grading" | "reveal";

function newSeed() {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function BlindReplayScreen({ onExit }: { onExit: () => void }) {
  const { profile, recordPractice } = useProfile();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 440) - 40 - 8;
  const focus = useMemo(() => derivePracticeFocus(profile.history), [profile.history]);

  const [seed] = useState(newSeed);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("play");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [visibleDays, setVisibleDays] = useState(42);
  const [canAdvance, setCanAdvance] = useState(true);
  const [stepDays, setStepDays] = useState(7);

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [depth] = useState<Depth>("learn");
  const [result, setResult] = useState<GradeResult | null>(null);
  const ratingFrom = useRef(profile.rating);

  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  const load = useCallback(async (visible: number) => {
    setLoading(true);
    try {
      const data = await fetchBlindReplay(seed, focus, visible);
      setProblem(data.problem);
      setVisibleDays(data.visibleDays);
      setCanAdvance(data.canAdvance);
      setStepDays(data.stepDays);
    } catch {
      setError("Couldn't load blind replay. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [seed, focus, onExit]);

  React.useEffect(() => { load(0); }, [load]);

  async function advance() {
    if (!canAdvance) return;
    Haptics.selectionAsync();
    await load(visibleDays + stepDays);
  }

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
        blindReplay: { seed, focus, visibleDays },
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
        concepts: [...new Set<ConceptId>([...conceptsForProblem(problem), "reversal"])],
      };
      await recordPractice(entry);
      Haptics.notificationAsync(data.earned ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      setPhase("reveal");
    } catch {
      setError("Grading failed. Check your connection and try again.");
      setPhase("play");
    }
  }

  if (loading && !problem && !error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (error && !problem) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 }}>
        <Text style={{ fontSize: 36 }}>👁️</Text>
        <Text style={{ marginTop: 12, fontSize: 14, color: C.muted, textAlign: "center" }}>{error}</Text>
        <Pressable onPress={() => load(0)} style={{ marginTop: 16, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: C.accent }}>
          <Text style={{ fontWeight: "700", color: C.accentInk }}>Retry</Text>
        </Pressable>
        <Pressable onPress={onExit} style={{ marginTop: 12, padding: 8 }}>
          <Text style={{ color: C.muted }}>Back to Practice</Text>
        </Pressable>
      </View>
    );
  }

  if (!problem) return null;

  if (phase === "reveal" && result) {
    const v = getVerdict(result);
    const skill = transferableSkill(problem, result);
    const r = result.reveal;
    const up = r.forwardReturnPct >= 0;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {result.earned && <Confetti />}
        <Text style={{ fontSize: 11, color: C.muted2, textTransform: "uppercase" }}>Blind replay · {visibleDays} days seen</Text>
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: verdictToneColor(v.tone), paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: verdictToneColor(v.tone) }}>{v.badge}</Text>
          </View>
          <CountUp from={ratingFrom.current} to={result.newRating} style={{ fontSize: 56, fontWeight: "800", color: result.ratingDelta >= 0 ? C.accent : C.bad, marginTop: 8, fontVariant: ["tabular-nums"] }} />
          <Text style={{ marginTop: 2, fontSize: 14, color: result.ratingDelta >= 0 ? C.accent : C.bad, fontVariant: ["tabular-nums"] }}>
            {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} rating
          </Text>
          <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center" }}>{v.line}</Text>
        </View>
        <Text style={{ marginTop: 12, fontSize: 14, color: C.muted }}>{r.company} · {r.forwardReturnPct >= 0 ? "+" : ""}{r.forwardReturnPct}%</Text>
        <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
          <SparkChart series={problem.series} continuation={r.continuation} width={chartW} />
        </View>
        <Text style={{ marginTop: 12, fontSize: 13, color: C.fg }}>{COACH.emoji} {COACH.name}: {result.explanation}</Text>
        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(94,242,176,0.06)", paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontWeight: "700" }}>🎯 What you practiced</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg, marginTop: 4 }}>{skill.title}</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 3 }}>{skill.line}</Text>
        </View>
        <Pressable onPress={onExit} style={{ marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}>
          <Text style={{ fontWeight: "700", color: C.accentInk }}>Back to Practice</Text>
        </Pressable>
        <Text style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: C.muted2 }}>Educational only · never buy/sell advice.</Text>
      </ScrollView>
    );
  }

  const grading = phase === "grading";
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: C.muted2, textTransform: "uppercase" }}>Blind replay · {focusLabel(focus)}</Text>
        <Pressable onPress={onExit}><Text style={{ color: C.muted }}>Exit</Text></Pressable>
      </View>
      <Text style={{ marginTop: 8, fontSize: 15, fontWeight: "600", color: C.fg }}>Watch the chart unfold — then make your call.</Text>
      <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>{visibleDays} trading days visible</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, marginTop: 16, paddingVertical: 8 }}>
        <SparkChart series={problem.series} width={chartW} />
      </View>

      {canAdvance && (
        <Pressable onPress={advance} style={{ marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 }}>
          <Text style={{ fontWeight: "600", color: C.fg }}>Reveal next {stepDays} days</Text>
        </Pressable>
      )}

      <Text style={{ marginTop: 20, fontSize: 15, fontWeight: "600", color: C.fg }}>{problem.prompt}</Text>
      <View style={{ marginTop: 10, gap: 8 }}>
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <Pressable key={c.id} onPress={() => setChoice(c.id)}
              style={{ borderRadius: 14, borderWidth: 1, padding: 14, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.08)" : C.card }}>
              <Text style={{ color: C.fg }}>{c.id}. {c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 16 }}>
        <Text style={{ color: C.muted }}>Confidence: {confidence}%</Text>
        <Slider minimumValue={50} maximumValue={99} value={confidence} onValueChange={(v) => setConfidence(Math.round(v))} minimumTrackTintColor={C.accent} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {chips.map((chip) => {
          const sel = selectedChips.includes(chip.label);
          return (
            <Pressable key={chip.id} onPress={() => setSelectedChips((p) => sel ? p.filter((l) => l !== chip.label) : [...p, chip.label])}
              style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.12)" : C.card2 }}>
              <Text style={{ fontSize: 13, color: sel ? C.accent : C.fg }}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput value={customReasoning} onChangeText={setCustomReasoning} placeholder="Optional note…" placeholderTextColor={C.muted2}
        style={{ marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.fg, backgroundColor: C.card2 }} />

      {error && phase === "play" && (
        <Text style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: C.bad }}>{error}</Text>
      )}

      <Pressable disabled={!canSubmit || grading} onPress={submit}
        style={{ marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: !canSubmit || grading ? 0.4 : 1 }}>
        <Text style={{ fontWeight: "700", color: C.accentInk }}>{grading ? "Grading…" : "Lock in your call"}</Text>
      </Pressable>
    </ScrollView>
  );
}
