import React, { useId, useMemo } from "react";
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { alignContinuation } from "../lib/game/chart";
import type { PricepointLite } from "../lib/game/types";
import { C, F } from "../theme";

const TRADING_DAYS_MONTH = 21;

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
}

/**
 * Anonymized (indexed-to-100) price chart, made legible: a relative time axis,
 * value gridlines, the start baseline, and a labeled "now" point. On the reveal
 * (continuation present) it also labels the real decision/resolve dates and the
 * forward move — anonymization no longer applies once the name is shown.
 */
export function SparkChart({
  series,
  continuation,
  width,
  height = 212,
  decisionDate,
  resolveDate,
  forwardReturnPct,
}: {
  series: PricepointLite[];
  continuation?: PricepointLite[];
  width: number;
  height?: number;
  decisionDate?: string;
  resolveDate?: string;
  forwardReturnPct?: number;
}) {
  const fillId = useId().replace(/:/g, "");
  const padT = 12;
  const padB = 26;
  const padL = 10;
  const padR = 38;
  const W = Math.max(280, width);
  const H = height;

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
  }, [series, alignedContinuation, W, H]);

  if (!m) {
    return (
      <Svg width={W} height={H}>
        <SvgText x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill={C.muted2} fontFamily={F.body}>
          Chart unavailable
        </SvgText>
      </Svg>
    );
  }

  const { x, y, min, max, decisionT, lastV, contLast, historyMonths, fwdMonths } = m;
  const decisionX = x(decisionT);
  const baselineInRange = min <= 100 && 100 <= max; // the indexed start value
  const gridVals = Array.from(new Set([max, (min + max) / 2, min].map((v) => Math.round(v))));

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* value gridlines + right-edge index labels */}
      {gridVals.map((v) => (
        <React.Fragment key={`g${v}`}>
          <Line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={C.border} strokeWidth={0.5} />
          <SvgText x={W - padR + 4} y={y(v) + 3} fontSize={9} fill={C.muted2} fontFamily={F.monoReg}>{v}</SvgText>
        </React.Fragment>
      ))}

      {/* indexed-to-100 start baseline */}
      {baselineInRange && (
        <>
          <Line x1={padL} y1={y(100)} x2={W - padR} y2={y(100)} stroke={C.muted2} strokeWidth={0.5} strokeDasharray="2,4" opacity={0.7} />
          <SvgText x={padL} y={y(100) - 3} fontSize={9} fill={C.muted2} fontFamily={F.body}>100 · start</SvgText>
        </>
      )}

      {/* area + history line */}
      <Path d={`${m.historyPath} L${decisionX.toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={`url(#${fillId})`} />
      <Path d={m.historyPath} fill="none" stroke={C.accent} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

      {/* decision divider */}
      <Line x1={decisionX} y1={padT} x2={decisionX} y2={H - padB} stroke={C.muted2} strokeWidth={1} strokeDasharray="3,4" opacity={m.contPath ? 0.8 : 0.4} />

      {/* forward continuation (reveal) */}
      {m.contPath && (
        <Path d={m.contPath} fill="none" stroke={m.up ? C.up : C.down} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* current ("now") point + value */}
      <Circle cx={decisionX} cy={y(lastV)} r={3.5} fill={C.fg} />
      {!m.contPath && (
        <SvgText x={decisionX - 5} y={y(lastV) - 6} textAnchor="end" fontSize={10} fill={C.fg} fontFamily={F.mono}>{Math.round(lastV)}</SvgText>
      )}

      {/* reveal end point + forward move */}
      {m.contPath && contLast && (
        <>
          <Circle cx={x(contLast.t)} cy={y(contLast.v)} r={3.5} fill={m.up ? C.up : C.down} />
          {typeof forwardReturnPct === "number" && (
            <SvgText x={x(contLast.t)} y={y(contLast.v) - 6} textAnchor="end" fontSize={10} fill={m.up ? C.up : C.down} fontFamily={F.mono}>
              {forwardReturnPct >= 0 ? "+" : ""}{forwardReturnPct}%
            </SvgText>
          )}
        </>
      )}

      {/* relative / real time axis */}
      <SvgText x={padL} y={H - 8} fontSize={9} fill={C.muted2} fontFamily={F.body}>{historyMonths}mo ago</SvgText>
      <SvgText x={decisionX} y={H - 8} textAnchor="middle" fontSize={9} fill={C.muted2} fontFamily={F.monoReg}>
        {decisionDate ? fmtMonth(decisionDate) : "now"}
      </SvgText>
      {m.contPath && (
        <SvgText x={W - padR} y={H - 8} textAnchor="end" fontSize={9} fill={C.muted2} fontFamily={F.monoReg}>
          {resolveDate ? fmtMonth(resolveDate) : `+${fwdMonths}mo`}
        </SvgText>
      )}
    </Svg>
  );
}
