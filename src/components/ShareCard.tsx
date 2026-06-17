"use client";
import { useRef, useState } from "react";
import { shareResultImage, shareRow, shareText } from "@/lib/share-image";

/** Wordle-style shareable result — image card + text fallback. */
export function ShareCard({
  date, rating, delta, streak, correct, brier, reasoning,
}: {
  date: string; rating: number; delta: number; streak: number; correct: boolean; brier: number; reasoning: number;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = { date, rating, delta, streak, correct, brier, reasoning };
  const row = shareRow(input);
  const text = shareText(input);
  const previewRef = useRef<HTMLDivElement>(null);

  async function share() {
    setBusy(true);
    try {
      await shareResultImage(input);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { /* noop */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div ref={previewRef} className="card overflow-hidden px-4 py-5 text-center">
        <div className="text-[11px] uppercase tracking-widest text-[var(--muted-2)]">Hindsight · {date}</div>
        <div className="my-2 text-4xl tracking-widest">{row}</div>
        <div className="tnum text-5xl font-extrabold" style={{ color: delta >= 0 ? "var(--accent)" : "var(--bad)" }}>{rating}</div>
        <div className="tnum mt-1 text-sm" style={{ color: delta >= 0 ? "var(--accent)" : "var(--bad)" }}>
          {delta >= 0 ? "+" : ""}{delta} rating · 🔥 {streak}
        </div>
        <div className="mt-2 text-[12px] text-[var(--muted)]">outcome · calibration · reasoning</div>
      </div>
      <button onClick={share} disabled={busy} className="btn-primary mt-3 w-full py-3.5 disabled:opacity-50">
        {busy ? "Preparing…" : copied ? "Copied ✓" : "Share result"}
      </button>
    </div>
  );
}
