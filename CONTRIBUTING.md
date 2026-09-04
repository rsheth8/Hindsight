# Contributing to Hindsight

## Prerequisites
- Node.js + npm

## Run (no keys)
```bash
npm install
npm run dev      # http://localhost:3000 → /daily
```

Optional `.env.local`: `FMP_API_KEY`, `ANTHROPIC_API_KEY` (server-side only).

## Tests
```bash
npm test
npm run test:e2e
npm run test:ci
```

Keep `src/lib/game/` and `mobile/src/lib/game/` in sync (`scripts/check-game-sync.sh`).

Educational only — no buy/sell advice in UI or prompts.
