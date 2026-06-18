import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Hindsight",
};

export default function PrivacyPage() {
  return (
    <article className="animate-rise mx-auto max-w-lg px-5 py-8 pb-16">
      <Link href="/daily" className="text-sm text-[var(--muted)]">← Back to Hindsight</Link>
      <h1 className="mt-4 text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: June 17, 2026</p>

      <section className="mt-6 space-y-4 text-[14px] leading-relaxed text-[var(--fg)]/90">
        <p>
          Hindsight is an educational game about investing judgment. We designed it to collect as
          little data as possible.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">What we store on your device</h2>
        <p>
          Your rating, streak, journal of past calls, and settings are saved locally in your browser
          or the iOS app (localStorage / AsyncStorage). We do not require an account to play.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">What the server sees</h2>
        <p>
          When you submit a daily call, an anonymous device identifier and your choice, confidence,
          and grades may be stored server-side to compute aggregate crowd statistics. We do not store
          your name, email, or brokerage credentials.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">Third-party services</h2>
        <p>
          The backend may fetch historical market data (Financial Modeling Prep) and use AI grading
          (Anthropic) to score your reasoning and generate educational explanations. Your reasoning
          text is sent to our server for grading; API keys for those services never leave our
          server.
        </p>

        <h2 className="text-base font-semibold text-[var(--fg)]">What we do not do</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No ads or ad tracking</li>
          <li>No sale of personal data</li>
          <li>No connection to your brokerage or real-money accounts</li>
          <li>No investment advice — educational game only</li>
        </ul>

        <h2 className="text-base font-semibold text-[var(--fg)]">Contact</h2>
        <p>
          Questions? See our <Link href="/support" className="text-[var(--accent)] underline">Support</Link> page
          or email <a href="mailto:support@hindsight.game" className="text-[var(--accent)] underline">support@hindsight.game</a>.
        </p>
      </section>
    </article>
  );
}
