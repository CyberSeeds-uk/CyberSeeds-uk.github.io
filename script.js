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
    result.classList.remove("reveal");
    nextBtn.textContent="Start";
    backBtn.disabled=true;
    nextBtn.style.display="";
    backBtn.style.display="";
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
    const weakestLabel = LENS_LABELS[scored.weakest];
    const rationale = seedForge.buildRationale(scored.focus,answers);
    const seed = seedForge.seedsForLens(scored.focus)[0]||null;

    const headlineEl = $("#resultHeadline");
    const stageEl = $("#resultStage");
    const strongestEl = $("#strongestLens");
    const weakestEl = $("#weakestLens");
    const rationaleEl = $("#resultRationale");
    const seedTitleEl = $("#resultSeedTitle");
    const seedTodayEl = $("#resultSeedToday");
    const seedWeekEl = $("#resultSeedWeek");
    const seedMonthEl = $("#resultSeedMonth");

    if (headlineEl) headlineEl.textContent = `Best place to start: ${focusLabel}.`;
    if (stageEl) stageEl.textContent = `Overall signal: ${scored.stage.label} — ${scored.stage.message}`;
    if (strongestEl) strongestEl.textContent = strongestLabel;
    if (weakestEl) weakestEl.textContent = weakestLabel;
    if (rationaleEl) rationaleEl.textContent = rationale || `Focus on ${focusLabel} for the fastest, calmest improvement.`;

    const lensPercents = scored.lensPercents || {};
    const lensMap = {
      network: { bar: "#barNetwork", val: "#valNetwork" },
      devices: { bar: "#barDevices", val: "#valDevices" },
      privacy: { bar: "#barPrivacy", val: "#valPrivacy" },
      scams: { bar: "#barScams", val: "#valScams" },
      wellbeing: { bar: "#barWellbeing", val: "#valWellbeing" }
    };

    Object.entries(lensMap).forEach(([lens, ids]) => {
      const bar = $(ids.bar);
      const val = $(ids.val);
      const pct = Math.round(lensPercents[lens] ?? 0);
      if (bar) bar.style.width = `${pct}%`;
      if (val) val.textContent = `${pct}%`;
    });

    if (seedTitleEl) seedTitleEl.textContent = seed?.title || "Your next Digital Seed";
    if (seedTodayEl) seedTodayEl.textContent = seed?.today || "Complete your snapshot to receive a clear next step.";
    if (seedWeekEl) seedWeekEl.textContent = seed?.this_week || " ";
    if (seedMonthEl) seedMonthEl.textContent = seed?.this_month || " ";

    safeSet(SNAP_KEY,JSON.stringify({ts:Date.now(),answers,...scored,seed}));

    result.hidden=false;
    result.classList.add("reveal");
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

/* =========================================================
   Systems Map Insight Panel
   ========================================================= */

(() => {
  "use strict";

  const nodes = Array.from(document.querySelectorAll(".cs-node"));
  if (!nodes.length) return;

  const kicker = document.getElementById("csInsightKicker");
  const title = document.getElementById("csInsightTitle");
  const body = document.getElementById("csInsightBody");
  const meta = document.getElementById("csInsightMeta");
  const state = document.getElementById("csInsightState");
  const leverage = document.getElementById("csInsightLeverage");
  const next = document.getElementById("csInsightNext");
  const nextText = document.getElementById("csInsightNextText");
  const resetBtn = document.getElementById("csResetSystems");

  const defaults = {
    kicker: "Household view",
    title: "The invisible becomes visible",
    body: "Tap any system in the map to see what it means in real life — calmly and proportionately."
  };

  const insights = {
    network: {
      kicker: "Network lens",
      title: "Your Wi-Fi is the home’s circulation system",
      body: "Stable router settings make everything else steadier — devices update cleanly, accounts stay protected, and stress reduces.",
      state: "Forming",
      leverage: "High leverage",
      next: "Check who can access the router settings and ensure guest access is separate."
    },
    devices: {
      kicker: "Devices lens",
      title: "Devices are the organs of the household system",
      body: "Simple upkeep — updates, locks, backups — keeps daily life running without sudden breakage or loss.",
      state: "Steady",
      leverage: "High leverage",
      next: "Pick one device to update and turn on auto-updates for the rest."
    },
    privacy: {
      kicker: "Privacy lens",
      title: "Accounts are the immune system",
      body: "Boundaries reduce surprises. Strong recovery routes keep the household in control when pressure hits.",
      state: "Forming",
      leverage: "Critical",
      next: "Secure the main email account with two-step verification."
    },
    scams: {
      kicker: "Scams lens",
      title: "Scams test the household perimeter",
      body: "A calm pause protects everyone. Simple verification routines stop urgency from turning into loss.",
      state: "Emerging",
      leverage: "High leverage",
      next: "Set one rule: no payments or logins without a quick double-check."
    },
    children: {
      kicker: "Wellbeing lens",
      title: "Wellbeing keeps the system calm",
      body: "Small routines around screens, sleep, and focus protect development and reduce friction at home.",
      state: "Steady",
      leverage: "Foundational",
      next: "Pick one shared calm time each day that is device-light or device-free."
    }
  };

  function resetInsight(){
    nodes.forEach(node => node.classList.remove("is-active"));
    if (kicker) kicker.textContent = defaults.kicker;
    if (title) title.textContent = defaults.title;
    if (body) body.textContent = defaults.body;
    if (meta) meta.hidden = true;
    if (next) next.hidden = true;
  }

  function setInsight(key){
    const entry = insights[key];
    if (!entry) return;
    nodes.forEach(node => node.classList.toggle("is-active", node.dataset.node === key));
    if (kicker) kicker.textContent = entry.kicker;
    if (title) title.textContent = entry.title;
    if (body) body.textContent = entry.body;
    if (state) state.textContent = entry.state;
    if (leverage) leverage.textContent = entry.leverage;
    if (nextText) nextText.textContent = entry.next;
    if (meta) meta.hidden = false;
    if (next) next.hidden = false;
  }

  nodes.forEach(node => {
    node.addEventListener("click", () => setInsight(node.dataset.node));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setInsight(node.dataset.node);
      }
    });
  });

  resetBtn?.addEventListener("click", resetInsight);
})();
