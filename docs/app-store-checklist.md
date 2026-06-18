# Hindsight — App Store submission checklist

The app and build config are done. The remaining steps need **your accounts** (Apple,
Expo) and a **deployed backend** — they can't be automated from here. This is the path.

---

## 0. Status — what's already done ✅

- Native iOS app (Expo SDK 56 / RN 0.85), full game loop working in the simulator.
- Branded app **icon** + **splash** (`mobile/assets/icon.png`, `splash-icon.png`).
- `app.json`: bundle id `game.hindsight.app`, dark UI, portrait, splash plugin,
  `ITSAppUsesNonExemptEncryption=false` (skips the export-compliance prompt), iOS
  **privacy manifest** for AsyncStorage's UserDefaults access.
- `eas.json`: `development` / `preview` / `production` build profiles + a `submit` block.
- `npx expo-doctor` → 18/18 checks pass.

---

## 1. Accounts & prerequisites (you)

- [ ] **Apple Developer Program** membership — $99/yr (`developer.apple.com`). Required to
      ship to the App Store. *(I can't enroll or pay on your behalf.)*
- [ ] **Expo account** (free) for EAS Build — `eas login`.
- [ ] Xcode is already installed (26.5) ✓.

## 2. Deploy the backend

The app fetches `/api/daily` and `/api/grade` from the Next.js app. Host it anywhere that
runs Next 16; Vercel is simplest:

- [ ] From the repo root: `vercel` (or connect the GitHub repo in the Vercel dashboard).
- [ ] Set env vars on the host: `FMP_API_KEY`, `ANTHROPIC_API_KEY` *(optional — without
      them it serves the fallback bank + heuristic grading)*. Add **Vercel KV** (or Upstash
      Redis) so crowd submissions persist — sets `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
- [ ] Set `NEXT_PUBLIC_APP_URL` to your deployed HTTPS URL (share cards + legal pages).
- [ ] Note the HTTPS URL, e.g. `https://hindsight-api.vercel.app`.
- [ ] Put that URL in `mobile/eas.json` →
      `build.production.env.EXPO_PUBLIC_API_BASE` (and `preview` too).

## 3. First build

```bash
cd mobile
eas login
eas init                 # creates the EAS project, writes extra.eas.projectId
eas build --platform ios --profile production
```

EAS handles signing — let it create the Distribution certificate & provisioning profile
when prompted (`eas` walks you through it; needs your Apple login).

## 4. App Store Connect listing

- [ ] Create the app at `appstoreconnect.apple.com` (bundle id `game.hindsight.app`).
- [ ] **Category:** Finance or Education. **Age rating:** complete the questionnaire.
- [ ] **Screenshots** — 6.7" (iPhone 16 Pro Max) required. Capture the commit screen, the
      reveal, and the You/calibration screen from the simulator
      (`xcrun simctl io booted screenshot out.png`).
- [ ] **Description / keywords / subtitle** — see the draft copy in §6 below.
- [ ] **Privacy:** "Data Not Collected" is accurate today — the profile lives only in
      on-device AsyncStorage, there are no accounts, ads, or third-party analytics. (If you
      later add cloud sync/accounts, update this.)
- [ ] **Support URL** + **Privacy Policy URL** — served at `/support` and `/privacy` on
      your deployed web app (e.g. `https://your-app.vercel.app/privacy`).

## 5. Submit

```bash
eas submit --platform ios --profile production   # fill appleId/ascAppId/appleTeamId in eas.json, or go interactive
```

Then in App Store Connect, attach the build to the version and **Submit for Review**.

### Review notes (paste into "Notes for Reviewer") — important for a finance app

> Hindsight is an **educational game** about decision-making and calibration using
> **anonymized historical** market data. It does **not** provide investment advice, does
> **not** connect to any brokerage, and does **not** enable any real trades or money
> movement. All content is illustrative/educational. No account or login is required.

This framing matters: Apple scrutinizes finance apps, and "we never give buy/sell advice,
no trading, educational only" is exactly the positioning baked into the app copy.

---

## 6. Draft store copy

**Name:** Hindsight
**Subtitle:** Train your market judgment
**Promotional text:** One puzzle a day. Read the setup, make the call, see if your
confidence was earned.

**Description:**
> Hindsight is a daily game that makes you a sharper decision-maker. Read an anonymized
> real-market setup, make your call, and say how sure you are. You're scored on
> **calibration and reasoning — not luck.** A confident wrong answer costs you; an honest,
> well-reasoned read earns you. Build a streak, watch your rating climb, and learn to size
> your conviction to the evidence.
>
> • A fresh puzzle every day
> • A luck-resistant rating (calibration 45% · reasoning 40% · outcome 15%)
> • A coach's explanation after every reveal, at the depth you choose
> • A private journal of every call you've made
>
> Educational only. Hindsight never gives buy or sell advice and never touches real money.

**Keywords:** investing,finance,calibration,decision,judgment,stocks,game,daily,puzzle,learn

---

## Notes / guardrails carried from the project

- Keys stay **server-side**. The app only talks to your backend over HTTPS.
- Grade the **decision, not the outcome** — the rating weighting and luck filter live in
  `src/lib/game/rating.ts` (shared by web + mobile).
- The crowd split is **real** once enough players have answered; otherwise illustrative
  and labelled. Production needs Vercel KV (`KV_REST_API_*` env vars).
- The "real-money bridge" is a roadmap teaser — it's read-only coaching, never trade
  execution. Don't let copy drift toward advice.
