import React, { useEffect, useRef, useState } from "react";
import { Text, TextStyle } from "react-native";

/** Animated count from `from` → `to`. The rating is the hero — it ticks up. */
export function CountUp({ from, to, durationMs = 900, style }: { from: number; to: number; durationMs?: number; style?: TextStyle | TextStyle[] }) {
  const [val, setVal] = useState(from);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [from, to, durationMs]);
  return <Text style={style}>{val.toLocaleString()}</Text>;
}
