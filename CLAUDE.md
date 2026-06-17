@AGENTS.md

# Hindsight — working notes for assistants

**What it is:** a daily investing-judgment game. See `README.md` for the loop and
architecture, and `docs/handoff.md` for the full product vision.

## Resolved decisions (were open in the handoff §13)
- **Name:** Hindsight. Owner: Rahil Sheth, solo. NOT affiliated with Aastik / "MSAD".
- **Build:** fresh Next.js 16 / React 19 / Tailwind v4 — **not** a fork of MSAD. Engine
  *patterns* (calibration math, FMP/Anthropic fetch clients) were re-implemented clean
  here, so there's no co-authored-code attribution question.
- **Data:** live FMP `/stable/` + Anthropic, server-side. Graceful fallback bank +
  heuristic grading when keys are absent (so it always runs).
- **First front door:** daily problem + streak; beginner-friendly via the
  Learn/Analyst/Quant depth toggle on the reveal.

## Guardrails
- Third-party keys are **server-side only** (`FMP_API_KEY`, `ANTHROPIC_API_KEY`).
- Grade the **decision, not the outcome** (outcome 0.15 / calibration 0.45 / reasoning
  0.40). Keep the luck filter intact — `src/lib/game/rating.ts`.
- Educational only — **never** generate buy/sell advice in copy or AI prompts.
- Mobile-first, dark, number-as-hero. Effects stay compositor-cheap (no heavy WebGL).
- The "how players answered" crowd split is **synthetic/illustrative** until real
  telemetry exists — it's labelled as such; don't present it as real.

## Native iOS app — `mobile/` (Expo SDK 56 / RN 0.85)
The App Store client. **Architecture:** the Next.js app is the *backend* (its `/api/daily`
+ `/api/grade` routes); the Expo app is a thin native *client* that reuses the pure logic
in `src/lib/game/` (copied into `mobile/src/lib/game/`). Keys stay server-side; the phone
only calls the backend over HTTPS (native `fetch`, so no CORS needed).
- Run: backend `npm run dev` (:3000) **and** `cd mobile && npx expo start` → press `i`.
  iOS simulator reaches the Mac at `localhost:3000` (the default `API_BASE`).
- Mobile mirrors the same screens (Daily commit+reveal, You, Journal, Practice/Rank stubs)
  with native haptics, AsyncStorage persistence, and a `react-native-svg` SparkChart.
- Ship: EAS Build (`mobile/eas.json`) → set `EXPO_PUBLIC_API_BASE` to the deployed backend.
  Full steps in `docs/app-store-checklist.md`. `npx expo-doctor` is green; `expo export`
  validates the prod bundle. **Heed `mobile/AGENTS.md`** — SDK 56 changed APIs (e.g. splash
  moved to the `expo-splash-screen` plugin); read the versioned docs before editing config.
- If you edit shared game logic in `src/lib/game/`, copy the change into
  `mobile/src/lib/game/` too (they're duplicated, not symlinked).
- **Niche / "you're getting better IRL" features (mobile-only so far)** — see
  `docs/market-research.md` for the positioning (calibration-first; the luck filter is the
  wedge no competitor has). `mobile/src/lib/game/progress.ts` powers: the reveal
  **Lucky/Earned verdict**, the **"what you just practiced"** transferable-skill line, the
  You-screen **trajectory** (recent-vs-early calibration/reasoning), and personalized
  **edge & leak** insights. Web `/you` does NOT have these yet — mirror if you want parity.

## Next TODOs
- P2: render the share result as an actual image card (currently emoji/text share).
- P2 (beginner UX): tap-to-build reasoning chips + a provisional "grace period" so thin
  reasoning can't sink a new player's rating (the reasoning input is the moat *and* the main
  beginner-churn risk — keep it, but remove the blank-page friction).
- P3: persist submissions server-side for a *real* crowd split + leaderboard. This same
  backend unlocks **leagues** — design is decided in `docs/leagues-design.md` (earned
  auto-promotion, calibration-based, NOT self-chosen; Phase 1 global board → Phase 2 weekly
  cohorts; gated on accounts + ~200+ WAU density).
- Profile is localStorage/AsyncStorage only; cloud sync + accounts are later.
- Mobile is backend-dependent (graceful error screen if offline) — in-app fallback is a maybe.
- SnapTrade read-only brokerage bridge (P5) — never place trades.

```bash
npm run dev                  # backend + web, localhost:3000
npm run build                # typechecks + prod build (web)
cd mobile && npx expo start  # native app (press i for iOS simulator)
```
