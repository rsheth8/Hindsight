"use client";
import Link from "next/link";
import { SparkChart } from "./SparkChart";
import type { JournalEntry } from "@/lib/profile/store";
import { journalEntryKindLabel, journalEntryKind } from "@/lib/game/journal-entry-kind";
import { COACH } from "@/lib/coach";

export function JournalDetail({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const snap = entry.snapshot;
  const kind = journalEntryKind(entry.problemId);

  return (
    <div className="animate-rise">
      <button type="button" onClick={onClose} className="text-sm text-[var(--muted)]">← Journal</button>
      <h2 className="mt-3 text-lg font-bold">{entry.company}</h2>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        {entry.date} · {journalEntryKindLabel(kind)} · {entry.choiceLabel} at {Math.round(entry.confidence * 100)}%
      </p>

      {snap?.series && snap.series.length > 1 && (
        <div className="card mt-4 overflow-hidden p-2">
          <SparkChart series={snap.series} continuation={snap.continuation} height={140} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Outcome" value={entry.correct ? "Correct" : "Missed"} />
        <MiniStat label="Brier" value={entry.brier.toFixed(2)} />
        <MiniStat label="Reasoning" value={`${Math.round(entry.reasoningScore * 100)}`} />
      </div>

      {entry.reasoning && (
        <div className="card mt-4 px-4 py-3">
          <div className="text-[11px] uppercase text-[var(--muted-2)]">Your thesis</div>
          <p className="mt-1 text-[13px] italic">&ldquo;{entry.reasoning}&rdquo;</p>
        </div>
      )}

      {snap?.explanation && (
        <div className="card mt-4 px-4 py-4">
          <div className="text-sm font-semibold">{COACH.emoji} {COACH.name}&apos;s read</div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{snap.explanation}</p>
        </div>
      )}

      {!snap && (
        <p className="mt-4 text-[12px] text-[var(--muted-2)]">
          Full replay wasn&apos;t saved for this entry. New calls store the full breakdown automatically.
        </p>
      )}

      <div className="mt-4 text-[13px] text-[var(--muted)]">
        {entry.forwardReturnPct >= 0 ? "+" : ""}{entry.forwardReturnPct}% forward · {entry.ratingDelta >= 0 ? "+" : ""}{entry.ratingDelta} rating
      </div>

      <Link href="/practice" className="btn-accent mt-6 block w-full text-center">
        Practice a similar setup
      </Link>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card py-2 text-center">
      <div className="text-[9px] uppercase text-[var(--muted-2)]">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
