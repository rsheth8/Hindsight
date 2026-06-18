"use client";
import { useSyncExternalStore } from "react";
import { emptyProfile, loadProfile, subscribe, type Profile } from "./store";

/** Reactive profile hook. Server snapshot is empty so SSR matches hydration;
 *  client reads localStorage and re-renders on every store change. */
export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, loadProfile, emptyProfile);
}
