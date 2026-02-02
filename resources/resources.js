- Populates Today / Week / Month from snapshot.seed
   - Baseline tracking for progress
   ========================================================= */

(function(){
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);

  // Year
  const YEAR = $("#year");
  if (YEAR) YEAR.textContent = String(new Date().getFullYear());

  // Mobile nav toggle (safe even if you remove header)
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (navToggle && nav){
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // ---------- Storage keys ----------
  const SNAPSHOT_KEYS = [
    "cyberseeds_snapshot_v3",
    "cyberseeds_snapshot_v2",
    "cyberseeds_snapshot_v1",
    "seed_snapshot_v2",
    "cyberseeds_snapshot_last",
    "cyberSeeds_snapshot_last",
    "cs_snapshot_last",
    "snapshot_last",
    "cyberseeds_snapshot",
    "cyberSeedsSnapshot",
    "cyberSeeds.snapshot",
    "cs.snapshot.last",
    "cs:lastSnapshot"
  ];

  const BASELINE_KEY = "cyberseeds_snapshot_baseline_v2";

  function safeJSONParse(str){
    try { return JSON.parse(str); } catch { return null; }
  }

  function safeGetStorageItem(k){
    try { return localStorage.getItem(k); } catch {}
    try { return sessionStorage.getItem(k); } catch {}
    return null;
  }
