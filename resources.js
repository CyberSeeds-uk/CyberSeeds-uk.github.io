import { getSnapshot } from '/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('resourcesRoot');
  if (!root) return;

  const snapshot = getSnapshot();
  if (!snapshot) {
    root.innerHTML = `
      <section class="resource-panel">
        <p class="kicker">Signal</p>
        <h1>You haven’t completed your snapshot yet.</h1>
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

  const toneTitles = {
    stable: 'A steady digital pattern',
    holding: 'A household holding steady',
    strained: 'A household under digital pressure'
  };

  const toneDescriptions = {
    stable: 'Your routines are supporting calm and control. Continued small rituals will help this pattern remain steady.',
    holding: 'Your household has strong foundations. A few small adjustments can strengthen resilience over time.',
    strained: 'Digital demands may be feeling heavier right now. Gentle, practical steps can gradually restore balance.'
  };

  container.innerHTML = `
    <section class="signal-header">
      <p class="signal-kicker">Household signal</p>
      <h1 class="signal-pattern">${toneTitles[snapshot.tone]}</h1>
      <p class="signal-description">${toneDescriptions[snapshot.tone]}</p>
    </section>

    <section class="signal-score-block">
      <div class="score-circle">
        <span class="score-number">${snapshot.overallScore}</span>
        <span class="score-label">Overall pattern score</span>
      </div>
      <p class="certification-level">${snapshot.certificationLevel} level</p>
    </section>

    <section class="lens-breakdown">
      <h2>Lens overview</h2>
      ${Object.entries(snapshot.lenses).map(([lens, value]) => `
        <div class="lens-row">
          <div class="lens-row-head">
            <span class="lens-name">${formatLensName(lens)}</span>
            <span class="lens-value">${value}</span>
          </div>
          <div class="lens-bar">
            <div class="lens-fill" style="width:${value}%"></div>
          </div>
        </div>
      `).join('')}
    </section>

    <section class="digital-seeds">
      <h2>Next digital seeds</h2>
      <ul>
        ${snapshot.digitalSeeds.map(seed => `<li>${seed}</li>`).join('')}
      </ul>
    </section>
  `;
}

export function renderSeeds(snapshot, mount) {
  if (!mount) return;
  mount.innerHTML = `
    <section class="seed-card">
      <h2>Digital Seeds</h2>
      <p>Start with one or two small rituals this week. Steady routines are more effective than big one-off changes.</p>
      <ol>
        ${snapshot.digitalSeeds.slice(0, 5).map((seed) => `<li>${seed}</li>`).join('')}
      </ol>
    </section>
  `;
}

function downloadPassport(snapshot) {
  const readable = {
    householdSignal: {
      tone: snapshot.tone,
      hdss: snapshot.overallScore,
      certification: snapshot.certificationLevel,
      summary: snapshot.narrativeSummary,
      timestamp: snapshot.timestamp
    },
    lensBreakdown: snapshot.lenses,
    digitalSeeds: snapshot.digitalSeeds,
    renewalNote: 'Retake the snapshot in around 8-12 weeks, or after a major household digital change.'
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

function formatLensName(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
