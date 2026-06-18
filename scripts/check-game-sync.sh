#!/usr/bin/env bash
# Fail CI if web/mobile duplicated game logic drifts apart.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SYNC_FILES=(
  rating.ts
  calibration.ts
  streak.ts
  seed.ts
  reasoning-chips.ts
  journal-entry-kind.ts
  types.ts
  chart.ts
  duel.ts
)

FAILED=0
for f in "${SYNC_FILES[@]}"; do
  WEB="src/lib/game/$f"
  MOB="mobile/src/lib/game/$f"
  if [[ ! -f "$WEB" || ! -f "$MOB" ]]; then
    echo "MISSING: $f (web or mobile)"
    FAILED=1
    continue
  fi
  if ! diff -q "$WEB" "$MOB" >/dev/null 2>&1; then
    echo "DRIFT: $f — copy src/lib/game/$f → mobile/src/lib/game/$f"
    FAILED=1
  fi
done

if [[ $FAILED -ne 0 ]]; then
  exit 1
fi
echo "Game logic sync OK (${#SYNC_FILES[@]} files)"
