/* =========================================================
   Cyber Seeds — Snapshot Reader Layer v3
   Canon-aligned • Backward-compatible • Deterministic
   ========================================================= */

(function(){

  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_v3";

  /* ---------------- Utilities ---------------- */

  function safeParse(v,f=null){
    try{ return JSON.parse(v); }
    catch{ return f; }
  }

  function getRawSnapshot(){
    return safeParse(localStorage.getItem(SNAP_KEY), null);
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

  /* ---------------- Normalisation ---------------- */

  function normaliseSnapshot(raw){

    if (!raw) return null;

    // If already canonical (future format)
    if (raw.schema === "cs.snapshot.v3"){
      return raw;
    }

    // Minimal SeedForge score format (your current object)
    const total =
      typeof raw.hdss === "number"
        ? Math.round(raw.hdss)
        : null;

    const lenses =
      raw.lensPercents || {};

    const stage = raw.stage || null;

    return {
      schema:"cs.snapshot.v3",
      timestamp:Date.now(),
      total,
      lenses,
      focus:raw.focus || null,
      strongest:raw.strongest || null,
      weakest:raw.weakest || null,
      stage,
      signal:{
        summary:
          stage?.message ||
          "A household signal has been generated."
      }
    };
  }

  /* ---------------- Rendering ---------------- */

  function renderLatestSignal(){

    const container =
      document.querySelector("[data-latest-signal]");

    if (!container) return;

    const raw = getRawSnapshot();
    const snapshot = normaliseSnapshot(raw);

    if (!snapshot){
      container.innerHTML = `
        <p class="muted">
          No snapshot yet. Take the 2-minute check-in to see your signal.
        </p>
      `;
      return;
    }

    const lensMap = lensLabels();

    const focusLabel =
      lensMap[snapshot.focus] || "—";

    const strongest =
      lensMap[snapshot.strongest] || null;

    const weakest =
      lensMap[snapshot.weakest] || null;

    const lensChips =
      Object.entries(snapshot.lenses || {})
        .map(([k,v]) => `
          <span class="chip">
            ${lensMap[k]}: ${Math.round(v)}%
          </span>
        `)
        .join("");

    container.innerHTML = `
      <div class="resultCard">

        <h3>Your household signal</h3>

        <p style="margin-bottom:10px">
          ${snapshot.signal?.summary || ""}
        </p>

        <div class="resultRow">

          <span class="chip">
            ${snapshot.total ?? "—"}/100
          </span>

          <span class="chip">
            Stage: ${snapshot.stage?.label || "—"}
          </span>

          <span class="chip">
            Focus: ${focusLabel}
          </span>

        </div>

        ${
          strongest
            ? `<p style="margin-top:12px">
                Strongest lens: <strong>${strongest}</strong>
              </p>`
            : ""
        }

        ${
          weakest
            ? `<p>
                Priority lens: <strong>${weakest}</strong>
              </p>`
            : ""
        }

        <div class="resultRow" style="margin-top:14px">
          ${lensChips}
        </div>

      </div>
    `;
  }

  /* ---------------- Resource Personalisation ---------------- */

  function personaliseResources(){

    const raw = getRawSnapshot();
    const snapshot = normaliseSnapshot(raw);

    if (!snapshot) return;

    const lensMap = lensLabels();

    const focusTargets =
      document.querySelectorAll("[data-focus-lens]");

    focusTargets.forEach(el => {
      el.textContent =
        lensMap[snapshot.focus] || "";
    });

    // Optional: Add class to body for CSS filtering
    if (snapshot.focus){
      document.body.dataset.focusLens =
        snapshot.focus;
    }
  }

  /* ---------------- Live Updates ---------------- */

  function bindLiveUpdates(){

    window.addEventListener(
      "cs:snapshot-updated",
      () => {
        renderLatestSignal();
        personaliseResources();
      }
    );
  }

  /* ---------------- Init ---------------- */

  function init(){
    renderLatestSignal();
    personaliseResources();
    bindLiveUpdates();
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
