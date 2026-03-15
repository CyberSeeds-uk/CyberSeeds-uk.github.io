(function(){
  "use strict";

  const HISTORY_KEYS = [
    "cyberseeds_snapshot_history_v3",
    "cyberseeds_snapshots_v1",
    "cs_snapshot_history"
  ];

  const BASELINE_KEYS = [
    "cyberseeds_snapshot_baseline_v1",
    "cyberseeds_snapshot_baseline_v3",
    "cs_snapshot_baseline"
  ];

  const LENS_LABELS = {
    network: "Network",
    devices: "Devices",
    privacy: "Accounts & Privacy",
    scams: "Scams & Messages",
    wellbeing: "Children & Wellbeing"
  };

  const hostSelector = "[data-cs-trajectory]";

  function safeParse(value, fallback){
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readFirst(keys, fallback){
    for (const key of keys){
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        return safeParse(raw, fallback);
      } catch {}
    }
    return fallback;
  }

  function asNumber(value){
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function normaliseSnapshot(snapshot){
    if (!snapshot || typeof snapshot !== "object") return null;

    const total = snapshot.total ?? snapshot.hdss ?? snapshot.overallScore ?? 0;
    const lensesRaw = snapshot.lensPercents || snapshot.lenses || {};
    const lensPercents = {};

    Object.keys(LENS_LABELS).forEach((lens) => {
      lensPercents[lens] = clamp(Math.round(asNumber(lensesRaw[lens])), 0, 100);
    });

    return {
      id: String(snapshot.id || snapshot.snapshotId || `snapshot-${Date.now()}`),
      timestamp: Number.isFinite(snapshot.timestamp)
        ? snapshot.timestamp
        : Date.parse(snapshot.timestamp || "") || Date.now(),
      total: clamp(Math.round(asNumber(total)), 0, 100),
      stage: typeof snapshot.stage === "string" ? snapshot.stage : (snapshot.stage?.label || ""),
      focus: typeof snapshot.focus === "string" ? snapshot.focus : "",
      strongest: typeof snapshot.strongest === "string" ? snapshot.strongest : "",
      weakest: typeof snapshot.weakest === "string" ? snapshot.weakest : "",
      seed: typeof snapshot.seed === "string" ? snapshot.seed : "",
      lensPercents
    };
  }

  function getHistory(){
    const parsed = readFirst(HISTORY_KEYS, []);
    const list = Array.isArray(parsed) ? parsed : [];

    return list
      .map(normaliseSnapshot)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function filterSnapshots(list){
    const MIN_GAP = 60 * 60 * 1000; // 1 hour minimum spacing
  
    const filtered = [];
  
    for(const snap of list){
      if(!filtered.length){
        filtered.push(snap);
        continue;
      }
  
      const last = filtered[filtered.length - 1];
  
      if(snap.timestamp - last.timestamp >= MIN_GAP){
        filtered.push(snap);
      }
    }

  return filtered;
}

  function getBaseline(){
    return normaliseSnapshot(readFirst(BASELINE_KEYS, null));
  }

  function signed(value){
    if (value > 0) return `+${value}`;
    return String(value);
  }

  function formatDate(timestamp){
    const d = new Date(timestamp);
    const now = new Date();
  
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  
    if(sameDay){
      return d.toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"});
    }
  
    return d.toLocaleDateString("en-GB", {day:"numeric",month:"short"});
  }

  function describeTrend(deltaFromBaseline, deltaFromPrevious){
    if (deltaFromBaseline >= 10) {
      return "Your household signal is moving in a clearly stronger direction over time.";
    }

    if (deltaFromBaseline > 0) {
      return deltaFromPrevious > 0
        ? "Your household signal is improving steadily and your most recent check-in also moved upward."
        : "Your household signal is stronger than your baseline and currently holding that ground.";
    }

    if (deltaFromBaseline === 0) {
      return "Your household signal is holding steady against your baseline.";
    }

    return "Your household signal has dipped below its baseline, which may be a cue for a calm reset rather than alarm.";
  }

  function buildTrajectory(){
    const points = filterSnapshots(getHistory());
    if (!points.length) return null;

    const baseline = getBaseline() || points[0];
    const latest = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : null;

    const deltaFromBaseline = latest.total - baseline.total;
    const deltaFromPrevious = previous ? latest.total - previous.total : 0;

    const lensTrend = {};
    Object.keys(LENS_LABELS).forEach((lens) => {
      lensTrend[lens] = latest.lensPercents[lens] - baseline.lensPercents[lens];
    });

    return {
      points,
      baseline,
      latest,
      previous,
      deltaFromBaseline,
      deltaFromPrevious,
      bestScore: Math.max(...points.map((point) => point.total)),
      lowestScore: Math.min(...points.map((point) => point.total)),
      lensTrend
    };
  }

  function renderChart(points){
    if (!Array.isArray(points) || !points.length) return "";

    const width = 100;
    const height = 32;
    const xStep = points.length === 1 ? 0 : width / (points.length - 1);

    const polyline = points.map((point, index) => {
      const x = index * xStep;
      const y = height - ((point.total / 100) * height);
      return `${x},${y}`;
    }).join(" ");

    const circles = points.map((point, index) => {
      const x = index * xStep;
      const y = height - ((point.total / 100) * height);
      return `<circle cx="${x}" cy="${y}" r="1.9"></circle>`;
    }).join("");

    return `
      <svg viewBox="0 0 ${width} ${height}" class="cs-trajectory-chart" aria-hidden="true" focusable="false">
        <polyline points="${polyline}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${circles}
      </svg>
    `;
  }

  function renderLensRows(trajectory){
    return Object.keys(LENS_LABELS).map((lens) => {
      const start = trajectory.baseline.lensPercents[lens];
      const end = trajectory.latest.lensPercents[lens];
      const delta = trajectory.lensTrend[lens];
      const directionClass = delta > 0 ? "is-up" : (delta < 0 ? "is-down" : "is-flat");

      return `
        <div class="cs-traj-row">
          <span class="cs-traj-lens">${LENS_LABELS[lens]}</span>
          <span class="cs-traj-range">${start}% → ${end}%</span>
          <span class="cs-traj-delta ${directionClass}">${signed(delta)}</span>
        </div>
      `;
    }).join("");
  }

  function renderMilestones(trajectory){
    const milestones = [];

    if (trajectory.points.length >= 1) milestones.push("First household snapshot completed");
    if (trajectory.points.length >= 3) milestones.push("Three or more household check-ins completed");
    if (trajectory.deltaFromBaseline >= 10) milestones.push("Household signal improved by at least 10 points");

    const allAboveSixty = Object.values(trajectory.latest.lensPercents).every((value) => value >= 60);
    if (allAboveSixty) milestones.push("All five lenses are now at or above 60%");

    if (!milestones.length) {
      milestones.push("No milestones yet. Small, repeatable digital seeds still count as progress.");
    }

    return milestones.map((item) => `<li>${item}</li>`).join("");
  }

  function renderEmpty(host){
    host.innerHTML = `
      <div class="cs-trajectory-card">
        <h3>Household trajectory</h3>
        <p class="cs-trajectory-sub">Complete your first household snapshot to begin your trajectory.</p>
      </div>
    `;
  }

  function resetTrajectory(){
    HISTORY_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });

    BASELINE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });

    try { localStorage.removeItem("cyberseeds_snapshot_latest_v3"); } catch {}

    location.reload();
  }

  function renderTrajectory(){
    const host = document.querySelector(hostSelector);
    if (!host) return;

    const trajectory = buildTrajectory();
    if (!trajectory) {
      renderEmpty(host);
      return;
    }

    host.innerHTML = `
      <div class="cs-trajectory-card">
        <div class="cs-trajectory-head">
          <div class="cs-trajectory-head-text">
            <h3>Household trajectory</h3>
            <p class="cs-trajectory-sub">
              A calm view of how your household signal is changing over time.
            </p>
          </div>

          <div class="cs-trajectory-head-actions">
            <div class="cs-trajectory-score">
              ${trajectory.latest.total}/100
            </div>

            <button
              type="button"
              id="resetTrajectory"
              class="cs-btn-reset"
              aria-label="Reset trajectory testing data"
            >
              Reset trajectory
            </button>
          </div>
        </div>

        <div class="cs-trajectory-meta" aria-label="Trajectory summary">
          <span>Baseline: <strong>${trajectory.baseline.total}</strong></span>
          <span>Since baseline: <strong>${signed(trajectory.deltaFromBaseline)}</strong></span>
          <span>Since last check-in: <strong>${signed(trajectory.deltaFromPrevious)}</strong></span>
        </div>

        <p class="cs-trajectory-summary">${describeTrend(trajectory.deltaFromBaseline, trajectory.deltaFromPrevious)}</p>

        <div class="cs-trajectory-visual">
          ${renderChart(trajectory.points)}
          <div class="cs-trajectory-dates">
            <span>${formatDate(trajectory.points[0].timestamp)}</span>
            <span>${formatDate(trajectory.latest.timestamp)}</span>
          </div>
        </div>

        <div class="cs-trajectory-grid">
          <section class="cs-trajectory-panel" aria-labelledby="cs-trajectory-lens-change-title">
            <h4 id="cs-trajectory-lens-change-title">Lens change</h4>
            ${renderLensRows(trajectory)}
          </section>

          <section class="cs-trajectory-panel" aria-labelledby="cs-trajectory-milestones-title">
            <h4 id="cs-trajectory-milestones-title">Milestones</h4>
            <ul class="cs-milestones">
              ${renderMilestones(trajectory)}
            </ul>
          </section>
        </div>
      </div>
    `;
  }

  function init(){
    renderTrajectory();

    window.addEventListener("cs:snapshot-updated", renderTrajectory);
    window.addEventListener("storage", renderTrajectory);

    document.addEventListener("click", (e) => {
      const button = e.target.closest("#resetTrajectory");
      if (!button) return;

      const confirmed = window.confirm(
        "Reset trajectory test data from this browser? This will clear saved household snapshot history on this device."
      );

      if (!confirmed) return;
      resetTrajectory();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
