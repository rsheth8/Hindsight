"use client";
import { useEffect, useMemo, useState } from "react";
import { SparkChart } from "./SparkChart";
import { BandsStrip, MetricsGrid } from "./SetupContext";
import { Confetti } from "./Confetti";
import { CountUp } from "./CountUp";
import { ShareCard } from "./ShareCard";
import { useProfile } from "@/lib/profile/useProfile";
import { hasPlayed, loadProfile, markMilestonesSeen, recordResult, type JournalEntry, type JournalSnapshot } from "@/lib/profile/store";
import { isProvisional } from "@/lib/game/rating";
import { calibrationCredit } from "@/lib/game/calibration";
import { todayKey } from "@/lib/game/seed";
import { buildReasoning, chipsForProblem, hasReasoning } from "@/lib/game/reasoning-chips";
import { conceptsForProblem } from "@/lib/game/concepts";
import { verdict, transferableSkill, type VerdictTone } from "@/lib/game/progress";
import { getDeviceId } from "@/lib/device-id";
import { COACH } from "@/lib/coach";
import { detectNewMilestones, streakUpdatePreview } from "@/lib/game/milestones";
import { utcResetLabel, secsToUtcMidnight, formatCountdown } from "@/lib/game/utc-reset";
import { HelpTip } from "./HelpTip";
import { MilestoneModal } from "./MilestoneModal";
import { PostDailyCTAs } from "./PostDailyCTAs";
import type { ChoiceId, DailyProblem, GradeResult } from "@/lib/game/types";
import type { Depth } from "@/lib/ai/grade";

type Phase = "loading" | "commit" | "grading" | "reveal" | "done-today";

function vibrate(ms: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

export function DailyGame() {
  const profile = useProfile();
  const [phase, setPhase] = useState<Phase>("loading");
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [showCustomReasoning, setShowCustomReasoning] = useState(false);
  const [depth, setDepth] = useState<Depth>("learn");

  const [result, setResult] = useState<GradeResult | null>(null);
  const [ratingFrom, setRatingFrom] = useState(profile.rating);
  const [milestones, setMilestones] = useState<ReturnType<typeof detectNewMilestones>>([]);

  const today = todayKey();
  const playedToday = useMemo(() => hasPlayed(profile, today), [profile, today]);
  const todayEntry = useMemo(() => profile.history.find((h) => h.date === today), [profile, today]);
  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.error) throw new Error(data.error || `Couldn't load (${r.status})`);
        return data as DailyProblem;
      })
      .then((data) => {
        if (cancelled) return;
        setProblem(data);
        setPhase(hasPlayed(loadOnce(), data.date) ? "done-today" : "commit");
      })
      .catch(() => !cancelled && setError("Could not reach the server."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!choice || !problem) return;
    setRatingFrom(profile.rating);
    setPhase("grading");
    vibrate([18, 40, 18]);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          choice,
          confidence: confidence / 100,
          reasoning,
          rating: profile.rating,
          gradedCount: profile.gradedCount,
          depth,
          deviceId: getDeviceId(),
        }),
      });
      const data: GradeResult & { error?: string } = await res.json();
      if (data.error) { setError(data.error); setPhase("commit"); return; }
      setResult(data);

      const snapshot: JournalSnapshot = {
        explanation: data.explanation,
        series: problem.series,
        continuation: data.reveal.continuation,
        horizonLabel: problem.horizonLabel,
        prompt: problem.prompt,
        problemType: problem.type,
        crowd: data.crowd,
      };

      const entry: JournalEntry = {
        date: problem.date,
        problemId: problem.id,
        choice,
        choiceLabel: problem.choices.find((c) => c.id === choice)!.label,
        confidence: confidence / 100,
        reasoning,
        correct: data.correct,
        brier: data.brier,
        reasoningScore: data.reasoning,
        reasoningNotes: data.reasoningNotes,
        ratingDelta: data.ratingDelta,
        ratingAfter: data.newRating,
        earned: data.earned,
        ticker: data.reveal.ticker,
        company: data.reveal.company,
        forwardReturnPct: data.reveal.forwardReturnPct,
        difficulty: problem.difficulty,
        concepts: conceptsForProblem(problem),
        snapshot,
      };
      const before = loadProfile();
      const streakPreview = streakUpdatePreview(before, problem.date);
      recordResult(entry);
      const after = loadProfile();
      const ms = detectNewMilestones(before, after, { usedFreeze: streakPreview.usedFreeze });
      if (ms.length) {
        markMilestonesSeen(ms.map((m) => m.id));
        setMilestones(ms);
      }
      vibrate(data.earned ? [0, 60, 30, 120] : 30);
      setPhase("reveal");
    } catch {
      setError("Grading failed. Try again.");
      setPhase("commit");
    }
  }

  if (error) return <ErrorState msg={error} />;
  if (phase === "loading" || !problem) return <Skeleton />;

  if (phase === "done-today" && todayEntry) {
    return (
      <>
        <MilestoneModal items={milestones} onDismiss={() => setMilestones([])} />
        <AlreadyPlayed entry={todayEntry} streak={profile.streak} rating={profile.rating} result={result} />
      </>
    );
  }

  if (phase === "reveal" && result) {
    return (
      <>
        <MilestoneModal items={milestones} onDismiss={() => setMilestones([])} />
        <Reveal
          problem={problem}
          result={result}
          ratingFrom={ratingFrom}
          streak={profile.streak}
          choice={choice!}
          depth={depth}
          setDepth={setDepth}
          todayEntry={todayEntry ?? undefined}
        />
      </>
    );
  }

  // ── commit screen ─────────────────────────────────────────────────────────
  const grading = phase === "grading";
  return (
    <div className="animate-rise">
      <TopBar rating={profile.rating} gradedCount={profile.gradedCount} streak={profile.streak} freezes={profile.streakFreezes ?? 1} />

      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4">
          <DifficultyChip d={problem.difficulty} />
          <span className="text-[11px] text-[var(--muted-2)]">Anonymized · {problem.horizonLabel} ahead <HelpTip term="horizon" /></span>
        </div>
        <div className="px-2 pt-2">
          <SparkChart series={problem.series} />
        </div>
        <MetricsGrid metrics={problem.metrics} />
      </div>

      <BandsStrip bands={problem.bands} />

      <h2 className="mt-5 text-[15px] font-semibold text-[var(--fg)]">{problem.prompt}</h2>
      <div className="mt-3 flex flex-col gap-2">
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { setChoice(c.id); vibrate(8); }}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition"
              style={{
                borderColor: sel ? "var(--accent)" : "var(--border)",
                background: sel ? "rgba(240,197,96,0.10)" : "var(--card)",
              }}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                style={{ background: sel ? "var(--accent)" : "var(--card-2)", color: sel ? "#3a2c08" : "var(--muted)" }}
              >
                {c.id}
              </span>
              <span className="text-[15px]">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card mt-5 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[var(--muted)]">How sure are you? <HelpTip term="confidence" /></span>
          <span className="tnum text-2xl font-bold" style={{ color: confColor(confidence) }}>{confidence}%</span>
        </div>
        <input
          className="dial mt-3 w-full"
          type="range"
          min={33}
          max={99}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          onInput={() => vibrate(2)}
        />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--muted-2)]">
          <span>33% · pure guess</span>
          <span>99% · certain</span>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-[var(--muted-2)]">
          You won&apos;t have everything — that&apos;s the point. Set your confidence to how sure you honestly are; you&apos;re scored on calibration, not on being right.
        </p>
      </div>

      <div className="card mt-4 px-4 py-4">
        <div className="text-sm font-medium text-[var(--fg)]">What are you seeing? <HelpTip term="chips" /></div>
        <p className="mt-1 text-[12px] text-[var(--muted)]">Tap what stands out — no essay required. Add your own words if you want.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const sel = selectedChips.includes(chip.label);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setSelectedChips((prev) =>
                    sel ? prev.filter((l) => l !== chip.label) : [...prev, chip.label],
                  );
                  vibrate(6);
                }}
                className="rounded-full border px-3 py-1.5 text-[13px] transition"
                style={{
                  borderColor: sel ? "var(--accent)" : "var(--border)",
                  background: sel ? "rgba(240,197,96,0.14)" : "var(--card-2)",
                  color: sel ? "var(--accent)" : "var(--fg)",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {!showCustomReasoning ? (
          <button
            type="button"
            onClick={() => setShowCustomReasoning(true)}
            className="mt-3 text-[12px] text-[var(--muted)] underline-offset-2 hover:underline"
          >
            + Add your own words
          </button>
        ) : (
          <textarea
            value={customReasoning}
            onChange={(e) => setCustomReasoning(e.target.value)}
            rows={2}
            placeholder="Optional — spell out your read in your own words"
            className="mt-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
          />
        )}
        {isProvisional(profile.gradedCount) && (
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted-2)]">
            Provisional rating — thin reasoning won&apos;t sink you yet ({10 - profile.gradedCount} calls left).
          </p>
        )}
      </div>

      <button
        disabled={!canSubmit || grading}
        onClick={submit}
        className="btn-primary mt-4 w-full py-4 text-[16px] disabled:opacity-40"
      >
        {grading ? "Grading your judgment…" : "Lock in your call"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--muted-2)]">
        Educational only — never buy/sell advice. We grade your decision, not the outcome.
      </p>
      <p className="mt-2 text-center text-[11px] text-[var(--muted-2)]">{utcResetLabel()}</p>
    </div>
  );
}

