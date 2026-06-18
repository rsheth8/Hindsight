/**
 * Duels — head-to-head PvP on identical setups. Pure, dependency-free logic
 * shared by the Next.js backend and the Expo client (mirrored, not symlinked —
 * keep `src/lib/game/duel.ts` and `mobile/src/lib/game/duel.ts` byte-identical).
 *
 * Both players see the SAME anonymized problem and are graded on the same
 * luck-resistant skill score the solo game uses (calibration + reasoning, with
 * the luck filter). The round winner is the higher skill score — never just
 * "who guessed the direction." Duel Elo is a SEPARATE ladder from the daily
 * Judgment rating: daily stays the ritual, duels are the arena.
 *
 * See docs/duel-design.md for the full spec.
 */
import type { ChoiceId, SolvedProblem } from "./types";

export type DuelMode = "same-board" | "best-of-3";
export type DuelTempo = "live" | "async" | "hybrid";
export type DuelClock = "blitz" | "rapid" | "deep";

export type MatchState =
  | "waiting_opponent" // created; waiting for someone to join (queue or challenge)
  | "round_active" // a problem is dealt; clock running
  | "round_reveal" // a round finished; results visible (Best-of-3 interlude)
  | "match_end" // match decided; ratings applied
  | "abandoned"; // forfeit / expired before completion

export interface DuelModeMeta {
  id: DuelMode;
  name: string;
  blurb: string;
  emoji: string;
  rounds: number;
  winsNeeded: number;
  defaultTempo: DuelTempo;
  defaultClock: DuelClock;
  ranked: boolean;
}

export const DUEL_MODES: Record<DuelMode, DuelModeMeta> = {
  "same-board": {
    id: "same-board",
    name: "Call & Counter",
    blurb: "One setup. Both lock in. Sharper read wins.",
    emoji: "⚔️",
    rounds: 1,
    winsNeeded: 1,
    defaultTempo: "live",
    defaultClock: "rapid",
    ranked: true,
  },
  "best-of-3": {
    id: "best-of-3",
    name: "The Desk",
    blurb: "Three setups, best of three. A real match.",
    emoji: "🎯",
    rounds: 3,
    winsNeeded: 2,
    defaultTempo: "live",
    defaultClock: "rapid",
    ranked: true,
  },
};

/** Seconds on the commit clock for each live preset. */
export const CLOCK_SECONDS: Record<DuelClock, number> = {
  blitz: 45,
  rapid: 90,
  deep: 180,
};

export const CLOCK_LABEL: Record<DuelClock, string> = {
  blitz: "Blitz · 45s",
  rapid: "Rapid · 90s",
  deep: "Deep · 3m",
};

/** Async / hybrid deadline per round. */
export const ASYNC_DEADLINE_MS = 24 * 60 * 60 * 1000;

export interface PlayerSlot {
  id: string; // device id (or account id once accounts land)
  name: string;
  /** duel rating coming into the match (for the Elo update + display) */
  duelRating: number;
  duelMatchesPlayed: number;
  /** filled when the match ends */
  duelRatingAfter?: number;
  duelDelta?: number;
  /** true for an AI opponent (cold-start filler). Always surfaced in the UI. */
  isBot?: boolean;
}

export interface HiddenCommit {
  choice: ChoiceId;
  confidence: number;
  reasoning: string;
  lockedAt: string;
}

/** A graded call. `score` is the luck-filtered skill score that decides the round. */
export interface RoundGrade {
  choice: ChoiceId | null; // null = forfeit / timeout
  confidence: number;
  correct: boolean;
  brier: number;
  reasoning: number;
  reasoningNotes: string;
  score: number;
  forfeit?: boolean;
}

export interface DuelRound {
  index: number;
  /** stable id for telemetry; problem is rebuilt server-side from `seed` */
  problemId: string;
  seed: string;
  state: "active" | "complete";
  deadlineAt?: string;
  /** hybrid: a live round whose clock expired and was extended to an async deadline */
  convertedToAsync?: boolean;
  commits: Record<string, HiddenCommit>;
  grades?: Record<string, RoundGrade>;
  /** id of round winner; null = draw; undefined = not decided */
  winnerId?: string | null;
  /** captured at finalize so a completed round can show its reveal to both players */
  reveal?: SolvedProblem["reveal"];
  answer?: ChoiceId;
}

