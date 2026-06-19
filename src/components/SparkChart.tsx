"use client";
import { useId, useMemo } from "react";
import { alignContinuation } from "@/lib/game/chart";
import type { PricepointLite } from "@/lib/game/types";

const TRADING_DAYS_MONTH = 21;

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** SVG price chart. Anonymized (indexed-to-100) so the level gives nothing away,
 *  but made legible with a relative time axis, value gridlines, the start
 *  baseline, and a labeled "now" point. On the reveal it labels the real
 *  decision/resolve dates and the forward move. */
export function SparkChart({
  series,
  continuation,
  height = 212,
  decisionDate,
  resolveDate,
  forwardReturnPct,
}: {
  series: PricepointLite[];
  continuation?: PricepointLite[];
  height?: number;
  decisionDate?: string;
  resolveDate?: string;
  forwardReturnPct?: number;
}) {
  const fillId = useId().replace(/:/g, "");
  const W = 360;
  const H = height;
  const padT = 12;
  const padB = 26;
  const padL = 10;
  const padR = 38;

  const alignedContinuation = useMemo(
    () => (continuation?.length ? alignContinuation(series, continuation) : undefined),
    [series, continuation],
  );

  const m = useMemo(() => {
    if (!series.length) return null;
    const all = [...series, ...(alignedContinuation ?? [])];
    const vs = all.map((p) => p.v);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const span = max - min || 1;
    const ts = all.map((p) => p.t);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const tSpan = tMax - tMin || 1;
    const x = (t: number) => padL + ((t - tMin) / tSpan) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
    const toPath = (pts: PricepointLite[]) =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    const decisionT = series[series.length - 1]!.t;
    const lastV = series[series.length - 1]!.v;
    const contLast = alignedContinuation?.length ? alignedContinuation[alignedContinuation.length - 1]! : null;
    const historyMonths = Math.max(1, Math.round((decisionT - series[0]!.t) / TRADING_DAYS_MONTH));
    const fwdMonths = contLast ? Math.max(1, Math.round((contLast.t - decisionT) / TRADING_DAYS_MONTH)) : 0;
    return {
      historyPath: toPath(series),
      contPath: alignedContinuation?.length ? toPath(alignedContinuation) : null,
      x, y, min, max, decisionT, lastV, contLast, historyMonths, fwdMonths,
      up: contLast ? contLast.v >= lastV : true,
    };
  }, [series, alignedContinuation, H]);

  if (!m) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price history unavailable">
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--muted-2)">Chart unavailable</text>
      </svg>
    );
  }

  const { x, y, min, max, decisionT, lastV, contLast, historyMonths, fwdMonths } = m;
  const decisionX = x(decisionT);
  const contColor = m.up ? "var(--up)" : "var(--down)";
  const baselineInRange = min <= 100 && 100 <= max;
  const gridVals = Array.from(new Set([max, (min + max) / 2, min].map((v) => Math.round(v))));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price history">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridVals.map((v) => (
        <g key={`g${v}`}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--border)" strokeWidth="0.5" />
          <text x={W - padR + 4} y={y(v) + 3} fontSize="9" fill="var(--muted-2)">{v}</text>
        </g>
      ))}

      {baselineInRange && (
        <>
          <line x1={padL} y1={y(100)} x2={W - padR} y2={y(100)} stroke="var(--muted-2)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.7" />
          <text x={padL} y={y(100) - 3} fontSize="9" fill="var(--muted-2)">100 · start</text>
        </>
      )}

      <path d={`${m.historyPath} L${decisionX.toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={`url(#${fillId})`} />
      <path d={m.historyPath} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

      <line x1={decisionX} y1={padT} x2={decisionX} y2={H - padB} stroke="var(--muted-2)" strokeWidth="1" strokeDasharray="3 4" opacity={m.contPath ? 0.8 : 0.4} />

      {m.contPath && (
        <path d={m.contPath} fill="none" stroke={contColor} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="animate-rise" />
      )}

      <circle cx={decisionX} cy={y(lastV)} r="3.5" fill="var(--fg)" />
      {!m.contPath && (
        <text x={decisionX - 5} y={y(lastV) - 6} textAnchor="end" fontSize="10" fill="var(--fg)">{Math.round(lastV)}</text>
      )}

      {m.contPath && contLast && (
        <>
          <circle cx={x(contLast.t)} cy={y(contLast.v)} r="3.5" fill={contColor} />
          {typeof forwardReturnPct === "number" && (
            <text x={x(contLast.t)} y={y(contLast.v) - 6} textAnchor="end" fontSize="10" fill={contColor}>
              {forwardReturnPct >= 0 ? "+" : ""}{forwardReturnPct}%
            </text>
          )}
        </>
      )}

      <text x={padL} y={H - 8} fontSize="9" fill="var(--muted-2)">{historyMonths}mo ago</text>
      <text x={decisionX} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted-2)">{decisionDate ? fmtMonth(decisionDate) : "now"}</text>
      {m.contPath && (
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize="9" fill="var(--muted-2)">{resolveDate ? fmtMonth(resolveDate) : `+${fwdMonths}mo`}</text>
      )}
    </svg>
  );
}
