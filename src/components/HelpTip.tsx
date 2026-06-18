"use client";
import { useState } from "react";
import type { GlossaryKey } from "@/lib/game/glossary";
import { GLOSSARY } from "@/lib/game/glossary";

export function HelpTip({ term, className }: { term: GlossaryKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const g = GLOSSARY[term];
  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] text-[9px] font-bold text-[var(--muted-2)]"
        aria-label={`What is ${g.title}?`}
      >
        ?
      </button>
      {open && (
        <span className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-[11px] leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">{g.title}. </span>
          {g.body}
        </span>
      )}
    </span>
  );
}
