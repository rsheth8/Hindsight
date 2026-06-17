# Hindsight — iOS app (Expo / React Native)

The native client for Hindsight. Reuses the web app's **pure game logic** (rating,
calibration, seed) and talks to the **same backend** (the Next.js app's `/api/daily` and
`/api/grade` routes), so the FMP + Anthropic keys never leave the server.

```
mobile/
  App.tsx                 providers + custom bottom-tab shell
  src/screens/            DailyScreen (commit + reveal) · YouScreen · JournalScreen · SoonScreen
  src/components/         SparkChart (react-native-svg) · CountUp · Confetti · TabBar
  src/lib/game/           calibration · rating · seed · types  (copied, framework-agnostic)
  src/lib/api.ts          fetchDaily / gradeSubmission → backend
  src/lib/profile.tsx     AsyncStorage store + ProfileProvider/useProfile
  src/theme.ts            palette (matches web)
  assets/icon*.svg/png    branded icon + splash (rebuild PNGs with rsvg-convert)
```

## Run in development

The app needs the backend reachable. Two terminals:

```bash
# 1) backend (repo root)
cd ..  &&  npm run dev            # Next.js on :3000

# 2) the app
cd mobile  &&  npx expo start     # press i to open the iOS simulator
```

- **iOS simulator** reaches the Mac at `http://localhost:3000` — the default `API_BASE`,
  so no config needed.
- **Physical device** (Expo Go): set your Mac's LAN IP, e.g.
  `EXPO_PUBLIC_API_BASE=http://192.168.1.50:3000 npx expo start`.

## Production build (App Store)

Builds run in the cloud via **EAS Build** (no Xcode archive step needed locally).

```bash
npm i -g eas-cli           # or use npx eas-cli
eas login                  # your Expo account
eas init                   # writes extra.eas.projectId into app.json

# point the app at your deployed backend first:
#   edit eas.json → build.production.env.EXPO_PUBLIC_API_BASE = https://your-api…

eas build --platform ios --profile production
eas submit --platform ios --profile production    # uploads to App Store Connect
```

See [`../docs/app-store-checklist.md`](../docs/app-store-checklist.md) for the full
submission checklist (Apple Developer account, screenshots, privacy, review notes).

## Backend

Any host that runs Next.js works (Vercel is one click). Set `FMP_API_KEY` and
`ANTHROPIC_API_KEY` there for live data + AI grading; without them the backend serves the
built-in fallback bank. Native `fetch` is not subject to CORS, so no extra headers needed.

## Regenerating the icon / splash

```bash
cd assets
rsvg-convert -w 1024 -h 1024 icon-source.svg   -o icon.png
rsvg-convert -w 1024 -h 1024 splash-source.svg -o splash-icon.png
```
