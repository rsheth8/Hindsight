"use client";
import { useProfile } from "@/lib/profile/useProfile";
import { journalEntryKind, journalEntryKindLabel } from "@/lib/game/journal-entry-kind";
import { Disclaimer } from "@/components/Disclaimer";

export default function JournalPage() {
  const p = useProfile();
  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold">Journal</h1>
      <p className="mt-1 text-[13px] text-[var(--muted)]">Every call you&apos;ve logged — your thesis, your confidence, and what actually happened.</p>

      {p.history.length === 0 ? (
        <div className="card mt-6 px-5 py-10 text-center text-[var(--muted)]">
          <div className="text-3xl">📓</div>
          <p className="mt-3 text-sm">No calls yet. Play today&apos;s problem to start your track record.</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {p.history.map((h) => (
            <div key={h.problemId} className="card px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{h.company}</span>
                <span className="tnum text-sm font-bold" style={{ color: h.ratingDelta >= 0 ? "var(--accent)" : "var(--bad)" }}>
                  {h.ratingDelta >= 0 ? "+" : ""}{h.ratingDelta}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]">
                <span>{h.date}</span>
                {journalEntryKind(h.problemId) !== "daily" && (
                  <span className="rounded-md bg-[var(--card-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted-2)]">
                    {journalEntryKindLabel(journalEntryKind(h.problemId))}
                  </span>
                )}
                <span>·</span>
                <span>{h.choiceLabel}</span>
                <span>·</span>
                <span>{Math.round(h.confidence * 100)}% sure</span>
                <span>·</span>
                <span style={{ color: h.correct ? "var(--up)" : "var(--down)" }}>{h.correct ? "correct" : "missed"} ({h.forwardReturnPct >= 0 ? "+" : ""}{h.forwardReturnPct}%)</span>
              </div>
              {h.reasoning && <p className="mt-2 text-[13px] italic text-[var(--fg)]/80">“{h.reasoning}”</p>}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
                <span className="rounded-md bg-[var(--card-2)] px-2 py-0.5">reasoning {Math.round(h.reasoningScore * 100)}</span>
                <span className="rounded-md bg-[var(--card-2)] px-2 py-0.5">brier {h.brier.toFixed(2)}</span>
                {h.earned && <span className="rounded-md px-2 py-0.5" style={{ background: "rgba(94,242,176,0.12)", color: "var(--accent)" }}>earned ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Disclaimer className="mt-8" />
    </div>
  );
}
