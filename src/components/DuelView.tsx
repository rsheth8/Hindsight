"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparkChart } from "./SparkChart";
import { useProfile } from "@/lib/profile/useProfile";
import { recordDuelResult } from "@/lib/profile/store";
import { getDeviceId } from "@/lib/device-id";
import { buildReasoning, chipsForProblem, hasReasoning } from "@/lib/game/reasoning-chips";
import {
  CLOCK_LABEL,
  DUEL_MODES,
  duelName,
  explainRound,
  type DuelClock,
  type DuelExplanation,
  type DuelMode,
  type DuelTempo,
  type PlayerSlot,
  type RoundGrade,
} from "@/lib/game/duel";
import { createDuel, joinDuel, getDuelProblem, type DuelIdentity } from "@/lib/duel/client";
import { useDuelMatch } from "@/lib/duel/useDuelMatch";
import type { PublicDuelMatch } from "@/lib/duel/types";
import type { ChoiceId, Choice, DailyProblem } from "@/lib/game/types";

const MODES: DuelMode[] = ["same-board", "best-of-3"];
const TEMPOS: { id: DuelTempo; label: string; sub: string }[] = [
  { id: "live", label: "Live", sub: "Both in the room" },
  { id: "hybrid", label: "Auto", sub: "Live → async fallback" },
  { id: "async", label: "Async", sub: "Send & wait (24h)" },
];
const CLOCKS: DuelClock[] = ["blitz", "rapid", "deep"];

