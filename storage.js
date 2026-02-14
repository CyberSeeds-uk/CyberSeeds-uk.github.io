const SNAPSHOT_KEY = 'cs_snapshot_latest';

export function saveSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  try {
    const serialised = JSON.stringify(snapshot);
    localStorage.setItem(SNAPSHOT_KEY, serialised);
    return true;
  } catch {
    return false;
  }
}

export function getSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!isValidSnapshot(parsed)) {
      return null;
    }

    return Object.freeze(parsed);
  } catch {
    return null;
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Intentionally silent: local-first fallback should never block UX.
  }
}

function isValidSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const requiredLens = ['network', 'devices', 'privacy', 'scams', 'wellbeing'];
  const hasAllLens = requiredLens.every((lens) => typeof snapshot.lenses?.[lens] === 'number');

  return (
    snapshot.version === 'v1' &&
    typeof snapshot.timestamp === 'string' &&
    typeof snapshot.overallScore === 'number' &&
    typeof snapshot.tone === 'string' &&
    typeof snapshot.certificationLevel === 'string' &&
    hasAllLens &&
    Array.isArray(snapshot.digitalSeeds) &&
    typeof snapshot.narrativeSummary === 'string'
  );
}
