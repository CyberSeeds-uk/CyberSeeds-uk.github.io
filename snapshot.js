/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   v1.3 Public (Canon-aligned)
   Finished Result Experience
   =========================================================== */

(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, m =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])
    );

  /* ---------- Storage ---------- */
  const STORE = "cyberseeds_snapshot_v1";
  const save = (data) => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...data, ts: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };

  /* ---------- Body Lock ---------- */
  let scrollY = 0;
  const lockBody = () => {
    scrollY = window.scrollY;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${scrollY}px`;
  };
  const unlockBody = () => {
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, scrollY);
  };

  /* ---------- State ---------- */
  const answers = {};
  let step = -1;

  /* ---------- DOM ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const strongestEl = $("#strongestLens");
  const weakestEl = $("#weakestLens");
  const headline = $("#resultHeadline");
  const resourceBtn = $("#goToResources");

  if (!modal) return;

  /* ---------- Snapshot Model ---------- */
  const SECTIONS = [
    { id:"wifi", title:"Home Wi-Fi & Router", questions:[{a:[{s:4},{s:3},{s:2},{s:1}]}] },
    { id:"devices", title:"Devices & Updates", questions:[{multi:true,a:[1,2,3,4,5,6,7]}] },
    { id:"accounts", title:"Accounts & Passwords", questions:[{a:[{s:4},{s:3},{s:2},{s:1}]}] },
    { id:"children", title:"Children’s Online Safety", questions:[{a:[{s:4},{s:3},{s:2},{s:4}]}] },
  ];

  const LENS_MAP = {
    Network:["wifi"],
    Devices:["devices"],
    Privacy:["accounts"],
    Wellbeing:["children"]
  };

  const LENS_EXPLAIN = {
    Network:"Your router is the home’s digital front door. Small gaps here affect everything else.",
    Devices:"Unpatched or shared devices quietly increase household risk over time.",
    Privacy:"Accounts and recovery routes are the most common entry point after scams or leaks.",
    Wellbeing:"Boundaries protect attention, sleep, and children’s development."
  };

  /* ---------- Scoring ---------- */
  const scoreMulti = (arr) =>
    arr.length <= 2 ? 4 : arr.length <= 4 ? 3 : arr.length <= 6 ? 2 : 1;

  function computeLens() {
    const section = {};
    Object.entries(answers).forEach(([id, vals]) => {
      const scores = vals.map(v => Array.isArray(v) ? scoreMulti(v) : v);
      section[id] = scores.reduce((a,b)=>a+b,0)/scores.length;
    });

    const lens = {};
    Object.entries(LENS_MAP).forEach(([k, ids]) => {
      const vals = ids.map(id=>section[id]).filter(Boolean);
      lens[k] = vals.reduce((a,b)=>a+b,0)/vals.length;
    });

    return lens;
  }

  /* ---------- UI ---------- */
  function updateChoiceStyles(){
    $$(".choice").forEach(c=>c.classList.remove("is-selected"));
    $$("input:checked").forEach(i=>i.closest(".choice")?.classList.add("is-selected"));
  }

  function renderIntro(){
    form.innerHTML = `<p class="muted">This is a calm reading of your household’s digital ecosystem.</p>`;
    nextBtn.textContent="Start";
    nextBtn.disabled=false;
    backBtn.disabled=true;
    result.hidden=true;
  }

  function renderSection(){
    const sec = SECTIONS[step];
    answers[sec.id] ??= [];
    form.innerHTML = "";

    sec.questions.forEach((q,qi)=>{
      const wrap=document.createElement("div");
      wrap.className="choices";

      if(q.multi){
        answers[sec.id][qi] ??= [];
        q.a.forEach((_,oi)=>{
          wrap.innerHTML+=`
            <label class="choice">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>Option</span>
            </label>`;
        });
      }else{
        q.a.forEach(o=>{
          wrap.innerHTML+=`
            <label class="choice">
              <input type="radio" name="${sec.id}_${qi}" value="${o.s}">
              <span>Option</span>
            </label>`;
        });
      }

      form.appendChild(wrap);
    });

    bindInputs(sec);
    updateChoiceStyles();
    nextBtn.textContent = step===SECTIONS.length-1?"Finish":"Next";
    nextBtn.disabled=true;
    backBtn.disabled=step===0;
  }

  function bindInputs(sec){
    sec.questions.forEach((q,qi)=>{
      if(q.multi){
        $$(`input[data-q="${qi}"]`).forEach(cb=>{
          cb.addEventListener("change",()=>{
            const arr=answers[sec.id][qi];
            const idx=+cb.dataset.o;
            cb.checked&&!arr.includes(idx)&&arr.push(idx);
            !cb.checked&&(answers[sec.id][qi]=arr.filter(i=>i!==idx));
            updateChoiceStyles();
            nextBtn.disabled=answers[sec.id][qi].length===0;
          });
        });
      }else{
        $$(`input[name="${sec.id}_${qi}"]`).forEach(r=>{
          r.addEventListener("change",()=>{
            answers[sec.id][qi]=+r.value;
            updateChoiceStyles();
            nextBtn.disabled=false;
          });
        });
      }
    });
  }

  function renderResult(){
    form.innerHTML="";
    const lens=computeLens();
    const sorted=Object.entries(lens).sort((a,b)=>b[1]-a[1]);
    const strongest=sorted[0][0];
    const weakest=sorted.at(-1)[0];

    headline.textContent=`Calm signal — start with ${weakest}.`;
    strongestEl.textContent=strongest;
    weakestEl.textContent=weakest;

    // Explanation cards
    const expl=document.createElement("div");
    expl.className="lens-explain";
    expl.innerHTML=`
      <div><h4>Why ${weakest}</h4><p>${LENS_EXPLAIN[weakest]}</p></div>
      <div><h4>What’s already working</h4><p>${LENS_EXPLAIN[strongest]}</p></div>`;
    result.appendChild(expl);

    // Save confirmation
    const ok=save({lens,strongest,weakest});
    const saved=document.createElement("p");
    saved.className="micro muted saved-line";
    saved.textContent= ok ? "✓ Saved locally on this device" : "Results shown (not saved)";
    result.appendChild(saved);

    // Reveal + animate
    result.hidden=false;
    requestAnimationFrame(()=>result.classList.add("reveal"));

    nextBtn.style.display="none";
    backBtn.style.display="none";
    resourceBtn.style.display="inline-flex";

    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete"));
  }

  function render(){
    if(step<0) renderIntro();
    else if(step>=SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ---------- Controls ---------- */
  nextBtn.onclick=()=>{
    if(step===SECTIONS.length-1){ step=SECTIONS.length; renderResult(); return; }
    step++; render();
  };
  backBtn.onclick=()=>{ step--; render(); };

  $$("[data-open-snapshot]").forEach(b=>b.onclick=()=>{
    step=-1;
    Object.keys(answers).forEach(k=>delete answers[k]);
    modal.classList.add("is-open");
    lockBody();
    nextBtn.style.display="";
    backBtn.style.display="";
    render();
  });

  $("#closeSnapshot")?.onclick=()=>{ modal.classList.remove("is-open"); unlockBody(); };
})();
