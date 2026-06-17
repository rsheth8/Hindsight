"use client";
import { useMemo } from "react";
import type { PricepointLite } from "@/lib/game/types";

/** Lightweight SVG price chart. Anonymized (indexed) so the level gives nothing
 *  away. Optionally draws the revealed continuation in a second color. */
export function SparkChart({
  series,
  continuation,
  height = 200,
}: {
  series: PricepointLite[];
  continuation?: PricepointLite[];
  height?: number;
}) {
  const W = 360;
  const H = height;
  const pad = 10;

  const { historyPath, contPath, decisionX, minV, maxV } = useMemo(() => {
    const all = [...series, ...(continuation ?? [])];
    const vs = all.map((p) => p.v);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const span = max - min || 1;
    const ts = all.map((p) => p.t);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const tSpan = tMax - tMin || 1;

    const x = (t: number) => pad + ((t - tMin) / tSpan) * (W - pad * 2);
    const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
    const toPath = (pts: PricepointLite[]) =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

    return {
      historyPath: toPath(series),
      contPath: continuation && continuation.length ? toPath(continuation) : null,
      decisionX: x(series[series.length - 1].t),
      minV: min,
      maxV: max,
    };
  }, [series, continuation, H]);

  const up = continuation && continuation.length ? continuation[continuation.length - 1].v >= series[series.length - 1].v : true;
  const contColor = up ? "var(--up)" : "var(--down)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price history">
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* history area fill */}
      <path d={`${historyPath} L${decisionX},${H - pad} L${pad},${H - pad} Z`} fill="url(#fill)" />
      {/* history line */}
      <path d={historyPath} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

      {/* decision marker */}
      <line x1={decisionX} y1={pad} x2={decisionX} y2={H - pad} stroke="var(--muted-2)" strokeWidth="1" strokeDasharray="3 4" opacity={contPath ? 0.7 : 0.35} />

      {/* revealed continuation */}
      {contPath && (
        <path d={contPath} fill="none" stroke={contColor} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="animate-rise" />
      )}

      {/* min/max ticks (no absolute price — just relative) */}
      <text x={pad} y={pad + 8} fontSize="9" fill="var(--muted-2)">{maxV.toFixed(0)}</text>
      <text x={pad} y={H - pad - 2} fontSize="9" fill="var(--muted-2)">{minV.toFixed(0)}</text>
    </svg>
  );
}
