/** Lightweight user preferences set during onboarding (kept out of the synced
 *  Profile reducer on purpose). Currently: the default reveal explanation depth,
 *  chosen from the "how well do you know markets?" question. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Depth } from "./grade-types";

const DEPTH_KEY = "hindsight.prefs.depth.v1";

export async function getPreferredDepth(): Promise<Depth | null> {
  try {
    const v = await AsyncStorage.getItem(DEPTH_KEY);
    return v === "learn" || v === "analyst" || v === "quant" ? v : null;
  } catch {
    return null;
  }
}

export async function setPreferredDepth(d: Depth): Promise<void> {
  try {
    await AsyncStorage.setItem(DEPTH_KEY, d);
  } catch {
    /* non-fatal */
  }
}
