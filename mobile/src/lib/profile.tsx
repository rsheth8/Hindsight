/**
 * Client-side profile — rating, streak, and the journal of every call. Persisted
 * with AsyncStorage and shared app-wide via context. Cloud sync is a later item;
 * the shape is deliberately server-friendly.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { START_RATING } from "./game/rating";
import { computeStreakUpdate, FREEZES_PER_WEEK } from "./game/streak";
import type { ConceptId } from "./game/concept-types";

export interface JournalEntry {
  date: string;
  problemId: string;
  choice: "A" | "B" | "C";
  choiceLabel: string;
  confidence: number;
  reasoning: string;
  correct: boolean;
  brier: number;
  reasoningScore: number;
  reasoningNotes: string;
  ratingDelta: number;
  ratingAfter: number;
  earned: boolean;
  ticker: string;
  company: string;
  forwardReturnPct: number;
  /** problem difficulty 0–1, for per-difficulty insight detection (optional for older entries) */
  difficulty?: number;
  concepts?: ConceptId[];
}

export interface Profile {
  rating: number;
  gradedCount: number;
  streak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  streakFreezes: number;
  freezeWeekKey: string | null;
  history: JournalEntry[];
}

const KEY = "hindsight.profile.v1";

export function emptyProfile(): Profile {
  return {
    rating: START_RATING,
    gradedCount: 0,
    streak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    streakFreezes: FREEZES_PER_WEEK,
    freezeWeekKey: null,
    history: [],
  };
}

export function hasPlayed(p: Profile, dateKey: string): boolean {
  return p.history.some((h) => h.date === dateKey);
}

interface Ctx {
  profile: Profile;
  ready: boolean;
  record: (entry: JournalEntry) => Promise<void>;
  recordPractice: (entry: JournalEntry) => Promise<void>;
}

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setProfile({ ...emptyProfile(), ...(JSON.parse(raw) as Profile) });
      } catch {
        /* keep empty */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const record = useCallback(async (entry: JournalEntry) => {
    setProfile((p) => {
      if (hasPlayed(p, entry.date)) return p;
      const streakUpdate = computeStreakUpdate({
        lastPlayedDate: p.lastPlayedDate,
        currentStreak: p.streak,
        playDate: entry.date,
        streakFreezes: p.streakFreezes ?? FREEZES_PER_WEEK,
        freezeWeekKey: p.freezeWeekKey ?? null,
      });
      const next: Profile = {
        rating: entry.ratingAfter,
        gradedCount: p.gradedCount + 1,
        streak: streakUpdate.streak,
        longestStreak: Math.max(p.longestStreak, streakUpdate.streak),
        lastPlayedDate: entry.date,
        streakFreezes: streakUpdate.streakFreezes,
        freezeWeekKey: streakUpdate.freezeWeekKey,
        history: [entry, ...p.history].slice(0, 365),
      };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const recordPractice = useCallback(async (entry: JournalEntry) => {
    setProfile((p) => {
      if (p.history.some((h) => h.problemId === entry.problemId)) return p;
      const next: Profile = {
        rating: entry.ratingAfter,
        gradedCount: p.gradedCount + 1,
        streak: p.streak,
        longestStreak: p.longestStreak,
        lastPlayedDate: p.lastPlayedDate,
        streakFreezes: p.streakFreezes ?? FREEZES_PER_WEEK,
        freezeWeekKey: p.freezeWeekKey ?? null,
        history: [entry, ...p.history].slice(0, 365),
      };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ profile, ready, record, recordPractice }), [profile, ready, record, recordPractice]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
