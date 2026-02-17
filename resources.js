const SNAPSHOT_KEY = 'cyberseeds_snapshot_latest_v3';

function safeParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getSnapshot() {
  try {
    const raw = localStorage.getItem("cyberseeds_snapshot_latest_v3");
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (!parsed || parsed.schema !== "cs.snapshot.v3") {
      console.warn("[CS] Invalid snapshot schema.");
      return null;
    }

    return parsed;
  } catch (e) {
    console.warn("[CS] Corrupted snapshot detected. Clearing.");
    localStorage.removeItem("cyberseeds_snapshot_latest_v3");
    return null;
  }
}

function formatLensName(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('resourcesRoot');
  if (!root) return;

  const snapshot = getSnapshot();
  if (!snapshot || !snapshot.lensPercents) {
    root.innerHTML = `
      <section class="resource-panel">
        <p class="kicker">Signal</p>
        <h1>No snapshot found</h1>
        <p>When you are ready, start a two-minute check-in to generate your household signal.</p>
        <a href="/" class="btn-primary">Return home</a>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <section class="resource-panel">
      <div id="snapshotMount"></div>
      <section class="renewal-actions" aria-label="Renewal path">
        <a class="btn-secondary" href="/">Retake Snapshot</a>
        <button class="btn-secondary" type="button" id="downloadPassport">Download Household Passport</button>
        <a class="btn-primary" href="/book/">Book a Full Audit</a>
      </section>
    </section>
  `;

  renderSnapshot(snapshot, document.getElementById('snapshotMount'));

  document.getElementById('downloadPassport')?.addEventListener('click', () => {
    downloadPassport(snapshot);
  });
});

export function renderSnapshot(snapshot, container) {
  if (!container) return;

  const lensValues = snapshot.lensPercents || snapshot.lenses || {};

  container.innerHTML = `
    <section class="signal-header">
      <p class="signal-kicker">Household signal</p>
      <h1 class="signal-pattern">${snapshot.stage || 'Current snapshot stage'}</h1>
      <p class="signal-description">This snapshot is a supportive signal to help you decide your next calm step.</p>
    </section>

    <section class="signal-score-block">
      <div class="score-circle">
        <span class="score-number">${Math.round(snapshot.total || 0)}</span>
        <span class="score-label">Household signal</span>
      </div>
      <p class="certification-level">Focus lens: ${formatLensName(snapshot.focus || 'privacy')}</p>
    </section>

    <section class="lens-breakdown">
      <h2>Lens overview</h2>
      ${Object.entries(lensValues).map(([lens, value]) => `
        <div class="lens-row">
          <div class="lens-row-head">
            <span class="lens-name">${formatLensName(lens)}</span>
            <span class="lens-value">${Math.round(value)}</span>
          </div>
          <div class="lens-bar">
            <div class="lens-fill" style="width:${Math.round(value)}%"></div>
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function downloadPassport(snapshot) {
  const readable = {
    schema: snapshot.schema,
    id: snapshot.id,
    timestamp: snapshot.timestamp,
    total: snapshot.total,
    stage: snapshot.stage,
    focus: snapshot.focus,
    lenses: snapshot.lenses,
    lensPercents: snapshot.lensPercents,
    answers: snapshot.answers || {}
  };

  const payload = JSON.stringify(readable, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cyber-seeds-household-passport.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
