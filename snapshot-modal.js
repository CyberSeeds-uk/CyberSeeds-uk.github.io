/* =========================================
   Cyber Seeds — Unified Snapshot Modal Engine
   Snapshot + Resources Hub Integration
   ========================================= */

(function(){
"use strict";

const SNAP_KEY = "cyberseeds_snapshot_v2";

/* ---------- helpers ---------- */

const $ = s => document.querySelector(s);

function getSnap(){
  try{
    return JSON.parse(localStorage.getItem(SNAP_KEY));
  }catch{ return null; }
}

const BASELINE_KEY = "cyberseeds_snapshot_baseline_v2";

function saveBaseline(){
  const s = getSnap();
  if(!s) return;

  // store as baseline snapshot (full object)
  localStorage.setItem(BASELINE_KEY, JSON.stringify({
    ...s,
    baseline_ts: Date.now()
  }));
}


function lensRowsHTML(scores){
  return Object.entries(scores).map(([k,v]) =>
    `<div class="cs-lens-row"><span>${cap(k)}</span><span>${v}</span></div>`
  ).join("");
}

function cap(x){ return x.charAt(0).toUpperCase()+x.slice(1); }

/* ---------- seed depth layer ---------- */

function deepSeed(seed){
  if(!seed) return null;

  const whyMap = {
    wellbeing: "Digital strain is often a sleep and attention problem before it is a security problem.",
    privacy: "Account compromise spreads outward. Root accounts are the immune system.",
    network: "The network is the household boundary layer.",
    devices: "Unmaintained devices become silent weak points.",
    scams: "Scams succeed through pressure and confusion — not intelligence."
  };

  return {
    title: seed.title,
    why: whyMap[seed.lens] || "Small habits create compound protection.",
    today: seed.today,
    week: seed.this_week,
    month: seed.this_month
  };
}

/* ---------- render modal ---------- */

window.CSOpenSnapshotResult = function(){

  const snap = getSnap();
  if(!snap) return;

  const seed = deepSeed(snap.seed);

  const backdrop = document.createElement("div");
  backdrop.className = "cs-modal-backdrop open";

  backdrop.innerHTML = `
  <div class="cs-modal">

    <div class="cs-modal-head">
      <div class="cs-head-row">
        <div>
          <div class="cs-eyebrow">Household snapshot</div>
          <h2 class="cs-title">Your calm signal</h2>
          <p class="cs-sub">Not a score. A direction.</p>
        </div>
        <button class="cs-icon-btn" id="csClose">×</button>
      </div>
    </div>

    <div class="cs-modal-body">

      <div class="cs-signal-card">
        <div class="cs-chip-row">
          <div class="cs-chip">Stage ${snap.stage}</div>
          <div class="cs-chip">HDSS ${snap.hdss}/100</div>
          <div class="cs-chip">Focus ${cap(snap.weakest)}</div>
        </div>

        <div class="cs-lens-grid">
          ${lensRowsHTML(snap.lensScores)}
        </div>
      </div>

      ${seed ? `
      <div class="cs-seed">
        <div class="cs-seed-title">${seed.title}</div>
        <div class="cs-seed-why">${seed.why}</div>
        <div class="cs-seed-steps">
          <div><strong>Today:</strong> ${seed.today}</div>
          <div><strong>This week:</strong> ${seed.week}</div>
          <div><strong>This month:</strong> ${seed.month}</div>
        </div>
      </div>` : ""}

    </div>

    <div class="cs-modal-foot">
      <button class="cs-btn primary" id="csHub">Open resources hub</button>
      <button class="cs-btn" id="csBaseline">Save baseline</button>
      <button class="cs-btn" id="csRetake">Retake snapshot</button>
    </div>

  </div>
  `;

  document.body.appendChild(backdrop);

  $("#csClose").onclick = ()=> backdrop.remove();
  $("#csHub").onclick = ()=> location.href="/resources/";
  $("#csRetake").onclick = ()=> location.reload();
  $("#csBaseline").onclick = ()=> saveBaseline();

};

})();
