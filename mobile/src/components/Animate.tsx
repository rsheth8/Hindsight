import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

/** Fade + rise-in on mount. Used to choreograph the reveal (see docs/design.md §6).
 *  Starts hidden and animates to visible in an effect that always runs on mount, so
 *  content never gets stuck invisible. */
export function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: ViewStyle }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Spring scale "punch-in" — for the verdict badge. */
export function Pop({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: ViewStyle }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, delay, friction: 5, tension: 140, useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}
