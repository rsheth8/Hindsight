"use client";

const BITS = Array.from({ length: 36 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.3,
  dur: 1.6 + Math.random() * 1.2,
  color: ["#5ef2b0", "#ffb454", "#7aa2ff", "#ff6b81", "#eef2f7"][i % 5],
  size: 6 + Math.random() * 7,
  rot: Math.random() * 360,
}));

/** Cheap CSS-only confetti burst. Gated to earned wins only — never for luck. */
export function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {BITS.map((b, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${b.left}%`,
            top: "-5vh",
            width: b.size,
            height: b.size * 0.6,
            background: b.color,
            transform: `rotate(${b.rot}deg)`,
            borderRadius: 2,
            animation: `confetti-fall ${b.dur}s ${b.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
