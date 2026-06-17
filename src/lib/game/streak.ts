/**
 * Streak freeze — one forgiven miss per calendar week (UTC ISO week).
 */
export const FREEZES_PER_WEEK = 1;

export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function dayGap(prev: string, today: string): number {
  return Math.round(
    (new Date(today + "T00:00:00Z").getTime() - new Date(prev + "T00:00:00Z").getTime()) / 86400000,
  );
}

export interface StreakUpdate {
  streak: number;
  streakFreezes: number;
  freezeWeekKey: string;
  usedFreeze: boolean;
}

/** Compute streak + freeze bank after a daily play. */
export function computeStreakUpdate(args: {
  lastPlayedDate: string | null;
  currentStreak: number;
  playDate: string;
  streakFreezes: number;
  freezeWeekKey: string | null;
}): StreakUpdate {
  const wk = isoWeekKey(args.playDate);
  let freezes = args.streakFreezes;
  if (args.freezeWeekKey !== wk) freezes = FREEZES_PER_WEEK;

  let streak = 1;
  let usedFreeze = false;

  if (args.lastPlayedDate) {
    const gap = dayGap(args.lastPlayedDate, args.playDate);
    if (gap === 1) streak = args.currentStreak + 1;
    else if (gap === 0) streak = args.currentStreak;
    else if (gap === 2 && freezes > 0) {
      streak = args.currentStreak + 1;
      freezes -= 1;
      usedFreeze = true;
    } else if (gap > 1) streak = 1;
  }

  return { streak, streakFreezes: freezes, freezeWeekKey: wk, usedFreeze };
}
