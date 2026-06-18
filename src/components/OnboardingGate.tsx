"use client";
import { useSyncExternalStore, useState } from "react";

const SLIDES = [
  {
    emoji: "📈",
    title: "One call a day",
    body: "Every day you get a fresh anonymized market setup — a real chart, stripped of the ticker. Read it, make your call, come back tomorrow.",
  },
  {
    emoji: "🎯",
    title: "We grade your thinking, not luck",
    body: "Your score weighs calibration and reasoning far more than being right. Confident-and-wrong bleeds rating. Right-for-the-wrong-reasons barely moves it.",
  },
  {
    emoji: "📊",
    title: "A rating that compounds",
    body: "Like chess.com, your number only climbs through sustained good judgment. Track your streak, spot your leaks, and get measurably sharper over time.",
  },
] as const;

const ONBOARD_KEY = "hindsight.onboarded.v1";
const ONBOARD_EVENT = "hindsight:onboarded";

function subscribeOnboarded(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(ONBOARD_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ONBOARD_EVENT, handler);
  };
}

function readOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARD_KEY) === "1";
}

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  return (
    <div className="flex min-h-[70vh] flex-col px-7 pb-10 pt-16">
      <button type="button" onClick={onDone} className="self-end text-sm text-[var(--muted)]">Skip</button>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-6xl">{slide.emoji}</div>
        <h2 className="mt-6 text-[28px] font-extrabold leading-tight">{slide.title}</h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">{slide.body}</p>
      </div>

      <div className="mb-7 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <div key={i} className="h-2 rounded-full transition-all" style={{ width: i === step ? 20 : 8, background: i === step ? "var(--accent)" : "var(--card-2)" }} />
        ))}
      </div>

      <button type="button" onClick={() => (last ? onDone() : setStep((s) => s + 1))} className="btn-primary w-full py-4 text-[16px]">
        {last ? "Play today's problem" : "Next"}
      </button>
      <p className="mt-4 text-center text-[11px] text-[var(--muted-2)]">Educational only — never buy/sell advice.</p>
    </div>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const onboarded = useSyncExternalStore(subscribeOnboarded, readOnboarded, () => false);

  function finish() {
    localStorage.setItem(ONBOARD_KEY, "1");
    window.dispatchEvent(new Event(ONBOARD_EVENT));
  }

  if (!onboarded) return <OnboardingScreen onDone={finish} />;
  return <>{children}</>;
}
