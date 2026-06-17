"use client";
import { useEffect, useState } from "react";
import { emptyProfile, loadProfile, subscribe, type Profile } from "./store";

/** Reactive profile hook. Starts from the empty profile so the first client
 *  render matches the server (no hydration mismatch), then loads the stored
 *  profile after mount and on every change. */
export function useProfile(): Profile {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  useEffect(() => {
    setProfile(loadProfile());
    return subscribe(() => setProfile(loadProfile()));
  }, []);
  return profile;
}
