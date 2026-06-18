import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { C, F } from "../theme";

/** Calibration "temperature" bar: cool (too timid) → gold (calibrated) → hot (too cocky).
 *  `position` is 0..1; the marker animates from center to where the player landed.
 *  See docs/design.md §5–§6. */
export function CalibrationBar({ position, width }: { position: number; width: number }) {
  const p = Math.max(0, Math.min(1, position));
  const h = 11;
  const markerLeft = p * (width - 19);
  const centerLeft = 0.5 * (width - 19);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 650, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide, markerLeft]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [centerLeft, markerLeft] });

  return (
    <View>
      <View style={{ width, height: h + 8, justifyContent: "center" }}>
        <Svg width={width} height={h}>
          <Defs>
            <LinearGradient id="calib" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={C.cool} />
              <Stop offset="0.5" stopColor={C.accent} />
              <Stop offset="1" stopColor={C.bad} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={h} rx={h / 2} fill="url(#calib)" />
        </Svg>
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            width: 19,
            height: 19,
            borderRadius: 9.5,
            backgroundColor: C.fg,
            borderWidth: 3,
            borderColor: C.bg,
            transform: [{ translateX }],
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: C.muted2, fontFamily: F.body }}>too timid</Text>
        <Text style={{ fontSize: 10, color: C.muted2, fontFamily: F.body }}>calibrated</Text>
        <Text style={{ fontSize: 10, color: C.muted2, fontFamily: F.body }}>too cocky</Text>
      </View>
    </View>
  );
}

/** Where the player sits on the timid↔cocky axis, from confidence + outcome.
 *  Correct + low confidence → timid (left). Wrong + high confidence → cocky (right). */
export function calibrationPosition(confidence: number, correct: boolean): number {
  const c = Math.max(0.33, Math.min(0.99, confidence));
  return correct ? 0.5 - (1 - c) * 0.7 : 0.5 + (c - 0.33) * 0.72;
}
