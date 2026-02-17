/* =========================================================
   Cyber Seeds — Snapshot Reader Layer v4
   Canon-grade • Deterministic • Public-sector safe
   ========================================================= */

(function(){

"use strict";

const SNAP_KEY = "cyberseeds_snapshot_latest_v3";
const HISTORY_KEY = "cyberseeds_snapshot_history_v3";
const LEGACY_SNAP_KEYS = ["cyberseeds_snapshot_v3", "cs_snapshot_latest", "cyberseeds_snapshot_v1"];
const LEGACY_HISTORY_KEYS = ["cyberseeds_snapshots_v1", "cs_snapshot_history"];

/* ---------------- Utilities ---------------- */

function safeParse(v,f=null){
  try{ return JSON.parse(v); }
  catch{ return f; }
}

function migrateLegacyKeys(){
  try{
    if (!localStorage.getItem(SNAP_KEY)){
      for (const key of LEGACY_SNAP_KEYS){
        const raw = localStorage.getItem(key);
        if (raw){
          localStorage.setItem(SNAP_KEY, raw);
          break;
        }
      }
    }

    if (!localStorage.getItem(HISTORY_KEY)){
      for (const key of LEGACY_HISTORY_KEYS){
        const raw = localStorage.getItem(key);
        if (raw){
          localStorage.setItem(HISTORY_KEY, raw);
          break;
        }
      }
    }
  }catch{}
}

function getRawSnapshot(){
  migrateLegacyKeys();
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

function getHistory(){
  migrateLegacyKeys();
  return safeParse(localStorage.getItem(HISTORY_KEY), []);
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

  if (raw.schema === "cs.snapshot.v3"){
    return raw;
  }

  return {
    schema:"cs.snapshot.v3",
    timestamp:Date.now(),
    total:Math.round(raw.hdss ?? 0),
    lenses:raw.lensPercents || {},
    focus:raw.focus || null,
    strongest:raw.strongest || null,
    weakest:raw.weakest || null,
    stage:raw.stage || null,
    signal:{
      summary:
        raw.stage?.message ||
        "A household signal has been generated."
    }
  };
}

/* ---------------- Comparison Logic ---------------- */

function compareWithPrevious(current){

  const history = getHistory();
  if (!history || history.length < 2) return null;

  const previous = history[1];

  if (!previous || typeof previous.total !== "number") return null;

  return {
    previousTotal: previous.total,
    delta: current.total - previous.total
  };
}

/* ---------------- Rendering ---------------- */

function renderLatestSignal(){

  const container =
    document.querySelector("[data-latest-signal]");

  if (!container) return;

  const snapshot = normaliseSnapshot(getRawSnapshot());

  if (!snapshot){
    container.innerHTML = `
      <p class="muted">
        No snapshot yet. Take the 2-minute check-in to see your signal.
      </p>
    `;
    return;
  }

  const lensMap = lensLabels();
  const comparison = compareWithPrevious(snapshot);
  const stageLabel = typeof snapshot.stage === "string" ? snapshot.stage : (snapshot.stage?.label || "—");

  const lensChips =
    Object.entries(snapshot.lenses || {})
      .map(([k,v]) => `
        <span class="chip">
          ${lensMap[k]}: ${Math.round(v)}%
        </span>
      `).join("");

  const deltaBlock = comparison
    ? `
      <p style="margin-top:10px">
        Compared to last snapshot:
        <strong>
          ${comparison.delta > 0 ? "+" : ""}
          ${comparison.delta}
        </strong>
      </p>
    `
    : "";

  container.innerHTML = `
    <div class="resultCard">

      <h3>Your household signal</h3>

      <p>${snapshot.signal?.summary || ""}</p>

      <div class="resultRow">
        <span class="chip">${snapshot.total}/100</span>
        <span class="chip">Stage: ${stageLabel}</span>
        <span class="chip">
          Focus: ${lensMap[snapshot.focus] || "—"}
        </span>
      </div>

      ${deltaBlock}

      <div class="resultRow" style="margin-top:12px">
        ${lensChips}
      </div>

    </div>
  `;
}

/* ---------------- Adaptive Routing ---------------- */

function personaliseResources(){

  const snapshot = normaliseSnapshot(getRawSnapshot());
  if (!snapshot) return;

  const lensMap = lensLabels();
  const stageLabel = typeof snapshot.stage === "string" ? snapshot.stage : snapshot.stage?.label;

  document
    .querySelectorAll("[data-focus-lens]")
    .forEach(el=>{
      el.textContent =
        lensMap[snapshot.focus] || "";
    });

  document
    .querySelectorAll("[data-stage-label]")
    .forEach(el=>{
      el.textContent =
        stageLabel
          ? `— ${stageLabel}`
          : "";
    });

  if (snapshot.focus){
    document.body.dataset.focusLens =
      snapshot.focus;
  }

  document
    .querySelectorAll("[data-resource-lens]")
    .forEach(section=>{
      if (!snapshot.focus) return;

      section.hidden =
        section.dataset.resourceLens !== snapshot.focus;
    });
}

/* ---------------- Export JSON ---------------- */

function bindExport(){

  document
    .querySelectorAll("[data-export-json]")
    .forEach(btn=>{
      btn.addEventListener("click", () => {

        const snapshot = getRawSnapshot();
        if (!snapshot) return;

        const blob =
          new Blob(
            [JSON.stringify(snapshot,null,2)],
            { type:"application/json" }
          );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cyber-seeds-snapshot.json";
        a.click();

        URL.revokeObjectURL(url);
      });
    });
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
  migrateLegacyKeys();
  renderLatestSignal();
  personaliseResources();
  bindExport();
  bindLiveUpdates();
}

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

})();
