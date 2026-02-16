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

  function normalizeSnapshot(snapshot){
    if (!snapshot || typeof snapshot !== "object") return null;
    const now = Date.now();
    const lensPercents = snapshot.lensPercents || snapshot.lenses || {};
    const stageValue = snapshot.stage;
    const stage = typeof stageValue === "string"
      ? { label: stageValue, message: snapshot.signal?.summary || "" }
      : {
          label: stageValue?.label || "Current snapshot stage",
          message: stageValue?.message || snapshot.signal?.summary || ""
        };

    return {
      ...snapshot,
      schema: snapshot.schema || "cs.snapshot.v3",
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : now,
      id: snapshot.id || snapshot.snapshotId || String(now),
      hdss: Number.isFinite(snapshot.hdss) ? snapshot.hdss : 0,
      total: Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0),
      lensPercents,
      lenses: snapshot.lenses || lensPercents,
      focus: snapshot.focus || "privacy",
      strongest: snapshot.strongest || null,
      weakest: snapshot.weakest || null,
      stage
    };
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

  function getLensBand(value){
    if (value >= 75) return "Established";
    if (value >= 50) return "Developing";
    return "Emerging";
  }

  function getLensSummary(lens, value){
    const band = getLensBand(value).toLowerCase();
    const labels = {
      network: `Network foundations are ${band} and can be strengthened with small routine checks.`,
      devices: `Device habits are ${band} and benefit from calm consistency across the household.`,
      privacy: `Account and privacy routines are ${band} with room for clearer defaults.`,
      scams: `Scam and message awareness is ${band} and can improve through shared pause habits.`,
      wellbeing: `Children and wellbeing support is ${band} with space to keep expectations clear and gentle.`
    };
    return labels[lens] || `This lens is ${band} and can move forward through steady, manageable steps.`;
  }

  function getLensDetails(lens){
    const copy = {
      network: {
        interpretation: "A stable home connection supports everyday trust. Small improvements like router checks and known-device reviews help the whole household feel more settled.",
        next: "Set one recurring moment each month to review router settings and remove unknown devices."
      },
      devices: {
        interpretation: "Shared device routines reduce friction and support safer defaults. Clear charging, update, and handover habits make digital life easier for adults and children.",
        next: "Agree one simple household device routine, such as a weekly update check before weekend use."
      },
      privacy: {
        interpretation: "Privacy settings work best when they are understandable and repeatable. Keeping account controls simple helps everyone maintain confidence without extra pressure.",
        next: "Choose one important account and review sign-in and recovery settings together."
      },
      scams: {
        interpretation: "Scam resistance grows through shared pause-and-check behaviours. A calm response plan helps reduce urgency and protects decision-making.",
        next: "Create a family pause phrase to use before clicking links or sharing codes."
      },
      wellbeing: {
        interpretation: "Digital wellbeing is strengthened by predictable boundaries and open conversations. Children benefit when expectations are clear and support is non-judgemental.",
        next: "Set one short weekly check-in about online experiences and what support is needed."
      }
    };
    return copy[lens] || {
      interpretation: "Steady routines build resilience over time. Small and repeated actions are usually more sustainable than big one-off changes.",
      next: "Pick one manageable improvement and revisit it in a week."
    };
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
      schema: snapshot.schema || "cs.snapshot.v3",
      id: snapshot.id || null,
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : null,
      total: Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0),
      stage: snapshot.stage || { label: "Current snapshot stage", message: "" },
      focus: snapshot.focus || null,
      lenses: snapshot.lenses || snapshot.lensPercents || {},
      lensPercents: snapshot.lensPercents || snapshot.lenses || {},
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

    const rawSnapshot = getSnapshot();
    if (!rawSnapshot){
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

    const snapshot = normalizeSnapshot(rawSnapshot);
    if (!snapshot) return;

    if (!rawSnapshot.schema){
      localStorage.setItem(SNAP_KEY, JSON.stringify(snapshot));
    }

    const lensValues = snapshot.lensPercents || snapshot.lenses || {};
    const stageLabel = typeof snapshot.stage === "string" ? snapshot.stage : (snapshot.stage?.label || "Current snapshot stage");
    const stageMessage = snapshot.signal?.summary || snapshot.stage?.message || "This snapshot is a supportive signal to help you choose your next calm step.";
    const focusLens = formatLensName(snapshot.focus || "privacy");
    const signalValue = Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0);

    const focusLensKey = snapshot.focus || "privacy";
    const seed = await getFocusSeed(focusLensKey);
    const weekText = seed?.this_week || seed?.thisWeek || seed?.week || "";
    const monthText = seed?.this_month || seed?.thisMonth || seed?.month || "";
    const seedHtml = seed
      ? `
        <section class="resultCard" style="margin-top:16px">
          <h2>${seed.title || "Digital seed"}</h2>
          <p><strong>Today:</strong> ${seed.today || ""}</p>
          ${weekText ? `<p><strong>This week:</strong> ${weekText}</p>` : ""}
          ${monthText ? `<p><strong>This month:</strong> ${monthText}</p>` : ""}
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
            <span class="score-number">${signalValue}</span>
            <span class="score-label">Household signal</span>
          </div>
          <p class="certification-level">Focus lens: <span data-focus-lens>${focusLens}</span></p>
        </section>

        ${seedHtml}

        <section class="lens-breakdown">
          <h2>Lens overview</h2>
          ${Object.entries(lensValues).map(([lens, value]) => `
            <article class="cs-lensRow ${lens === focusLensKey ? "cs-lensRow--focus" : ""}" data-lens="${lens}">
              <button class="cs-lensToggle" type="button" aria-expanded="${lens === focusLensKey ? "true" : "false"}">
                <div class="cs-lensLeft">
                  <div class="cs-lensName">${formatLensName(lens)}</div>
                  <div class="cs-lensScore">${Math.round(value)}</div>
                </div>
                <div class="cs-lensRight">
                  <div class="cs-lensBand">${getLensBand(value)}</div>
                  <div class="cs-lensSummary">${getLensSummary(lens, value)}</div>
                </div>
              </button>
              <div class="cs-lensDetails" ${lens === focusLensKey ? "" : "hidden"}>
                <p class="cs-lensInterpretation">${getLensDetails(lens).interpretation}</p>
                <p class="cs-lensDirection"><strong>Next:</strong> ${getLensDetails(lens).next}</p>
              </div>
              <div class="lens-bar" style="padding:0 14px 14px;">
                <div class="lens-fill" style="width:${Math.round(value)}%"></div>
              </div>
            </article>
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

    root.querySelectorAll(".cs-lensToggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const details = toggle.parentElement?.querySelector(".cs-lensDetails");
        if (!details) return;
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
      });
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
