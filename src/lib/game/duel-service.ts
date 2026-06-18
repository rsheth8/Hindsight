/**
 * Duel orchestration (server-side). Holds the match lifecycle so the API routes
 * stay thin: create/matchmake, join, commit + grade, lazy deadline expiry, and a
 * per-viewer serializer that never leaks the opponent's call before both lock.
 *
 * Transport-agnostic: works over plain REST polling today; when Ably is wired
 * (ABLY_API_KEY) the same state transitions can be broadcast for instant live
 * updates. See docs/duel-design.md.
 */
import { buildProblemForSeed } from "./daily";
import { gradeCall } from "@/lib/ai/grade-call";
import { botCall, isBotId, makeBot } from "./duel-bot";
import {
  enqueue,
  getMatch,
  popOpponent,
  removeFromQueue,
  saveMatch,
} from "@/lib/db/duel-store";
import {
  ASYNC_DEADLINE_MS,
  CLOCK_SECONDS,
  DUEL_MODES,
  forfeitGrade,
  isMatchOver,
  matchWinnerId,
  resultFor,
  roundSeed,
  roundWinnerId,
  updateDuelRating,
  type DuelClock,
  type DuelMatch,
  type DuelMode,
  type DuelRound,
  type DuelTempo,
  type PlayerSlot,
  type RoundGrade,
} from "./duel";
import type { ChoiceId, DailyProblem, SolvedProblem } from "./types";

const LIVE_CLOCK_BUFFER_MS = 5000; // grace for network latency on the live clock
const WAIT_EXPIRY_LIVE_MS = 10 * 60 * 1000;
/** How long a queue match waits for a human before an AI opponent fills in.
 *  Short enough to never feel dead, long enough that two humans still pair.
 *  Read at call-time so it can be tuned via env (and overridden in tests). */
function botFillDelayMs(): number {
  return Number(process.env.DUEL_BOT_FILL_MS ?? 4000);
}

function genId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function roundDeadline(tempo: DuelTempo, clock: DuelClock | null): string {
  const ms =
    tempo === "async" || !clock
      ? ASYNC_DEADLINE_MS
      : CLOCK_SECONDS[clock] * 1000 + LIVE_CLOCK_BUFFER_MS;
  return new Date(Date.now() + ms).toISOString();
}

function newRound(matchId: string, index: number, tempo: DuelTempo, clock: DuelClock | null): DuelRound {
  const seed = roundSeed(matchId, index);
  return {
    index,
    problemId: seed,
    seed,
    state: "active",
    deadlineAt: roundDeadline(tempo, clock),
    commits: {},
    grades: {},
  };
}

function toClientProblem(p: SolvedProblem): DailyProblem {
  const { answer: _a, reveal: _r, ...rest } = p;
  void _a;
  void _r;
  return rest;
}

export interface CreateParams {
  mode: DuelMode;
  tempo: DuelTempo;
  clock: DuelClock | null;
  rated: boolean;
  player: PlayerSlot;
  /** "queue" = matchmaking; "friend" = generate a challenge link */
  kind: "queue" | "friend";
}

export interface CreateResult {
  match: PublicDuelMatch;
  joined: boolean; // true if we paired with a waiting opponent immediately
}

/** Create a match — pair with a waiting opponent (queue) or open a friend challenge. */
export async function createMatch(params: CreateParams): Promise<CreateResult> {
  const { mode, tempo, clock, rated, player, kind } = params;

  if (kind === "queue") {
    const opponent = await popOpponent({ mode, tempo, rated, rating: player.duelRating, selfId: player.id });
    if (opponent) {
      const existing = await getMatch(opponent.matchId);
      if (existing && existing.state === "waiting_opponent" && existing.players[0]?.id !== player.id) {
        startMatch(existing, player);
        await saveMatch(existing);
        return { match: toPublic(existing, player.id), joined: true };
      }
      // stale queue entry → fall through and create a fresh waiting match
    }
  }

  const id = genId();
  const match: DuelMatch = {
    id,
    mode,
    tempo,
    clock,
    rated,
    state: "waiting_opponent",
    players: [player],
    rounds: [],
    currentRound: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...(kind === "friend" ? { challengeCode: id } : {}),
  };
  await saveMatch(match);
  if (kind === "queue") {
    await enqueue({
      matchId: id,
      playerId: player.id,
      mode,
      tempo,
      rated,
      rating: player.duelRating,
      enqueuedAt: nowIso(),
    });
  }
  return { match: toPublic(match, player.id), joined: false };
}

