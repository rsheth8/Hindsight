/** Learning path — gamified curriculum for core judgment skills. */

export type LessonStepType = "read" | "quiz" | "confidence-demo" | "tap-chips";

export interface LessonQuiz {
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface LessonStep {
  id: string;
  type: LessonStepType;
  title: string;
  body: string;
  quiz?: LessonQuiz;
  /** For confidence-demo: the "right" confidence band (low, high) 0–1 */
  demoTarget?: { low: number; high: number };
  chipLabels?: string[];
}

export interface LearningUnit {
  id: string;
  title: string;
  emoji: string;
  description: string;
  /** graded calls before this unit unlocks (0 = always) */
  unlockAfterGraded: number;
  unlockAfterUnit: string | null;
  xp: number;
  steps: LessonStep[];
}

export const LEARNING_UNITS: LearningUnit[] = [
  {
    id: "calibration-101",
    title: "Calibration basics",
    emoji: "🎯",
    description: "Match how sure you are to how often you're right.",
    unlockAfterGraded: 0,
    unlockAfterUnit: null,
    xp: 50,
    steps: [
      {
        id: "what-is-calibration",
        type: "read",
        title: "What calibration means",
        body: "Being right 60% of the time while saying you're 90% sure is overconfidence — and it bleeds your rating. Calibration is honesty about uncertainty.",
      },
      {
        id: "confidence-quiz",
        type: "quiz",
        title: "Quick check",
        body: "Test your intuition.",
        quiz: {
          question: "You're 85% sure but only right 55% of the time. What's happening?",
          options: ["Well calibrated", "Overconfident", "Underconfident", "Lucky"],
          correct: 1,
          explain: "Your confidence runs ahead of your hit rate — the #1 leak beginners have.",
        },
      },
      {
        id: "slider-demo",
        type: "confidence-demo",
        title: "Size your confidence",
        body: "Imagine a murky setup — trend is unclear, volatility is high. Where should confidence land?",
        demoTarget: { low: 0.33, high: 0.55 },
      },
    ],
  },
  {
    id: "read-the-chart",
    title: "Read the setup",
    emoji: "📈",
    description: "Trend, volatility, and context before you call.",
    unlockAfterGraded: 1,
    unlockAfterUnit: "calibration-101",
    xp: 60,
    steps: [
      {
        id: "chart-anatomy",
        type: "read",
        title: "What the chart shows",
        body: "You see indexed price history up to a decision date — no ticker, no future. The metrics row adds context: drawdown, volatility, distance from highs.",
      },
      {
        id: "abc-choices",
        type: "quiz",
        title: "The three calls",
        body: "Every setup asks: up materially, flat/small, or down over the forward window.",
        quiz: {
          question: "Why is 'flat' a real answer, not a cop-out?",
          options: [
            "It never happens",
            "Most short windows are noise — sideways is common",
            "The game is broken",
            "Only experts pick flat",
          ],
          correct: 1,
          explain: "Short horizons are noisy. Forcing up/down every day is how real investors overtrade.",
        },
      },
      {
        id: "chip-practice",
        type: "tap-chips",
        title: "Build a thesis in taps",
        body: "Tap what you'd cite before locking in. One chip is enough.",
        chipLabels: ["Uptrend intact", "Above the 50-day", "High volatility", "Near the highs", "Big drawdown"],
      },
    ],
  },
  {
    id: "reasoning-moat",
    title: "Reasoning that counts",
    emoji: "✍️",
    description: "The 40% of your score that transfers to real investing.",
    unlockAfterGraded: 3,
    unlockAfterUnit: "read-the-chart",
    xp: 70,
    steps: [
      {
        id: "why-reasoning",
        type: "read",
        title: "Why we grade the why",
        body: "Right-for-the-wrong-reasons barely moves your rating. The luck filter rewards process: evidence, counter-thesis, what would change your mind.",
      },
      {
        id: "earned-vs-lucky",
        type: "quiz",
        title: "Earned or lucky?",
        body: "Same outcome, different process.",
        quiz: {
          question: "You called 'up' because 'stocks always go up.' It went up. What happens to your rating?",
          options: ["Big jump", "Barely moves — lucky win", "You lose rating", "Instant Oracle tier"],
          correct: 1,
          explain: "Thin reasoning on a correct call gets clamped. The game teaches habits, not lottery tickets.",
        },
      },
    ],
  },
  {
    id: "vol-and-drawdown",
    title: "Volatility & drawdowns",
    emoji: "🌊",
    description: "When setups are murky, confidence should shrink.",
    unlockAfterGraded: 5,
    unlockAfterUnit: "reasoning-moat",
    xp: 80,
    steps: [
      {
        id: "vol-read",
        type: "read",
        title: "Volatility changes the odds",
        body: "High-vol setups have fatter tails — big moves both ways. That means lower base confidence unless evidence is unusually strong.",
      },
      {
        id: "drawdown-quiz",
        type: "quiz",
        title: "After a big drawdown",
        body: "Context matters.",
        quiz: {
          question: "A stock is −35% from highs but stabilizing. What's the beginner trap?",
          options: [
            "Assuming it must bounce",
            "Ignoring the chart entirely",
            "Using 95% confidence",
            "All of the above — overconfidence on 'cheap'",
          ],
          correct: 3,
          explain: "Drawdowns invite narrative. The skill is sizing confidence to what the chart actually shows.",
        },
      },
    ],
  },
  {
    id: "options-greeks-101",
    title: "Options & Greeks",
    emoji: "📐",
    description: "Delta, theta, gamma, vega — risk language for derivatives.",
    unlockAfterGraded: 8,
    unlockAfterUnit: "vol-and-drawdown",
    xp: 100,
    steps: [
      {
        id: "greeks-intro",
        type: "read",
        title: "Greeks = sensitivities",
        body: "Options aren't just directional bets. Delta is stock exposure, theta is time bleed, gamma is how fast delta moves, vega is vol exposure.",
      },
      {
        id: "theta-quiz",
        type: "quiz",
        title: "Theta hurts holders",
        body: "Time is a position.",
        quiz: {
          question: "You're long a call with 5 days to expiry and theta −$0.15/day. What's the main risk?",
          options: ["Stock goes up", "Time decay even if stock is flat", "Dividends", "Interest rates only"],
          correct: 1,
          explain: "Short-dated long options fight the clock every day. Theta is why 'being right eventually' isn't enough.",
        },
      },
      {
        id: "delta-demo",
        type: "quiz",
        title: "Delta as exposure",
        body: "Translate greek to stock risk.",
        quiz: {
          question: "A call with 0.40 delta on a $100 stock. Roughly how many shares of exposure?",
          options: ["4 shares", "40 shares", "100 shares", "0 — options aren't stocks"],
          correct: 1,
          explain: "Delta × 100 shares per contract ≈ 40 shares of equivalent exposure per contract.",
        },
      },
    ],
  },
  {
    id: "futures-basics-101",
    title: "Futures & leverage",
    emoji: "📊",
    description: "Notional exposure, gap risk, and roll cost — not just direction.",
    unlockAfterGraded: 12,
    unlockAfterUnit: "options-greeks-101",
    xp: 90,
    steps: [
      {
        id: "notional-intro",
        type: "read",
        title: "Notional ≠ margin",
        body: "One ES contract controls ~$275k of index notional but might only require ~$15k margin. You're leveraged — small moves, big P&L.",
      },
      {
        id: "gap-quiz",
        type: "quiz",
        title: "Overnight gap risk",
        body: "Futures trade nearly 24h but gaps still happen on macro prints.",
        quiz: {
          question: "Long ES overnight before CPI. Main risk vs holding SPY?",
          options: ["Dividend timing", "Gap risk at the open", "No difference", "Futures can't gap"],
          correct: 1,
          explain: "Futures can gap through your stop with no chance to exit intraday — sizing matters.",
        },
      },
    ],
  },
  {
    id: "spot-the-flaw",
    title: "Spot the flaw",
    emoji: "🔍",
    description: "Find the reasoning error before it costs you money.",
    unlockAfterGraded: 10,
    unlockAfterUnit: "futures-basics-101",
    xp: 90,
    steps: [
      {
        id: "flaw-types",
        type: "read",
        title: "Common flaws",
        body: "Cherry-picking one bullish signal, ignoring base rates, and trend-chasing after a parabolic move — three leaks we drill in practice mode.",
      },
      {
        id: "flaw-quiz",
        type: "quiz",
        title: "Name the flaw",
        body: "'It's up 80% this month so it has to keep going.'",
        quiz: {
          question: "What's the main error?",
          options: ["None — momentum always works", "Trend extrapolation / ignoring mean reversion risk", "Using too many chips", "Picking flat"],
          correct: 1,
          explain: "Parabolic moves raise reversal risk. The flaw is treating recent trend as destiny.",
        },
      },
    ],
  },
];

export function unitById(id: string): LearningUnit | undefined {
  return LEARNING_UNITS.find((u) => u.id === id);
}

export function stepKey(unitId: string, stepId: string): string {
  return `${unitId}:${stepId}`;
}
