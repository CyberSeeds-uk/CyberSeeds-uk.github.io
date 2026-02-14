/* =========================================================
   /resources/resources-hub.js
   Cyber Seeds — Resources Hub Controller
   Adaptive routing • Focus-first • Calm guidance
   ========================================================= */

(function(){
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_v3";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function safeParse(v,f=null){
    try{ return JSON.parse(v); }catch{ return f; }
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

  function normalise(raw){
    if (!raw) return null;
    if (raw.schema === "cs.snapshot.v3") return raw;

    return {
      schema:"cs.snapshot.v3",
      total: typeof raw.hdss === "number" ? Math.round(raw.hdss) : null,
      focus: raw.focus || null,
      stage: raw.stage || null,
      lenses: raw.lensPercents || {}
    };
  }

  function getSnapshot(){
    return normalise(safeParse(localStorage.getItem(SNAP_KEY), null));
  }

  function applyRouting(){
    const hub = document.querySelector("[data-cs-resources-hub]");
    if (!hub) return;

    const snap = getSnapshot();
    if (!snap || !snap.focus) return;

    document.body.dataset.focusLens = snap.focus;

    // Update focus labels
    $$("[data-focus-lens]", hub).forEach(el => {
      el.textContent = lensLabels()[snap.focus] || "";
    });

    // Focus sections
    const sections = $$("[data-resource-lens]", hub);
    if (!sections.length) return;

    const showAll = localStorage.getItem("cs_resources_show_all") === "1";

    sections.forEach(sec => {
      const lens = sec.getAttribute("data-resource-lens");
      sec.style.display = (showAll || lens === snap.focus) ? "" : "none";
    });

    // Optional: set stage label
    const stageEl = $("[data-stage-label]", hub);
    if (stageEl){
      stageEl.textContent = snap.stage?.label || "";
    }
  }

  function bindButtons(){
    const hub = document.querySelector("[data-cs-resources-hub]");
    if (!hub) return;

    const showAll = $("[data-cs-show-all]", hub);
    const showFocus = $("[data-cs-show-focus]", hub);

    if (showAll){
      showAll.addEventListener("click", () => {
        localStorage.setItem("cs_resources_show_all", "1");
        applyRouting();
      });
    }

    if (showFocus){
      showFocus.addEventListener("click", () => {
        localStorage.setItem("cs_resources_show_all", "0");
        applyRouting();
      });
    }
  }

  function init(){
    applyRouting();
    bindButtons();

    window.addEventListener("cs:snapshot-updated", () => {
      applyRouting();
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
