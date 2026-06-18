# Hindsight — visual design system & redesign spec

> **Status:** **Implemented (v1).** Palette, type, logo, and the flagship Daily reveal are
> live in the app; remaining screens are palette-themed with display/mono type on their
> hero numbers and titles. Source of truth for the 2026 visual redesign. Owner: Rahil.
> Finalized & first implementation 2026-06-18. See §9 for what shipped.
>
> **For the agent implementing this:** read this top to bottom, then apply it screen by
> screen on **web** (`src/`) and **mobile** (`mobile/src/`). The current app is a clean,
> generic "dark fintech" look (mint-on-near-black). The redesign replaces that with a
> warm, premium, **espresso + gold** identity and a set of signature interactions. Do not
> change game logic, copy guardrails, or calibration math while restyling — see
> `CLAUDE.md` (educational-only copy; single-source calibration in
> `src/lib/game/calibration.ts`; mobile/web game logic is duplicated, keep it in sync).

---

## 1. Design thesis

Hindsight is a **daily judgment game**, not a finance dashboard. The product's soul is the
gap between *how sure you were* and *how right you were* — calibration. The visual system
exists to make that feeling **visceral, premium, and shareable**, and to look unmistakably
*not* like every other dark fintech app.

Three principles:
1. **Number-as-hero.** Big, confident, custom-typeface numbers carry every screen.
2. **Gold = earned judgment.** The accent isn't decoration; it means mastery / a calibrated,
   correct call. Reserve it for wins and the calibrated state.
3. **One idea, everywhere.** The "price line across a time interval" appears as the logo,
   the app icon, the loading animation, and the in-app reveal chart. They all rhyme.

Chosen direction: **"Reinvented"** (a clean break from fintech convention), executed with
restraint (calm dark base, one decisive accent).

---

## 2. Color palette — "espresso + gold" (green-free, on purpose)

The old app used mint `#5ef2b0`. **Mint/green is retired** — it's the single most overused
accent in this category. We are deliberately green-free.

| Token | Hex | Role |
|------|------|------|
| `base` | `#0C0907` | app background (near-black espresso) |
| `surface` | `#171210` | cards |
| `surface2` | `#241A14` | insets, slider/progress tracks, inactive bars |
| `border` | `#2C2118` | hairline borders (0.5px) |
| `accent` | `#F0C560` | **gold** — hero numbers, gains, "calibrated", wins, primary buttons |
| `cool` | `#6F8CFF` | "too timid" end of the calibration bar |
| `hot` | `#FF7A6B` | "too cocky" end of the bar, **and losses** |
| `text` | `#F6EDE0` | warm white, primary text |
| `muted` | `#9A8D7A` | secondary text |
| `muted2` | `#6B5C48` | tertiary text / dim chart history line |

**Semantic rules (important):**
- **Gains glow gold, losses are coral/red.** Keep the universal `red = loss` convention
  (breaking it confuses people); break only `green = gain` → use gold. So a positive return
  is gold, a negative return is `hot`.
- **Gold is reserved for the reward/calibrated/win state.** Never use gold for a neutral or
  losing state, or its meaning erodes.
- The reveal background uses a subtle warm radial glow from the top-right:
  `radial-gradient(130% 60% at 82% 0%, #241509 0%, #100B08 42%, #0C0907 100%)`.
- Optional **light "paper" mode** (cream `#F3EDE1` base, ink text, gold/violet accent) is a
  strong differentiator for App Store screenshots — keep as a stretch goal, not v1.

---

## 3. Typography

| Use | Typeface | Notes |
|-----|----------|-------|
| Display / hero numbers / wordmark | **Bricolage Grotesque** (800, 700) | the personality; rating, the gap %, big headers |
| Stat numbers (returns, Brier, n=, counters) | **Space Mono** (700, 400) | tabular, "terminal" precision |
| Body / UI | **Inter** (400, 500, 600) | clean, legible |

- Numbers are the hero — set them large with tight tracking (`letter-spacing: -0.5px` on
  Bricolage display). Always `tabular-nums` / `font-variant-numeric: tabular-nums` for
  anything that animates or aligns.
- Mobile: load via `expo-font` (or `@expo-google-fonts/bricolage-grotesque`,
  `-space-mono`, `-inter`). Web: `next/font/google`.
- Sentence case in UI. Wordmark is **lowercase** `hindsight`.

