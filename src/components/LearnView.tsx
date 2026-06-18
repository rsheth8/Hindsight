"use client";
import { useState } from "react";
import { COACH } from "@/lib/coach";
import {
  LEARNING_UNITS,
  type LearningUnit,
  type LessonStep,
} from "@/lib/learning/path";
import {
  completeStep,
  isUnitComplete,
  isUnitUnlocked,
  pathSummary,
  unitProgressPct,
} from "@/lib/learning/progress";
import { useProfile } from "@/lib/profile/useProfile";
import { loadProfile, updateLearningProgress, markMilestonesSeen } from "@/lib/profile/store";
import { detectNewMilestones } from "@/lib/game/milestones";
import { MilestoneModal } from "./MilestoneModal";

type View = "hub" | "unit";

export function LearnView() {
  const profile = useProfile();
  const summary = pathSummary(profile);
  const [view, setView] = useState<View>("hub");
  const [activeUnit, setActiveUnit] = useState<LearningUnit | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [milestones, setMilestones] = useState<ReturnType<typeof detectNewMilestones>>([]);

  function openUnit(u: LearningUnit) {
    setActiveUnit(u);
    setStepIdx(0);
    setView("unit");
  }

  function finishStep(unitId: string, stepId: string) {
    const before = loadProfile();
    const { progress, unitJustCompleted } = completeStep(before, unitId, stepId);
    const after = updateLearningProgress(progress);
    if (unitJustCompleted) {
      const ms = detectNewMilestones(before, after, { learningUnitCompleted: true });
      if (ms.length) {
        markMilestonesSeen(ms.map((m) => m.id));
        setMilestones(ms);
      }
    }
  }

  if (view === "unit" && activeUnit) {
    const step = activeUnit.steps[stepIdx];
    if (!step) {
      setView("hub");
      return null;
    }
    const last = stepIdx === activeUnit.steps.length - 1;
    return (
      <LessonRunner
        unit={activeUnit}
        step={step}
        stepNum={stepIdx + 1}
        total={activeUnit.steps.length}
        onDone={() => {
          finishStep(activeUnit.id, step.id);
          if (last) setView("hub");
          else setStepIdx((i) => i + 1);
        }}
        onBack={() => (stepIdx > 0 ? setStepIdx((i) => i - 1) : setView("hub"))}
      />
    );
  }

  return (
    <div className="animate-rise">
      <MilestoneModal items={milestones} onDismiss={() => setMilestones([])} />
      <h1 className="text-xl font-bold">Learn</h1>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        {COACH.emoji} {COACH.name}&apos;s path — core skills before they cost you real money.
      </p>

      <div className="card mt-4 px-4 py-4">
        <div className="text-[11px] uppercase tracking-widest text-[var(--muted-2)]">Progress</div>
        <div className="mt-1 text-2xl font-bold text-[var(--accent)]">{summary.xp} XP</div>
        <div className="text-[12px] text-[var(--muted)]">
          {summary.completed}/{summary.total} units complete
          {summary.nextUnit ? ` · Next: ${summary.nextUnit.title}` : " · Path complete 🎉"}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {LEARNING_UNITS.map((u) => {
          const unlocked = isUnitUnlocked(profile, u);
          const done = isUnitComplete(profile, u.id);
          const pct = unitProgressPct(profile, u);
          return (
            <button
              key={u.id}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && openUnit(u)}
              className="card px-4 py-4 text-left disabled:opacity-40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl">{u.emoji}</div>
                  <div className="mt-1 font-semibold">{u.title}</div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">{u.description}</div>
                </div>
                <div className="text-right text-[11px] text-[var(--muted-2)]">
                  {done ? "✓ Done" : unlocked ? `${pct}%` : "🔒"}
                  <div className="mt-1">+{u.xp} XP</div>
                </div>
              </div>
              {!unlocked && (
                <div className="mt-2 text-[11px] text-[var(--muted-2)]">
                  Unlock: {u.unlockAfterGraded} graded calls
                  {u.unlockAfterUnit ? ` + complete prior unit` : ""}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonRunner({
  unit,
  step,
  stepNum,
  total,
  onDone,
  onBack,
}: {
  unit: LearningUnit;
  step: LessonStep;
  stepNum: number;
  total: number;
  onDone: () => void;
  onBack: () => void;
}) {
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [conf, setConf] = useState(70);
  const [chips, setChips] = useState<string[]>([]);

  const quizDone = step.type !== "quiz" || quizPick !== null;
  const confOk =
    step.type !== "confidence-demo" ||
    (step.demoTarget && conf / 100 >= step.demoTarget.low && conf / 100 <= step.demoTarget.high);
  const chipsOk = step.type !== "tap-chips" || chips.length >= 1;

  return (
    <div className="animate-rise">
      <button type="button" onClick={onBack} className="text-sm text-[var(--muted)]">← Back</button>
      <div className="mt-2 text-[11px] uppercase tracking-widest text-[var(--muted-2)]">
        {unit.emoji} {unit.title} · {stepNum}/{total}
      </div>
      <h2 className="mt-2 text-xl font-bold">{step.title}</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{step.body}</p>

      {step.type === "quiz" && step.quiz && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm font-semibold">{step.quiz.question}</p>
          {step.quiz.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => setQuizPick(i)}
              className="card px-3 py-3 text-left text-[13px]"
              style={{
                borderColor: quizPick === i ? (i === step.quiz!.correct ? "var(--accent)" : "var(--bad)") : undefined,
              }}
            >
              {opt}
            </button>
          ))}
          {quizPick !== null && (
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{step.quiz.explain}</p>
          )}
        </div>
      )}

      {step.type === "confidence-demo" && step.demoTarget && (
        <div className="mt-4">
          <div className="text-sm font-semibold">Your confidence: {conf}%</div>
          <input
            type="range"
            min={33}
            max={95}
            value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            {confOk
              ? "Good — murky setups deserve humble confidence."
              : "Try landing between 33–55% for a genuinely unclear chart."}
          </p>
        </div>
      )}

      {step.type === "tap-chips" && step.chipLabels && (
        <div className="mt-4 flex flex-wrap gap-2">
          {step.chipLabels.map((c) => {
            const on = chips.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setChips((xs) => (on ? xs.filter((x) => x !== c) : [...xs, c]))}
                className="rounded-full border px-3 py-1.5 text-[12px]"
                style={{
                  borderColor: on ? "var(--accent)" : "var(--border)",
                  background: on ? "rgba(240,197,96,0.12)" : "transparent",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={!quizDone || !confOk || !chipsOk}
        onClick={onDone}
        className="btn-accent mt-8 w-full disabled:opacity-40"
      >
        {stepNum === total ? "Complete unit" : "Continue"}
      </button>
    </div>
  );
}
