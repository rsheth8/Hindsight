import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Hindsight",
};

export default function SupportPage() {
  return (
    <article className="animate-rise mx-auto max-w-lg px-5 py-8 pb-16">
      <Link href="/daily" className="text-sm text-[var(--muted)]">← Back to Hindsight</Link>
      <h1 className="mt-4 text-2xl font-bold">Support</h1>

      <section className="mt-6 space-y-4 text-[14px] leading-relaxed text-[var(--fg)]/90">
        <p>
          Hindsight is a daily educational game that grades your investing judgment and calibration —
          not your luck. It never provides buy or sell advice and never connects to real money.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">Get help</h2>
        <p>
          Email us at{" "}
          <a href="mailto:support@hindsight.game" className="text-[var(--accent)] underline">
            support@hindsight.game
          </a>
          . We typically respond within a few business days.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">Common questions</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">Why is my rating provisional?</dt>
            <dd className="mt-1 text-[var(--muted)]">
              Your first 10 graded calls use a provisional rating while we learn your calibration.
              Thin reasoning won&apos;t sink a new player during this grace period.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Is the crowd split real?</dt>
            <dd className="mt-1 text-[var(--muted)]">
              Once enough players have answered today&apos;s puzzle, the reveal shows real aggregate
              percentages. Until then, the split is illustrative and labelled as such.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Does Hindsight connect to my brokerage?</dt>
            <dd className="mt-1 text-[var(--muted)]">
              No. There is no trading, no portfolio sync, and no financial advice — only practice
              on anonymized historical setups.
            </dd>
          </div>
        </dl>

        <p className="pt-2 text-[13px] text-[var(--muted-2)]">
          <Link href="/privacy" className="text-[var(--accent)] underline">Privacy Policy</Link>
        </p>
      </section>
    </article>
  );
}
