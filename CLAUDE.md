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
- **Calibration math is single-source** in `src/lib/game/calibration.ts`: confidence floor
  is `1/3` (pure guess among 3), the Brier reference is `2/9` (= p(1−p) base-rate variance),
  and everything uses `calibrationSkill` (readiness/mastery) or `calibrationCredit` (rating
  axis) — never re-derive `1−brier` / `(0.25−brier)/0.25` inline.
- **Answer distribution is balanced** — the live universe is large-cap *survivors* (upward
  base-rate skew), so `daily.ts` balances the decision date across A/B/C. Don't "fix" this
  by sampling dates uniformly, or "always pick up" beats chance. Live outcomes use **total
  return** (`adjClose`); never claim the universe is survivorship-free.
- Educational only — **never** generate buy/sell advice in copy or AI prompts.
- Mobile-first, dark, number-as-hero. Effects stay compositor-cheap (no heavy WebGL).
- Crowd split is **real** once ≥3 server submissions exist for a problem; otherwise
  **illustrative*** — always labelled in the UI.

## Native iOS app — `mobile/` (Expo SDK 56 / RN 0.85)
The App Store client. **Architecture:** the Next.js app is the *backend* (its `/api/daily`
+ `/api/grade` routes); the Expo app is a thin native *client* that reuses the pure logic
in `src/lib/game/` (copied into `mobile/src/lib/game/`). Keys stay server-side; the phone
only calls the backend over HTTPS (native `fetch`, so no CORS needed).
- Run: backend `npm run dev` (:3000) **and** `cd mobile && npx expo start` → press `i`.
  iOS simulator reaches the Mac at `localhost:3000` (the default `API_BASE`).
- Mobile mirrors the same screens (Daily, Practice, Blind replay, Rank, You, Journal)
  with native haptics, AsyncStorage persistence, share cards, and reminders.
- Ship: EAS Build (`mobile/eas.json`) → set `EXPO_PUBLIC_API_BASE` to the deployed backend.
  Full steps in `docs/app-store-checklist.md`. Privacy/support pages at `/privacy` and
  `/support` on the web app (use as App Store URLs).
- If you edit shared game logic in `src/lib/game/`, copy the change into
  `mobile/src/lib/game/` too (they're duplicated, not symlinked).
- **Progress features** (`src/lib/game/progress.ts`): Lucky/Earned verdict, transferable
  skill line, You-screen trajectory, edge/leak insights — on **web and mobile**.

## Next TODOs (pre-launch / post-launch)
- **You:** deploy backend (Vercel), add KV for production crowd store, `eas init` + App Store
  accounts, set `EXPO_PUBLIC_API_BASE` in `mobile/eas.json`.
- **P2:** accounts + cloud profile sync + global calibration leaderboard.
- **P3:** leagues (see `docs/leagues-design.md`) — needs ~200+ WAU.
- **P4:** more practice modes (spot-the-flaw, valuation puzzle, calibration bet).
- **P5:** SnapTrade read-only brokerage bridge (gated by rating) — never place trades.

```bash
npm run dev                  # backend + web, localhost:3000
npm run build                # typechecks + prod build (web)
npm test                     # vitest — unit + API (89 tests)
npm run test:coverage        # with HTML coverage report
npm run test:e2e             # Playwright smoke against prod build
npm run test:ci              # full CI suite (lint + coverage + sync + build)
cd mobile && npx expo start  # native app (press i for iOS simulator)
curl localhost:3000/api/health  # which backends are live vs fallback
```
See `docs/TESTING.md` for the full testing regime.
