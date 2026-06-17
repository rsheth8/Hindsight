# Hindsight

**A daily investing puzzle that grades your judgment and calibration — not your luck.**
"chess.com for investing": read an anonymized real-market setup, make a call with a
confidence level, write your thesis, and earn a luck-resistant rating that only climbs
through sustained good reasoning + calibration.

> Educational only. Never buy/sell advice. We grade your decision, not the outcome.

## Run it

```bash
npm install
npm run dev      # → http://localhost:3000  (redirects to /daily)
```

Works with **zero config** on a built-in fallback problem bank + heuristic grading.
For the real experience, add server-side keys:

```bash
cp .env.local.example .env.local
# fill in FMP_API_KEY (Financial Modeling Prep, /stable/ endpoints)
#         ANTHROPIC_API_KEY (reasoning grading + reveal explanations)
```

With keys set, the daily problem is built from **real historical price data** (a random
anonymized window 1–6 years back) and the reveal explanation + reasoning grade come from
Claude. Keys never reach the client bundle.

## The game loop

`Daily problem → make the call (choice + confidence + thesis) → graded on decision quality → rating + streak → reveal`

### The rating (the moat)

Three axes, weighted to defeat luck:

```
S = 0.15·correctness + 0.45·calibration + 0.40·reasoning
E = 1 / (1 + 10^((D − R)/400))          R' = R + K·(S − E)
```

- **Calibration** — single-call Brier `(confidence − outcome)²`. Confident-and-wrong bleeds rating.
- **Reasoning** — Claude grades the *why* against a fixed rubric (cite evidence, weigh the
  counter-thesis, state what would change your mind).
- **Outcome** — deliberately low-weighted; over 3 months a single move is mostly noise.
- **Luck filter** — right but poorly-reasoned ⇒ rating delta clamped toward 0.
- **Provisional** rating under 10 graded calls; **K-factor** shrinks as a track record builds.

## Layout

```
src/
  lib/game/        calibration.ts · rating.ts · daily.ts · metrics.ts · seed.ts · universe.ts · fallback.ts · types.ts
  lib/fmp/         client.ts            (server-side, /stable/ only)
  lib/ai/          client.ts · grade.ts (Anthropic Messages; heuristic fallback)
  lib/profile/     store.ts · useProfile.ts   (localStorage; cloud sync is later)
  app/api/daily    GET  today's problem (answer stripped)
  app/api/grade    POST a submission → grade + reveal
  app/daily        the game (commit + reveal)
  app/you          rating + calibration ring + graduation gate
  app/journal      every logged call
  app/practice|rank  roadmap stubs
  components/      DailyGame · SparkChart · ShareCard · Confetti · CountUp · BottomNav
```

## Roadmap (from the handoff)

1. ✅ **P1** — Daily problem + rating + streak (this build)
2. **P2** — Reveal polish + shareable card (card shipped; image-card next)
3. **P3** — Leagues + leaderboard + skill tree (real crowd telemetry replaces the illustrative split)
4. **P4** — More modes: blind replay, valuation puzzle, calibration bet
5. **P5** — Graduation + read-only brokerage bridge (gated by rating)
6. **P6** — Onboarding + notifications + retention loops

See [docs/handoff.md](docs/handoff.md) for the full product vision.
