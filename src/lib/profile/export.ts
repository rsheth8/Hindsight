/**
 * Profile export / import — backup before cloud accounts ship.
 */
import type { Profile } from "./store";
import { emptyProfile } from "./store";

const EXPORT_VERSION = 1;

export interface ProfileExport {
  v: number;
  exportedAt: string;
  profile: Profile;
}

export function exportProfile(profile: Profile): string {
  const payload: ProfileExport = {
    v: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseProfileExport(raw: string): Profile {
  const data = JSON.parse(raw) as ProfileExport | Profile;
  if ("profile" in data && data.profile && typeof data.profile === "object") {
    return { ...emptyProfile(), ...data.profile };
  }
  return { ...emptyProfile(), ...(data as Profile) };
}
