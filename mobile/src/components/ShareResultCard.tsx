import React, { forwardRef } from "react";
import { Text, View } from "react-native";
import { C } from "../theme";

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
        <Text style={{ fontSize: 11, letterSpacing: 2, color: C.muted2, fontWeight: "600" }}>HINDSIGHT</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>{date}</Text>
        <Text style={{ marginTop: 16, fontSize: 44, letterSpacing: 4 }}>{row}</Text>
        <Text style={{ marginTop: 6, fontSize: 11, color: C.muted }}>outcome · calibration · reasoning</Text>
        <Text style={{ marginTop: 20, fontSize: 56, fontWeight: "800", color: deltaColor, fontVariant: ["tabular-nums"] }}>{rating}</Text>
        <Text style={{ marginTop: 4, fontSize: 15, fontWeight: "600", color: deltaColor, fontVariant: ["tabular-nums"] }}>
          {delta >= 0 ? "+" : ""}{delta} rating · 🔥 {streak}
        </Text>
        <Text style={{ marginTop: 14, fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 18 }}>
          Better-calibrated than I was yesterday.
        </Text>
        <Text style={{ marginTop: 18, fontSize: 13, fontWeight: "700", color: C.accent }}>play › hindsight.game</Text>
      </View>
    </View>
  );
});
