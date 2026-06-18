/** Educational-only footer — App Store / finance review framing. */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] leading-relaxed text-[var(--muted-2)] ${className}`}>
      Educational only · never buy/sell advice · your data stays on this device for now.
    </p>
  );
}
