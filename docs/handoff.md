# Hindsight — handoff & build guide

> Living doc. The product vision plus **what's built today** and a **prioritized TODO
> backlog** any agent can pick up. Read `CLAUDE.md` (root) first for guardrails; this is the
> deeper context. Companion docs: `docs/market-research.md` (competitive niche),
> `docs/leagues-design.md` (competitive layer), `docs/app-store-checklist.md` (shipping).
> Last updated: 2026-06-17.

---

## 0. What this is, who owns it

- **Hindsight** — *"chess.com for investing judgment."* A daily puzzle game with a
  luck-resistant skill rating that measures your **judgment + calibration, not your
  returns.** Educational decision-support, **never** a buy/sell signal service.
- **Owner: Rahil Sheth — solo.** NOT affiliated with Aastik / the "MSAD" app. Built fresh
  (engine *patterns* re-implemented clean), so there is no co-authored-code attribution
  question. Don't use MSAD/Mishra branding.

## 0a. Current state (what exists and is verified) ✅

- **Web app** (Next.js 16 / React 19 / Tailwind v4) — the daily game (commit + reveal),
  `/you`, `/journal`, `/practice` + `/rank` stubs, and the backend API. `npm run build`
  passes; played through end-to-end. Root project.
- **Native iOS app** (`mobile/`, Expo SDK 56 / RN 0.85) — **the App Store product.** Full
  game loop, native haptics, AsyncStorage persistence, custom tab bar, branded icon +
  splash. Verified in the iOS simulator end-to-end. `expo-doctor` 18/18; prod bundle
  exports clean. The Next.js app is its **backend** (`/api/daily`, `/api/grade`); keys stay
  server-side; native `fetch` → no CORS.
- **Architecture:** pure game logic in `src/lib/game/` is duplicated into
  `mobile/src/lib/game/` (copy edits to both — not symlinked).
- **The rating engine** (§3) is implemented and luck-resistant: `src/lib/game/rating.ts`.
- **"You're getting better" features (mobile only so far)** via
  `mobile/src/lib/game/progress.ts`: the **Lucky/Earned reveal verdict**, the **"what you
  just practiced"** transferable-skill line, the You-screen **trajectory** (recent-vs-early
  calibration/reasoning), and personalized **edge & leak** insights.
- **Data:** live FMP `/stable/` + Anthropic server-side, with a graceful fallback problem
  bank + heuristic grading when keys are absent (so it always runs).

## 0b. Resolved decisions (were open in old §13)

1. **Name = Hindsight.** Solo, distinct from MSAD.
2. **Built fresh**, not forked from MSAD → no attribution issue.
3. **First audience = beginners**, daily-streak front door; depth toggle (Learn/Analyst/
   Quant) serves intermediates on the reveal.
4. **Front door = daily problem + streak.** Shipped first.
5. **Mobile = React Native (Expo), iOS-first** (not Capacitor). Android later (one command).
6. **Niche = calibration-first** (see §2 + `market-research.md`). The **luck filter** is the
   wedge no competitor has.
7. **Leagues = earned auto-promotion, not self-chosen** (see `leagues-design.md`); Phase 2,
   backend-gated.