/** Join an open match (friend challenge or a waiting queue lobby). */
export async function joinMatch(matchId: string, player: PlayerSlot): Promise<PublicDuelMatch> {
  const match = await getMatch(matchId);
  if (!match) throw new DuelError("Match not found", 404);

  // Re-joining your own match (e.g. reconnect) just returns current state.
  if (match.players.some((p) => p.id === player.id)) {
    if (await progressMatch(match)) await saveMatch(match);
    return toPublic(match, player.id);
  }
  if (match.state !== "waiting_opponent" || match.players.length >= 2) {
    throw new DuelError("This match is no longer open", 409);
  }

  startMatch(match, player);
  await removeFromQueue((e) => e.matchId === matchId);
  await saveMatch(match);
  return toPublic(match, player.id);
}

/** Transition a waiting match to live once the second player is in. */
function startMatch(match: DuelMatch, second: PlayerSlot): void {
  match.players.push(second);
  match.state = "round_active";
  match.currentRound = 0;
  match.rounds = [newRound(match.id, 0, match.tempo, match.clock)];
}

export interface CommitInput {
  choice: ChoiceId;
  confidence: number;
  reasoning: string;
}

/** Lock in a call. Grades it, and resolves the round/match once both have locked. */
export async function commit(matchId: string, playerId: string, input: CommitInput): Promise<PublicDuelMatch> {
  let match = await getMatch(matchId);
  if (!match) throw new DuelError("Match not found", 404);
  if (!match.players.some((p) => p.id === playerId)) throw new DuelError("You're not in this match", 403);

  match = applyExpiry(match);
  if (match.state !== "round_active") {
    await saveMatch(match);
    throw new DuelError("This round is closed", 409);
  }

  const round = match.rounds[match.currentRound];
  if (round.commits[playerId]) throw new DuelError("You've already locked in", 409);

  const problem = await buildProblemForSeed(round.seed);
  const grade = await gradeCall({ problem, choice: input.choice, confidence: input.confidence, reasoning: input.reasoning });

  round.commits[playerId] = {
    choice: input.choice,
    confidence: input.confidence,
    reasoning: input.reasoning,
    lockedAt: nowIso(),
  };
  round.grades = { ...round.grades, [playerId]: grade };

  // A bot opponent locks in here too (same board, same grader), so the round
  // resolves the instant the human commits instead of waiting on a poll.
  await ensureBotMoves(match, problem);

  const everyoneIn = match.players.length >= 2 && match.players.every((p) => round.grades?.[p.id]);
  if (everyoneIn && match.state === "round_active") finalizeRound(match, problem);

  await saveMatch(match);
  return toPublic(match, playerId);
}

/** Resign — opponent wins the match immediately. */
export async function forfeit(matchId: string, playerId: string): Promise<PublicDuelMatch> {
  const match = await getMatch(matchId);
  if (!match) throw new DuelError("Match not found", 404);
  if (!match.players.some((p) => p.id === playerId)) throw new DuelError("You're not in this match", 403);
  if (match.state === "match_end" || match.state === "abandoned") return toPublic(match, playerId);

  const round = match.rounds[match.currentRound];
  if (round) {
    for (const p of match.players) {
      if (!round.grades?.[p.id]) {
        round.grades = { ...round.grades, [p.id]: p.id === playerId ? forfeitGrade() : (round.grades?.[p.id] ?? bestEffortGrade()) };
      }
    }
    finalizeRound(match);
  } else {
    match.state = "abandoned";
  }
  await saveMatch(match);
  return toPublic(match, playerId);
}

/** Public state for a viewer; lazily resolves deadlines, bot-fills, and bot moves. */
export async function viewMatch(matchId: string, viewerId: string): Promise<PublicDuelMatch> {
  const match = await getMatch(matchId);
  if (!match) throw new DuelError("Match not found", 404);
  if (await progressMatch(match)) await saveMatch(match);
  return toPublic(match, viewerId);
}

/** Client-safe problem for the current round (no answer / reveal). */
export async function currentProblem(
  matchId: string,
  viewerId: string,
): Promise<{ problem: DailyProblem; round: number; deadlineAt?: string }> {
  const match = await getMatch(matchId);
  if (!match) throw new DuelError("Match not found", 404);
  if (!match.players.some((p) => p.id === viewerId)) throw new DuelError("You're not in this match", 403);
  if (match.state !== "round_active") throw new DuelError("No active round", 409);
  const round = match.rounds[match.currentRound];
  const problem = await buildProblemForSeed(round.seed);
  // Let a bot lock in for this (possibly new) round; won't finalize since the
  // viewer hasn't committed yet, but means they won't wait a poll for it.
  if (await ensureBotMoves(match, problem)) await saveMatch(match);
  return { problem: toClientProblem(problem), round: round.index, deadlineAt: round.deadlineAt };
}

