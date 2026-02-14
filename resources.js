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
      <p class="kicker">Signal + interpretation</p>
      <div id="signalMount"></div>
      <div id="seedsMount"></div>
      <section class="renewal-actions" aria-label="Renewal path">
        <a class="btn-secondary" href="/">Retake Snapshot</a>
        <button class="btn-secondary" type="button" id="downloadPassport">Download Household Passport</button>
        <a class="btn-primary" href="/book/">Book a Full Audit</a>
      </section>
    </section>
  `;

  renderSignal(snapshot, document.getElementById('signalMount'));
  renderSeeds(snapshot, document.getElementById('seedsMount'));

  document.getElementById('downloadPassport')?.addEventListener('click', () => {
    downloadPassport(snapshot);
  });
});

export function renderSignal(snapshot, mount) {
  if (!mount) return;
  const lensMarkup = Object.entries(snapshot.lenses)
    .map(([lens, value]) => {
      return `
        <li>
          <div class="lens-row"><span>${capitalise(lens)}</span><span>${value}</span></div>
          <div class="bar" role="img" aria-label="${lens} score ${value} out of 100"><span style="width:${value}%"></span></div>
        </li>
      `;
    }).join('');

  mount.innerHTML = `
    <article class="signal-card">
      <h1>Household Signal</h1>
      <p class="tone-pill">Tone: ${capitalise(snapshot.tone)}</p>
      <p class="score">HDSS ${snapshot.overallScore}</p>
      <p class="cert">Certification: ${snapshot.certificationLevel}</p>
      <p class="summary">${snapshot.narrativeSummary}</p>
      <section>
        <h2>Lens breakdown</h2>
        <ul class="lens-list">${lensMarkup}</ul>
      </section>
    </article>
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

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
