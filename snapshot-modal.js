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
  localStorage.setItem("cyberseeds_snapshot_v2", JSON.stringify(snapshot));

  localStorage.setItem("cs_snapshot_updated", Date.now().toString());
  window.location.href = "/resources/";


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

})();
