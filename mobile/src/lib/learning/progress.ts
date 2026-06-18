/**
 * Learning path progress — pure functions over Profile.learningProgress.
 */
import type { Profile } from "../profile";
import { LEARNING_UNITS, stepKey, type LearningUnit } from "./path";

export interface LearningProgress {
  completedSteps: string[];
  completedUnits: string[];
  xp: number;
  lastStepAt: string | null;
}

export function emptyLearningProgress(): LearningProgress {
  return { completedSteps: [], completedUnits: [], xp: 0, lastStepAt: null };
}

export function learningProgressOf(p: Profile): LearningProgress {
  return p.learningProgress ?? emptyLearningProgress();
}

export function isUnitUnlocked(p: Profile, unit: LearningUnit): boolean {
  if (p.gradedCount < unit.unlockAfterGraded) return false;
  if (unit.unlockAfterUnit && !learningProgressOf(p).completedUnits.includes(unit.unlockAfterUnit)) {
    return false;
  }
  return true;
}

export function isStepComplete(p: Profile, unitId: string, stepId: string): boolean {
  return learningProgressOf(p).completedSteps.includes(stepKey(unitId, stepId));
}

export function isUnitComplete(p: Profile, unitId: string): boolean {
  return learningProgressOf(p).completedUnits.includes(unitId);
}

export function unitProgressPct(p: Profile, unit: LearningUnit): number {
  if (unit.steps.length === 0) return 0;
  const done = unit.steps.filter((s) => isStepComplete(p, unit.id, s.id)).length;
  return Math.round((done / unit.steps.length) * 100);
}

export function completeStep(
  p: Profile,
  unitId: string,
  stepId: string,
): { progress: LearningProgress; unitJustCompleted: boolean } {
  const unit = LEARNING_UNITS.find((u) => u.id === unitId);
  if (!unit) return { progress: learningProgressOf(p), unitJustCompleted: false };

  const prev = learningProgressOf(p);
  const key = stepKey(unitId, stepId);
  if (prev.completedSteps.includes(key)) {
    return { progress: prev, unitJustCompleted: false };
  }

  const completedSteps = [...prev.completedSteps, key];
  const allDone = unit.steps.every((s) => completedSteps.includes(stepKey(unitId, s.id)));
  const unitJustCompleted = allDone && !prev.completedUnits.includes(unitId);

  const completedUnits = unitJustCompleted
    ? [...prev.completedUnits, unitId]
    : prev.completedUnits;

  const progress: LearningProgress = {
    completedSteps,
    completedUnits,
    xp: prev.xp + (unitJustCompleted ? unit.xp : 10),
    lastStepAt: new Date().toISOString(),
  };

  return { progress, unitJustCompleted };
}

export function pathSummary(p: Profile): { completed: number; total: number; xp: number; nextUnit: LearningUnit | null } {
  const prog = learningProgressOf(p);
  const total = LEARNING_UNITS.length;
  const completed = prog.completedUnits.length;
  const nextUnit = LEARNING_UNITS.find((u) => !prog.completedUnits.includes(u.id) && isUnitUnlocked(p, u)) ?? null;
  return { completed, total, xp: prog.xp, nextUnit };
}