---

## 4. Logo & app icon — LOCKED

**Mark:** the **"H as a chart across a time interval."** Two dashed vertical gridlines are
the two timestamps — *when you call it* (left) → *when it resolves* (right) — and a gold
price line travels between them as the H's crossbar. This is the literal shape of the game.

**Locked spec (variant "B", dot treatment "both white"):**
- Two dashed vertical legs in `muted2` (`#6B5C48`), `stroke-dasharray: 1 7` (fatten dashes
  at small sizes for legibility).
- Gold (`accent`) price line as the crossbar: dips then rises (e.g. path points
  `16,35 → 27,38 → 37,26 → 48,30` in a 64×64 viewBox).
- **Both endpoint dots warm-white** (`text`), not gold. Rationale: the dots are the same
  kind of object (timestamps) so they share a color; white-on-gold has the highest contrast
  and survives down to a 40px notification glyph. A *gold* terminal dot merges into the gold
  line and disappears — do not do that in the static mark.
- Icon background: warm radial `radial-gradient(130% 130% at 28% 18%, #241509, #0C0907)`,
  corner radius ~22px at 96px.

**Wordmark:** `hindsight`, lowercase, Bricolage Grotesque 800, `letter-spacing: -0.5px`.
- **Primary marketing variant:** gold-split — `hind` in `text`, `sight` in `accent`
  ("hind\<gold\>sight\</gold\>").
- Tracked-caps variant (`HINDSIGHT`, `letter-spacing: 0.34em`, weight 700) for nav/footers.
- Horizontal lockup: mark + wordmark with ~14px gap.

**Motion expression:** the colored "arrival" dot (right dot lighting **gold**, or the
muted→white "then→now" idea) is **reserved for the animated in-app reveal chart**, where it
has room to breathe — not the static icon.

**Canonical mark SVG** (reproduce exactly; scale via the wrapping element, not the geometry).
At ≤48px, fatten the dashes/dots for legibility (e.g. `stroke-width: 4`, `dasharray: 1 8`,
dot `r: 5`):

```svg
<svg viewBox="0 0 64 64" role="img" aria-label="Hindsight">
  <path d="M16 12 L16 52" stroke="#6B5C48" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" fill="none"/>
  <path d="M48 12 L48 52" stroke="#6B5C48" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" fill="none"/>
  <path d="M16 35 L27 38 L37 26 L48 30" stroke="#F0C560" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="16" cy="35" r="4.5" fill="#F6EDE0"/>
  <circle cx="48" cy="30" r="4.5" fill="#F6EDE0"/>
</svg>
```

App-icon background: `radial-gradient(130% 130% at 28% 18%, #241509, #0C0907)`, corner radius
~24px at 104px (≈23% of size). **Monochrome-on-light fallback:** legs `#B3AA97`, price line +
dots `#1A1610`. **Wordmark (finalized):** lowercase `hindsight`, Bricolage Grotesque 800,
`letter-spacing: -0.5px`; gold-split = `hind` in `#F6EDE0` + `sight` in `#F0C560`.

---

## 5. Signature UX concepts

These are what make the app feel like Hindsight, not a reskin.

1. **Gap-as-hero reveal.** The reveal's headline is the calibration gap, e.g.
   `72% → 78%` ("how sure" → "how right"), not the rating. Two big Bricolage numbers with
   an arrow between; "how right" is gold.