export interface DuelMatch {
  id: string;
  mode: DuelMode;
  tempo: DuelTempo;
  clock: DuelClock | null; // null for pure async
  rated: boolean;
  state: MatchState;
  players: PlayerSlot[]; // 1 while waiting, 2 once joined
  rounds: DuelRound[];
  currentRound: number; // index into rounds
  createdAt: string;
  updatedAt: string;
  /** present for friend challenges (share link join code) */
  challengeCode?: string;
  /** id of match winner; null = draw; undefined = undecided */
  winnerId?: string | null;
  ratingApplied?: boolean;
}

/* ------------------------------------------------------------------ */
/* Round + match resolution                                            */
/* ------------------------------------------------------------------ */

/**
 * Compare two graded calls. Returns >0 if a is the better call, <0 if b is,
 * 0 for a genuine tie. Primary: skill score. Tiebreak: lower Brier, then higher
 * reasoning. Outcome correctness is already baked into `score` (weighted 15%).
 */
export function compareGrades(a: RoundGrade, b: RoundGrade): number {
  const EPS = 1e-9;
  if (Math.abs(a.score - b.score) > EPS) return a.score - b.score;
  if (Math.abs(a.brier - b.brier) > EPS) return b.brier - a.brier; // lower Brier wins
  if (Math.abs(a.reasoning - b.reasoning) > EPS) return a.reasoning - b.reasoning;
  return 0;
}

/** Winner of a round once both grades exist. null = draw, undefined = undecided. */
export function roundWinnerId(round: DuelRound, playerIds: string[]): string | null | undefined {
  if (playerIds.length < 2) return undefined;
  const [p1, p2] = playerIds;
  const g1 = round.grades?.[p1];
  const g2 = round.grades?.[p2];
  if (!g1 || !g2) return undefined;
  const cmp = compareGrades(g1, g2);
  if (cmp > 0) return p1;
  if (cmp < 0) return p2;
  return null;
}

/** Round wins per player across all completed rounds. */
export function tallyWins(match: DuelMatch): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const p of match.players) wins[p.id] = 0;
  for (const r of match.rounds) {
    if (r.state === "complete" && r.winnerId) wins[r.winnerId] = (wins[r.winnerId] ?? 0) + 1;
  }
  return wins;
}

/** Has the match been decided (someone hit winsNeeded, or all rounds played)? */
export function isMatchOver(match: DuelMatch): boolean {
  if (match.players.length < 2) return false;
  const meta = DUEL_MODES[match.mode];
  const wins = tallyWins(match);
  if (Object.values(wins).some((w) => w >= meta.winsNeeded)) return true;
  const completed = match.rounds.filter((r) => r.state === "complete").length;
  return completed >= meta.rounds;
}

/** Winner of the whole match. null = draw, undefined = undecided. */
export function matchWinnerId(match: DuelMatch): string | null | undefined {
  if (!isMatchOver(match)) return undefined;
  const wins = tallyWins(match);
  const ids = match.players.map((p) => p.id);
  if (ids.length < 2) return undefined;
  const [a, b] = ids;
  if ((wins[a] ?? 0) > (wins[b] ?? 0)) return a;
  if ((wins[b] ?? 0) > (wins[a] ?? 0)) return b;
  return null;
}

/** Elo result for a player given the decided match winner. */
export function resultFor(match: DuelMatch, playerId: string): 1 | 0.5 | 0 {
  const winner = matchWinnerId(match);
  if (winner === undefined) return 0.5; // shouldn't happen once over
  if (winner === null) return 0.5;
  return winner === playerId ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Duel Elo — separate ladder from the daily Judgment rating           */
/* ------------------------------------------------------------------ */

export const START_DUEL_RATING = 1000;

/** K-factor shrinks as a duel track record builds (stabler rating). */
export function duelKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return 48; // provisional
  if (matchesPlayed < 30) return 32;
  return 24;
}

