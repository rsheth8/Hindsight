/** UTC midnight reset helpers — daily puzzle + countdown share one clock. */

export function secsToUtcMidnight(now: Date = new Date()): number {
  const mid = new Date(now);
  mid.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000));
}

export function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** User-facing label for when the shared daily puzzle rolls. */
export function utcResetLabel(now: Date = new Date()): string {
  const mid = new Date(now);
  mid.setUTCHours(24, 0, 0, 0);
  const local = mid.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Next daily drops at ${local} your time (midnight UTC)`;
}
