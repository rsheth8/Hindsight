"use client";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingGate } from "@/components/OnboardingGate";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </OnboardingGate>
  );
}
