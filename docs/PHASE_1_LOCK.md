# PHASE_1_LOCK.md
**Repository Guard File — Cyber Seeds Phase 1 Stabilisation Lock**

**Status:** ACTIVE  
**Scope:** Snapshot Runtime + Scoring Determinism + Local-First Persistence + Resources Rendering  
**Authority:** Cyber Seeds Core Stabilisation Authority  
**Purpose:** Prevent regression. Preserve determinism. Protect cross-device reliability.

---

## 1) Why This Lock Exists

Phase 1 establishes the **deterministic, local-first** foundations of Cyber Seeds:

- Snapshot must load reliably (desktop + mobile)
- Snapshot → Score → Resources must complete without race conditions
- HDSS must remain deterministic (same answers = same HDSS)
- No whitescreens, no broken storage, no mount conflicts

**This lock is a stability contract.**  
Phase 2 work is permitted only if it does not degrade Phase 1 guarantees.

---

## 2) Phase 1 Protected Surface (Non-Negotiable)

The following areas are protected and MUST NOT be modified without a formal Stabilisation Review:

### A. Scoring Engine Authority (Single Source of Truth)
**Rule:** The scoring engine cannot be modified without Stabilisation Review.

- The canonical scorer is the only accepted scoring authority.
- No alternative scoring paths may exist in runtime.
- No duplicate “computeScore / scoreSnapshot / calcHdss / stageForScore” implementations may re-enter active code paths.

**Hard requirement:**  
> One scoring engine. One scoring path. No ambiguity.

---

### B. Storage Schema & Local-First Snapshot Persistence
**Rule:** Storage schema cannot change.

- Snapshot schema version(s) are fixed for Phase 1.
- Snapshot object structure is treated as a contract with the Resources renderer.
- No breaking changes to stored snapshot JSON are permitted in Phase 2 work.

**Hard requirement:**  
> Stored snapshot must remain readable, validatable, and fail-safe.

---

### C. Snapshot Mount Logic (Deterministic Entry Point)
**Rule:** Snapshot mount logic cannot change.

- There must be **one canonical runtime entry point** for snapshot mount.
- No secondary launchers, no duplicate mounting, no conditional mounts that vary by page type.
- No reintroduction of legacy launch scripts.

**Hard requirement:**  
> One mount path, deterministic across all devices.

---

### D. Storage Keys (Canonical Key Only)
**Rule:** No secondary storage keys allowed.

- A single canonical key is the authoritative snapshot location.
- Legacy keys may be read for migration (if already supported), but must not be written.
- No parallel keys, no “latest” duplication, no shadow copies.

**Hard requirement:**  
> One write target, one read target, migration read-only.

---

### E. Modal Structural Integrity (Mobile Stability Lock)
**Rule:** No UI modal structural refactor without Phase Gate.

- Phase 2 must not restructure modal layout, container strategy, or scroll management.
- Cosmetic copy changes are permitted if they do not alter structure or overflow behaviour.
- Tap targets and viewport constraints must remain compliant.

**Hard requirement:**  
> Mobile viewport stability is sacred. No layout regressions.

---

## 3) Changes Allowed Without Review (Safe Zone)

The following are allowed *without* triggering Stabilisation Review **only if they do not modify Phase 1 protected surface**:

- Copy edits / text changes (non-structural)
- Resource content additions (new advice text, new seed content) that do not alter render logic
- CSS token tweaks that do not change modal container structure, overflow, or sizing logic
- Documentation changes
- Non-runtime assets (images, icons)

**Principle:** If it can’t cause a whitescreen, scoring drift, or storage breakage, it’s probably safe.

---

## 4) Stabilisation Review Trigger (Mandatory)

A Stabilisation Review MUST occur if a PR touches any of the following (non-exhaustive):

- `engine/seedforge.js` (or equivalent canonical scorer)
- `generated/scoring.json` / `generated/bands.json` / `generated/questions.json`
- snapshot write/read logic (localStorage keys, schema shape, parse/validate functions)
- snapshot mount logic and runtime entry scripts
- `/snapshot/` modal container structure or scroll/height behaviour
- `/resources/` snapshot rendering logic and assumptions

**If triggered:**  
PR must include:
1. Root cause for change  
2. Minimal fix justification  
3. Non-regression test evidence (desktop + iPhone-class viewport)  
4. Determinism confirmation (same input → same HDSS output)  
5. Storage compatibility confirmation (old snapshots still load or fail safely)

---

## 5) Required Non-Regression Scenarios (Gate Checklist)

Any PR that triggers Stabilisation Review must explicitly pass:

1. Fresh visit → `/snapshot/` loads (no whitescreen)
2. Complete snapshot → redirect to `/resources/` succeeds
3. `/resources/` direct access with no snapshot → renders fallback state (no crash)
4. Corrupted snapshot JSON in localStorage → fail-safe clear + fallback render
5. Double finish interaction (rapid taps) → single redirect, no race
6. iPhone-class viewport (390px) → modal fits, no overflow, buttons visible
7. Repeat snapshot run → latest snapshot reads correctly every time

**Pass/fail only. No partial credit.**

---

## 6) Enforcement Principle

Cyber Seeds is being built as a **replicable national-standard prototype**.  
That requires:

- deterministic computation
- stable runtime behaviour
- consistent storage contracts
- cross-device reliability

**This lock exists to protect the foundation.**

---

## 7) Phase Gate Statement

Phase 1 is only considered complete while this lock remains intact.

If any protected surface is modified without review, Phase 1 is considered **re-opened** until stability is re-proven.

---