export function DuelView({ onExit }: { onExit: () => void }) {
  const profile = useProfile();
  const [deviceId, setDeviceId] = useState("");
  useEffect(() => { setDeviceId(getDeviceId()); }, []);

  const myName = useMemo(() => (deviceId ? duelName(deviceId) : ""), [deviceId]);
  const identity: DuelIdentity = useMemo(
    () => ({ deviceId, name: myName, duelRating: profile.duelRating, duelMatchesPlayed: profile.duelMatchesPlayed }),
    [deviceId, myName, profile.duelRating, profile.duelMatchesPlayed],
  );

  const { match, setMatch, error, setError, busy, commit, forfeit, clear } = useDuelMatch(deviceId);

  const [mode, setMode] = useState<DuelMode>("same-board");
  const [tempo, setTempo] = useState<DuelTempo>("live");
  const [clock, setClock] = useState<DuelClock>("rapid");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [loadedRound, setLoadedRound] = useState(-1);
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const recordedRef = useRef(false);

  const you = match?.players.find((p) => p.id === match.you) ?? null;
  const opponent = match?.players.find((p) => p.id !== match?.you) ?? null;
  const round = match ? match.rounds[match.currentRound] : null;
  const youCommitted = round?.youCommitted ?? false;

  useEffect(() => {
    if (!match || !deviceId || match.state !== "round_active" || match.currentRound === loadedRound) return;
    let cancelled = false;
    getDuelProblem(match.id, deviceId)
      .then(({ problem: p, round: rIdx }) => {
        if (cancelled) return;
        setProblem(p);
        setLoadedRound(rIdx);
        setChoice(null);
        setConfidence(70);
        setSelectedChips([]);
        setCustomReasoning("");
      })
      .catch(() => !cancelled && setError("Couldn't load the round."));
    return () => { cancelled = true; };
  }, [match, deviceId, loadedRound, setError]);

  useEffect(() => {
    if (!match || match.state !== "match_end" || recordedRef.current) return;
    const me = match.players.find((p) => p.id === match.you);
    if (!me || me.duelRatingAfter === undefined) return;
    recordedRef.current = true;
    recordDuelResult({
      ratingAfter: me.duelRatingAfter,
      result: match.winnerId == null ? "draw" : match.winnerId === me.id ? "win" : "loss",
    });
  }, [match]);

  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = Boolean(choice) && hasReasoning(selectedChips, customReasoning) && !busy;

  const start = useCallback(
    async (kind: "queue" | "friend") => {
      if (!deviceId) return;
      setCreating(true);
      setError(null);
      recordedRef.current = false;
      try {
        const { match: m } = await createDuel({ mode, tempo, clock: tempo === "async" ? null : clock, rated: true, kind, identity });
        setMatch(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start a duel.");
      } finally {
        setCreating(false);
      }
    },
    [deviceId, mode, tempo, clock, identity, setMatch, setError],
  );

  const join = useCallback(async () => {
    const code = joinCode.trim();
    if (!code || !deviceId) return;
    setCreating(true);
    setError(null);
    recordedRef.current = false;
    try {
      const m = await joinDuel(code, identity);
      setMatch(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join that match.");
    } finally {
      setCreating(false);
    }
  }, [joinCode, deviceId, identity, setMatch, setError]);

  const submit = useCallback(async () => {
    if (!choice) return;
    try {
      await commit({ choice, confidence: confidence / 100, reasoning });
    } catch { /* surfaced by hook */ }
  }, [choice, confidence, reasoning, commit]);

  const leave = useCallback(() => {
    clear();
    setProblem(null);
    setLoadedRound(-1);
    recordedRef.current = false;
  }, [clear]);

  // ── lobby ──
  if (!match) {
    return (
      <div className="animate-rise">
        <Header title="Duel" sub="Head-to-head on the same setup — sharper read wins, never returns." onExit={onExit} />
        {myName && <p className="mt-3 text-[12px] text-[var(--muted-2)]">Playing as <span className="font-bold text-[var(--fg)]">{myName}</span></p>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Duel rating" value={String(profile.duelRating)} accent />
          <Stat label="Wins" value={String(profile.duelWins)} />
          <Stat label="Losses" value={String(profile.duelLosses)} />
        </div>

        <SectionLabel>Mode</SectionLabel>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => {
            const meta = DUEL_MODES[m];
            const sel = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${sel ? "border-[var(--accent)] bg-[rgba(94,242,176,0.08)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
                <div className="font-bold">{meta.emoji}  {meta.name}</div>
                <div className="mt-0.5 text-[12px] text-[var(--muted)]">{meta.blurb}</div>
              </button>
            );
          })}
        </div>

        <SectionLabel>Tempo</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {TEMPOS.map((t) => {
            const sel = tempo === t.id;
            return (
              <button key={t.id} onClick={() => setTempo(t.id)}
                className={`rounded-xl border px-2 py-3 text-center transition ${sel ? "border-[var(--accent)] bg-[rgba(94,242,176,0.08)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
                <div className={`text-sm font-bold ${sel ? "text-[var(--accent)]" : ""}`}>{t.label}</div>
                <div className="mt-0.5 text-[10px] text-[var(--muted-2)]">{t.sub}</div>
              </button>
            );
          })}
        </div>

        {tempo !== "async" && (
          <>
            <SectionLabel>Clock</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {CLOCKS.map((cl) => {
                const sel = clock === cl;
                return (
                  <button key={cl} onClick={() => setClock(cl)}
                    className={`rounded-xl border py-3 text-center text-[13px] font-bold transition ${sel ? "border-[var(--accent)] bg-[rgba(94,242,176,0.08)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
                    {CLOCK_LABEL[cl]}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <p className="mt-4 text-center text-[13px] text-[var(--bad)]">{error}</p>}

        <button disabled={creating} onClick={() => start("queue")}
          className="mt-5 w-full rounded-2xl bg-[var(--accent)] py-4 font-bold text-[var(--accent-ink)] disabled:opacity-50">
          {creating ? "Finding…" : "Find opponent"}
        </button>
        <button disabled={creating} onClick={() => start("friend")}
          className="mt-2.5 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] py-3.5 font-bold disabled:opacity-50">
          Challenge a friend
        </button>

        <div className="mt-4 flex gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Join code"
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2.5 text-sm outline-none" />
          <button disabled={creating || !joinCode.trim()} onClick={join}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold disabled:opacity-50">Join</button>
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--muted-2)]">Open two tabs (or share a join code) to play a full match.</p>
      </div>
    );
  }

  if (match.state === "match_end") {
    return <Reveal match={match} you={you} opponent={opponent} problem={problem} onRematch={leave} onExit={onExit} />;
  }

  if (match.state === "abandoned") {
    return (
      <Centered>
        <div className="text-4xl">🕊️</div>
        <p className="mt-3 text-center text-[var(--muted)]">This match was abandoned — no opponent locked in.</p>
        <Primary onClick={leave}>Back to duels</Primary>
      </Centered>
    );
  }

  if (match.state === "waiting_opponent") {
    return <Waiting match={match} onCancel={() => { void forfeit(); leave(); }} onExit={onExit} />;
  }

  if (youCommitted) {
    return (
      <Centered>
        <div className="text-4xl">🔒</div>
        <div className="mt-3 text-lg font-bold">Locked in</div>
        <p className="mt-1.5 text-center text-[var(--muted)]">Waiting for {opponent?.name ?? "your opponent"} to make their call…</p>
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--muted-2)]"><Spinner /> {opponent?.name ?? "Opponent"} is thinking</div>
        <div className="mt-4 text-[12px] text-[var(--muted-2)]">Round {match.currentRound + 1} of {match.roundsTotal}</div>
        <button onClick={onExit} className="mt-6 text-[12px] text-[var(--muted-2)]">Back to Rank</button>
      </Centered>
    );
  }

  if (!problem) return <Centered><Spinner big /></Centered>;

  // ── round commit ──
  return (
    <div className="animate-rise">
      <MatchHeader match={match} you={you} opponent={opponent} onExit={onExit} />
      <RoundClock deadlineAt={round?.deadlineAt} converted={round?.convertedToAsync} />

      <div className="card mt-3 overflow-hidden p-0">
        <div className="px-1 pt-3"><SparkChart series={problem.series} /></div>
        <div className="flex flex-wrap border-t border-[var(--border)]">
          {problem.metrics.map((m, i) => (
            <div key={m.label} className={`w-1/2 px-4 py-2.5 ${i > 1 ? "border-t" : ""} ${i % 2 === 0 ? "border-r" : ""} border-[var(--border)]`}>
              <div className="text-[11px] text-[var(--muted)]">{m.label}</div>
              <div className="tnum text-base font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[15px] font-semibold">{problem.prompt}</p>

      <div className="mt-3 flex flex-col gap-2">
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <button key={c.id} onClick={() => setChoice(c.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${sel ? "border-[var(--accent)] bg-[rgba(94,242,176,0.08)]" : "border-[var(--border)] bg-[var(--card)]"}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${sel ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--card-2)] text-[var(--muted)]"}`}>{c.id}</span>
              <span className="text-[15px]">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card mt-4 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[var(--muted)]">How sure are you?</span>
          <span className="tnum text-2xl font-extrabold" style={{ color: confColor(confidence) }}>{confidence}%</span>
        </div>
        <input type="range" min={33} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}
          className="mt-2.5 w-full accent-[var(--accent)]" />
      </div>

      <div className="card mt-4 px-4 py-4">
        <div className="text-sm font-semibold">What are you seeing?</div>
        <div className="mt-1 text-[12px] text-[var(--muted)]">Tap what stands out — sharper read wins the round.</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const sel = selectedChips.includes(chip.label);
            return (
              <button key={chip.id} onClick={() => setSelectedChips((prev) => sel ? prev.filter((l) => l !== chip.label) : [...prev, chip.label])}
                className={`rounded-full border px-3 py-1.5 text-[13px] transition ${sel ? "border-[var(--accent)] bg-[rgba(94,242,176,0.12)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--card-2)]"}`}>
                {chip.label}
              </button>
            );
          })}
        </div>
        <textarea value={customReasoning} onChange={(e) => setCustomReasoning(e.target.value)}
          placeholder="Optional — add your own words"
          className="mt-3 min-h-[56px] w-full rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2.5 text-[13px] outline-none" />
      </div>

      {error && <p className="mt-3 text-center text-[13px] text-[var(--bad)]">{error}</p>}

      <button disabled={!canSubmit} onClick={submit}
        className="mt-4 w-full rounded-2xl bg-[var(--accent)] py-4 font-bold text-[var(--accent-ink)] disabled:opacity-40">
        {busy ? "Locking in…" : "Lock in your call"}
      </button>
      <p className="mt-3 text-center text-[11px] text-[var(--muted-2)]">Educational only — graded on judgment, never the outcome.</p>
    </div>
  );
}

/* ── sub-views ── */

function Waiting({ match, onCancel, onExit }: { match: PublicDuelMatch; onCancel: () => void; onExit: () => void }) {
  const isFriend = Boolean(match.challengeCode);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(match.challengeCode ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }
  return (
    <Centered>
      <Spinner big />
      <div className="mt-4 text-lg font-bold">{isFriend ? "Waiting for your friend" : "Finding an opponent…"}</div>
      <p className="mt-1.5 max-w-xs text-center text-[13px] text-[var(--muted)]">
          {isFriend ? "Share the join code — the match starts when they join." : "Matching you with someone near your duel rating — or a quick AI opponent if no one's around."}
      </p>
      {isFriend && (
        <>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-center">
            <div className="text-[11px] text-[var(--muted-2)]">JOIN CODE</div>
            <div className="tnum text-xl font-extrabold tracking-widest text-[var(--accent)]">{match.challengeCode}</div>
          </div>
          <Primary onClick={copy}>{copied ? "Copied!" : "Copy join code"}</Primary>
        </>
      )}
      <button onClick={onCancel} className="mt-3.5 text-[var(--muted)]">Cancel</button>
      <button onClick={onExit} className="mt-4 text-[12px] text-[var(--muted-2)]">Back to Rank</button>
    </Centered>
  );
}

function Reveal({ match, you, opponent, problem, onRematch, onExit }: {
  match: PublicDuelMatch; you: PlayerSlot | null; opponent: PlayerSlot | null; problem: DailyProblem | null; onRematch: () => void; onExit: () => void;
}) {
  const [showOppReasoning, setShowOppReasoning] = useState(false);
  const isFriend = Boolean(match.challengeCode);
  const won = match.winnerId === match.you;
  const draw = match.winnerId == null;
  const title = draw ? "DRAW" : won ? "YOU WIN" : "YOU LOSE";
  const tone = draw ? "var(--warn)" : won ? "var(--accent)" : "var(--bad)";
  const delta = you?.duelDelta ?? 0;
  const completedRounds = match.rounds.filter((r) => r.state === "complete");
  const lastRound = [...completedRounds].reverse()[0];
  const reveal = lastRound?.reveal;
  const up = (reveal?.forwardReturnPct ?? 0) >= 0;
  const youName = you?.name ?? "You";
  const oppName = (opponent?.name ?? "Opponent") + (opponent?.isBot ? " 🤖" : "");
  const choiceLabels = problem?.choices;

  const yg = you && lastRound ? lastRound.grades?.[you.id] : undefined;
  const og = opponent && lastRound ? lastRound.grades?.[opponent.id] : undefined;
  const lastOutcome: "win" | "loss" | "draw" =
    lastRound?.winnerId == null ? "draw" : lastRound.winnerId === match.you ? "win" : "loss";
  const explanation: DuelExplanation | null = yg && og ? explainRound(yg, og, lastOutcome) : null;

  return (
    <div className="animate-rise">
      <div className="flex flex-col items-center">
        <div className="rounded-full border-[1.5px] px-4 py-1.5 text-[15px] font-extrabold tracking-wider" style={{ borderColor: tone, color: tone }}>{title}</div>
        <div className="tnum mt-3 text-5xl font-extrabold" style={{ color: tone }}>{delta >= 0 ? "+" : ""}{delta}</div>
        <div className="text-[13px] text-[var(--muted)]">duel rating · now {you?.duelRatingAfter ?? "—"}</div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {completedRounds.map((r) => {
          const ryg = you ? r.grades?.[you.id] : undefined;
          const rog = opponent ? r.grades?.[opponent.id] : undefined;
          const youWonRound = r.winnerId === match.you;
          const roundChoices = r.index === match.currentRound ? choiceLabels : undefined;
          return (
            <div key={r.index} className="card px-3.5 py-3">
              {match.roundsTotal > 1 && (
                <div className="mb-2 text-[11px] text-[var(--muted-2)]">Round {r.index + 1} · {r.winnerId == null ? "draw" : youWonRound ? "you won" : "you lost"}</div>
              )}
              <div className="flex gap-2.5">
                <GradeCol name={`You · ${youName}`} grade={ryg} highlight={youWonRound} choices={roundChoices} />
                <GradeCol name={oppName} grade={rog} highlight={!youWonRound && r.winnerId != null} choices={roundChoices} />
              </div>
              {r.yourReasoning && ryg && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Your call</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg)]">{r.yourReasoning}</p>
                  {ryg.reasoningNotes && (
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
                      <span className="font-semibold text-[var(--fg)]">On your reasoning: </span>{ryg.reasoningNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isFriend && lastRound?.opponentReasoning && (
        <div className="card mt-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowOppReasoning((v) => !v)}
            className="text-[13px] font-semibold text-[var(--accent)]"
          >
            {showOppReasoning ? "Hide their call" : `See ${oppName}'s call`}
          </button>
          {showOppReasoning && (
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{lastRound.opponentReasoning}</p>
          )}
        </div>
      )}

      {explanation && (
        <div className="card mt-4 px-4 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Why{match.roundsTotal > 1 ? " — final round" : ""}</div>
          <div className="mt-1 text-base font-extrabold">{explanation.headline}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{explanation.summary}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {explanation.factors.map((f) => (
              <div key={f.label} className="flex items-start gap-2 text-[13px]">
                <span className="mt-0.5" style={{ color: edgeColor(f.edge) }}>{edgeMark(f.edge)}</span>
                <span><span className="font-semibold">{f.label}:</span> <span className="text-[var(--muted)]">{f.detail}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reveal && (
        <div className="card mt-4 overflow-hidden p-0">
          <div className="flex justify-between px-4 pt-3.5">
            <div>
              <div className="text-[11px] text-[var(--muted-2)]">It was</div>
              <div className="text-lg font-bold">{reveal.company} <span className="text-[var(--muted)]">{problem?.live ? reveal.ticker : "(demo)"}</span></div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[var(--muted-2)]">Forward</div>
              <div className="tnum text-xl font-bold" style={{ color: up ? "var(--up)" : "var(--down)" }}>{up ? "+" : ""}{reveal.forwardReturnPct}%</div>
            </div>
          </div>
          {problem && <div className="px-1 pb-3 pt-2"><SparkChart series={problem.series} continuation={reveal.continuation} /></div>}
        </div>
      )}

      <Primary onClick={onRematch}>New duel</Primary>
      <button onClick={onExit} className="mt-3 block w-full text-center text-[13px] text-[var(--muted-2)]">Back to Rank</button>
    </div>
  );
}

function GradeCol({ name, grade, highlight, choices }: { name: string; grade?: RoundGrade; highlight: boolean; choices?: Choice[] }) {
  const pickLine = gradePickLine(grade, choices);
  return (
    <div className={`flex-1 rounded-xl border px-3 py-2.5 ${highlight ? "border-[var(--accent)] bg-[rgba(94,242,176,0.08)]" : "border-[var(--border)] bg-[var(--card-2)]"}`}>
      <div className={`text-[12px] font-bold ${highlight ? "text-[var(--accent)]" : ""}`}>{name}</div>
      <div className="tnum mt-1.5 text-2xl font-extrabold">{grade ? grade.score.toFixed(2) : "—"}</div>
      <div className="text-[10px] text-[var(--muted-2)]">skill score</div>
      {grade && (
        <>
          {pickLine && <div className="mt-1.5 text-[11px] text-[var(--fg)]">{pickLine}</div>}
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {grade.forfeit ? "no call" : `${confidenceLabel(grade)} · cal ${(1 - grade.brier).toFixed(2)} · reas ${Math.round(grade.reasoning * 100)}`}
          </div>
        </>
      )}
    </div>
  );
}

function gradePickLine(grade: RoundGrade | undefined, choices?: Choice[]): string | null {
  if (!grade || grade.forfeit || !grade.choice) return grade?.forfeit ? "No call" : null;
  const label = choices?.find((c) => c.id === grade.choice)?.label ?? grade.choice;
  return `Pick · ${label}${grade.correct ? " ✓" : ""}`;
}

function confidenceLabel(grade: RoundGrade): string {
  return `${Math.round(grade.confidence * 100)}% confident`;
}

function MatchHeader({ match, you, opponent, onExit }: { match: PublicDuelMatch; you: PlayerSlot | null; opponent: PlayerSlot | null; onExit: () => void }) {
  const completed = match.rounds.filter((r) => r.state === "complete");
  const youWins = completed.filter((r) => r.winnerId === match.you).length;
  const oppWins = completed.filter((r) => r.winnerId && r.winnerId !== match.you).length;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className="font-bold text-[var(--accent)]">{you?.name ?? "You"} <span className="text-[var(--muted-2)]">{you?.duelRating}</span></span>
        {match.roundsTotal > 1 && <span className="tnum">{youWins}–{oppWins}</span>}
        <span className="text-[var(--muted-2)]">vs</span>
        <span className="font-bold">{opponent?.name ?? "Opponent"}{opponent?.isBot ? " 🤖" : ""} <span className="text-[var(--muted-2)]">{opponent?.duelRating}</span></span>
      </div>
      <button onClick={onExit} className="text-[12px] text-[var(--muted-2)]">Exit</button>
    </div>
  );
}

function RoundClock({ deadlineAt, converted }: { deadlineAt?: string; converted?: boolean }) {
  const [left, setLeft] = useState(() => secsLeft(deadlineAt));
  useEffect(() => {
    setLeft(secsLeft(deadlineAt));
    const t = setInterval(() => setLeft(secsLeft(deadlineAt)), 1000);
    return () => clearInterval(t);
  }, [deadlineAt]);
  if (!deadlineAt) return null;
  const long = left > 3600;
  return (
    <div className="mt-2.5 flex items-center justify-center gap-1.5">
      <span className="text-[12px]" style={{ color: converted ? "var(--warn)" : "var(--muted)" }}>{converted ? "Async — opponent has time" : long ? "Time left" : "⏱"}</span>
      <span className="tnum text-sm font-bold" style={{ color: left <= 10 && !long ? "var(--bad)" : "var(--fg)" }}>{long ? `${Math.round(left / 3600)}h` : fmtClock(left)}</span>
    </div>
  );
}

function Header({ title, sub, onExit }: { title: string; sub: string; onExit: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{sub}</p>
      </div>
      <button onClick={onExit} className="text-sm text-[var(--muted)]">Done</button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--muted-2)]">{children}</div>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="tnum mt-0.5 text-xl font-extrabold" style={{ color: accent ? "var(--accent)" : "var(--fg)" }}>{value}</div>
    </div>
  );
}

function Primary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="mt-4 w-full rounded-2xl bg-[var(--accent)] py-3.5 font-bold text-[var(--accent-ink)]">{children}</button>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center">{children}</div>;
}

function Spinner({ big }: { big?: boolean }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-[var(--card-2)] border-t-[var(--accent)] ${big ? "h-8 w-8" : "h-4 w-4"}`} />;
}

function edgeColor(edge: "you" | "opponent" | "even") {
  return edge === "you" ? "var(--accent)" : edge === "opponent" ? "var(--bad)" : "var(--muted-2)";
}
function edgeMark(edge: "you" | "opponent" | "even") {
  return edge === "you" ? "▲" : edge === "opponent" ? "▼" : "—";
}
function confColor(c: number) {
  if (c >= 90) return "var(--bad)";
  if (c >= 75) return "var(--warn)";
  return "var(--accent)";
}
function secsLeft(deadlineAt?: string) {
  if (!deadlineAt) return 0;
  return Math.max(0, Math.floor((Date.parse(deadlineAt) - Date.now()) / 1000));
}
function fmtClock(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }
