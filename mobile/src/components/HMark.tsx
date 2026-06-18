import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { C } from "../theme";

/** Hindsight logo mark — the "H as a chart across a time interval".
 *  Two dashed timestamp legs (call → resolve), a gold price line, two white dots.
 *  See docs/design.md §4 (canonical spec). Dashes/dots fatten at small sizes. */
export function HMark({ size = 28 }: { size?: number }) {
  const small = size <= 40;
  const sw = small ? 4 : 3;
  const dash = small ? "1,8" : "1,7";
  const lw = small ? 6.5 : 5.5;
  const r = small ? 5 : 4.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M16 12 L16 52" stroke={C.muted2} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dash} fill="none" />
      <Path d="M48 12 L48 52" stroke={C.muted2} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dash} fill="none" />
      <Path d="M16 35 L27 38 L37 26 L48 30" stroke={C.accent} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={16} cy={35} r={r} fill={C.fg} />
      <Circle cx={48} cy={30} r={r} fill={C.fg} />
    </Svg>
  );
}
