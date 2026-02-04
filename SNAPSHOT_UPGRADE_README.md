# Snapshot Upgrade Notes (v3)

This document describes the Snapshot → Resources Hub upgrade and local storage contract.

## Canonical Snapshot Object
Stored at `localStorage["cyberseeds_snapshot_v3"]` after completion.

```json
{
  "id": "<string>",
  "timestamp": 0,
  "total": 0,
  "lenses": { "network": 0, "devices": 0, "privacy": 0, "scams": 0, "wellbeing": 0 },
  "patterns": [],
  "strengths": [],
  "phasePlan": [],
  "signal": { "overall": "STABLE", "score": 0, "trajectory": "Stable", "riskPressure": "Medium", "resilienceIndex": "Flat" },
  "trajectory": { "label": "Stable", "diff": 0, "change": "" }
}
```

Additional compatibility fields are retained (for older UI modules), including `lensPercents`, `hdss`, `focus`, `strongest`, `weakest`, and `seed`.

## Snapshot History
Stored at `localStorage["cyberseeds_snapshots_v1"]` as an array of entries with:

- `date`, `totalScore`, `perLens`, `patterns`, `strengths`, `phasePlan`
- Plus legacy fields for comparisons (`hdss`, `lensPercents`)

History is capped at 24 entries and rendered as the latest three in the modal.

## Migration (v2 → v3)
Both `script.js` and `resources/resources.js` include a lightweight migration helper. If the canonical key is missing or malformed, the helpers:

1. Scan older snapshot keys.
2. Coerce legacy data into the v3 schema.
3. Save the canonical object into `cyberseeds_snapshot_v3` and update `cyberseeds_snapshot_last`.

## Resources Hub Ingestion
`resources/resources.js` loads the latest snapshot, derives signal metadata, and updates:

- Snapshot overview card
- Lens ring + legend values
- Focus panel and lens insight cards
- “Personalised for you” banner
- Action lists and baseline comparison

All updates are guarded so the page remains stable if snapshot data is missing or corrupt.
