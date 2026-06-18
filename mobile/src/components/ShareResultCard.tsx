import React, { forwardRef } from "react";
import { Text, View } from "react-native";
import { Flame } from "./Glyph";
import { C, F } from "../theme";

export interface ShareResultCardProps {
  date: string;
  rating: number;
  delta: number;
  streak: number;
  correct: boolean;
  brier: number;
  reasoning: number;
}

function sq(good: number, ok: number, v: number): string {
  return v >= good ? "🟩" : v >= ok ? "🟨" : "🟥";
}

export function shareRow(props: Pick<ShareResultCardProps, "correct" | "brier" | "reasoning">): string {
  const calib = 1 - props.brier;
  return `${props.correct ? "🟩" : "🟥"}${sq(0.8, 0.55, calib)}${sq(0.66, 0.4, props.reasoning)}`;
}

/** Off-screen-capturable share card for react-native-view-shot. */
export const ShareResultCard = forwardRef<View, ShareResultCardProps>(function ShareResultCard(
  { date, rating, delta, streak, correct, brier, reasoning },
  ref,
) {
  const row = shareRow({ correct, brier, reasoning });
  const deltaColor = delta >= 0 ? C.accent : C.bad;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: 360, backgroundColor: C.bg, padding: 20 }}
    >
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 28, alignItems: "center" }}>
        <Text style={{ fontSize: 19, fontFamily: F.display, letterSpacing: -0.4 }}>
          <Text style={{ color: C.fg }}>hind</Text><Text style={{ color: C.accent }}>sight</Text>
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: C.muted, fontFamily: F.body }}>{date}</Text>
        <Text style={{ marginTop: 16, fontSize: 44, letterSpacing: 4 }}>{row}</Text>
        <Text style={{ marginTop: 6, fontSize: 11, color: C.muted, fontFamily: F.body }}>outcome · calibration · reasoning</Text>
        <Text style={{ marginTop: 20, fontSize: 56, color: deltaColor, fontFamily: F.display, letterSpacing: -1.5, fontVariant: ["tabular-nums"] }}>{rating}</Text>
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 15, color: deltaColor, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{delta >= 0 ? "+" : ""}{delta} rating</Text>
          <Flame size={15} />
          <Text style={{ fontSize: 15, color: C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{streak}</Text>
        </View>
        <Text style={{ marginTop: 14, fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 18, fontFamily: F.body }}>
          Better-calibrated than I was yesterday.
        </Text>
        <Text style={{ marginTop: 18, fontSize: 13, color: C.accent, fontFamily: F.bodySemi }}>play › hindsight.game</Text>
      </View>
    </View>
  );
});
