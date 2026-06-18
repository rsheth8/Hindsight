import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, F } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A single grading-axis ring (Outcome / Calibration / Reasoning). Animates its
 *  draw on mount; `delay` staggers the trio. See docs/design.md §5–§6. */
export function ScoreRing({
  label,
  value,
  weight,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  weight: string;
  color: string;
  delay?: number;
}) {
  const size = 48;
  const r = 18;
  const sw = 5;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: v, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, v, delay]);

  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={C.card2} strokeWidth={sw} fill="none" />
        <AnimatedCircle
          cx={cx}
          cy={cx}
          r={r}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <Text style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: F.bodyMed }}>{label}</Text>
      <Text style={{ fontSize: 10, color: C.muted2, fontFamily: F.monoReg }}>{weight}</Text>
    </View>
  );
}