function loadOnce() { return loadProfile(); }

// ── sub-views ────────────────────────────────────────────────────────────────

function TopBar({ rating, gradedCount, streak, freezes }: { rating: number; gradedCount: number; streak: number; freezes: number }) {
  const prov = isProvisional(gradedCount);
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted-2)]">Hindsight · Daily</div>
        <div className="text-[13px] text-[var(--muted)]">Read the setup. Make the call.</div>
      </div>
      <div className="flex items-center gap-2">
        <Pill label="🔥 Streak" value={String(streak)} />
        {freezes > 0 && <Pill label="🧊 Freeze" value={String(freezes)} />}
        <Pill label="Rating" value={prov ? `${rating}?` : String(rating)} accent />
      </div>
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
      <div className="tnum text-base font-bold" style={{ color: accent ? "var(--accent)" : "var(--fg)" }}>{value}</div>
    </div>
  );
}

function DifficultyChip({ d }: { d: number }) {
  const { label, color } = d < 0.4 ? { label: "Easy", color: "var(--up)" } : d < 0.7 ? { label: "Medium", color: "var(--warn)" } : { label: "Hard", color: "var(--bad)" };
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--card-2)", color }}>
      ● {label}
    </span>
  );
}

function confColor(c: number) {
  if (c >= 90) return "var(--bad)";
  if (c >= 75) return "var(--warn)";
  return "var(--accent)";
}

function verdictToneCss(tone: VerdictTone): string {
  return ({ accent: "var(--accent)", warn: "var(--warn)", bad: "var(--bad)", fg: "var(--fg)" })[tone];
}

