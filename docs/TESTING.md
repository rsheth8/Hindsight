# Testing — Hindsight

Comprehensive test pyramid for the web backend + game engine. Mobile duplicates pure logic in `mobile/src/lib/game/` — kept in sync via `scripts/check-game-sync.sh`.

## Quick commands

```bash
npm test              # all unit + API tests (Vitest)
npm run test:watch    # watch mode
npm run test:coverage # unit + API with coverage report (coverage/index.html)
npm run test:e2e      # Playwright smoke (builds + starts prod server)
npm run test:ci       # full CI suite: lint + coverage + sync + build
bash scripts/check-game-sync.sh   # web ↔ mobile game logic diff
```

## Layers

### 1. Unit tests — `src/lib/**/*.test.ts`

Pure game logic, no network:

| Module | What it guards |
|--------|----------------|
| `rating` | Luck filter, provisional grace, Elo math, earned flag |
| `calibration` | Brier scores, readiness labels, sample size |
| `streak` | Consecutive days, freeze mechanics, ISO weeks |
| `progress` | Verdict badges, trajectory, insights |
| `reasoning-chips` | Chip generation, submit gate |
| `seed` | Deterministic daily puzzle selection |
| `metrics` | Setup metrics, difficulty estimation |
| `daily` + `fallback` | Problem generation, answer classification |
| `practice` + `practice-focus` | Weakness targeting |
| `blind-replay` | Chart truncation, ID conventions |
| `concepts` + `stats` | Skill tree, rank tiers, weekly stats |
| `journal-entry-kind` | Journal badges |
| `env` | Deploy health contract |
| `submissions` | Crowd dedup, real vs synthetic threshold |
| `ai/grade` | Heuristic grading path (no API key) |

### 2. API integration tests — `src/app/api/**/route.test.ts`

Route handlers invoked directly with mocked dependencies where needed:

- `GET /api/health` — mode flags
- `GET /api/daily` — no answer/reveal leak
- `POST /api/grade` — validation, confidence clamp, submission rules
- `GET /api/practice` — seed validation, focus default
- `GET /api/blind-replay` — truncation meta

### 3. E2E user journeys — `e2e/*.spec.ts` (Playwright)

Runs against **production build** on port **3001** (`next build && PORT=3001 next start`) so it never collides with `npm run dev` on :3000 (dev HMR breaks headless Playwright hydration).

| File | Coverage |
|------|----------|
| `smoke.spec.ts` | API health/daily/grade + page load smoke |
| `onboarding.spec.ts` | First-run slides, skip, complete, persistence |
| `user-journeys.spec.ts` | Full flows: nav, daily commit→reveal→done-today, practice, blind replay, You/Rank/Journal |

21 automated browser tests covering every main workflow. Grading round-trips hit the real `/api/grade` endpoint (~5s each).

### 4. Mobile sync gate — `scripts/check-game-sync.sh`

Fails if duplicated files drift:

`rating`, `calibration`, `streak`, `seed`, `reasoning-chips`, `journal-entry-kind`, `types`

After editing `src/lib/game/`, copy changes to `mobile/src/lib/game/`.

## CI

GitHub Actions (`.github/workflows/test.yml`):

1. **unit-and-api** — lint, `test:coverage`, sync check, `next build`
2. **e2e** — Playwright chromium smoke

## Environment in tests

`src/test/setup.ts` clears API keys so tests always hit fallback/heuristic paths — deterministic, no secrets in CI.

For local live-key validation (manual):

```bash
# With real keys in .env.local
curl http://localhost:3000/api/health
# mode.fmp: "live", mode.ai: "live"
```

## Adding tests

1. **New pure logic** → `src/lib/game/foo.test.ts` next to `foo.ts`
2. **New API route** → `src/app/api/foo/route.test.ts`
3. **User-facing flow** → extend `e2e/smoke.spec.ts`
4. **Shared web/mobile logic** → update both copies + sync script list if new file

## Coverage goals

Run `npm run test:coverage` and open `coverage/index.html`. Priority for new tests:

1. Anything that touches **money/education compliance** (no buy/sell copy, no answer leaks)
2. **Rating / calibration** math
3. **API validation** paths
4. UI-only polish (lower priority for unit tests; use E2E sparingly)

## Manual release checklist (Vercel + mobile)

Run after deploy or before App Store submission. Replace `$API` with your Vercel URL.

### Backend smoke (2 min)

```bash
API=https://your-app.vercel.app

curl -s "$API/api/health" | jq .
curl -s "$API/api/daily" | jq 'keys'          # must NOT include answer/reveal
curl -s -X POST "$API/api/grade" \
  -H 'content-type: application/json' \
  -d '{"choice":"B","confidence":0.7,"reasoning":"Range-bound with capped upside near resistance","rating":1000,"gradedCount":0,"depth":"learn","deviceId":"manual-smoke"}' \
  | jq 'keys'                                   # newRating, explanation, reveal
```

Confirm `/api/health` shows expected modes (`live` vs `fallback` for FMP/AI/KV).

### Web flows (10 min)

| Flow | Pass criteria |
|------|----------------|
| Daily | Load `/daily`, complete onboarding, submit call with chips + reasoning, reveal shows verdict + coach |
| Done today | Refresh — shows summary, no second submit |
| Practice | `/practice` → read setup → grade → reveal; blind replay week-by-week works |
| Journal | Past entries show daily/practice/blind badges |
| You | Rating, streak, trajectory (mobile has more; web shows stats) |
| Legal | `/privacy` and `/support` render; linked from App Store metadata |

### Mobile (15 min, simulator)

1. Set `EXPO_PUBLIC_API_BASE` to Vercel URL in `mobile/eas.json` preview/production profile.
2. `cd mobile && npx expo start` → iOS simulator.
3. Repeat daily + practice + blind replay flows; confirm haptics, AsyncStorage persistence, notification permission UX on You screen.
4. Airplane mode → graceful offline error on daily fetch.

### Crowd split (optional, needs KV)

Submit 3+ distinct device IDs for today's puzzle via `/api/grade`, then confirm daily reveal shows **real** crowd split (not synthetic label).

## CI notes

- `npm run test:ci` runs lint + unit/API + sync + build. E2E runs separately in GitHub Actions.
- E2E uses port **3001** so it never collides with `npm run dev` on :3000.
- First local E2E run: `npx playwright install chromium`
