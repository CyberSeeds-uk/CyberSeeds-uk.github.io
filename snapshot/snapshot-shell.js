/* =========================================================
   Cyber Seeds — Snapshot Shell
   Loads Web Component + binds homepage CTA
   ========================================================= */
(async function(){
  "use strict";

  async function ensureComponent(){
    if (customElements.get("cyber-seeds-snapshot")) return;

    // Engine first (safe to import multiple times)
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

  await ensureComponent();
  const component = ensureInstance();

  // Bind any [data-open-snapshot] on the page
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-snapshot]");
    if (!btn) return;
    e.preventDefault();
    component.open();
  });
})();

window.addEventListener("cs:snapshot-updated", (event) => {

  const data = event.detail;
  if (!data) return;

  const section = document.getElementById("snapshotResults");
  if (!section) return;

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

  if (scoreEl) scoreEl.textContent = `${Math.round(data.hdss)} / 100`;
  if (summaryEl) summaryEl.textContent = data.stage?.message || "A steady household signal.";
  if (strongestEl) strongestEl.textContent = lensLabels[data.strongest] || "";
  if (focusEl) focusEl.textContent = lensLabels[data.focus] || "";
  if (seedEl) seedEl.textContent = data.seed?.today || "Small consistent routines build resilience.";

});

