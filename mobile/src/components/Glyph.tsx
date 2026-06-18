import React from "react";
import Svg, { Path, Line, G } from "react-native-svg";
import { C } from "../theme";

/** Custom streak flame — replaces the 🔥 emoji. Two-tone: warm amber body, gold core. */
export function Flame({ size = 14, color = C.warn, core = C.accent }: { size?: number; color?: string; core?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 23 C7 23 4 19.5 4 15 C4 10 9 7 8.5 2.5 C11 4 12 6 12 8 C13 5 14 4 15 3 C15 7 20 9 20 15 C20 19.5 17 23 12 23 Z"
        fill={color}
      />
      <Path
        d="M12 21 C9.6 21 8 19.2 8 16.8 C8 14.3 10.4 12.8 10.4 10.3 C11.4 11.3 12 12.6 12 14 C12.8 12.3 13.4 11.7 14 11.2 C14 13.1 16 14.4 16 16.8 C16 19.2 14.4 21 12 21 Z"
        fill={core}
      />
    </Svg>
  );
}

/** Custom freeze snowflake — replaces the 🧊 emoji. Cool-blue (the "too timid" hue).
 *  Six identical arms (a spoke + Y-fork) rotated 60° apart for true snowflake symmetry. */
export function Freeze({ size = 14, color = C.cool }: { size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <G key={deg} transform={`rotate(${deg}, 12, 12)`}>
          <Line x1={12} y1={12} x2={12} y2={3} {...p} />
          <Line x1={12} y1={6.2} x2={9.9} y2={4.1} {...p} />
          <Line x1={12} y1={6.2} x2={14.1} y2={4.1} {...p} />
        </G>
      ))}
    </Svg>
  );
}
