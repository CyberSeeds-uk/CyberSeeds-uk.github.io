/* =========================================================
   Cyber Seeds — Snapshot Platform Layer v4
   Infrastructure-grade • Deterministic • Print-ready
   ========================================================= */

(function(){
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_v3";
  const HISTORY_KEY = "cyberseeds_snapshots_v1";
  const BASELINE_KEY = "cyberseeds_snapshot_baseline_v1";

  const VERSION = "v4.0";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  /* ---------------- Utilities ---------------- */

  function safeParse(v,f=null){
    try{ return JSON.parse(v); }catch{ return f; }
  }

  function getSnapshot(){
    return safeParse(localStorage.getItem(SNAP_KEY), null);
  }

  function getHistory(){
    return safeParse(localStorage.getItem(HISTORY_KEY), []);
  }

  function getBaseline(){
    return safeParse(localStorage.getItem(BASELINE_KEY), null);
  }

  function setBaseline(snapshot){
    localStorage.setItem(BASELINE_KEY, JSON.stringify(snapshot));
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

  function stageColor(stage){
    if(!stage) return "#9aa";
    if(stage.label==="Vulnerable") return "#c85050";
    if(stage.label==="Holding") return "#c39a2e";
    return "#1a6a5d";
  }

  /* ---------------- HDSS BAR ---------------- */

  function renderHDSS(container, snapshot){

    if(!container || !snapshot) return;

    const total = snapshot.total ?? snapshot.hdss ?? 0;
    const stage = snapshot.stage || {};

    const barId = "cs-hdss-bar";

    container.innerHTML = `
      <div class="cs-signal-card">
        <div class="cs-signal-head">
          <h3>Your household signal</h3>
          <span class="cs-version">${VERSION}</span>
        </div>

        <p class="cs-stage">${stage.message || ""}</p>

        <div class="cs-hdss-wrap">
          <div class="cs-hdss-bar" id="${barId}"></div>
        </div>

        <div class="cs-hdss-meta">
          <strong>${total}/100</strong>
          <span style="color:${stageColor(stage)}">
            ${stage.label || ""}
          </span>
        </div>

        <div class="cs-focus">
          Focus: <strong>${lensLabels()[snapshot.focus] || ""}</strong>
        </div>

        <div class="cs-compare" data-cs-compare></div>

        <div class="cs-actions">
          <button data-cs-set-baseline>Set as baseline</button>
          <button data-cs-export-json>Export JSON</button>
          <button data-cs-export-pdf>Export PDF</button>
        </div>
      </div>
    `;

    setTimeout(()=>{
      const bar = document.getElementById(barId);
      if(bar){
        bar.style.width = total+"%";
        bar.style.background = stageColor(stage);
      }
    },50);

    bindActions(container, snapshot);
    renderComparison(container, snapshot);
  }

  /* ---------------- BASELINE COMPARISON ---------------- */

  function renderComparison(container, snapshot){

    const compareEl = $("[data-cs-compare]", container);
    if(!compareEl) return;

    const baseline = getBaseline();
    if(!baseline){
      compareEl.textContent = "No baseline set yet.";
      return;
    }

    const diff = (snapshot.total ?? 0) - (baseline.total ?? 0);

    let msg = "";
    if(diff>0) msg = `Improved by ${diff} points since baseline.`;
    else if(diff<0) msg = `Decreased by ${Math.abs(diff)} points since baseline.`;
    else msg = "No change since baseline.";

    compareEl.textContent = msg;
  }

  /* ---------------- FOCUS SEED AUTO ---------------- */

  function generateSeed(snapshot){

    const focus = snapshot.focus;
    const seeds = {
      privacy:"Enable two-step verification on your primary email and stop password reuse.",
      network:"Review router firmware and create a guest network.",
      devices:"Turn on automatic updates and enable device tracking.",
      scams:"Create a household pause rule for urgent messages.",
      wellbeing:"Set a nightly device-free wind-down time."
    };

    return seeds[focus] || "";
  }

  function renderSeeds(container, snapshot){

    if(!container || !snapshot) return;

    const seed = generateSeed(snapshot);

    container.innerHTML = `
      <div class="cs-seed-card">
        <h3>Your next digital seed</h3>
        <p>${seed}</p>
        <p class="cs-seed-note">
          Small, repeatable changes build long-term stability.
        </p>
      </div>
    `;
  }

  /* ---------------- EXPORT ---------------- */

  function exportJSON(snapshot){
    const blob = new Blob(
      [JSON.stringify(snapshot,null,2)],
      {type:"application/json"}
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cyber-seeds-snapshot.json";
    a.click();
  }

  function exportPDF(){
    window.print();
  }

  /* ---------------- BIND ACTIONS ---------------- */

  function bindActions(container, snapshot){

    const baselineBtn = $("[data-cs-set-baseline]", container);
    if(baselineBtn){
      baselineBtn.onclick = ()=>{
        setBaseline(snapshot);
        renderComparison(container, snapshot);
      };
    }

    const jsonBtn = $("[data-cs-export-json]", container);
    if(jsonBtn){
      jsonBtn.onclick = ()=>exportJSON(snapshot);
    }

    const pdfBtn = $("[data-cs-export-pdf]", container);
    if(pdfBtn){
      pdfBtn.onclick = ()=>exportPDF();
    }
  }

  /* ---------------- INIT ---------------- */

  function init(){
    const signalContainer = $("[data-cs-signal]");
    const seedContainer = $("[data-cs-seeds]");
    if(!signalContainer || !seedContainer) return;

    const snapshot = getSnapshot();
    if(!snapshot) return;

    renderHDSS(signalContainer, snapshot);
    renderSeeds(seedContainer, snapshot); 
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
