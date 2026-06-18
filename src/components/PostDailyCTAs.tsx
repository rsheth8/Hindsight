"use client";
import Link from "next/link";
import type { JournalEntry } from "@/lib/profile/store";
import { ShareCard } from "./ShareCard";
import type { GradeResult } from "@/lib/game/types";

export function PostDailyCTAs({
  entry,
  result,
  onReview,
}: {
  entry?: JournalEntry;
  result?: GradeResult | null;
  onReview?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-2">
      <Link href="/practice" className="btn-accent w-full text-center">
        Keep training → Practice
      </Link>
      <Link href="/learn" className="card w-full py-3.5 text-center text-sm font-semibold">
        🧭 Hind&apos;s learning path
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/rank" className="card py-3 text-center text-[13px] font-semibold">
          ⚔️ Duel someone
        </Link>
        {onReview ? (
          <button type="button" onClick={onReview} className="card py-3 text-[13px] font-semibold">
            Review breakdown
          </button>
        ) : (
          <Link href="/journal" className="card py-3 text-center text-[13px] font-semibold">
            Open journal
          </Link>
        )}
      </div>
      {result && entry && (
        <div className="mt-2">
          <ShareCard
            date={entry.date}
            rating={result.newRating}
            delta={result.ratingDelta}
            streak={0}
            correct={result.correct}
            brier={result.brier}
            reasoning={result.reasoning}
          />
        </div>
      )}
    </div>
  );
}