2. **Calibration temperature bar.** A horizontal bar `linear-gradient(90deg, cool, accent
   50%, hot)` with a warm-white marker dot at the player's position. Labels: `too timid ·
   calibrated · too cocky`. This visualizes calibration better than a raw Brier number.
3. **Score rings** replace the old emoji squares (🟩🟨🟥). Three arcs — Outcome (15%),
   Calibration (45%), Reasoning (40%) — drawn as stroked SVG circles, gold when strong,
   dimming toward `muted2`/`hot` when weak. The three-arc motif echoes the brand.
4. **Calibration-strip share card = the growth loop** (the "Wordle grid"). A row of colored
   squares, one per recent call: gold = calibrated, `cool` = timid, `hot` = cocky. Decodable
   at a glance in a group chat, recognizable as Hindsight, screenshot-bait. Include date/##,
   streak, and a one-line hook ("read a chart better than me?").
5. **The "call" gesture is reused everywhere** — logo, loading spinner, and the in-app chart
   continuation are the same gold line crossing a decision point.

---

## 6. Reveal-screen choreography (the emotional peak)

The reveal is the payoff; sequence it (~1.5s total), don't dump it:
1. Verdict badge punches in (scale + haptic `Medium`).
2. Gap numbers count up (`CountUp`), bar fills left→right to the marker.
3. Score rings draw (stagger ~80ms each).
4. Reveal chart paints its **gold continuation** left→right; the right "arrival" dot lights
   up at the end with a success haptic.
5. Confetti only on an *earned* win (already gated by `result.earned`).

Effects stay compositor-cheap (no heavy WebGL) per `CLAUDE.md`.

---

## 7. Screen-by-screen intent

Apply the system to every screen (mobile `mobile/src/screens/*`, web `src/components/*`):
- **Daily — commit:** dark warm base; anonymized chart in a `surface` card; choice buttons
  with gold selected-state; confidence slider with gold fill on `surface2` track; reasoning
  chips as pills (gold when selected). Primary CTA "Lock in your call" in gold.
- **Daily — reveal:** §5 + §6. Gap-as-hero, temperature bar, score rings, reveal chart
  (gold gains / coral losses), crowd split (gold = the answer bar), Coach's read card with
  Learn/Analyst/Quant depth toggle (gold active), "What you practiced" card (gold hairline),
  Share button.
- **Duel (`DuelScreen`/`DuelView`):** head-to-head — mirror the gap/temperature language for
  both players; gold = round winner. Keep the separate Elo ladder visuals consistent.
- **You:** rating trajectory, edge/leak insights, Lucky/Earned verdict — number-as-hero in
  Bricolage, gold for positive trajectory.
- **Journal / Rank / Onboarding / Practice / Blind replay:** same tokens, type, and
  components. Onboarding should introduce the gap concept and the temperature bar early.

---

## 8. Implementation notes

- **Mobile theme** lives in `mobile/src/theme.ts` (currently exports `C` palette + `radius`).
  Replace the palette with §2 tokens; add type constants. Web has an equivalent — update
  both, they are duplicated not shared.
- **Keep game logic untouched.** Restyle presentation only. The Daily flow, grading, crowd
  store, and calibration math stay as-is.
- **Reuse, don't re-derive.** Build shared primitives: `<ScoreRing>`, `<CalibrationBar>`,
  `<GapHero>`, `<CalibrationStripCard>` (share), `<HMark>` (logo). Both platforms get their
  own copy following the existing duplication convention.
- **Accessibility:** white-on-espresso and gold-on-espresso both pass contrast; verify the
  `muted2` tertiary text stays ≥ 4.5:1 on `base`. Don't rely on color alone — gains pair
  gold with a `+`/↑ if user testing shows confusion (see §2).
- **Assets:** export the locked mark as the app icon (`mobile/assets/`), splash, and
  favicon. Update `app.json`/`eas.json` icon refs.

---

## 9. Decision log

- **2026-06-18** — Picked "Reinvented" over evolving the current look. Locked **espresso +
  gold** palette after exploring 18 candidates (warm/premium won on legibility + thesis fit
  + low fatigue; **no mint/green**). Locked type: Bricolage Grotesque / Space Mono / Inter.
  Locked logo: **H-as-chart-over-an-interval, variant B, both dots warm-white, gold line**;
  gold-split lowercase wordmark. Defined signature UX (gap-as-hero, temperature bar, score
  rings, calibration-strip share card).

- **2026-06-18 (implementation v1)** — Shipped the redesign:
  - Palette remapped in `mobile/src/theme.ts` (`C` tokens) and web `src/app/globals.css`
    (`:root` vars); every hardcoded old-mint/charcoal literal swapped to espresso+gold across
    both `src/` and `mobile/src/`.
  - Fonts: `@expo-google-fonts/{bricolage-grotesque,space-mono,inter}` installed and loaded
    via `useFonts` in `App.tsx` (render gated until ready); `F` family constants in `theme.ts`.
  - New shared mobile components: `HMark` (logo), `CalibrationBar` (+ `calibrationPosition`),
    `ScoreRing`.
  - Daily reveal rebuilt: gap-as-hero (how sure → how right), temperature bar, score rings
    (emoji squares removed), gold-split wordmark + logo in the top bar.
  - App icon / splash / Android adaptive + monochrome / favicon regenerated from the H-mark
    SVG sources via `rsvg-convert`; `app.json` colors updated.
  - Display/mono type applied to hero numbers + titles on Onboarding, You, Rank, Practice,
    Journal, Duel, Learn, TabBar.
  - Verified: web `npm run build` ✓, `npm test` (148) ✓, `check-game-sync.sh` ✓, mobile
    `tsc` clean for all touched files.
  - **Not yet done (follow-ups):** full type pass on body copy of secondary screens; reveal
    motion choreography (§6); custom flame/freeze glyph; light "paper" mode.

- **2026-06-18 (flow & onboarding pass)** — Navigation/UX intuitiveness:
  - Rebuilt `OnboardingScreen` into a guided entrance: welcome (brand) → 2 questions
    (experience → sets default reveal depth; goal) → a single "daily loop" walkthrough →
    "Play today's problem". Progress dots + back/skip. Experience answer persists via new
    `mobile/src/lib/prefs.ts` (`getPreferredDepth`/`setPreferredDepth`); Daily & Practice
    load it to default the Coach's-read depth.
  - Fixed dead-ends: `App.tsx` now passes `onNavigate` to `DailyScreen`; the Daily reveal
    and "already played" views gained a shared `NextSteps` row (Practice / Duel / Journal),
    so the daily always points somewhere. Added a first-call helper banner on the commit
    screen when `gradedCount === 0`.
  - **Note for future agents:** at the time of this pass the repo had concurrent uncommitted
    work on a "special problems" feature (`special-problems.ts`, extra `ProblemType`s,
    `profile-export.ts`) and a pre-existing `profile.tsx` reducer bug (daily/practice record
    drops `duelRating`/learning fields — spread `...p` to fix). Left untouched to avoid
    conflicts; not introduced by the redesign.

- **2026-06-18 (special-problems UI, motion, profile fix)** —
  - **Special problems:** themed `ProblemSetup` (spot-the-flaw / options-greeks / futures /
    calibration-bet drill cards) with display/mono type, and rebuilt the Practice reveal to
    match Daily — gap-as-hero, calibration bar, score rings (emoji `MiniScore` removed),
    themed buttons/prompt/confidence.
  - **Motion choreography (§6):** new `components/Animate.tsx` (`Rise`, `Pop`). `ScoreRing`
    now animates its draw on mount with a staggered `delay`; `CalibrationBar` slides its
    marker from center → position. Daily reveal: verdict badge punches in (`Pop`), rings
    card rises (`Rise`), rings draw in sequence (120/220/320ms), rating counts up. Cards
    below the fold left static on purpose (they'd animate off-screen). Built on RN's
    `Animated` (no new deps); compositor-cheap.
  - **Bug fix:** `mobile/src/lib/profile.tsx` `record`/`recordPractice` now spread `...p`, so
    playing the daily/practice no longer wipes `duelRating`, learning progress, or milestones
    (the §9 follow-up from the flow pass — done).
  - **Left alone (another agent's WIP):** `mobile/src/lib/game/problems/calibration-bet.ts`
    and `mobile/src/lib/profile-export.ts` reference not-yet-mirrored modules (`../daily`,
    `./store`). They're unreachable in the mobile bundle (tsc-only) and part of the synced
    set, so not deleted. Their owner needs to add the mobile mirrors of `daily.ts`/`store.ts`.

- **2026-06-18 (Duel motion + custom glyphs)** —
  - **Duel reveal** now uses the same choreography: verdict badge `Pop`s in, the delta is set
    in the display face, and the scoreboard + reveal card `Rise` in sequence (80/160ms).
  - **Custom glyphs** (`components/Glyph.tsx`): `Flame` (two-tone amber/gold) and `Freeze`
    (6-fold cool-blue snowflake via rotated arms) retire the 🔥/🧊 emoji across the live UI —
    Daily top-bar pills, Daily reveal + already-played streak, You stats, and the share card
    (which also now carries the gold-split wordmark + display/mono type). Emoji remain only in
    the OS share-message *string* (SVG can't go in plain text) and the synced milestone data.

## 10. Open questions
- Light "paper" mode — ship for App Store screenshots, or post-launch?
- Exact reveal-motion timings — tune on-device.
- Custom flame/streak glyph + freeze glyph to replace 🔥/🧊 emoji.