function Reveal({
  problem, result, ratingFrom, streak, choice, depth, setDepth, todayEntry,
}: {
  problem: DailyProblem; result: GradeResult; ratingFrom: number; streak: number; choice: ChoiceId; depth: Depth; setDepth: (d: Depth) => void; todayEntry?: JournalEntry;
}) {
  const r = result.reveal;
  const up = r.forwardReturnPct >= 0;
  const calib = calibrationCredit(result.brier);
  const v = verdict(result);
  const skill = transferableSkill(problem, result);
  const toneColor = verdictToneCss(v.tone);
  return (
    <div className="animate-rise">
      {result.earned && <Confetti />}

      <div className="text-center">
        <div
          className="mx-auto inline-block rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-extrabold tracking-wide"
          style={{ borderColor: toneColor, color: toneColor }}
        >
          {v.badge}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="hero-num animate-pop tnum text-6xl" style={{ color: result.ratingDelta >= 0 ? "var(--accent)" : "var(--bad)" }}>
            <CountUp from={ratingFrom} to={result.newRating} />
          </span>
        </div>
        <div className="mt-1 tnum text-sm" style={{ color: result.ratingDelta >= 0 ? "var(--accent)" : "var(--bad)" }}>
          {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} rating · 🔥 {streak}
        </div>
        <p className="mx-auto mt-2 max-w-sm px-2 text-[13px] leading-relaxed text-[var(--muted)]">{v.line}</p>
      </div>

      {/* three-axis scorecard */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Score label="Outcome" emoji={result.correct ? "🟩" : "🟥"} sub={result.correct ? "Correct" : "Missed"} weight="15%" tip="outcome" />
        <Score label="Calibration" emoji={calib > 0.7 ? "🟩" : calib > 0.45 ? "🟨" : "🟥"} sub={`Brier ${result.brier.toFixed(2)}`} weight="45%" tip="calibration" />
        <Score label="Reasoning" emoji={result.reasoning >= 0.66 ? "🟩" : result.reasoning >= 0.4 ? "🟨" : "🟥"} sub={`${Math.round(result.reasoning * 100)}/100`} weight="40%" tip="reasoning" />
      </div>

      {/* reveal chart + identity */}
      <div className="card mt-5 overflow-hidden animate-flip">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <div className="text-[11px] text-[var(--muted-2)]">It was</div>
            <div className="text-lg font-bold">{r.company} <span className="text-[var(--muted)]">{problem.live ? r.ticker : "(demo)"}</span></div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--muted-2)]">Next {problem.horizonLabel}</div>
            <div className="tnum text-xl font-bold" style={{ color: up ? "var(--up)" : "var(--down)" }}>{up ? "+" : ""}{r.forwardReturnPct}%</div>
          </div>
        </div>
        <div className="px-2 pt-2">
          <SparkChart series={problem.series} continuation={r.continuation} />
        </div>
        <div className="px-4 pb-3 text-[11px] text-[var(--muted-2)]">
          {fmtDate(r.decisionDate)} → {fmtDate(r.resolveDate)} · correct answer: <span className="font-semibold text-[var(--fg)]">{problem.choices.find((c) => c.id === result.answer)?.label}</span>
        </div>
      </div>

      {/* crowd split */}
      <div className="card mt-4 px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">How players answered</span>
          <span className="text-[10px] text-[var(--muted-2)]">
            {result.crowdReal ? `real · n=${result.crowdSampleSize ?? "?"}` : "illustrative*"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {problem.choices.map((c) => {
            const pct = result.crowd[c.id];
            const isAns = c.id === result.answer;
            const isMine = c.id === choice;
            return (
              <div key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="w-4 font-bold" style={{ color: isMine ? "var(--accent)" : "var(--muted)" }}>{c.id}</span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-[var(--card-2)]">
                  <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: isAns ? "var(--accent)" : "var(--card-2)", borderRight: isAns ? "none" : "1px solid var(--border)", backgroundColor: isAns ? "var(--accent)" : "#3a2e1c" }} />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[11px] text-[var(--fg)]">{c.label}</span>
                  <span className="absolute inset-y-0 right-2 flex items-center tnum text-[11px] font-semibold">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* coach explanation + depth */}
      <div className="card mt-4 px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{COACH.emoji} {COACH.name}&apos;s read</span>
          <DepthToggle depth={depth} setDepth={setDepth} />
        </div>
        <p className="text-[14px] leading-relaxed text-[var(--fg)]/90">{result.explanation}</p>
        <div className="mt-3 rounded-xl bg-[var(--card-2)] px-3 py-2.5 text-[13px] text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">On your reasoning: </span>{result.reasoningNotes}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--accent)] bg-[rgba(240,197,96,0.07)] px-4 py-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">🎯 What you just practiced</div>
        <div className="mt-1 text-[15px] font-bold text-[var(--fg)]">{skill.title}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{skill.line}</p>
      </div>

      <div className="mt-5">
        <ShareCard
          date={problem.date}
          rating={result.newRating}
          delta={result.ratingDelta}
          streak={streak}
          correct={result.correct}
          brier={result.brier}
          reasoning={result.reasoning}
        />
      </div>

      <PostDailyCTAs entry={todayEntry} result={result} />

      <p className="mt-4 text-center text-[11px] text-[var(--muted-2)]">
        {result.crowdReal
          ? `Crowd split from ${result.crowdSampleSize} real answers today.`
          : "*Crowd split is illustrative until enough players have answered. Come back tomorrow for a fresh problem."}
      </p>
      <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--muted-2)]">
        Anonymized {problem.live ? "real large-cap history (total return)" : "synthetic setup"} · decision dates are balanced across up / flat / down outcomes, so the answer isn&apos;t just &ldquo;stocks go up.&rdquo;
      </p>
    </div>
  );
}