8. **Reasoning input = keep** (it's the moat) **but de-friction for beginners** (TODO #1).

---

## 1. One-line pitch
A daily call on an anonymized real-market setup, graded on **how well you think, not how
lucky you got** — with a rating that only climbs through sustained good calibration +
reasoning, and a felt sense that you're getting better at the real thing.

## 2. The niche (why we win) — see `docs/market-research.md`
Four adjacent camps, and **none occupies our intersection**: hidden-chart trading games
(ChartGame/ChartZero — scored on P&L), "Wordle for stocks" (Stockle/Wallstreetle — ticker
trivia), forecasting/calibration (Metaculus, Calibrate Your Judgment — general, not
investing, not a daily game), and decision journals (InvestorOS — no game, no grade).
**Hindsight is the only daily + investing + calibration + reasoning + skill-rating game.**
The **luck filter** ("right for the wrong reasons → clamped") is the signature mechanic
nobody else has. Compete on calibration, never returns.

## 3. The signature mechanic: a rating luck can't game (IMPLEMENTED)
`src/lib/game/rating.ts` (+ `mobile/` copy). Grade three axes, weight outcome *down*:
```
S = 0.15·correctness + 0.45·calibration + 0.40·reasoning
E = 1 / (1 + 10^((D − R)/400))        R' = R + K·(S − E)
```
- **Calibration (Brier)** `(p − outcome)²` — confident-and-wrong bleeds rating.
- **Reasoning (AI-graded 0–1)** against a fixed rubric (`src/lib/ai/grade.ts`): cite the
  evidence, weigh the counter-thesis, say what would change your mind.
- **Outcome** deliberately low-weighted (short-horizon = noise).
- **Luck filter:** correct-but-poorly-reasoned → delta clamped toward 0.
- **Provisional** under 10 graded calls; **K-factor** shrinks as a track record builds.
The rating IS the product and the moat.

## 4. Core loop
`Daily problem → make the call (choice + confidence + reasoning) → graded on decision
quality → rating + streak → reveal (verdict + coach + what you practiced) → come back
tomorrow.` Long arc: rating threshold unlocks a read-only brokerage *bridge* (never trades).

## 5. Game modes
Built: **Daily problem** ("read the setup"). Roadmap (Practice tab, mostly stubs):
**blind replay, spot the flaw, valuation puzzle, calibration bet, bias trap.**

## 6. Engagement (ethical, niche-preserving)
Every reward attaches to *decision quality*, never activity or P&L. Daily ritual + variable
reveal + streak/rating/journal as stored value. Forgiving (streak freeze, celebrate
consistency). Wordle-style shareable result is the cheapest viral loop (TODO #2).

## 7. UI/UX
Number-as-hero, dark, one mint accent, mobile-first, compositor-cheap effects, satisfying
micro-interactions (haptic lock-in, rating count-up, reveal "flip"). Bottom nav:
daily · practice · rank · journal · you. A coach persona is a retention lever (TODO).

## 8. Guardrails (keep visible)
Educational only. **Never** buy/sell advice — in copy or AI prompts. Grade decisions, not
outcomes; keep the luck filter intact. Keys server-side only (`FMP_API_KEY`,
`ANTHROPIC_API_KEY`). Read-only brokerage bridge — never place trades. Crowd split is
synthetic/illustrative until real telemetry — labelled as such. Forgiving, non-manipulative
engagement.

## 9. Tech / data notes
- FMP **`/stable/` only** (EOD/daily resolution); scope problems to that and teach the limit.
- Anthropic Messages API server-side, prompt-cache the grounded block; tier by cost
  (Haiku grade/explain, Sonnet critique, Opus rare deep synthesis).
- Mobile ships via **EAS Build** (`mobile/eas.json`); set `EXPO_PUBLIC_API_BASE` to the
  deployed backend. **Heed `mobile/AGENTS.md`** — Expo SDK 56 changed config APIs.
- *(Historical: `~/Desktop/msad` was the reference for engine patterns; we re-implemented
  clean. Not a dependency.)*

---

## 10. TODO backlog — prioritized, agent-ready

Each item is self-contained: what, why, where, done-when. **P0/P1 ship now; P2 needs the
backend; P3 needs a player base.** When you pick one up, read `CLAUDE.md` guardrails first;
if you change shared logic in `src/lib/game/`, mirror it into `mobile/src/lib/game/`.

### P0 — ships today, matters for the first user

**TODO 1 — Beginner-friendly reasoning input (tap-to-build + grace period)**
- *Why:* the graded reasoning box is the moat **and** the #1 beginner-churn risk (a blank
  essay worth 40% of the score scares newcomers who "don't know why yet"). Keep the skill,
  remove the blank page.
- *What:* (a) Replace the empty textarea as the *default* with tappable "what are you
  seeing?" chips derived from the setup (e.g. *Uptrend, Above the 50-day, Overextended, High
  volatility, Big drawdown, Near the highs*); tapped chips become the reasoning string fed
  to the grader. Keep free-type as an option. (b) Add a **provisional grace period**: for
  the first ~10 graded calls, reasoning can *lift* but not *sink* the rating.
- *Where:* `mobile/src/screens/DailyScreen.tsx` (commit UI), `src/lib/ai/grade.ts`
  (grading accepts chip text fine), rating/grace logic in `src/lib/game/rating.ts` (+ mobile
  copy). Mirror to web `src/app/daily`.
- *Done when:* a new player can complete a call by tapping a choice + confidence + ≥1 chip,
  with no typing, and thin reasoning doesn't reduce a provisional player's rating.

**TODO 2 — Shareable image result card (viral loop)**
- *Why:* distribution is the unsolved problem; the Wordle-style share is the cheapest loop.
  Today it's plain text/emoji.
- *What:* render the result (verdict badge, the 🟩🟨🟥 row, rating + delta, streak,
  "play › hindsight…") as an **image** for the native share sheet.
- *Where:* mobile `ShareCard`/reveal — use `react-native-view-shot` (capture a styled
  off-screen view) → `Share`. Web: canvas/OG image.
- *Done when:* sharing produces an image, not a text blob.

### P1 — strong wins, no backend required

**TODO 3 — Adaptive weakness-targeting**
- *Why:* the strongest "it's training me" loop — turn "it knows my leak" into "it's fixing
  my leak."
