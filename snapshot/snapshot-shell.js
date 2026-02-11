/* =========================================================
   Cyber Seeds — Snapshot Shell (Production)
   Bootstraps component + wires homepage results
   ========================================================= */

(async function(){
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_v3";

  /* -------------------------------------------------------
     1. Ensure Web Component is registered
  ------------------------------------------------------- */

  async function ensureComponent(){
    if (customElements.get("cyber-seeds-snapshot")) return;

    await import("/engine/seedforge.js");
    await import("/components/cyber-seeds-snapshot.js");
  }

  function ensureInstance(){
    let el = document.querySelector("cyber-seeds-snapshot");
    if (!el){
      el = document.createElement("cyber-seeds-snapshot");
      document.body.appendChild(el);
    }
    return el;
  }

  /* -------------------------------------------------------
     2. Render Homepage Results
  ------------------------------------------------------- */

  function renderHomepageResults(data){

    const section = document.getElementById("snapshotResults");
    if (!section || !data) return;

    section.hidden = false;

    const scoreEl = document.getElementById("signalScore");
    const summaryEl = document.getElementById("signalSummary");
    const strongestEl = document.getElementById("strongestLens");
    const focusEl = document.getElementById("focusLens");
    const seedEl = document.getElementById("focusSeed");

    const lensLabels = {
      network: "Network",
      devices: "Devices",
      privacy: "Accounts & Privacy",
      scams: "Scams & Messages",
      wellbeing: "Children & Wellbeing"
    };

    if (scoreEl) scoreEl.textContent = `${Math.round(data.hdss ?? data.total)} / 100`;
    if (summaryEl) summaryEl.textContent = data.signal?.summary || data.stage?.message || "";
    if (strongestEl) strongestEl.textContent = lensLabels[data.strongest] || "";
    if (focusEl) focusEl.textContent = lensLabels[data.focus] || "";
    if (seedEl) seedEl.textContent = data.seed?.today || "";

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* -------------------------------------------------------
     3. Listen for Snapshot Completion Event
  ------------------------------------------------------- */

  window.addEventListener("cs:snapshot-updated", (event) => {
    if (!event.detail) return;
    renderHomepageResults(event.detail);
  });

  /* -------------------------------------------------------
     4. Also Render If Snapshot Already Exists
     (Deterministic on refresh)
  ------------------------------------------------------- */

  try {
    const stored = localStorage.getItem(SNAP_KEY);
    if (stored){
      const parsed = JSON.parse(stored);
      renderHomepageResults(parsed);
    }
  } catch(e){}

  /* -------------------------------------------------------
     5. Bind CTA Button
  ------------------------------------------------------- */

  await ensureComponent();
  const component = ensureInstance();

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-snapshot]");
    if (!btn) return;
    e.preventDefault();
    component.open();
  });

})();