/* ------------------------------------------------------------------ */
/* Internal: expiry + finalize                                        */
/* ------------------------------------------------------------------ */

function applyExpiry(match: DuelMatch): DuelMatch {
  const now = Date.now();

  if (match.state === "waiting_opponent") {
    const age = now - Date.parse(match.createdAt);
    const limit = match.tempo === "async" ? ASYNC_DEADLINE_MS : WAIT_EXPIRY_LIVE_MS;
    if (age > limit) match.state = "abandoned";
    return match;
  }

  if (match.state !== "round_active") return match;
  const round = match.rounds[match.currentRound];
  if (!round?.deadlineAt || Date.parse(round.deadlineAt) >= now) return match;

  const missing = match.players.filter((p) => !round.grades?.[p.id]);

  // Hybrid grace: a live clock that ran out converts to an async deadline once,
  // so a dropped/slow opponent doesn't instantly forfeit.
  if (match.tempo === "hybrid" && !round.convertedToAsync && missing.length > 0) {
    round.convertedToAsync = true;
    round.deadlineAt = new Date(now + ASYNC_DEADLINE_MS).toISOString();
    return match;
  }

  const committed = match.players.filter((p) => round.grades?.[p.id]);
  if (committed.length === 0) {
    match.state = "abandoned";
    return match;
  }

  for (const p of missing) {
    round.grades = { ...round.grades, [p.id]: forfeitGrade() };
  }
  finalizeRound(match);
  return match;
}

/** A cheap signature of the bits a viewer cares about, to decide whether to persist. */
function progressSig(match: DuelMatch): string {
  const round = match.rounds[match.currentRound];
  return [
    match.state,
    match.players.length,
    match.currentRound,
    round?.state,
    round?.deadlineAt,
    Object.keys(round?.grades ?? {}).length,
  ].join("|");
}

/** Fill a stale queue lobby with an AI opponent so the player never waits forever. */
async function botFillIfDue(match: DuelMatch): Promise<void> {
  if (match.state !== "waiting_opponent") return;
  if (match.challengeCode) return; // friend challenge — only a human can join
  if (match.players.length !== 1) return;
  const age = Date.now() - Date.parse(match.createdAt);
  if (age < botFillDelayMs()) return;
  const bot = makeBot(match.players[0].duelRating, `${match.id}:bot`);
  startMatch(match, bot);
  await removeFromQueue((e) => e.matchId === match.id);
}

/** Make any bot in the active round lock in. Returns the built problem (for reveal). */
async function ensureBotMoves(match: DuelMatch, problem?: SolvedProblem): Promise<SolvedProblem | undefined> {
  if (match.state !== "round_active") return problem;
  const round = match.rounds[match.currentRound];
  const bots = match.players.filter((p) => isBotId(p.id) && !round.grades?.[p.id]);
  if (bots.length === 0) return problem;

  const solved = problem ?? (await buildProblemForSeed(round.seed));
  for (const bot of bots) {
    const call = botCall(solved, bot.duelRating, `${round.seed}:${bot.id}`);
    const grade = await gradeCall({
      problem: solved,
      choice: call.choice,
      confidence: call.confidence,
      reasoning: call.reasoning,
    });
    round.commits[bot.id] = {
      choice: call.choice,
      confidence: call.confidence,
      reasoning: call.reasoning,
      lockedAt: nowIso(),
    };
    round.grades = { ...round.grades, [bot.id]: grade };
  }
  return solved;
}

/**
 * Advance a match on read: expire deadlines, bot-fill an empty lobby, let bots
 * lock in, and finalize the round if everyone's now committed. Returns whether
 * anything changed (so callers only persist when needed).
 */
async function progressMatch(match: DuelMatch): Promise<boolean> {
  const before = progressSig(match);
  applyExpiry(match);
  await botFillIfDue(match);
  const solved = await ensureBotMoves(match);
  if (match.state === "round_active") {
    const round = match.rounds[match.currentRound];
    if (match.players.length >= 2 && match.players.every((p) => round.grades?.[p.id])) {
      finalizeRound(match, solved);
    }
  }
  return progressSig(match) !== before;
}