- *What:* use `progress.ts` insights to bias problem selection toward setup-types the player
  is miscalibrated on (e.g. more hard setups if "hard setups trip you up"). Keep the daily
  problem shared/global; apply targeting in **Practice** mode (per-user) to preserve daily
  fairness.
- *Where:* `mobile/src/lib/game/progress.ts` (read), a new Practice generator, Practice
  screen. *Done when:* Practice serves more of your weak categories and the You-screen leak
  measurably shrinks over a session.

**TODO 4 — Web/mobile parity for the "getting better" features**
- *Why:* `progress.ts` (verdict, transferable skill, trajectory, edge/leak) is mobile-only.
- *What:* decide web's role (co-equal client vs. marketing site). If co-equal, port
  `progress.ts` to web and render on `/daily` reveal + `/you`.
- *Where:* `src/app/...`, `src/components/`. *Done when:* web `/you` shows the trajectory +
  insights, web reveal shows the verdict + transferable skill.

**TODO 5 — First-run onboarding ("why this makes you better")**
- *Why:* set the expectation that this is get-*better*, not get-*rich*; frame calibration in
  plain language so beginners aren't confused.
- *What:* a 2–3 screen intro (skippable) explaining the one call/day, "we grade your
  thinking not luck," and what the rating means. *Where:* mobile root (gate before first
  Daily). *Done when:* shown once on first launch, never again.

### P2 — needs a real backend (the big unlock)

**TODO 6 — Backend: accounts + server-side submissions**
- *Why:* prerequisite for a **real** crowd split (replace the synthetic one), a global
  leaderboard, cloud sync, and leagues. One build unlocks several roadmap items.
- *What:* auth/accounts; store each submission (choice, confidence, reasoning grade, rating
  delta, problem id) server-side; compute the real per-problem crowd split + difficulty.
- *Where:* extend the Next.js API; a datastore. Keep keys server-side. *Done when:* the
  crowd split on the reveal is real (labelled real) and profiles sync across devices.

**TODO 7 — Share/result polish + global calibration leaderboard**
- *Why:* first social surface once accounts exist; validates density before leagues.
- *What:* a single global weekly leaderboard ranked on **calibration**, in the Rank tab.
- *Where:* `mobile/src/screens/SoonScreen.tsx → RankScreen`. *Done when:* a real weekly
  board renders for signed-in users.

### P3 — needs a player base (~200+ WAU)

**TODO 8 — Leagues (earned auto-promotion)** — full design in `docs/leagues-design.md`.
- *Why:* the retention engine; promotion = "getting better," made social; fair cohorts
  protect beginners.
- *What:* weekly cohorts (~25), ranked by summed daily rating deltas (luck-resistant by
  construction), top/bottom promote/relegate, judgment-themed tiers (*Coin-Flip →
  Calibrated → Sharp → Oracle*), cosmetic rewards only. **Earned, never self-chosen.**
- *Done when:* weekly cohorts with promotion/relegation, ranked on calibration.

### P4+ — content, depth, graduation

- **TODO 9 — More problem types** (blind replay, spot-the-flaw, valuation puzzle,
  calibration bet, bias trap) in Practice. Each: generator + grader + reveal.
- **TODO 10 — Concept tags + skill tree** — tag problems by concept; track per-concept
  mastery; visualize the tree (Rank).
- **TODO 11 — Notifications + streak freeze** — daily reminder at the user's play time;
  forgiving streak mechanics.
- **TODO 12 — Coach persona** — give the AI coach a face/voice across reveal + insights.
- **TODO 13 — Read-only brokerage bridge (SnapTrade), gated by rating** — *"we don't take
  your trades; we make you good enough to deserve them."* **Never place trades.**

### Always-on / quality

- **TODO 14 — Tests** for pure logic: `rating.ts`, `calibration.ts`, `progress.ts` (verdict,
  insights, transferableSkill, skillTrend). No backend needed.
- **TODO 15 — Validate the live FMP/Anthropic path** end-to-end with real keys (only the
  fallback path is fully exercised today).
- **TODO 16 — Ship to the App Store** — Apple Developer enrollment, deploy backend, set
  `EXPO_PUBLIC_API_BASE`, `eas build` + `eas submit`. Full checklist:
  `docs/app-store-checklist.md`. (Needs Rahil's Apple + Expo accounts.)

---

### Pointers
`CLAUDE.md` (guardrails + run commands) · `docs/market-research.md` (niche/competitors) ·
`docs/leagues-design.md` · `docs/app-store-checklist.md` · `mobile/README.md` ·
`mobile/AGENTS.md` (SDK 56 changes). Run: `npm run dev` (backend+web :3000) and
`cd mobile && npx expo start` (press `i` for the iOS simulator).
