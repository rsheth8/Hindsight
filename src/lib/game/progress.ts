/**
 * Progress & self-knowledge — the "I'm actually getting better at the real thing" engine.
 * Pure functions over the player's journal. Platform-agnostic (no UI colors here).
 */
import type { JournalEntry } from "@/lib/profile/store";
import type { DailyProblem, GradeResult } from "./types";
import { calibrationCredit, calibrationSkill } from "./calibration";

export type VerdictTone = "accent" | "warn" | "bad" | "fg";

export interface Verdict { badge: string; tone: VerdictTone; line: string }

export function verdict(result: Pick<GradeResult, "correct" | "earned" | "brier" | "reasoning">): Verdict {
  const calib = calibrationCredit(result.brier);
  if (result.earned) {
    return { badge: "💎 EARNED", tone: "accent", line: "Right, well-reasoned, and properly confident. This is the kind of win that compounds in real life." };
  }
  if (result.correct && result.reasoning < 0.4) {
    return { badge: "🍀 LUCKY", tone: "warn", line: "Right — but your reasoning was thin, so that 40% of your score earned almost nothing. Spell out the 'why' and the same call climbs far more." };
  }
  if (result.correct) {
    return { badge: "✅ SOLID", tone: "accent", line: "A correct call backed by a reasonable read. Keep stacking these." };
  }
  if (!result.correct && calib > 0.6) {
    return { badge: "🧠 UNLUCKY", tone: "fg", line: "Wrong outcome — but your confidence was well-sized, so it barely cost you. Over many calls, this is exactly the process that wins." };
  }
  if (!result.correct && result.reasoning >= 0.5) {
    return { badge: "📉 OFF, BUT THOUGHTFUL", tone: "warn", line: "Missed it, but the reasoning was sound. Note what you couldn't have known — that's the lesson." };
  }
  return { badge: "🎯 MISS", tone: "bad", line: "Wrong, and confident about it — the costliest combo. This is the exact habit the game is here to fix." };
}

export interface Skill { title: string; line: string }

export function transferableSkill(problem: DailyProblem, result: GradeResult): Skill {
  const s = problem.series;
  const trendUp = s[s.length - 1].v >= s[0].v;
  const fwd = result.reveal.forwardReturnPct;
  const outcomeUp = fwd >= 0;
  const small = Math.abs(fwd) < 10;
  const reversal = trendUp !== outcomeUp && !small;

  if (reversal) return { title: "Not chasing the trend", line: "Recent direction doesn't decide the next leg. You just practiced resisting the pull of the chart — one of the hardest real-world habits." };
  if (small) return { title: "Signal vs. noise", line: "Most short-horizon moves are noise. You practiced not reading a story into random wiggles — exactly what saves real investors from overtrading." };
  if (problem.difficulty >= 0.7) return { title: "Base rates under uncertainty", line: "When a setup is genuinely murky, the skill is sizing confidence to the odds instead of forcing a confident call. That transfers directly." };
  if (trendUp === outcomeUp && !small) return { title: "Reading momentum honestly", line: "Trends can persist — but the rep is backing a move without overpaying in confidence. That's real portfolio discipline." };
  return { title: "Sizing conviction to evidence", line: "The core skill of every good investor: matching how sure you are to how strong the evidence actually is." };
}

export interface SkillTrend {
  enough: boolean;
  ratingSeries: number[];
  ratingDelta: number;
  calibNow: number;
  calibPrev: number;
  reasoningNow: number;
  reasoningPrev: number;
  verdict: "improving" | "steady" | "slipping" | "early";
  headline: string;
}

const calibScore = (brier: number) => Math.round(calibrationSkill(brier) * 100);

export function skillTrend(history: JournalEntry[]): SkillTrend {
  const chrono = [...history].reverse();
  const n = chrono.length;
  const ratingSeries = chrono.map((h) => h.ratingAfter);
  const ratingDelta = n ? ratingSeries[n - 1] - ratingSeries[0] : 0;

  if (n < 4) {
    return { enough: false, ratingSeries, ratingDelta, calibNow: 0, calibPrev: 0, reasoningNow: 0, reasoningPrev: 0, verdict: "early", headline: "Play a few more days and I'll start charting whether you're actually improving." };
  }

  const half = Math.floor(n / 2);
  const early = chrono.slice(0, half);
  const recent = chrono.slice(half);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const calibPrev = calibScore(avg(early.map((h) => h.brier)));
  const calibNow = calibScore(avg(recent.map((h) => h.brier)));
  const reasoningPrev = Math.round(avg(early.map((h) => h.reasoningScore)) * 100);
  const reasoningNow = Math.round(avg(recent.map((h) => h.reasoningScore)) * 100);

  const move = calibNow - calibPrev + (reasoningNow - reasoningPrev);
  const verdict = move >= 8 ? "improving" : move <= -8 ? "slipping" : "steady";
  const headline =
    verdict === "improving" ? "You're getting sharper. Your recent calls are better-calibrated and better-reasoned than when you started."
    : verdict === "slipping" ? "You've slipped a little lately — tighten the calls you're least sure about."
    : "Holding steady. Consistency is its own win — now push your weak spots below.";

  return { enough: true, ratingSeries, ratingDelta, calibNow, calibPrev, reasoningNow, reasoningPrev, verdict, headline };
}

