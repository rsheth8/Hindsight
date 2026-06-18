"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SparkChart } from "./SparkChart";
import { CountUp } from "./CountUp";
import { Confetti } from "./Confetti";
import { ShareCard } from "./ShareCard";
import { DepthToggle } from "./DepthToggle";
import { Disclaimer } from "./Disclaimer";
import { useProfile } from "@/lib/profile/useProfile";
import { recordPracticeResult, type JournalEntry } from "@/lib/profile/store";
import { buildReasoning, chipsForProblem, hasReasoning } from "@/lib/game/reasoning-chips";
import { conceptsForProblem } from "@/lib/game/concepts";
import { derivePracticeFocus, focusLabel } from "@/lib/game/practice-focus";
import { verdict, transferableSkill, type VerdictTone } from "@/lib/game/progress";
import { COACH } from "@/lib/coach";
import type { ChoiceId, DailyProblem, GradeResult } from "@/lib/game/types";
import type { Depth } from "@/lib/ai/grade";

function newSeed() {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function vibrate(ms: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

export function BlindReplayGame({ onExit }: { onExit: () => void }) {
  const profile = useProfile();
  const focus = useMemo(() => derivePracticeFocus(profile.history), [profile.history]);
  const [seed] = useState(newSeed);
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [visibleDays, setVisibleDays] = useState(42);
  const [canAdvance, setCanAdvance] = useState(true);
  const [stepDays, setStepDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"play" | "grading" | "reveal">("play");

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [showCustomReasoning, setShowCustomReasoning] = useState(false);
  const [depth, setDepth] = useState<Depth>("learn");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [ratingFrom, setRatingFrom] = useState(profile.rating);

  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  const load = useCallback(async (visible: number) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ seed, focus, visible: String(visible || 42) });
      const res = await fetch(`/api/blind-replay?${q}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Load failed (${res.status})`);
      setProblem(data.problem);
      setVisibleDays(data.visibleDays);
      setCanAdvance(data.canAdvance);
      setStepDays(data.stepDays);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load blind replay.");
      setProblem(null);
    } finally {
      setLoading(false);
    }
  }, [seed, focus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({ seed, focus, visible: "42" });
        const res = await fetch(`/api/blind-replay?${q}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) throw new Error(data.error || `Load failed (${res.status})`);
        setProblem(data.problem);
        setVisibleDays(data.visibleDays);
        setCanAdvance(data.canAdvance);
        setStepDays(data.stepDays);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Couldn't load blind replay.");
          setProblem(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seed, focus]);

  if (loading && !problem) {
    return <div className="animate-pulse pt-10"><div className="h-56 rounded-2xl bg-[var(--card)]" /></div>;
  }

  if (error && !problem) {
    return (
      <div className="pt-10 text-center">
        <div className="text-4xl">👁️</div>
        <p className="mt-3 text-[var(--muted)]">{error}</p>
        <button type="button" onClick={() => load(0)} className="btn-primary mt-5 px-5 py-2.5">Retry</button>
        <button type="button" onClick={onExit} className="mt-3 block w-full text-sm text-[var(--muted)]">Back to Practice</button>
      </div>
    );
  }

  if (!problem) return null;

  if (phase === "reveal" && result) {
    const v = verdict(result);
    const skill = transferableSkill(problem, result);
    const r = result.reveal;
    const up = r.forwardReturnPct >= 0;
    const toneColor = verdictToneCss(v.tone);

    return (
      <div className="animate-rise">
        {result.earned && <Confetti />}
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted-2)]">Blind replay · {visibleDays} days seen</p>

        <div className="mt-2 text-center">
          <div className="mx-auto inline-block rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-extrabold" style={{ borderColor: toneColor, color: toneColor }}>{v.badge}</div>
          <div className="hero-num tnum mt-2 text-6xl" style={{ color: result.ratingDelta >= 0 ? "var(--accent)" : "var(--bad)" }}>
            <CountUp from={ratingFrom} to={result.newRating} />
          </div>
          <div className="tnum text-sm" style={{ color: result.ratingDelta >= 0 ? "var(--accent)" : "var(--bad)" }}>
            {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} rating
          </div>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">{v.line}</p>
        </div>

        <div className="card mt-5 overflow-hidden">
          <div className="px-4 pt-4">
            <div className="text-lg font-bold">{r.company}</div>
            <div className="tnum text-xl font-bold" style={{ color: up ? "var(--up)" : "var(--down)" }}>{up ? "+" : ""}{r.forwardReturnPct}%</div>
          </div>
          <div className="px-2 pt-2"><SparkChart series={problem.series} continuation={r.continuation} /></div>
        </div>

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

        <div className="mt-4 rounded-2xl border border-[var(--accent)] bg-[rgba(94,242,176,0.06)] px-4 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">🎯 What you practiced</div>
          <div className="mt-1 font-bold">{skill.title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{skill.line}</p>
        </div>

        <div className="mt-5">
          <ShareCard
            date={problem.date}
            rating={result.newRating}
            delta={result.ratingDelta}
            streak={profile.streak}
            correct={result.correct}
            brier={result.brier}
            reasoning={result.reasoning}
          />
        </div>

        <button type="button" onClick={onExit} className="btn-primary mt-5 w-full py-4">Back to Practice</button>
        <Disclaimer className="mt-4" />
      </div>
    );
  }

  async function submit() {
    if (!choice || !problem) return;
    setRatingFrom(profile.rating);
    setPhase("grading");
    setError(null);
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
          blindReplay: { seed, focus, visibleDays },
        }),
      });
      const data: GradeResult & { error?: string } = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Grading failed.");
        setPhase("play");
        return;
      }
      setResult(data);
      const entry: JournalEntry = {
        date: new Date().toISOString().slice(0, 10),
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
      };
      recordPracticeResult(entry);
      vibrate(data.earned ? [0, 60, 30, 120] : 30);
      setPhase("reveal");
    } catch {
      setError("Grading failed. Check your connection and try again.");
      setPhase("play");
    }
  }

  const grading = phase === "grading";

  return (
    <div className="animate-rise">
      <div className="flex justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted-2)]">Blind replay · {focusLabel(focus)}</span>
        <button type="button" onClick={onExit} className="text-sm text-[var(--muted)]">Exit</button>
      </div>
      <p className="mt-2 font-semibold">Watch the chart unfold — then make your call.</p>
      <p className="text-xs text-[var(--muted)]">{visibleDays} trading days visible · no ticker until reveal</p>

      <div className="card mt-4 overflow-hidden"><SparkChart series={problem.series} /></div>

      {canAdvance && (
        <button type="button" onClick={() => load(visibleDays + stepDays)} disabled={loading}
          className="mt-3 w-full rounded-xl border border-[var(--border)] py-3 text-sm font-semibold disabled:opacity-50">
          {loading ? "Loading…" : `Reveal next ${stepDays} days`}
        </button>
      )}

      <h2 className="mt-5 text-[15px] font-semibold">{problem.prompt}</h2>
      <div className="mt-3 flex flex-col gap-2">
        {problem.choices.map((c) => {
          const sel = choice === c.id;
          return (
            <button key={c.id} type="button" onClick={() => { setChoice(c.id); vibrate(8); }}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left"
              style={{ borderColor: sel ? "var(--accent)" : "var(--border)", background: sel ? "rgba(94,242,176,0.08)" : "var(--card)" }}>
              <span className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold" style={{ background: sel ? "var(--accent)" : "var(--card-2)", color: sel ? "#062013" : "var(--muted)" }}>{c.id}</span>
              <span className="text-[15px]">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card mt-4 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[var(--muted)]">How sure are you?</span>
          <span className="tnum text-2xl font-bold text-[var(--accent)]">{confidence}%</span>
        </div>
        <input className="dial mt-3 w-full" type="range" min={50} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
      </div>

      <div className="card mt-4 px-4 py-4">
        <div className="text-sm font-medium">What are you seeing?</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const sel = selectedChips.includes(chip.label);
            return (
              <button key={chip.id} type="button" onClick={() => setSelectedChips((p) => sel ? p.filter((l) => l !== chip.label) : [...p, chip.label])}
                className="rounded-full border px-3 py-1.5 text-[13px]"
                style={{ borderColor: sel ? "var(--accent)" : "var(--border)", background: sel ? "rgba(94,242,176,0.12)" : "var(--card-2)", color: sel ? "var(--accent)" : "var(--fg)" }}>
                {chip.label}
              </button>
            );
          })}
        </div>
        {!showCustomReasoning ? (
          <button type="button" onClick={() => setShowCustomReasoning(true)} className="mt-3 text-[12px] text-[var(--muted)]">+ Add your own words</button>
        ) : (
          <textarea value={customReasoning} onChange={(e) => setCustomReasoning(e.target.value)} rows={2} placeholder="Optional"
            className="mt-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-[13px] outline-none" />
        )}
      </div>

      {error && <p className="mt-3 text-center text-sm text-[var(--bad)]">{error}</p>}

      <button type="button" disabled={!canSubmit || grading} onClick={submit} className="btn-primary mt-4 w-full py-4 disabled:opacity-40">
        {grading ? "Grading…" : "Lock in your call"}
      </button>
      <Disclaimer className="mt-4" />
    </div>
  );
}

function verdictToneCss(tone: VerdictTone): string {
  return ({ accent: "var(--accent)", warn: "var(--warn)", bad: "var(--bad)", fg: "var(--fg)" })[tone];
}
