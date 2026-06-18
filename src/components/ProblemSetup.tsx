"use client";
import { SparkChart } from "./SparkChart";
import type { DailyProblem } from "@/lib/game/types";

export function ProblemSetup({ problem }: { problem: DailyProblem }) {
  if (problem.type === "spot-the-flaw" && problem.flawSetup) {
    const f = problem.flawSetup;
    return (
      <div className="card mt-4 overflow-hidden">
        <div className="px-4 pt-4">
          <div className="text-[11px] text-[var(--muted-2)]">Someone&apos;s thesis</div>
          <p className="mt-2 text-[15px] leading-relaxed italic text-[var(--fg)]/90">&ldquo;{f.thesis}&rdquo;</p>
          <div className="mt-2 text-[12px] text-[var(--muted)]">{f.chartCaption}</div>
        </div>
        <div className="px-2 pt-2 pb-2">
          <SparkChart series={problem.series} />
        </div>
      </div>
    );
  }

  if (problem.type === "options-greeks" && problem.optionsSetup) {
    const o = problem.optionsSetup;
    return (
      <div className="card mt-4 overflow-hidden">
        <div className="px-4 pt-4">
          <div className="text-[11px] text-[var(--muted-2)]">Position</div>
          <div className="text-xl font-bold">{o.positionLabel}</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            ${o.underlying} underlying · ${o.strike} strike · {o.dte} DTE · IV {o.iv}%
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px bg-[var(--border)]">
          {(
            [
              ["Δ", o.greeks.delta.toFixed(2)],
              ["Γ", o.greeks.gamma.toFixed(2)],
              ["Θ", o.greeks.theta.toFixed(2)],
              ["ν", o.greeks.vega.toFixed(2)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-[var(--card)] px-3 py-3 text-center">
              <div className="text-[11px] text-[var(--muted)]">{label}</div>
              <div className="tnum text-base font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (problem.type === "futures-basics" && problem.futuresSetup) {
    const f = problem.futuresSetup;
    return (
      <div className="card mt-4 overflow-hidden">
        <div className="px-4 pt-4">
          <div className="text-[11px] text-[var(--muted-2)]">Instrument</div>
          <div className="text-lg font-bold">{f.instrument}</div>
          <div className="mt-2 text-[15px] font-semibold">{f.positionLabel}</div>
          <div className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{f.context}</div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
          <div className="bg-[var(--card)] px-4 py-3">
            <div className="text-[11px] text-[var(--muted)]">Notional</div>
            <div className="text-[14px] font-semibold">{f.notional}</div>
          </div>
          <div className="bg-[var(--card)] px-4 py-3">
            <div className="text-[11px] text-[var(--muted)]">Mode</div>
            <div className="text-[14px] font-semibold">Futures drill</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4 overflow-hidden">
      <div className="px-2 pt-2">
        <SparkChart series={problem.series} />
      </div>
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        {problem.metrics.map((m) => (
          <div key={m.label} className="bg-[var(--card)] px-4 py-2.5">
            <div className="text-[11px] text-[var(--muted)]">{m.label}</div>
            <div className="tnum text-base font-semibold">{m.value}</div>
          </div>
        ))}
      </div>
      {problem.type === "calibration-bet" && problem.baseRateHint && (
        <div className="border-t border-[var(--border)] px-4 py-3 text-[13px] text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">Base rate: </span>
          {problem.baseRateHint}
        </div>
      )}
    </div>
  );
}
