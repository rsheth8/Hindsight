"use client";
import { useEffect, useRef, useState } from "react";

/** Animated count from `from` → `to`. The rating is the hero — it should tick. */
export function CountUp({ from, to, durationMs = 900, className }: { from: number; to: number; durationMs?: number; className?: string }) {
  const [val, setVal] = useState(from);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [from, to, durationMs]);
  return <span className={className}>{val.toLocaleString()}</span>;
}
