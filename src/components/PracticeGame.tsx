"use client";
import { useCallback, useMemo, useState } from "react";
import { SparkChart } from "./SparkChart";
import { Confetti } from "./Confetti";
import { CountUp } from "./CountUp";
import { useProfile } from "@/lib/profile/useProfile";
import { recordPracticeResult, type JournalEntry } from "@/lib/profile/store";
import { isProvisional } from "@/lib/game/rating";
import { buildReasoning, chipsForProblem, hasReasoning } from "@/lib/game/reasoning-chips";
import { conceptsForProblem } from "@/lib/game/concepts";
import {
  derivePracticeFocus,
  focusLabel,
  practiceFocusBlurb,
  type PracticeFocus,
} from "@/lib/game/practice-focus";
import { verdict, transferableSkill, type VerdictTone } from "@/lib/game/progress";
import type { ChoiceId, DailyProblem, GradeResult } from "@/lib/game/types";
import { BlindReplayGame } from "./BlindReplayGame";

import type { Depth } from "@/lib/ai/grade";

type Phase = "hub" | "loading" | "commit" | "grading" | "reveal";

function newSeed() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function vibrate(ms: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

export function PracticeGame() {
  const profile = useProfile();
  const focus = useMemo(() => derivePracticeFocus(profile.history), [profile.history]);
  const [view, setView] = useState<"hub" | "read" | "blind">("hub");
  const [phase, setPhase] = useState<Phase>("hub");
  const [seed, setSeed] = useState(newSeed);
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customReasoning, setCustomReasoning] = useState("");
  const [showCustomReasoning, setShowCustomReasoning] = useState(false);
  const [depth] = useState<Depth>("learn");

  const [result, setResult] = useState<GradeResult | null>(null);
  const [ratingFrom, setRatingFrom] = useState(profile.rating);

  const chips = useMemo(() => (problem ? chipsForProblem(problem) : []), [problem]);
  const reasoning = useMemo(() => buildReasoning(selectedChips, customReasoning), [selectedChips, customReasoning]);
  const canSubmit = choice && hasReasoning(selectedChips, customReasoning);

  const resetRound = useCallback(() => {
    setChoice(null);
    setConfidence(70);
    setSelectedChips([]);
    setCustomReasoning("");
    setShowCustomReasoning(false);
    setResult(null);
    setError(null);
  }, []);

  const loadProblem = useCallback((nextSeed: string, f: PracticeFocus) => {
    resetRound();
    setSeed(nextSeed);
    setPhase("loading");
    const q = new URLSearchParams({ seed: nextSeed, focus: f });
    fetch(`/api/practice?${q}`)
      .then((r) => r.json())
      .then((data: DailyProblem & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setProblem(data);
        setPhase("commit");
      })
      .catch(() => {
        setError("Couldn't load a practice problem.");
        setPhase("hub");
      });
  }, [resetRound]);

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
          practice: { seed, focus },
        }),
      });
      const data: GradeResult & { error?: string } = await res.json();
      if (data.error) { setError(data.error); setPhase("commit"); return; }
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
      setError("Grading failed.");
      setPhase("commit");
    }
  }

  if (view === "blind") return <BlindReplayGame onExit={() => setView("hub")} />;

  if (phase === "hub") {
    return (
      <div className="animate-rise">
        <h1 className="text-xl font-bold">Practice</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">Binge mode — no streak pressure. Rating still moves; daily streak doesn&apos;t.</p>

        <div className="mt-5 rounded-2xl border border-[var(--accent)] bg-[rgba(94,242,176,0.06)] px-4 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">🎯 Targeting</div>
          <div className="mt-1 text-[17px] font-bold">{focusLabel(focus)}</div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{practiceFocusBlurb(focus)}</p>
        </div>

        <button type="button" onClick={() => loadProblem(newSeed(), focus)} className="btn-primary mt-5 w-full py-4 text-[16px]">
          Read the setup
        </button>
        <button type="button" onClick={() => setView("blind")} className="mt-3 w-full rounded-2xl border border-[var(--border)] py-4 text-[16px] font-semibold">
          👁️ Blind replay
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">Reveal the chart week-by-week, then call it.</span>
        </button>
        {error && <p className="mt-3 text-center text-sm text-[var(--bad)]">{error}</p>}

        <h2 className="mt-8 text-sm font-semibold">More modes — coming soon</h2>
        <div className="mt-3 flex flex-col gap-2">
          {["Spot the flaw", "Valuation puzzle", "Calibration bet", "Bias trap"].map((m) => (
            <div key={m} className="card flex items-center justify-between px-4 py-3 opacity-75">
              <span className="text-sm">{m}</span>
              <span className="rounded-full bg-[var(--card-2)] px-2 py-0.5 text-[10px] text-[var(--muted-2)]">soon</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "loading" || !problem) {
    return <div className="animate-pulse pt-10"><div className="h-56 rounded-2xl bg-[var(--card)]" /></div>;
  }

  if (phase === "reveal" && result) {
    const v = verdict(result);
    const skill = transferableSkill(problem, result);
    const r = result.reveal;
    const up = r.forwardReturnPct >= 0;
    const toneColor = verdictToneCss(v.tone);

    return (
      <div className="animate-rise">
        {result.earned && <Confetti />}
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted-2)]">Practice · no streak</div>

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

        <div className="mt-4 rounded-2xl border border-[var(--accent)] bg-[rgba(94,242,176,0.06)] px-4 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">🎯 What you practiced</div>
          <div className="mt-1 font-bold">{skill.title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{skill.line}</p>
        </div>

        <button type="button" onClick={() => loadProblem(newSeed(), focus)} className="btn-primary mt-5 w-full py-4">Another one</button>
        <button type="button" onClick={() => { resetRound(); setPhase("hub"); }} className="mt-3 w-full py-2 text-sm text-[var(--muted)]">Back to Practice hub</button>
      </div>
    );
  }

  const grading = phase === "grading";
  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted-2)]">Practice · {focusLabel(focus)}</div>
          <div className="text-[13px] text-[var(--muted)]">No streak · rating {isProvisional(profile.gradedCount) ? `${profile.rating}?` : profile.rating}</div>
        </div>
        <button type="button" onClick={() => { resetRound(); setPhase("hub"); }} className="text-[13px] text-[var(--muted)]">Exit</button>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="px-2 pt-2"><SparkChart series={problem.series} /></div>
        <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
          {problem.metrics.map((m) => (
            <div key={m.label} className="bg-[var(--card)] px-4 py-2.5">
              <div className="text-[11px] text-[var(--muted)]">{m.label}</div>
              <div className="tnum text-base font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

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
              <button key={chip.id} type="button" onClick={() => setSelectedChips((prev) => sel ? prev.filter((l) => l !== chip.label) : [...prev, chip.label])}
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

      <button type="button" disabled={!canSubmit || grading} onClick={submit} className="btn-primary mt-4 w-full py-4 disabled:opacity-40">
        {grading ? "Grading…" : "Lock in your call"}
      </button>
    </div>
  );
}

function verdictToneCss(tone: VerdictTone): string {
  return ({ accent: "var(--accent)", warn: "var(--warn)", bad: "var(--bad)", fg: "var(--fg)" })[tone];
}
