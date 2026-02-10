export const KEYS = Object.freeze({
  LATEST: "cyberseeds_snapshot_v3",
  HISTORY: "cyberseeds_snapshots_v1",
  PASSPORT: "cyberseeds_digital_passport_v1"
});

export function writeLatestSnapshot(canonical) {
  localStorage.setItem(KEYS.LATEST, JSON.stringify(canonical));
}

export function readLatestSnapshot() {
  const raw = localStorage.getItem(KEYS.LATEST);
  return raw ? JSON.parse(raw) : null;
}

export function appendSnapshotHistory(canonical) {
  const raw = localStorage.getItem(KEYS.HISTORY);
  const list = raw ? safeJson(raw, []) : [];
  list.unshift(canonical);
  // keep small + fast
  const trimmed = list.slice(0, 25);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed));
}

export function readSnapshotHistory() {
  const raw = localStorage.getItem(KEYS.HISTORY);
  return raw ? safeJson(raw, []) : [];
}

export function writeDigitalPassport(canonical) {
  // Passport is derived + stable: keep it minimal, portable, and versioned
  const passport = {
    version: 1,
    createdAt: canonical.createdAt,
    snapshotId: canonical.snapshotId,
    overall: canonical.overall,
    band: canonical.band,
    lenses: canonical.lenses,
    seeds: canonical.seeds,
    notes: {
      localFirst: true,
      exportedByUser: false
    }
  };
  localStorage.setItem(KEYS.PASSPORT, JSON.stringify(passport));
}

function safeJson(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}
