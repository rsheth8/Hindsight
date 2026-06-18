"use client";
import type { Milestone } from "@/lib/game/milestones";

export function MilestoneModal({ items, onDismiss }: { items: Milestone[]; onDismiss: () => void }) {
  if (items.length === 0) return null;
  const m = items[0]!;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onDismiss}>
      <div
        className="card w-full max-w-sm animate-rise px-6 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">{m.emoji}</div>
        <h3 className="mt-4 text-xl font-extrabold">{m.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{m.line}</p>
        {items.length > 1 && (
          <p className="mt-2 text-[11px] text-[var(--muted-2)]">+{items.length - 1} more milestone{items.length > 2 ? "s" : ""}</p>
        )}
        <button type="button" onClick={onDismiss} className="btn-accent mt-6 w-full">
          Nice
        </button>
      </div>
    </div>
  );
}
