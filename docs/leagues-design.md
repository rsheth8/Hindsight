# Hindsight — Leagues & competitive layer (design note)

> **Status:** decided, **not yet built.** Phase-2 feature, gated on a real backend + a
> player base. This captures the decision so we build the right thing at the right time.
> Owner: Rahil. Drafted 2026-06-17.

---

## The decision in one line

**Earned, skill-based leagues with automatic promotion/relegation — never self-chosen
tiers.** You climb by getting better; you can't pick your way up. Competition is on
**calibration, not returns.**

## Why leagues fit Hindsight unusually well

- **They *are* the "getting better" feeling, externalized.** The trajectory + edge/leak
  features are you-vs-your-past-self. A promotion is the same emotion made social and
  visible: *"I moved up because I got sharper."* That's the core feeling we're chasing.
- **They protect beginners** (the thing we were just worried about with the reasoning box).
  Fair cohorts mean newcomers compete with newcomers, not experts. Done right, leagues make
  the app *less* intimidating.
- **Hindsight leagues are structurally fair.** Everyone gets the **same daily problem**
  (date-seeded), so a league is a pure skill comparison on *identical inputs* — unlike
  fantasy-trading leagues where players pick different assets and luck dominates. This is a
  real, defensible advantage: nobody can grind more content or cherry-pick an easy stock.
- **We already have the rating** (luck-resistant Elo, `src/lib/game/rating.ts`) to seed
  initial placement, and the per-day rating delta to use as the weekly league currency —
  so the league is luck-resistant *by construction*.

## What we rejected, and why

- **Self-chosen leagues** ("let players pick their tier"). Rejected. Self-selected
  competitive tiers reliably break: strong players sandbag low to farm wins, unsure players
  overreach and churn, and "I climbed to Gold" stops meaning anything. The magic of
  Duolingo/chess tiers is that you *can't* choose — you earn it.
- **Choice belongs in Practice, not the ladder.** Let players choose *what to drill*
  (difficulty, specific concepts) in the no-stakes Practice mode. Keep the competitive
  ladder earned-only. Agency where it's healthy; integrity where it matters.
- **Competing on returns / fake P&L.** Rejected — it's the entire thing we differentiate
  against. The league ranks on calibration + reasoning, which keeps the niche intact.

---

## Hard prerequisites (why it's not a "now" feature)

1. **Backend with real accounts.** Today the profile is on-device (AsyncStorage / local
   storage) and the crowd split is *synthetic and labelled illustrative*. Leagues need
   server-side accounts + stored submissions — you can't fake a league the way we soft-fake
   the crowd split. This is the deferred **P3** item.
2. **Player density.** A league of 5 feels dead. Below critical mass, ship a *single global
   leaderboard* first; only split into cohorts once there are enough weekly-active players
   to fill them (rule of thumb: comfortably fill cohorts of ~25 → on the order of 200+ WAU
   before leagues feel alive).

Until both exist, the rating + streak + share is enough progression spine for launch.
Leagues are the **retention accelerant you switch on once you have users**, not a launch
feature. Building them now is decorating a party before anyone arrives.

## Phasing

| Phase | What ships | Unlocks |
|---|---|---|
| **0 — now** | Local rating, streak, trajectory, edge/leak, share | Launch-ready solo loop |
| **1 — backend MVP** | Accounts + server-side submissions → **real** crowd split + one **global weekly calibration leaderboard** | Replaces synthetic crowd; validates density; low complexity |
| **2 — leagues** | Split the global board into weekly cohorts with promotion/relegation | The retention engine |
| **3 — depth** | Seasons, skill tree, cosmetic rewards | Long-term progression |

Note Phase 1 is high-leverage on its own: the same backend work that enables leagues also
turns the illustrative crowd split into a **real** one and powers a global leaderboard.

---

## Mechanic sketch (for Phase 2)

- **Tiers, themed on judgment — not money.** A ladder like
  **Coin-Flip → Hunch → Calibrated → Sharp → Conviction → Oracle.** Even the ladder
  reinforces "this is about how well you think."
- **Weekly cycle.** Mon 00:00 UTC → Sun. You're placed in a cohort of ~25–30 similar-skill
  players. Ranked within the cohort by **weekly points = sum of your luck-resistant rating
  deltas that week** (already bakes in calibration 45% / reasoning 40% / outcome 15% + the
  luck filter — so the league can't be won on luck).
- **Promotion / relegation.** Top ~7 promote, bottom ~7 relegate (tune to cohort size).
- **Placement.** Seed a new player's starting league from their existing Elo band so the
  first cohort isn't wildly mismatched; everyone otherwise starts low and climbs.
- **Consistency matters.** Because points come from daily deltas, missing days costs you —
  which reinforces the daily habit without a separate mechanic.
- **Anti-abuse is mostly free.** One shared problem/day = no content grinding, no
  asset-picking, no multi-account farming advantage on a single day.

## Motivational balance (important)

Keep the **core loop you-vs-your-past-self** (trajectory, streak, edge/leak). Leagues are an
*additional, opt-in-feeling* competitive axis — a tab people visit, not a modal that shames
the "I just want to quietly get better" crowd. Duolingo runs both personal streaks **and**
leagues; we should too, with the personal-growth loop as the default and competition as the
accelerant for those who want it.

## Rewards / guardrails

- **Cosmetic only.** Badges, tier colors, season banners. **No real money, no cash prizes,
  no pay-to-win** — both for the "skill, not stakes" positioning and the App Store /
  regulatory posture (keeps us clearly out of gambling territory).
- Leagues rank on calibration; never surface a "returns" leaderboard.

## Open questions (resolve when we build)

- Cohort assignment algorithm (pure rating bands vs. activity-balanced).
- How missed days interact with relegation (grace? floor?).
- Cold-start: **no fake/bot players** — use the global board until real density (consistent
  with not faking the crowd split).
- Season length and whether ratings soft-reset between seasons.

---

## Where this lives in the app

The **Rank** tab (`mobile/src/screens/SoonScreen.tsx → RankScreen`) already stubs this
vision ("weekly leagues with promotion/relegation," "global calibration leaderboard,"
"skill tree"). When Phase 1 backend lands, build the global leaderboard there first, then
Phase 2 leagues. See `docs/market-research.md` for why calibration-based competition is the
defensible niche, and `CLAUDE.md` for the backend/keys guardrails.
