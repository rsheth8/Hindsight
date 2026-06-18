/** Hindsight palette — "espresso + gold". Dark, warm, one gold accent.
 *  See docs/design.md (source of truth). Mirrors the web app (globals.css). */
export const C = {
  bg: "#0c0907", // base — near-black espresso
  bgElev: "#100b08",
  card: "#171210", // surface
  card2: "#241a14", // surface2 — insets / tracks / inactive bars
  border: "#2c2118",
  fg: "#f6ede0", // warm white
  muted: "#9a8d7a",
  muted2: "#6b5c48",
  accent: "#f0c560", // gold — hero / gains / calibrated / wins
  accentInk: "#3a2c08", // text on gold
  warn: "#e89a4a", // caution — overconfidence (amber, distinct from gold)
  bad: "#ff7a6b", // wrong / loss (coral "hot")
  up: "#f0c560", // gains glow gold (NOT green — see design.md §2)
  down: "#ff7a6b", // losses coral
  cool: "#6f8cff", // "too timid" end of the calibration bar
} as const;

export const radius = 18;

/** Warm radial glow used on hero/reveal backgrounds (compositor-cheap). */
export const heroGlow = "#1d130d";

/** Font families — loaded in App.tsx via @expo-google-fonts. The app does not
 *  render until these are ready, so referencing them in styles is always safe. */
export const F = {
  display: "BricolageGrotesque_800ExtraBold", // hero numbers, wordmark
  displayBold: "BricolageGrotesque_700Bold",
  mono: "SpaceMono_700Bold", // stat numbers — returns, Brier, counters
  monoReg: "SpaceMono_400Regular",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;