export interface Insight { kind: "edge" | "leak" | "note"; icon: string; title: string; text: string }

export function insights(history: JournalEntry[]): Insight[] {
  const n = history.length;
  if (n < 3) {
    return [{ kind: "note", icon: "🧭", title: "Your patterns, soon", text: "Play a few more days and I'll surface your real tendencies — where you're overconfident, what you're good at, and how you're improving." }];
  }

  const out: Insight[] = [];
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const accuracy = history.filter((h) => h.correct).length / n;
  const avgConf = avg(history.map((h) => h.confidence));
  const overconf = avgConf - accuracy;

  if (overconf > 0.1) {
    out.push({ kind: "leak", icon: "⚠️", title: "You run overconfident", text: `You average ${Math.round(avgConf * 100)}% sure but are right ${Math.round(accuracy * 100)}% of the time. Dialing confidence down ~${Math.round(overconf * 100)} points would lift your rating the fastest.` });
  } else if (overconf < -0.1) {
    out.push({ kind: "edge", icon: "🪙", title: "You're underconfident", text: `You're right ${Math.round(accuracy * 100)}% of the time but only claim ${Math.round(avgConf * 100)}% — you can trust your reads a little more.` });
  } else {
    out.push({ kind: "edge", icon: "🎯", title: "Well-sized confidence", text: `Your confidence (${Math.round(avgConf * 100)}%) tracks your hit rate (${Math.round(accuracy * 100)}%). That calibration is the whole game.` });
  }

  if (n >= 6) {
    const chrono = [...history].reverse();
    const half = Math.floor(n / 2);
    const rPrev = Math.round(avg(chrono.slice(0, half).map((h) => h.reasoningScore)) * 100);
    const rNow = Math.round(avg(chrono.slice(half).map((h) => h.reasoningScore)) * 100);
    if (rNow - rPrev >= 12) out.push({ kind: "edge", icon: "📈", title: "Your reasoning is leveling up", text: `Reasoning quality climbed from ${rPrev} to ${rNow}. You're explaining your calls better — that's the skill that transfers.` });
    else if (rPrev - rNow >= 12) out.push({ kind: "leak", icon: "✍️", title: "Reasoning slipping", text: `Your written reads have thinned out (${rPrev}→${rNow}). Spell out the evidence and the counter-case to climb.` });
  }

  const wins = history.filter((h) => h.correct);
  if (wins.length >= 4) {
    const earnedRatio = wins.filter((h) => h.earned).length / wins.length;
    if (earnedRatio < 0.4) out.push({ kind: "leak", icon: "🍀", title: "Too many lucky wins", text: `Only ${Math.round(earnedRatio * 100)}% of your correct calls were truly earned. Right-for-the-wrong-reasons doesn't compound — focus on the why.` });
    else if (earnedRatio > 0.7) out.push({ kind: "edge", icon: "💎", title: "Your wins are earned", text: `${Math.round(earnedRatio * 100)}% of your correct calls were well-reasoned and well-sized. That's repeatable skill, not luck.` });
  }

  const tagged = history.filter((h) => typeof h.difficulty === "number");
  if (tagged.length >= 6) {
    const hard = tagged.filter((h) => (h.difficulty as number) >= 0.7);
    const easy = tagged.filter((h) => (h.difficulty as number) < 0.7);
    if (hard.length >= 3 && easy.length >= 3) {
      const cHard = calibScore(avg(hard.map((h) => h.brier)));
      const cEasy = calibScore(avg(easy.map((h) => h.brier)));
      if (cEasy - cHard >= 18) out.push({ kind: "leak", icon: "🌫️", title: "Hard setups trip you up", text: `Your calibration drops from ${cEasy} on clear setups to ${cHard} on hard ones — that's where overconfidence usually hides.` });
    }
  }

  return out.slice(0, 3);
}
