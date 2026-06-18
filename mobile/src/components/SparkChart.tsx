import React, { useId, useMemo } from "react";
import Svg, { Path, Line, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { alignContinuation } from "../lib/game/chart";
import type { PricepointLite } from "../lib/game/types";
import { C } from "../theme";

/** Anonymized (indexed) price chart. Optionally draws the revealed continuation. */
export function SparkChart({
  series,
  continuation,
  width,
  height = 200,
}: {
  series: PricepointLite[];
  continuation?: PricepointLite[];
  width: number;
  height?: number;
}) {
  const fillId = useId().replace(/:/g, "");
  const pad = 10;
  const W = Math.max(280, width);
  const H = height;

  const alignedContinuation = useMemo(
    () => (continuation?.length ? alignContinuation(series, continuation) : undefined),
    [series, continuation],
  );

  const { historyPath, contPath, decisionX, minV, maxV, up } = useMemo(() => {
    if (!series.length) {
      return { historyPath: "", contPath: null, decisionX: pad, minV: 0, maxV: 0, up: true };
    }

    const all = [...series, ...(alignedContinuation ?? [])];
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
      contPath: alignedContinuation?.length ? toPath(alignedContinuation) : null,
      decisionX: x(series[series.length - 1]!.t),
      minV: min,
      maxV: max,
      up: alignedContinuation?.length
        ? alignedContinuation[alignedContinuation.length - 1]!.v >= series[series.length - 1]!.v
        : true,
    };
  }, [series, alignedContinuation, W, H]);

  if (!series.length) {
    return (
      <Svg width={W} height={H}>
        <SvgText x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill={C.muted2}>
          Chart unavailable
        </SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Path d={`${historyPath} L${decisionX},${H - pad} L${pad},${H - pad} Z`} fill={`url(#${fillId})`} />
      <Path d={historyPath} fill="none" stroke={C.accent} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

      <Line x1={decisionX} y1={pad} x2={decisionX} y2={H - pad} stroke={C.muted2} strokeWidth={1} strokeDasharray="3,4" opacity={contPath ? 0.7 : 0.35} />

      {contPath && (
        <Path d={contPath} fill="none" stroke={up ? C.up : C.down} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      )}

      <SvgText x={pad} y={pad + 8} fontSize={9} fill={C.muted2}>{maxV.toFixed(0)}</SvgText>
      <SvgText x={pad} y={H - pad - 2} fontSize={9} fill={C.muted2}>{minV.toFixed(0)}</SvgText>
    </Svg>
  );
}
