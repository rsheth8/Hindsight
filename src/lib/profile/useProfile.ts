"use client";
import { useSyncExternalStore } from "react";
import { loadProfile, subscribe, SERVER_PROFILE, type Profile } from "./store";

/** Reactive profile hook. Server snapshot is a stable empty profile so SSR
 *  matches hydration; client reads localStorage (cached for referential
 *  stability) and re-renders on every store change. */
export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, loadProfile, () => SERVER_PROFILE);
}
