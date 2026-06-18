import React, { useEffect, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const COLORS = ["#5ef2b0", "#ffb454", "#7aa2ff", "#ff6b81", "#eef2f7"];
const { width: SW, height: SH } = Dimensions.get("window");

type Bit = {
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
  anim: Animated.Value;
  drift: number;
};

function createBits(): Bit[] {
  return Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * SW,
    delay: Math.random() * 300,
    dur: 1600 + Math.random() * 1300,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 7,
    anim: new Animated.Value(0),
    drift: (Math.random() - 0.5) * 80,
  }));
}

/** Cheap confetti burst, gated to earned wins only — never for luck. */
export function Confetti() {
  const [bits] = useState(createBits);

  useEffect(() => {
    Animated.stagger(
      8,
      bits.map((b) =>
        Animated.timing(b.anim, { toValue: 1, duration: b.dur, delay: b.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }, [bits]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: b.left,
            top: -20,
            width: b.size,
            height: b.size * 0.6,
            backgroundColor: b.color,
            borderRadius: 2,
            opacity: b.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: b.anim.interpolate({ inputRange: [0, 1], outputRange: [0, SH + 40] }) },
              { translateX: b.anim.interpolate({ inputRange: [0, 1], outputRange: [0, b.drift] }) },
              { rotate: b.anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "640deg"] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
