"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparkChart } from "./SparkChart";
import { CountUp } from "./CountUp";
import { useProfile } from "@/lib/profile/useProfile";
import { recordPracticeResult, type JournalEntry } from "@/lib/profile/store";
import { buildReasoning, chipsForProblem, hasReasoning } from "@/lib/game/reasoning-chips";
import { derivePracticeFocus, focusLabel } from "@/lib/game/practice-focus";
import { COACH } from "@/lib/coach";
import type { ChoiceId, DailyProblem, GradeResult } from "@/lib/game/types";
import type { Depth } from "@/lib/ai/grade";

function newSeed() {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [phase, setPhase] = useState<"play" | "grading" | "reveal">("play");

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const ratingFrom = useRef(profile.rating);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);

  const load = useCallback(async (visible: number) => {
    setLoading(true);
    const q = new URLSearchParams({ seed, focus, visible: String(visible || 42) });
    const res = await fetch(`/api/blind-replay?${q}`);
    const data = await res.json();
    setProblem(data.problem);
    setVisibleDays(data.visibleDays);
    setCanAdvance(data.canAdvance);
    setStepDays(data.stepDays);
    setLoading(false);
  }, [seed, focus]);

  useEffect(() => { load(0); }, [load]);

  if (loading || !problem) return <div className="animate-pulse pt-10"><div className="h-56 rounded-2xl bg-[var(--card)]" /></div>;

  if (phase === "reveal" && result) {
    const r = result.reveal;
    return (
      <div className="animate-rise">
        <p className="text-[11px] uppercase text-[var(--muted-2)]">Blind replay · {visibleDays} days seen</p>
        <div className="hero-num tnum mt-2 text-6xl text-[var(--accent)]"><CountUp from={ratingFrom.current} to={result.newRating} /></div>
        <p className="mt-2 text-sm text-[var(--muted)]">{r.company} · {r.forwardReturnPct >= 0 ? "+" : ""}{r.forwardReturnPct}%</p>
        <div className="mt-4"><SparkChart series={problem.series} continuation={r.continuation} /></div>
        <p className="mt-4 text-sm">{COACH.emoji} {COACH.name}: {result.explanation}</p>
        <button type="button" onClick={onExit} className="btn-primary mt-6 w-full py-4">Back to Practice</button>
      </div>
    );
  }

  async function submit() {
    if (!choice) return;
    setPhase("grading");
    ratingFrom.current = profile.rating;
    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        choice, confidence: confidence / 100, reasoning,
        rating: profile.rating, gradedCount: profile.gradedCount, depth: "learn" as Depth,
        blindReplay: { seed, focus, visibleDays },
      }),
    });
    const data: GradeResult = await res.json();
    setResult(data);
    const entry: JournalEntry = {
      date: new Date().toISOString().slice(0, 10),
      problemId: problem!.id,
      choice, choiceLabel: problem!.choices.find((c) => c.id === choice)!.label,
      confidence: confidence / 100, reasoning,
      correct: data.correct, brier: data.brier, reasoningScore: data.reasoning,
      reasoningNotes: data.reasoningNotes, ratingDelta: data.ratingDelta, ratingAfter: data.newRating,
      earned: data.earned, ticker: data.reveal.ticker, company: data.reveal.company,
      forwardReturnPct: data.reveal.forwardReturnPct, difficulty: problem!.difficulty,
    };
    recordPracticeResult(entry);
    setPhase("reveal");
  }

  return (
    <div className="animate-rise">
      <div className="flex justify-between">
        <span className="text-[11px] uppercase text-[var(--muted-2)]">Blind replay · {focusLabel(focus)}</span>
        <button type="button" onClick={onExit} className="text-sm text-[var(--muted)]">Exit</button>
      </div>
      <p className="mt-2 font-semibold">Watch the chart unfold — then make your call.</p>
      <p className="text-xs text-[var(--muted)]">{visibleDays} trading days visible</p>
      <div className="card mt-4 overflow-hidden"><SparkChart series={problem.series} /></div>
      {canAdvance && (
        <button type="button" onClick={() => load(visibleDays + stepDays)} className="mt-3 w-full rounded-xl border border-[var(--border)] py-3 text-sm font-semibold">
          Reveal next {stepDays} days
        </button>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {problem.choices.map((c) => (
          <button key={c.id} type="button" onClick={() => setChoice(c.id)} className="card py-3 text-left" style={{ borderColor: choice === c.id ? "var(--accent)" : undefined }}>{c.id}. {c.label}</button>
        ))}
      </div>
      <div className="card mt-4 px-4 py-3">
        <input className="dial w-full" type="range" min={50} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
        <div className="tnum text-center text-sm">{confidence}%</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button key={chip.id} type="button" onClick={() => setSelectedChips((p) => p.includes(chip.label) ? p.filter((l) => l !== chip.label) : [...p, chip.label])} className="rounded-full border px-3 py-1 text-xs">{chip.label}</button>
        ))}
      </div>
      <button type="button" disabled={!choice || !hasReasoning(selectedChips, customReasoning)} onClick={submit} className="btn-primary mt-4 w-full py-4 disabled:opacity-40">Lock in</button>
    </div>
  );
}
