#!/usr/bin/env bash
set -euo pipefail

violations=0

report_matches() {
  local title="$1"
  local pattern="$2"
  shift 2
  local -a rg_args=("$@")

  local output
  output=$(rg -n --no-heading --color never -F "$pattern" "${rg_args[@]}" || true)

  if [[ -n "$output" ]]; then
    violations=1
    echo "[FAIL] $title"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      echo "  - $line"
    done <<< "$output"
    echo
  fi
}

# 1) Scoring function patterns must only exist in canonical engine file.
scoring_patterns=(
  "function computeScore"
  "computeScore("
  "function scoreSnapshot"
  "scoreSnapshot("
  "calcHdss("
  "stageForScore("
  "bandFromOverall("
)

for pattern in "${scoring_patterns[@]}"; do
  report_matches \
    "Scoring function signature found outside engine/seedforge.js (pattern: ${pattern})" \
    "$pattern" \
    . \
    --glob '!engine/seedforge.js' \
    --glob '!scripts/canon_guard.sh' \
    --glob '!archive/legacy/**'
done

# 2) Snapshot storage keys outside canonical namespace are forbidden.
key_patterns=(
  'localStorage.setItem("cs_snapshot_'
  'localStorage.setItem("cyberseeds_snapshot_v1"'
  'localStorage.setItem("cyberseeds_snapshot_v3"'
  'localStorage.setItem("cyberseeds_snapshots_v1"'
)

for pattern in "${key_patterns[@]}"; do
  report_matches \
    "Non-canonical snapshot storage key detected (pattern: ${pattern})" \
    "$pattern" \
    . \
    --glob '!scripts/canon_guard.sh' \
    --glob '!archive/legacy/**'
done

# 3) Deprecated scorer imports are forbidden.
import_patterns=(
  "from '/scoring.js'"
  'from "/scoring.js"'
  "from '/storage.js'"
  'from "/storage.js"'
  "from '/engine/scoring.js'"
  'from "/engine/scoring.js"'
)

for pattern in "${import_patterns[@]}"; do
  report_matches \
    "Deprecated scoring/storage import detected (pattern: ${pattern})" \
    "$pattern" \
    . \
    --glob '!scripts/canon_guard.sh' \
    --glob '!archive/legacy/**'
done

if [[ "$violations" -ne 0 ]]; then
  echo "Canon Integrity Guard failed. Resolve the violations listed above."
  exit 1
fi

echo "Canon Integrity Guard passed."
