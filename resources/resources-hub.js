/* =========================================================
   Cyber Seeds — Resources Hub v3
   Calm, local-first rendering for household resources
   ========================================================= */

(function(){
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_latest_v3";

  function safeParse(v,f=null){
    try{return JSON.parse(v);}catch{return f;}
  }

  function getSnapshot(){
    return safeParse(localStorage.getItem(SNAP_KEY),null);
  }

  function lensLabels(){
    return {
      network:"Network",
      devices:"Devices",
      privacy:"Accounts & Privacy",
      scams:"Scams & Messages",
      wellbeing:"Children & Wellbeing"
    };
  }

  function formatLensName(value){
    if (!value) return "";
    return lensLabels()[value] || (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
  }

  async function getFocusSeed(focus){
    if (!focus) return null;
    try{
      if (!window.CSSeedForge){
        await import("/engine/seedforge.js");
      }
      const api = await window.CSSeedForge.load();
      const seeds = api?.seedsForLens ? api.seedsForLens(focus) : [];
      return Array.isArray(seeds) && seeds.length ? seeds[0] : null;
    }catch{
      return null;
    }
  }

  function downloadPassport(snapshot){
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
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyber-seeds-household-passport.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function render(){
    const root = document.getElementById("resourcesRoot");
    if (!root) return;

    const snapshot = getSnapshot();
    if (!snapshot){
      root.innerHTML = `
        <section class="resource-panel" data-cs-resources-hub>
          <p class="kicker">Resources</p>
          <h1>Your resources will appear here after a snapshot.</h1>
          <p>When you are ready, take a short check-in and come back for your next calm steps.</p>
          <a href="/" class="btn-primary">Return home</a>
        </section>
      `;
      return;
    }

    const lensValues = snapshot.lensPercents || snapshot.lenses || {};
    const stageLabel = typeof snapshot.stage === "string" ? snapshot.stage : (snapshot.stage?.label || "Current snapshot stage");
    const stageMessage = snapshot.signal?.summary || snapshot.stage?.message || "This snapshot is a supportive signal to help you choose your next calm step.";
    const focusLens = formatLensName(snapshot.focus || "privacy");

    const seed = await getFocusSeed(snapshot.focus);
    const seedHtml = seed
      ? `
        <section class="resultCard" style="margin-top:16px">
          <h2>${seed.title || "Digital seed"}</h2>
          <p><strong>Today:</strong> ${seed.today || ""}</p>
          <p><strong>This week:</strong> ${seed.week || seed.thisWeek || ""}</p>
          <p><strong>This month:</strong> ${seed.month || seed.thisMonth || ""}</p>
        </section>
      `
      : `
        <section class="resultCard" style="margin-top:16px">
          <h2>Focus lens digital seed</h2>
          <p>No digital seed available yet.</p>
        </section>
      `;

    root.innerHTML = `
      <section class="resource-panel" data-cs-resources-hub>
        <section class="signal-header">
          <p class="signal-kicker">Household signal</p>
          <h1 class="signal-pattern" data-stage-label>${stageLabel}</h1>
          <p class="signal-description">${stageMessage}</p>
        </section>

        <section class="signal-score-block">
          <div class="score-circle">
            <span class="score-number">${Math.round(snapshot.total || 0)}</span>
            <span class="score-label">Household signal</span>
          </div>
          <p class="certification-level">Focus lens: <span data-focus-lens>${focusLens}</span></p>
        </section>

        ${seedHtml}

        <section class="lens-breakdown">
          <h2>Lens overview</h2>
          ${Object.entries(lensValues).map(([lens, value]) => `
            <div class="lens-row" data-resource-lens="${lens}">
              <div class="lens-row-head">
                <span class="lens-name">${formatLensName(lens)}</span>
                <span class="lens-value">${Math.round(value)}</span>
              </div>
              <div class="lens-bar">
                <div class="lens-fill" style="width:${Math.round(value)}%"></div>
              </div>
            </div>
          `).join("")}
        </section>

        <section class="renewal-actions" aria-label="Renewal path">
          <a class="btn-secondary" href="/">Retake Snapshot</a>
          <button class="btn-secondary" type="button" id="downloadPassport">Download Household Passport</button>
          <a class="btn-primary" href="/book/">Book a Full Audit</a>
        </section>
      </section>
    `;

    document.getElementById("downloadPassport")?.addEventListener("click", () => {
      downloadPassport(snapshot);
    });
  }

  function init(){
    render();
    window.addEventListener("cs:snapshot-updated", () => {
      render();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  } else {
    init();
  }

})();
