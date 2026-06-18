/**
 * Milestone detection — celebrate progress without manipulative engagement.
 */
import type { Profile } from "../profile";
import { isProvisional } from "./rating";
import { tierFromRating } from "./stats";
import { computeStreakUpdate } from "./streak";

export type MilestoneId =
  | "first-call"
  | "provisional-graduate"
  | "tier-calibrated"
  | "tier-sharp"
  | "tier-oracle"
  | "streak-7"
  | "streak-30"
  | "freeze-used"
  | "first-earned"
  | "first-learning-unit";

export interface Milestone {
  id: MilestoneId;
  emoji: string;
  title: string;
  line: string;
}

export const MILESTONE_COPY: Record<MilestoneId, Omit<Milestone, "id">> = {
  "first-call": {
    emoji: "🎬",
    title: "First call logged",
    line: "Every rating journey starts with one honest decision. Keep showing up.",
  },
  "provisional-graduate": {
    emoji: "📊",
    title: "Rating unlocked",
    line: "Ten graded calls in. Your rating is no longer provisional — thin reasoning can now cost you, so keep citing evidence.",
  },
  "tier-calibrated": {
    emoji: "🎯",
    title: "Calibrated tier",
    line: "You've climbed past coin-flip territory. Your confidence is starting to mean something.",
  },
  "tier-sharp": {
    emoji: "💎",
    title: "Sharp tier",
    line: "Sustained judgment + calibration. You're playing a different game than guessers now.",
  },
  "tier-oracle": {
    emoji: "🔮",
    title: "Oracle tier",
    line: "Top shelf. The luck filter barely applies to you — your process earns its keep.",
  },
  "streak-7": {
    emoji: "🔥",
    title: "7-day streak",
    line: "A week of daily reps. Consistency is how calibration compounds.",
  },
  "streak-30": {
    emoji: "🏅",
    title: "30-day streak",
    line: "A month of judgment training. Most people never get this far.",
  },
  "freeze-used": {
    emoji: "🧊",
    title: "Streak saved",
    line: "You missed a day but your freeze kept the streak alive. One per week — use it wisely.",
  },
  "first-earned": {
    emoji: "💎",
    title: "First earned win",
    line: "Right, well-reasoned, and properly confident. That's the rep that transfers to real investing.",
  },
  "first-learning-unit": {
    emoji: "🧭",
    title: "First lesson complete",
    line: "Hind's path is working. Theory + reps beat vibes every time.",
  },
};

export function milestone(id: MilestoneId): Milestone {
  return { id, ...MILESTONE_COPY[id] };
}

/** Which milestones are newly earned after a profile update? */
export function detectNewMilestones(
  before: Profile,
  after: Profile,
  extras?: { usedFreeze?: boolean; learningUnitCompleted?: boolean },
): Milestone[] {
  const seen = new Set(after.seenMilestones ?? []);
  const out: MilestoneId[] = [];

  const tryAdd = (id: MilestoneId, cond: boolean) => {
    if (cond && !seen.has(id)) out.push(id);
  };

  tryAdd("first-call", before.gradedCount === 0 && after.gradedCount >= 1);
  tryAdd("provisional-graduate", isProvisional(before.gradedCount) && !isProvisional(after.gradedCount));
  tryAdd("first-earned", !before.history.some((h) => h.earned) && after.history.some((h) => h.earned));

  const tierBefore = tierFromRating(before.rating).name;
  const tierAfter = tierFromRating(after.rating).name;
  tryAdd("tier-calibrated", tierBefore === "Coin-Flip" && tierAfter !== "Coin-Flip");
  tryAdd("tier-sharp", tierBefore !== "Sharp" && tierBefore !== "Oracle" && (tierAfter === "Sharp" || tierAfter === "Oracle"));
  tryAdd("tier-oracle", tierBefore !== "Oracle" && tierAfter === "Oracle");

  tryAdd("streak-7", before.streak < 7 && after.streak >= 7);
  tryAdd("streak-30", before.streak < 30 && after.streak >= 30);
  tryAdd("freeze-used", !!extras?.usedFreeze);
  tryAdd("first-learning-unit", !!extras?.learningUnitCompleted);

  return out.map(milestone);
}

/** Preview freeze usage when recording a daily (for milestone toast). */
export function streakUpdatePreview(p: Profile, playDate: string) {
  return computeStreakUpdate({
    lastPlayedDate: p.lastPlayedDate,
    currentStreak: p.streak,
    playDate,
    streakFreezes: p.streakFreezes ?? 1,
    freezeWeekKey: p.freezeWeekKey ?? null,
  });
}
