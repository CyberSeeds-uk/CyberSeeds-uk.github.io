/* =========================================================
   Cyber Seeds — Resources Adaptive Router v2
   Focus-first • Stage-aware
   ========================================================= */

(function(){
  "use strict";

  const SNAP_KEY="cyberseeds_snapshot_v3";

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

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

  function applyRouting(){

    const hub=$("[data-cs-resources-hub]");
    if(!hub) return;

    const snap=getSnapshot();
    if(!snap || !snap.focus) return;

    document.body.dataset.focusLens=snap.focus;

    $$("[data-focus-lens]").forEach(el=>{
      el.textContent=lensLabels()[snap.focus]||"";
    });

    $$("[data-resource-lens]").forEach(sec=>{
      sec.style.display =
        sec.dataset.resourceLens===snap.focus ? "" : "none";
    });

    const stageEl=$("[data-stage-label]");
    if(stageEl){
      stageEl.textContent = snap.stage?.label || "";
    }
  }

  function init(){
    applyRouting();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  } else{
    init();
  }

})();
