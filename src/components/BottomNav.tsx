"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/daily", label: "Daily", icon: DailyIcon },
  { href: "/practice", label: "Practice", icon: PracticeIcon },
  { href: "/rank", label: "Rank", icon: RankIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/you", label: "You", icon: YouIcon },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--bg-elev)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = path === t.href || (t.href !== "/daily" && path.startsWith(t.href));
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
              style={{ color: active ? "var(--accent)" : "var(--muted-2)" }}
            >
              <Icon active={active} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function base(active: boolean) {
  return { width: 22, height: 22, fill: "none", stroke: active ? "var(--accent)" : "var(--muted-2)", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}
function DailyIcon({ active }: { active: boolean }) {
  return (<svg viewBox="0 0 24 24" {...base(active)}><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M4 9h16M9 4v3M15 4v3" /></svg>);
}
function PracticeIcon({ active }: { active: boolean }) {
  return (<svg viewBox="0 0 24 24" {...base(active)}><path d="m13 2-9 11h7l-2 9 9-11h-7l2-9Z" /></svg>);
}
function RankIcon({ active }: { active: boolean }) {
  return (<svg viewBox="0 0 24 24" {...base(active)}><path d="M5 21V10M12 21V4M19 21v-7" /></svg>);
}
function JournalIcon({ active }: { active: boolean }) {
  return (<svg viewBox="0 0 24 24" {...base(active)}><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M8 11h8M8 15h6" /></svg>);
}
function YouIcon({ active }: { active: boolean }) {
  return (<svg viewBox="0 0 24 24" {...base(active)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
}
