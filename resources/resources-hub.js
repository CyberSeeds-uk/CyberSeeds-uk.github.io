/* =========================================================
   Cyber Seeds — Resources Adaptive Router v3
   Canon-consistent • Snapshot-reactive • Deterministic
   ========================================================= */

(function(){
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_v3";

  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  function safeParse(v,f=null){
    try{return JSON.parse(v);}catch{return f;}
  }

  function getSnapshot(){
    return safeParse(localStorage.getItem(SNAP_KEY),null);
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

  function showFallback(hub){
    if(!hub) return;

    $$("[data-resource-lens]", hub).forEach(sec=>{
      sec.style.display="";
    });

    const stageEl=$("[data-stage-label]", hub);
    if(stageEl) stageEl.textContent="";

    $$("[data-focus-lens]", hub).forEach(el=>{
      el.textContent="";
    });

    hub.dataset.focusLens="";
  }

  function applyRouting(){

    const hub=$("[data-cs-resources-hub]");
    if(!hub) return;

    const snap=getSnapshot();

    if(!snap || !snap.focus){
      showFallback(hub);
      return;
    }

    const focus=snap.focus;
    const stageLabel=snap.stage?.label || "";

    // Keep state local to the hub container; never mutate body/documentElement.
    hub.dataset.focusLens=focus;

    $$("[data-focus-lens]", hub).forEach(el=>{
      el.textContent=lensLabels()[focus]||focus;
    });

    $$("[data-resource-lens]", hub).forEach(sec=>{
      sec.style.display =
        sec.dataset.resourceLens===focus ? "" : "none";
    });

    const stageEl=$("[data-stage-label]", hub);
    if(stageEl){
      stageEl.textContent=stageLabel;
    }
  }

  function init(){
    applyRouting();

    window.addEventListener("cs:snapshot-updated",()=>{
      applyRouting();
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  } else{
    init();
  }

})();
