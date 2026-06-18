import type { Depth } from "@/lib/ai/grade";

const OPTS: Depth[] = ["learn", "analyst", "quant"];

export function DepthToggle({ depth, setDepth }: { depth: Depth; setDepth: (d: Depth) => void }) {
  return (
    <div className="flex rounded-lg bg-[var(--card-2)] p-0.5 text-[10px]" role="group" aria-label="Explanation depth">
      {OPTS.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setDepth(o)}
          className="rounded-md px-2 py-1 capitalize"
          style={{ background: depth === o ? "var(--accent)" : "transparent", color: depth === o ? "#062013" : "var(--muted)" }}
          aria-pressed={depth === o}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
