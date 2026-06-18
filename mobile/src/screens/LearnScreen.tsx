import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { COACH } from "../lib/coach";
import { LEARNING_UNITS, type LearningUnit, type LessonStep } from "../lib/learning/path";
import {
  completeStep,
  isUnitComplete,
  isUnitUnlocked,
  pathSummary,
  unitProgressPct,
} from "../lib/learning/progress";
import { useProfile } from "../lib/profile";
import { detectNewMilestones } from "../lib/game/milestones";
import { C, F } from "../theme";

export function LearnScreen({ onExit }: { onExit: () => void }) {
  const { profile, updateLearningProgress, markMilestonesSeen } = useProfile();
  const summary = pathSummary(profile);
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);

  function finishStep(unitId: string, stepId: string) {
    const { progress, unitJustCompleted } = completeStep(profile, unitId, stepId);
    updateLearningProgress(progress);
    if (unitJustCompleted) {
      const ms = detectNewMilestones(profile, { ...profile, learningProgress: progress }, { learningUnitCompleted: true });
      if (ms.length) {
        markMilestonesSeen(ms.map((m) => m.id));
        setMilestone(ms[0]!.title);
      }
    }
  }

  if (unit) {
    const step = unit.steps[stepIdx];
    if (!step) { setUnit(null); return null; }
    return (
      <LessonRunner
        unit={unit}
        step={step}
        stepNum={stepIdx + 1}
        total={unit.steps.length}
        onBack={() => (stepIdx > 0 ? setStepIdx((i) => i - 1) : setUnit(null))}
        onDone={() => {
          finishStep(unit.id, step.id);
          if (stepIdx >= unit.steps.length - 1) setUnit(null);
          else setStepIdx((i) => i + 1);
        }}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Pressable onPress={onExit}><Text style={{ color: C.muted, fontSize: 14 }}>← Practice</Text></Pressable>
      <Text style={{ marginTop: 12, fontSize: 22, color: C.fg, fontFamily: F.display, letterSpacing: -0.5 }}>Learn</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>{COACH.emoji} {COACH.name}&apos;s path — core skills before they cost you.</Text>

      {milestone && (
        <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.10)", padding: 14 }}>
          <Text style={{ fontWeight: "700", color: C.accent }}>🎉 {milestone}</Text>
          <Pressable onPress={() => setMilestone(null)}><Text style={{ marginTop: 6, fontSize: 12, color: C.muted }}>Dismiss</Text></Pressable>
        </View>
      )}

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginTop: 16 }}>
        <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase" }}>Progress</Text>
        <Text style={{ marginTop: 4, fontSize: 28, fontWeight: "800", color: C.accent }}>{summary.xp} XP</Text>
        <Text style={{ fontSize: 12, color: C.muted }}>{summary.completed}/{summary.total} units complete</Text>
      </View>

      <View style={{ gap: 12, marginTop: 16 }}>
        {LEARNING_UNITS.map((u) => {
          const unlocked = isUnitUnlocked(profile, u);
          const done = isUnitComplete(profile, u.id);
          return (
            <Pressable
              key={u.id}
              disabled={!unlocked}
              onPress={() => { Haptics.selectionAsync(); setUnit(u); setStepIdx(0); }}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, opacity: unlocked ? 1 : 0.45 }}
            >
              <Text style={{ fontSize: 24 }}>{u.emoji}</Text>
              <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "700", color: C.fg }}>{u.title}</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>{u.description}</Text>
              <Text style={{ marginTop: 8, fontSize: 11, color: C.muted2 }}>{done ? "✓ Complete" : unlocked ? `${unitProgressPct(profile, u)}%` : `Unlock at ${u.unlockAfterGraded} calls`}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function LessonRunner({ unit, step, stepNum, total, onDone, onBack }: {
  unit: LearningUnit; step: LessonStep; stepNum: number; total: number; onDone: () => void; onBack: () => void;
}) {
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [chips, setChips] = useState<string[]>([]);

  const ready = step.type !== "quiz" || quizPick !== null;
  const chipsOk = step.type !== "tap-chips" || chips.length >= 1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Pressable onPress={onBack}><Text style={{ color: C.muted }}>← Back</Text></Pressable>
      <Text style={{ marginTop: 12, fontSize: 11, color: C.muted2 }}>{unit.title} · {stepNum}/{total}</Text>
      <Text style={{ marginTop: 8, fontSize: 22, color: C.fg, fontFamily: F.display, letterSpacing: -0.5 }}>{step.title}</Text>
      <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 22, color: C.muted }}>{step.body}</Text>

      {step.quiz && (
        <View style={{ marginTop: 16, gap: 8 }}>
          <Text style={{ fontWeight: "700", color: C.fg }}>{step.quiz.question}</Text>
          {step.quiz.options.map((opt, i) => (
            <Pressable key={opt} onPress={() => setQuizPick(i)} style={{ borderRadius: 12, borderWidth: 1, borderColor: quizPick === i ? C.accent : C.border, padding: 12, backgroundColor: C.card }}>
              <Text style={{ color: C.fg, fontSize: 13 }}>{opt}</Text>
            </Pressable>
          ))}
          {quizPick !== null && <Text style={{ fontSize: 12, color: C.muted, lineHeight: 18 }}>{step.quiz.explain}</Text>}
        </View>
      )}

      {step.chipLabels && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {step.chipLabels.map((c) => {
            const on = chips.includes(c);
            return (
              <Pressable key={c} onPress={() => setChips((xs) => on ? xs.filter((x) => x !== c) : [...xs, c])}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? C.accent : C.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: on ? "rgba(240,197,96,0.14)" : C.card2 }}>
                <Text style={{ fontSize: 12, color: on ? C.accent : C.fg }}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable disabled={!ready || !chipsOk} onPress={onDone}
        style={{ marginTop: 28, borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent, opacity: !ready || !chipsOk ? 0.4 : 1 }}>
        <Text style={{ fontWeight: "700", color: C.accentInk }}>{stepNum === total ? "Complete unit" : "Continue"}</Text>
      </Pressable>
    </ScrollView>
  );
}
