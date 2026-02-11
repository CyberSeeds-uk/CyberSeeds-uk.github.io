/* =========================================================
   Cyber Seeds — Snapshot Shell
   Loads Web Component + binds homepage CTA + renders results
   ========================================================= */
(async function(){
  "use strict";

  const SNAPSHOT_KEY = "cyberseeds_snapshot_v3";

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

  function safeParse(value, fallback=null){
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function labelLens(key){
    return ({
      network: "Network",
      devices: "Devices",
      privacy: "Accounts & Privacy",
      scams: "Scams & Messages",
      wellbeing: "Children & Wellbeing"
    }[key] || "—");
  }

  function renderHomepageResults(snapshot){
    if (!snapshot || typeof snapshot !== "object") return;

    const section = document.getElementById("snapshotResults");
    if (!section) return;

    const summaryEl   = document.getElementById("signalSummary");
    const scoreEl     = document.getElementById("signalScore");
    const strongEl    = document.getElementById("strongestLens");
    const focusEl     = document.getElementById("focusLens");
    const seedEl      = document.getElementById("focusSeed");

    const signalSummary = snapshot.signal?.summary || "Snapshot complete.";
    const score = (typeof snapshot.total === "number") ? `${snapshot.total}/100` : "—";
    const strongest = snapshot.strongest ? labelLens(snapshot.strongest) : "—";
    const focus = snapshot.focus ? labelLens(snapshot.focus) : "—";

    const seedText =
      snapshot.seed?.today ||
      snapshot.seed?.this_week ||
      snapshot.seed?.this_month ||
      "Open the resources hub for your next step.";

    if (summaryEl) summaryEl.textContent = signalSummary;
    if (scoreEl) scoreEl.textContent = score;
    if (strongEl) strongEl.textContent = strongest;
    if (focusEl) focusEl.textContent = focus;
    if (seedEl) seedEl.textContent = seedText;

    // Show + scroll
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Boot
  await ensureComponent();
  const component = ensureInstance();

  // Bind any [data-open-snapshot] on the page
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-snapshot]");
    if (!btn) return;
    e.preventDefault();
    component.open();
  });

  // Listen for completion event (from the component)
  window.addEventListener("cs:snapshot-updated", (e) => {
    renderHomepageResults(e.detail);
  });

  // If a snapshot already exists, render it on page load
  const existing = safeParse(localStorage.getItem(SNAPSHOT_KEY), null);
  if (existing) renderHomepageResults(existing);

})();
