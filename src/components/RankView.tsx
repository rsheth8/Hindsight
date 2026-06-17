"use client";
import { useProfile } from "@/lib/profile/useProfile";
import { conceptMastery } from "@/lib/game/concepts";
import { personalBests, tierFromRating } from "@/lib/game/stats";

export function RankView() {
  const p = useProfile();
  const bests = personalBests(p.history, p.longestStreak);
  const tier = tierFromRating(p.rating);
  const tree = conceptMastery(p.history);
  const progress = Math.min(100, Math.max(0, Math.round(((p.rating - 1000) / (tier.next - 1000)) * 100)));

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold">Rank</h1>
      <p className="mt-1 text-[13px] text-[var(--muted)]">Your tier, personal bests, and skill tree — judgment, never returns.</p>

      <div className="card mt-5 px-5 py-5 text-center">
        <div className="text-4xl">{tier.emoji}</div>
        <div className="mt-2 text-xl font-bold">{tier.name}</div>
        <div className="tnum mt-1 text-sm text-[var(--muted)]">Rating {p.rating} · next tier at {tier.next}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--card-2)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Best label="This week cal." value={bests.thisWeekCalibration !== null ? String(bests.thisWeekCalibration) : "—"} sub={`${bests.thisWeekCalls} daily`} />
        <Best label="Best week cal." value={bests.bestWeekCalibration !== null ? String(bests.bestWeekCalibration) : "—"} />
        <Best label="Longest streak" value={String(bests.longestStreak)} />
        <Best label="Earned wins" value={String(bests.earnedWins)} />
        <Best label="Best day" value={`+${bests.bestRatingDelta}`} />
        <Best label="Streak freezes" value={String(p.streakFreezes ?? 1)} sub="per week" />
      </div>

      <h2 className="mt-6 text-sm font-semibold">Skill tree</h2>
      <p className="mt-1 text-[12px] text-[var(--muted)]">Concept mastery from your journal — sharp means consistent calibration + reasoning.</p>
      <div className="mt-3 flex flex-col gap-2">
        {tree.map((c) => (
          <div key={c.id} className="card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{c.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">{c.calls} calls · {c.level}</div>
                </div>
              </div>
              <div className="tnum text-lg font-bold" style={{ color: c.level === "sharp" ? "var(--accent)" : "var(--fg)" }}>{c.calls > 0 ? c.score : "—"}</div>
            </div>
            {c.calls > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--card-2)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${c.score}%`, opacity: c.level === "learning" ? 0.5 : 1 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-5 px-4 py-4 text-center">
        <div className="text-2xl">🏆</div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
          Global leagues + weekly cohorts unlock once enough players are climbing. Your local tree is already tracking real skill.
        </p>
      </div>
    </div>
  );
}

function Best({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="tnum mt-0.5 text-xl font-bold">{value}</div>
      {sub && <div className="text-[10px] text-[var(--muted-2)]">{sub}</div>}
    </div>
  );
}
