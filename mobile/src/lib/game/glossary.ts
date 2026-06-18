/** In-app glossary — tap-to-learn copy for beginners. */

export type GlossaryKey =
  | "confidence"
  | "calibration"
  | "brier"
  | "reasoning"
  | "outcome"
  | "horizon"
  | "earned"
  | "provisional"
  | "chips"
  | "delta"
  | "theta"
  | "gamma"
  | "vega";

export const GLOSSARY: Record<GlossaryKey, { title: string; body: string }> = {
  confidence: {
    title: "Confidence",
    body: "How sure you are in your chosen answer, from 33% (a pure guess among three) to 100%. The game rewards matching confidence to evidence — not always being bold.",
  },
  calibration: {
    title: "Calibration",
    body: "Whether your confidence matches how often you're right. Well-calibrated means 70% sure → right about 70% of the time. It's weighted 45% of your score.",
  },
  brier: {
    title: "Brier score",
    body: "A calibration penalty: (confidence − outcome)². Lower is better. Confident-and-wrong hurts more than a humble miss.",
  },
  reasoning: {
    title: "Reasoning",
    body: "The why behind your call — evidence, counter-case, what would change your mind. Worth 40% of your score. Tap chips or type a short note.",
  },
  outcome: {
    title: "Outcome",
    body: "Whether the market moved your way. Only 15% of your score — one move is mostly noise. We grade the decision, not luck.",
  },
  horizon: {
    title: "Forward horizon",
    body: "How far after the decision date we measure the move. Shown on each problem — short windows are noisy, which is why outcome is down-weighted.",
  },
  earned: {
    title: "Earned vs lucky",
    body: "An earned win is correct, well-reasoned, and properly confident. A lucky win is right but thin on reasoning — your rating barely moves.",
  },
  provisional: {
    title: "Provisional rating",
    body: "Your first 10 graded calls. The number moves faster while you find your level. Thin reasoning can't sink you during this grace period.",
  },
  chips: {
    title: "Reasoning chips",
    body: "Tap what you see in the setup. One chip is enough to submit. They become your thesis for the grader — no essay required.",
  },
  delta: {
    title: "Delta (Δ)",
    body: "How much the option price moves per $1 move in the stock. A 0.45 delta call acts like ~45 shares of exposure.",
  },
  theta: {
    title: "Theta (Θ)",
    body: "Time decay — how much value the option loses per day as expiry approaches. Long options bleed theta every day.",
  },
  gamma: {
    title: "Gamma (Γ)",
    body: "How fast delta changes when the stock moves. High gamma near expiry = delta swings wildly on small moves.",
  },
  vega: {
    title: "Vega (ν)",
    body: "Sensitivity to implied volatility. When vol rises, option prices tend to rise (vega positive for long options).",
  },
};
