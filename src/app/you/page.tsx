"use client";
import { useProfile } from "@/lib/profile/useProfile";
import { summarize } from "@/lib/game/calibration";
import { isProvisional, START_RATING } from "@/lib/game/rating";
import { skillTrend, insights, type Insight } from "@/lib/game/progress";

export default function YouPage() {
  const p = useProfile();
  const calib = summarize(p.history.map((h) => ({ confidence: h.confidence, correct: h.correct })));
  const prov = isProvisional(p.gradedCount);
  const ready = calib.readiness;
  const ringPct = ready.score;
  const trend = skillTrend(p.history);
  const tips = insights(p.history);

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold">You</h1>

      <div className="card mt-4 px-5 py-6 text-center">
        <div className="text-[11px] uppercase tracking-widest text-[var(--muted-2)]">Investing rating</div>
        <div className="hero-num tnum mt-1 text-7xl" style={{ color: "var(--accent)" }}>
          {p.rating}{prov && <span className="text-3xl text-[var(--muted-2)]">?</span>}
        </div>
        <div className="mt-1 text-[12px] text-[var(--muted)]">
          {prov ? `Provisional — ${p.gradedCount}/10 graded calls` : `${p.rating - START_RATING >= 0 ? "+" : ""}${p.rating - START_RATING} since you started`}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="🔥 Streak" value={String(p.streak)} />
        <Stat label="🧊 Freezes" value={String(p.streakFreezes ?? 1)} />
        <Stat label="Best streak" value={String(p.longestStreak)} />
        <Stat label="Calls" value={String(p.gradedCount)} />
      </div>

      <div className="card mt-4 flex items-center gap-4 px-5 py-5">
        <Ring pct={ringPct} />
        <div>
          <div className="text-sm font-semibold">{ready.label}</div>
          <div className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{ready.blurb}</div>
        </div>
      </div>

      {calib.brier !== null && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Accuracy" value={`${Math.round((calib.accuracy ?? 0) * 100)}%`} />
          <Stat label="Brier (lower better)" value={(calib.brier ?? 0).toFixed(3)} />
          <Stat
            label={calib.overconfidence! >= 0 ? "Overconfidence" : "Underconfidence"}
            value={`${Math.abs(Math.round((calib.overconfidence ?? 0) * 100))}%`}
            tone={Math.abs(calib.overconfidence ?? 0) > 0.12 ? "warn" : undefined}
          />
          <Stat label="Resolved" value={String(calib.resolved)} />
        </div>
      )}

      <div className="card mt-4 px-5 py-4">
        <div className="text-sm font-semibold">Your trajectory</div>
        {trend.enough ? (
          <>
            <TrendLine series={trend.ratingSeries} />
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{trend.headline}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Delta label="Calibration" now={trend.calibNow} prev={trend.calibPrev} />
              <Delta label="Reasoning" now={trend.reasoningNow} prev={trend.reasoningPrev} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{trend.headline}</p>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold">Your edge &amp; your leaks</div>
        <div className="flex flex-col gap-2">
          {tips.map((t, i) => <InsightCard key={i} tip={t} />)}
        </div>
      </div>

      <div className="card mt-4 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">🎓 Real-money bridge</span>
          <span className="text-[11px] font-semibold" style={{ color: ringPct >= 75 ? "var(--accent)" : "var(--muted-2)" }}>
            {ringPct >= 75 ? "Unlocked" : "Locked"}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--card-2)]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (ringPct / 75) * 100)}%`, background: "var(--accent)" }} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
          Reach a 75 calibration score to unlock read-only coaching on your real trades. We don&apos;t take your trades — we make you good enough to deserve them.
        </p>
      </div>

      <p className="mt-5 text-center text-[11px] text-[var(--muted-2)]">Educational only · never buy/sell advice · your data stays on this device for now.</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="card px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="tnum mt-0.5 text-lg font-bold" style={{ color: tone === "warn" ? "var(--warn)" : "var(--fg)" }}>{value}</div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const off = C * (1 - pct / 100);
  const color = pct >= 75 ? "var(--accent)" : pct >= 25 ? "var(--warn)" : "var(--bad)";
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" className="shrink-0">
      <circle cx="39" cy="39" r={R} fill="none" stroke="var(--card-2)" strokeWidth="8" />
      <circle cx="39" cy="39" r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 39 39)" />
      <text x="39" y="44" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--fg)" className="tnum">{pct}</text>
    </svg>
  );
}

function TrendLine({ series }: { series: number[] }) {
  const W = 320;
  const H = 56;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const x = (i: number) => (series.length === 1 ? W / 2 : (i / (series.length - 1)) * W);
  const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 12);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const rising = series[series.length - 1] >= series[0];
  return (
    <div className="mt-3">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        <polyline points={pts} fill="none" stroke={rising ? "var(--accent)" : "var(--bad)"} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-[var(--muted-2)]">
        <span>first call</span>
        <span>now</span>
      </div>
    </div>
  );
}

function Delta({ label, now, prev }: { label: string; now: number; prev: number }) {
  const d = now - prev;
  const up = d >= 0;
  return (
    <div className="rounded-xl bg-[var(--card-2)] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="tnum text-lg font-bold">{now}</span>
        <span className="tnum text-xs font-bold" style={{ color: d === 0 ? "var(--muted-2)" : up ? "var(--accent)" : "var(--bad)" }}>
          {up ? "▲" : "▼"} {Math.abs(d)}
        </span>
      </div>
    </div>
  );
}

function InsightCard({ tip }: { tip: Insight }) {
  const accent = tip.kind === "edge" ? "var(--accent)" : tip.kind === "leak" ? "var(--warn)" : "var(--muted-2)";
  return (
    <div className="card flex gap-3 border-l-[3px] px-3.5 py-3" style={{ borderLeftColor: accent }}>
      <span className="text-lg">{tip.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold">{tip.title}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">{tip.text}</p>
      </div>
    </div>
  );
}