/** Score the current round, then either advance (Best-of-3) or end the match. */
function finalizeRound(match: DuelMatch, problem?: SolvedProblem): void {
  const round = match.rounds[match.currentRound];
  const ids = match.players.map((p) => p.id);
  round.winnerId = roundWinnerId(round, ids);
  round.state = "complete";
  if (problem) {
    round.reveal = problem.reveal;
    round.answer = problem.answer;
  }

  if (isMatchOver(match)) {
    match.winnerId = matchWinnerId(match);
    applyRatings(match);
    match.state = "match_end";
  } else {
    match.currentRound += 1;
    match.rounds.push(newRound(match.id, match.currentRound, match.tempo, match.clock));
    match.state = "round_active";
  }
}

function applyRatings(match: DuelMatch): void {
  if (!match.rated || match.ratingApplied || match.players.length < 2) return;
  const [a, b] = match.players;
  const ua = updateDuelRating({
    rating: a.duelRating,
    opponentRating: b.duelRating,
    result: resultFor(match, a.id),
    matchesPlayed: a.duelMatchesPlayed,
  });
  const ub = updateDuelRating({
    rating: b.duelRating,
    opponentRating: a.duelRating,
    result: resultFor(match, b.id),
    matchesPlayed: b.duelMatchesPlayed,
  });
  a.duelRatingAfter = ua.newRating;
  a.duelDelta = ua.delta;
  b.duelRatingAfter = ub.newRating;
  b.duelDelta = ub.delta;
  match.ratingApplied = true;
}

/** Fallback grade if a finalize is forced without a stored grade (shouldn't happen). */
function bestEffortGrade(): RoundGrade {
  return forfeitGrade();
}

/* ------------------------------------------------------------------ */
/* Public serialization (no commit leaks before both lock)            */
/* ------------------------------------------------------------------ */

export interface PublicRound {
  index: number;
  state: "active" | "complete";
  deadlineAt?: string;
  convertedToAsync?: boolean;
  youCommitted: boolean;
  opponentCommitted: boolean;
  winnerId?: string | null;
  /** present only once the round is complete */
  grades?: Record<string, RoundGrade>;
  /** viewer's raw reasoning — only after the round completes */
  yourReasoning?: string;
  /** opponent's raw reasoning — friend challenges only; ranked queue omits it */
  opponentReasoning?: string;
  reveal?: SolvedProblem["reveal"];
  answer?: ChoiceId;
}

export interface PublicDuelMatch {
  id: string;
  mode: DuelMode;
  modeName: string;
  tempo: DuelTempo;
  clock: DuelClock | null;
  rated: boolean;
  state: DuelMatch["state"];
  currentRound: number;
  roundsTotal: number;
  winsNeeded: number;
  players: PlayerSlot[];
  rounds: PublicRound[];
  winnerId?: string | null;
  challengeCode?: string;
  /** echoes the viewer so the client can split you / opponent */
  you: string;
}

export function toPublic(match: DuelMatch, viewerId: string): PublicDuelMatch {
  const meta = DUEL_MODES[match.mode];
  const friendChallenge = Boolean(match.challengeCode);
  const rounds: PublicRound[] = match.rounds.map((r) => {
    const complete = r.state === "complete";
    const opponentIds = match.players.map((p) => p.id).filter((id) => id !== viewerId);
    const opponentId = opponentIds[0];
    const yourCommit = complete ? r.commits[viewerId] : undefined;
    const oppCommit = complete && opponentId ? r.commits[opponentId] : undefined;
    return {
      index: r.index,
      state: r.state,
      deadlineAt: r.deadlineAt,
      convertedToAsync: r.convertedToAsync,
      youCommitted: Boolean(r.commits[viewerId]),
      opponentCommitted: opponentIds.some((id) => Boolean(r.commits[id])),
      winnerId: complete ? r.winnerId : undefined,
      grades: complete ? r.grades : undefined,
      yourReasoning: yourCommit?.reasoning,
      opponentReasoning: friendChallenge ? oppCommit?.reasoning : undefined,
      reveal: complete ? r.reveal : undefined,
      answer: complete ? r.answer : undefined,
    };
  });

  return {
    id: match.id,
    mode: match.mode,
    modeName: meta.name,
    tempo: match.tempo,
    clock: match.clock,
    rated: match.rated,
    state: match.state,
    currentRound: match.currentRound,
    roundsTotal: meta.rounds,
    winsNeeded: meta.winsNeeded,
    players: match.players,
    rounds,
    winnerId: match.winnerId,
    challengeCode: match.challengeCode,
    you: viewerId,
  };
}

export class DuelError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
