/* =========================================================
   Cyber Seeds — Household Snapshot Engine
   Calm • Deterministic • Canon
   ========================================================= */

(() => {
  "use strict";

  if (window.CSSeedForge) return;

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  const sum   = arr => arr.reduce((a,b)=>a+b,0);
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  function stableHash(input){
    const str = typeof input === "string" ? input : JSON.stringify(input);
    let hash = 0;
    for (let i=0;i<str.length;i++){
      hash = ((hash<<5)-hash)+str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  const toQuestionList = d =>
    Array.isArray(d) ? d : Array.isArray(d?.questions) ? d.questions : [];

  function extractLensMax(q){
    const s = q.scoring_v2 || {};
    const importance = s.importance ?? 1;
    const max = s.max_points ?? Math.max(...q.options.map(o=>o.points??0));
    return max * importance;
  }

  function extractLensScore(q, idx){
    if (!Number.isInteger(idx)) return 0;
    const s = q.scoring_v2 || {};
    const importance = s.importance ?? 1;
    return (q.options?.[idx]?.points ?? 0) * importance;
  }

  function computeLensScores(answers, questions){
    const scores = Object.fromEntries(LENS_ORDER.map(l=>[l,0]));
    const maxes  = Object.fromEntries(LENS_ORDER.map(l=>[l,0]));

    questions.forEach(q=>{
      if (!q?.lens) return;
      scores[q.lens] += extractLensScore(q, answers[q.id]);
      maxes[q.lens]  += extractLensMax(q);
    });

    return { lensScores:scores, lensMax:maxes };
  }

  function lensPercentages(scores,maxes){
    const out = {};
    LENS_ORDER.forEach(l=>{
      out[l] = maxes[l] ? (scores[l]/maxes[l])*100 : 0;
    });
    return out;
  }

  function calcHdss(percs, scoring){
    const w = scoring?.scoring_v2?.hdss?.lens_weights || {};
    const total = sum(LENS_ORDER.map(l=>w[l]??1));
    return Math.round(
      sum(LENS_ORDER.map(l=>(percs[l]??0)*(w[l]??1))) / (total||1)
    );
  }

  function strongestWeakest(percs){
    const sorted = [...LENS_ORDER]
      .map(l=>[l,percs[l]??0])
      .sort((a,b)=>a[1]-b[1]);
    return {
      weakest:   sorted[0]?.[0] || "privacy",
      strongest:sorted.at(-1)?.[0] || "privacy"
    };
  }

  function stageForScore(hdss,bands){
    const list = Array.isArray(bands?.bands)?bands.bands:[];
    return list.find(b=>hdss>=b.min&&hdss<=b.max)
      || list.at(-1)
      || { label:"Emerging", message:"Small changes will reduce risk quickly." };
  }

  function chooseFocusLens(percs, scoring, snapId){
    const cfg = scoring?.scoring_v2?.focus_lens || {};
    const floor = cfg.healthy_floor ?? 75;
    if (!LENS_ORDER.every(l=>(percs[l]??0)>=floor)){
      return strongestWeakest(percs).weakest;
    }
    const pool = cfg.rotation_pool_when_healthy || LENS_ORDER;
    return pool[stableHash(snapId)%pool.length];
  }

  function buildRationale(lens, scoring, answers, questions, snapId){
    const pool = scoring?.scoring_v2?.rationale?.templates?.[lens] || [];
    if (!pool.length) return "";
    const base = pool[stableHash(`${lens}:${snapId}`)%pool.length];
    const q = questions.find(q=>q.lens===lens && Number.isInteger(answers[q.id]));
    const opt = q?.options?.[answers[q.id]]?.label;
    return opt ? `${base} You said: “${opt}”.` : base;
  }

  const seedsForLens = (lens,seeds)=>
    (Array.isArray(seeds?.seeds)?seeds.seeds:[]).filter(s=>s.lens===lens);

  async function load(){
    if (window.CSSeedForge.__cache) return window.CSSeedForge.__cache;

    const [questions,scoring,seeds,bands] = await Promise.all([
      fetch("/generated/questions.json").then(r=>r.json()),
      fetch("/generated/scoring.json").then(r=>r.json()),
      fetch("/generated/seeds.json").then(r=>r.json()),
      fetch("/generated/bands.json").then(r=>r.json())
    ]);

    const qList = toQuestionList(questions);

    const api = {
      questions, scoring, seeds, bands,
      scoreAnswers(answers){
        const { lensScores,lensMax } = computeLensScores(answers,qList);
        const lensPercents = lensPercentages(lensScores,lensMax);
        const hdss = clamp(calcHdss(lensPercents,scoring),0,100);
        const { strongest,weakest } = strongestWeakest(lensPercents);
        const snapId = stableHash(answers);
        return {
          lensScores,lensMax,lensPercents,hdss,
          strongest,weakest,
          focus: chooseFocusLens(lensPercents,scoring,snapId),
          stage: stageForScore(hdss,bands),
          snapshotId:snapId
        };
      },
      buildRationale:(lens,answers)=>
        buildRationale(lens,scoring,answers,qList,stableHash(answers)),
      seedsForLens:(lens)=>seedsForLens(lens,seeds)
    };

    window.CSSeedForge.__cache = api;
    return api;
  }

  window.CSSeedForge = { load, __cache:null };
})();

/* =========================================================
   Snapshot Modal Controller (Deduplicated)
   ========================================================= */

(() => {
  "use strict";

  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  const modal   = $("#snapshotModal");
  const panel   = modal?.querySelector(".modal-panel");
  const backdrop= modal?.querySelector(".modal-backdrop");
  const form    = $("#snapshotForm");
  const result  = $("#snapshotResult");

  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn= $("#closeSnapshot");
  const resetBtn= $("#resetSnapshot");

  if (!modal||!panel||!form||!nextBtn||!backBtn) return;

  let step=-1, QUESTIONS=[], seedForge=null;
  const answers={};
  const SNAP_KEY="cyberseeds_snapshot_v3";

  const LENS_LABELS={
    network:"Network",
    devices:"Devices",
    privacy:"Accounts & Privacy",
    scams:"Scams & Messages",
    wellbeing:"Children & Wellbeing"
  };

  const safeSet=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
  const safeRemove=k=>{try{localStorage.removeItem(k);}catch{}};

  function openModal(){
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
  }
  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
  }

  function resetFlow(){
    step=-1;
    Object.keys(answers).forEach(k=>delete answers[k]);
    form.innerHTML="";
    result.hidden=true;
    nextBtn.textContent="Start";
    backBtn.disabled=true;
  }

  async function ensureReady(){
    seedForge = await window.CSSeedForge.load();
    QUESTIONS = seedForge.questions.questions
      .slice()
      .sort((a,b)=>(a.order??9999)-(b.order??9999));
  }

  function renderIntro(){
    form.innerHTML=`
      <p class="muted">This is a calm check-in — not a test.</p>
      <p class="muted">You’ll get one clear focus and simple next steps.</p>`;
  }

  function renderQuestion(){
    const q=QUESTIONS[step];
    form.innerHTML=`
      <p><strong>${q.prompt}</strong></p>
      <div class="choices">
        ${q.options.map((o,i)=>`
          <label class="choice">
            <input type="radio" name="q" value="${i}">
            <span>${o.label}</span>
          </label>`).join("")}
      </div>
      ${q.reassurance?`<p class="muted">${q.reassurance}</p>`:""}
    `;
    nextBtn.textContent=step===QUESTIONS.length-1?"Finish":"Next";
    nextBtn.disabled=true;
    backBtn.disabled=step===0;

    $$("input",form).forEach(r=>{
      r.addEventListener("change",()=>{
        answers[q.id]=Number(r.value);
        nextBtn.disabled=false;
      });
    });
  }

  function finish(){
    const scored = seedForge.scoreAnswers(answers);
    const focusLabel = LENS_LABELS[scored.focus];
    const strongestLabel = LENS_LABELS[scored.strongest];
    const rationale = seedForge.buildRationale(scored.focus,answers);
    const seed = seedForge.seedsForLens(scored.focus)[0]||null;

    safeSet(SNAP_KEY,JSON.stringify({ts:Date.now(),answers,...scored,seed}));

    result.hidden=false;
    result.innerHTML=`
      <h3>Your household snapshot</h3>
      <p class="lead">This is not a judgement — it’s a signal.</p>
      <p><strong>Strongest area:</strong> ${strongestLabel}</p>
      <p><strong>Best place to start:</strong> ${focusLabel}</p>
      <p class="muted">Overall signal: <strong>${scored.stage.label}</strong></p>
      ${rationale?`<p>${rationale}</p>`:""}
      ${seed?`
        <h4>${seed.title}</h4>
        <ul>
          <li><strong>Today:</strong> ${seed.today}</li>
          <li><strong>This week:</strong> ${seed.this_week}</li>
          <li><strong>This month:</strong> ${seed.this_month}</li>
        </ul>`:""}
    `;
    nextBtn.style.display="none";
    backBtn.style.display="none";
  }

  nextBtn.addEventListener("click",async()=>{
    if(step<0){await ensureReady();step=0;renderQuestion();return;}
    if(step>=QUESTIONS.length-1){finish();return;}
    step++;renderQuestion();
  });

  backBtn.addEventListener("click",()=>{
    if(step<=0){step=-1;renderIntro();backBtn.disabled=true;return;}
    step--;renderQuestion();
  });

  document.addEventListener("click",e=>{
    if(!e.target.closest("[data-open-snapshot]"))return;
    e.preventDefault();
    resetFlow();openModal();renderIntro();
  });

  closeBtn?.addEventListener("click",closeModal);
  backdrop?.addEventListener("click",closeModal);
  resetBtn?.addEventListener("click",()=>{safeRemove(SNAP_KEY);resetFlow();renderIntro();});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&modal.classList.contains("is-open"))closeModal();
  });
})();
