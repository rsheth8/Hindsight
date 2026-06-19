"use client";
import { useState } from "react";
import type { SetupMetric, SetupBand } from "@/lib/game/types";

/** Qualitative context chips (trend / sector / fundamentals). Tap any chip to
 *  reveal what it means — gives the player something to reason with. */
export function BandsStrip({ bands }: { bands?: SetupBand[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!bands || bands.length === 0) return null;
  const hint = open != null ? bands[open]?.hint : null;
  return (
    <div className="mt-4">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--muted-2)]">Where things stand</div>
      <div className="flex flex-wrap gap-2">
        {bands.map((b, i) => {
          const sel = open === i;
          return (
            <button
              key={`${b.label}-${i}`}
              onClick={() => setOpen(sel ? null : i)}
              className={`rounded-xl border px-3 py-2 text-left transition ${sel ? "border-[var(--accent)] bg-[rgba(240,197,96,0.10)]" : "border-[var(--border)] bg-[var(--card)]"}`}
            >
              <div className="text-[9px] uppercase tracking-wide text-[var(--muted-2)]">{b.label}</div>
              <div className="text-[13px] font-medium text-[var(--fg)]">{b.value}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-[var(--muted)]">
        {hint ?? "Tap any chip for what it means — anonymized, point-in-time context."}
      </p>
    </div>
  );
}

/** Setup metrics grid with tap-to-reveal hints (the hints existed but were never
 *  surfaced). Shared by the Daily and Practice setups. */
export function MetricsGrid({ metrics }: { metrics: SetupMetric[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!metrics || metrics.length === 0) return null;
  const active = open != null ? metrics[open] : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        {metrics.map((m, i) => {
          const sel = open === i;
          return (
            <button
              key={m.label}
              onClick={() => m.hint && setOpen(sel ? null : i)}
              className={`px-4 py-2.5 text-left ${sel ? "bg-[rgba(240,197,96,0.06)]" : "bg-[var(--card)]"}`}
            >
              <div className="text-[11px] text-[var(--muted)]">{m.label}{m.hint ? " ⓘ" : ""}</div>
              <div className="tnum text-base font-semibold">{m.value}</div>
            </button>
          );
        })}
      </div>
      {active?.hint ? (
        <div className="border-t border-[var(--border)] px-4 py-2.5 text-[12px] leading-snug text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">{active.label}: </span>{active.hint}
        </div>
      ) : null}
    </>
  );
}