function Score({ label, emoji, sub, weight, tip }: { label: string; emoji: string; sub: string; weight: string; tip?: "outcome" | "calibration" | "reasoning" }) {
  return (
    <div className="card px-2 py-3 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold">
        {label}
        {tip && <HelpTip term={tip === "calibration" ? "brier" : tip === "reasoning" ? "reasoning" : "outcome"} />}
      </div>
      <div className="tnum text-[10px] text-[var(--muted)]">{sub}</div>
      <div className="mt-0.5 text-[9px] text-[var(--muted-2)]">weight {weight}</div>
    </div>
  );
}

function DepthToggle({ depth, setDepth }: { depth: Depth; setDepth: (d: Depth) => void }) {
  const opts: Depth[] = ["learn", "analyst", "quant"];
  return (
    <div className="flex rounded-lg bg-[var(--card-2)] p-0.5 text-[10px]">
      {opts.map((o) => (
        <button key={o} onClick={() => setDepth(o)} className="rounded-md px-2 py-1 capitalize" style={{ background: depth === o ? "var(--accent)" : "transparent", color: depth === o ? "#3a2c08" : "var(--muted)" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function AlreadyPlayed({ entry, streak, rating, result }: { entry: JournalEntry; streak: number; rating: number; result: GradeResult | null }) {
  return (
    <div className="animate-rise pt-6 text-center">
      <div className="text-[12px] uppercase tracking-widest text-[var(--muted-2)]">You&apos;re done for today</div>
      <div className="hero-num tnum mt-2 text-7xl" style={{ color: "var(--accent)" }}>{rating}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">🔥 {streak}-day streak</div>
      <div className="card mt-6 px-4 py-4 text-left">
        <div className="text-sm font-semibold">Today: {entry.company}</div>
        <div className="mt-1 text-[13px] text-[var(--muted)]">
          You called <span className="font-semibold text-[var(--fg)]">{entry.choiceLabel}</span> at {Math.round(entry.confidence * 100)}% — {entry.correct ? "correct" : "missed"} · {entry.ratingDelta >= 0 ? "+" : ""}{entry.ratingDelta} rating.
        </div>
        <div className="mt-2 text-[12px] text-[var(--muted-2)]">{entry.reasoningNotes}</div>
      </div>
      <Countdown />
      <p className="mt-2 text-[12px] text-[var(--muted-2)]">{utcResetLabel()}</p>
      <PostDailyCTAs entry={entry} result={result} />
    </div>
  );
}

function Countdown() {
  const [s, setS] = useState(secsToUtcMidnight());
  useEffect(() => {
    const t = setInterval(() => setS(secsToUtcMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  return <div className="tnum mt-6 text-2xl font-bold text-[var(--fg)]">{formatCountdown(s)}</div>;
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 rounded-xl bg-[var(--card)]" />
      <div className="mt-4 h-56 rounded-2xl bg-[var(--card)]" />
      <div className="mt-5 h-32 rounded-2xl bg-[var(--card)]" />
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="pt-10 text-center">
      <div className="text-4xl">📉</div>
      <p className="mt-3 text-[var(--muted)]">{msg}</p>
      <button onClick={() => location.reload()} className="btn-primary mt-5 px-5 py-2.5">Retry</button>
    </div>
  );
}