export function duelExpectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export interface DuelRatingUpdate {
  newRating: number;
  delta: number;
  expected: number;
}

/** Standard Elo on the match result (1 win / 0.5 draw / 0 loss). */
export function updateDuelRating(args: {
  rating: number;
  opponentRating: number;
  result: 1 | 0.5 | 0;
  matchesPlayed: number;
}): DuelRatingUpdate {
  const { rating, opponentRating, result, matchesPlayed } = args;
  const expected = duelExpectedScore(rating, opponentRating);
  const k = duelKFactor(matchesPlayed);
  const delta = Math.round(k * (result - expected));
  return { newRating: Math.max(100, rating + delta), delta, expected };
}

/** Seed a new player's duel rating from their daily Judgment rating. */
export function seedDuelRating(judgmentRating: number): number {
  if (!Number.isFinite(judgmentRating)) return START_DUEL_RATING;
  return Math.max(100, Math.round(judgmentRating));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** The worst-case grade for a player who never locked in (timeout / abandon). */
export function forfeitGrade(): RoundGrade {
  return {
    choice: null,
    confidence: 1 / 3,
    correct: false,
    brier: 1,
    reasoning: 0,
    reasoningNotes: "No call submitted in time.",
    score: 0,
    forfeit: true,
  };
}

export function roundSeed(matchId: string, roundIndex: number): string {
  return `duel-${matchId}-r${roundIndex}`;
}

/* ------------------------------------------------------------------ */
/* Display names — stable, friendly handles derived from a device id   */
/* ------------------------------------------------------------------ */

const DUEL_ADJECTIVES = [
  "Sharp", "Bullish", "Bearish", "Steady", "Cool", "Bold", "Sly", "Lucky",
  "Calm", "Brave", "Swift", "Wise", "Keen", "Prime", "Nimble", "Stoic",
  "Quiet", "Patient", "Daring", "Crafty", "Astute", "Frosty", "Golden", "Iron",
];
const DUEL_ANIMALS = [
  "Otter", "Lynx", "Falcon", "Bison", "Heron", "Marmot", "Tapir", "Ferret",
  "Badger", "Osprey", "Mantis", "Civet", "Gecko", "Raven", "Yak", "Koala",
  "Stoat", "Egret", "Puma", "Crane", "Bison", "Mink", "Wren", "Vole",
];

/** Deterministic fun handle (e.g. "Bullish Otter") from any stable id. */
export function duelName(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const adj = DUEL_ADJECTIVES[u % DUEL_ADJECTIVES.length];
  const animal = DUEL_ANIMALS[Math.floor(u / DUEL_ADJECTIVES.length) % DUEL_ANIMALS.length];
  return `${adj} ${animal}`;
}

/* ------------------------------------------------------------------ */
/* Post-result explanation — "why did this round go the way it did?"   */
/* ------------------------------------------------------------------ */

export type DuelEdge = "you" | "opponent" | "even";

export interface DuelFactor {
  label: string; // "Direction" | "Calibration" | "Reasoning"
  detail: string;
  edge: DuelEdge;
}

export interface DuelExplanation {
  headline: string;
  summary: string;
  factors: DuelFactor[];
}

const fmt2 = (n: number) => n.toFixed(2);
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Plain-language breakdown of a single round: what each side did and which
 * component (direction / calibration / reasoning) actually decided it. Pure, so
 * web + mobile render the identical story. `outcome` is from *your* POV.
 */
export function explainRound(
  you: RoundGrade,
  opp: RoundGrade,
  outcome: "win" | "loss" | "draw",
): DuelExplanation {
  // Forfeits short-circuit — nothing to compare on the merits.
  if (you.forfeit && !opp.forfeit) {
    return {
      headline: "No call in time",
      summary: "You didn't lock in before the clock ran out, so the round went to your opponent. Even a low-confidence call beats no call.",
      factors: [{ label: "Result", detail: "You timed out; they submitted.", edge: "opponent" }],
    };
  }
  if (opp.forfeit && !you.forfeit) {
    return {
      headline: "Opponent ran out the clock",
      summary: "Your opponent never locked a call in, so you took the round by default. The breakdown below is still your real grade.",
      factors: [{ label: "Result", detail: "They timed out; you submitted.", edge: "you" }],
    };
  }

  const calYou = 1 - you.brier;
  const calOpp = 1 - opp.brier;
  const calDiff = calYou - calOpp;
  const reasDiff = you.reasoning - opp.reasoning;
  const CAL_EPS = 0.02;
  const REAS_EPS = 0.02;

  const direction: DuelFactor = {
    label: "Direction",
    detail:
      you.correct && opp.correct
        ? "You both read the move correctly."
        : !you.correct && !opp.correct
          ? "Neither of you nailed the direction — judgment decided it."
          : you.correct
            ? "You read the move right; they didn't."
            : "They read the move right; you didn't.",
    edge: you.correct === opp.correct ? "even" : you.correct ? "you" : "opponent",
  };

  const calibration: DuelFactor = {
    label: "Calibration",
    detail:
      Math.abs(calDiff) <= CAL_EPS
        ? `Confidence was sized about evenly (cal ${fmt2(calYou)} vs ${fmt2(calOpp)}).`
        : calDiff > 0
          ? `You sized your confidence better — cal ${fmt2(calYou)} vs ${fmt2(calOpp)}.`
          : `They sized confidence better — cal ${fmt2(calOpp)} vs ${fmt2(calYou)}.`,
    edge: Math.abs(calDiff) <= CAL_EPS ? "even" : calDiff > 0 ? "you" : "opponent",
  };

  const reasoning: DuelFactor = {
    label: "Reasoning",
    detail:
      Math.abs(reasDiff) <= REAS_EPS
        ? `Reasoning graded about even (${pct(you.reasoning)} vs ${pct(opp.reasoning)}).`
        : reasDiff > 0
          ? `Your reasoning was stronger — ${pct(you.reasoning)} vs ${pct(opp.reasoning)}.`
          : `Their reasoning was stronger — ${pct(opp.reasoning)} vs ${pct(you.reasoning)}.`,
    edge: Math.abs(reasDiff) <= REAS_EPS ? "even" : reasDiff > 0 ? "you" : "opponent",
  };

  const factors = [direction, calibration, reasoning];

  if (outcome === "draw") {
    return {
      headline: "Dead heat",
      summary: `Skill scores tied at ${fmt2(you.score)}. When calls are this close, the game scores it a draw rather than rewarding a coin-flip.`,
      factors,
    };
  }

  // Pick the factor that most explains the win/loss: the biggest edge for the winner.
  const favored: DuelEdge = outcome === "win" ? "you" : "opponent";
  const magnitudes: { f: DuelFactor; m: number }[] = [
    { f: calibration, m: Math.abs(calDiff) },
    { f: reasoning, m: Math.abs(reasDiff) },
    { f: direction, m: direction.edge === "even" ? 0 : 1 },
  ];
  const decider = magnitudes
    .filter((x) => x.f.edge === favored)
    .sort((a, b) => b.m - a.m)[0]?.f;

  const driver =
    decider?.label === "Direction"
      ? "reading the direction right"
      : decider?.label === "Calibration"
        ? "sharper calibration — sizing confidence to match how sure the setup justified"
        : decider?.label === "Reasoning"
          ? "stronger reasoning"
          : "the better all-round call";

  const summary =
    outcome === "win"
      ? `You won the round on ${driver} (skill ${fmt2(you.score)} vs ${fmt2(opp.score)}).`
      : `You lost the round — your opponent's edge was ${driver} (skill ${fmt2(opp.score)} vs ${fmt2(you.score)}).`;

  return {
    headline: outcome === "win" ? "You took it" : "They took it",
    summary,
    factors,
  };
}

/** Is `deadlineAt` in the past relative to `now`? */
export function isExpired(deadlineAt: string | undefined, now: number = Date.now()): boolean {
  if (!deadlineAt) return false;
  const t = Date.parse(deadlineAt);
  return Number.isFinite(t) && t < now;
}
