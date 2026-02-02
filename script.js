
 /* =========================================================
    Cyber Seeds — Household Snapshot Engine
    Calm • Deterministic • Canon
    ========================================================= */
 
+(() => {
+  "use strict";
+
+  if (window.CSSeedForge) return;
+
+  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];
+
+  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
+  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
+
+  function stableHash(input){
+    const str = typeof input === "string" ? input : JSON.stringify(input);
+    let hash = 0;
+    for (let i = 0; i < str.length; i++){
+      hash = ((hash << 5) - hash) + str.charCodeAt(i);
+      hash |= 0;
+    }
+    return Math.abs(hash);
+  }
+
+  function toQuestionList(data){
+    if (Array.isArray(data)) return data;
+    return Array.isArray(data?.questions) ? data.questions : [];
+  }
+
+  function extractLensMax(q){
+    const scoring = q.scoring_v2 || {};
+    const importance = scoring.importance ?? 1;
+    const max = scoring.max_points ?? Math.max(...q.options.map(o => o.points ?? 0));
+    return max * importance;
+  }
+
+  function extractLensScore(q, answerIndex){
+    if (!Number.isInteger(answerIndex)) return 0;
+    const scoring = q.scoring_v2 || {};
+    const importance = scoring.importance ?? 1;
+    const option = q.options?.[answerIndex];
+    const points = option?.points ?? 0;
+    return points * importance;
+  }
+
+  function computeLensScores(answers, questions){
+    const lensScores = Object.fromEntries(LENS_ORDER.map(l => [l, 0]));
+    const lensMax = Object.fromEntries(LENS_ORDER.map(l => [l, 0]));
+
+    questions.forEach(q => {
+      if (!q?.lens) return;
+      const lens = q.lens;
+      if (!(lens in lensScores)) lensScores[lens] = 0;
+      if (!(lens in lensMax)) lensMax[lens] = 0;
+      lensScores[lens] += extractLensScore(q, answers[q.id]);
+      lensMax[lens] += extractLensMax(q);
+    });
+
+    return { lensScores, lensMax };
+  }
+
+  function lensPercentages(lensScores, lensMax){
+    const result = {};
+    LENS_ORDER.forEach(lens => {
+      const max = lensMax[lens] || 0;
+      const score = lensScores[lens] || 0;
+      result[lens] = max ? (score / max) * 100 : 0;
+    });
+    return result;
+  }
+
+  function calcHdss(lensPercents, scoring){
+    const weights = scoring?.scoring_v2?.hdss?.lens_weights || {};
+    const weighted = LENS_ORDER.map(lens => {
+      const weight = weights[lens] ?? 1;
+      return (lensPercents[lens] ?? 0) * weight;
+    });
+    const denom = sum(LENS_ORDER.map(lens => weights[lens] ?? 1)) || 1;
+    return Math.round(sum(weighted) / denom);
+  }
+
+  function strongestWeakest(lensPercents){
+    const entries = LENS_ORDER.map(l => [l, lensPercents[l] ?? 0]);
+    const sorted = [...entries].sort((a, b) => a[1] - b[1]);
+    const weakest = sorted[0]?.[0] || "privacy";
+    const strongest = sorted[sorted.length - 1]?.[0] || "privacy";
+    return { strongest, weakest };
+  }
+
+  function stageForScore(hdss, bands){
+    const list = Array.isArray(bands?.bands) ? bands.bands : [];
+    const band = list.find(b => hdss >= b.min && hdss <= b.max) || list[list.length - 1];
+    if (!band) return { label: "Emerging", desc: "Small changes will reduce risk quickly." };
+    return { label: band.label, desc: band.message };
+  }
+
+  function chooseFocusLens(lensPercents, scoring, snapshotId){
+    const focus = scoring?.scoring_v2?.focus_lens;
+    const healthyFloor = focus?.healthy_floor ?? 75;
+    const allHealthy = LENS_ORDER.every(l => (lensPercents[l] ?? 0) >= healthyFloor);
+    if (!allHealthy){
+      return strongestWeakest(lensPercents).weakest;
+    }
+    const pool = focus?.rotation_pool_when_healthy || LENS_ORDER;
+    const idx = stableHash(snapshotId) % pool.length;
+    return pool[idx];
+  }
+
+  function buildRationaleTemplate(lensKey, scoring, answers, questions, snapshotId){
+    const templates = scoring?.scoring_v2?.rationale?.templates || {};
+    const pool = templates[lensKey] || [];
+    if (!pool.length) return "";
+
+    const idx = stableHash(`${lensKey}:${snapshotId}`) % pool.length;
+    const base = pool[idx];
+
+    const match = questions.find(q => q.lens === lensKey && Number.isInteger(answers[q.id]));
+    if (!match) return base;
+    const option = match.options?.[answers[match.id]];
+    if (!option?.label) return base;
+
+    return `${base} You said: “${option.label}”.`;
+  }
+
+  function seedsForLens(lensKey, seeds){
+    const list = Array.isArray(seeds?.seeds) ? seeds.seeds : [];
+    return list.filter(seed => seed.lens === lensKey);
+  }
+
+  async function load(){
+    if (window.CSSeedForge?.__cache) return window.CSSeedForge.__cache;
+
+    const [questions, scoring, seeds, bands] = await Promise.all([
+      fetch("/generated/questions.json").then(r => r.json()),
+      fetch("/generated/scoring.json").then(r => r.json()),
+      fetch("/generated/seeds.json").then(r => r.json()),
+      fetch("/generated/bands.json").then(r => r.json())
+    ]);
+
+    const questionsList = toQuestionList(questions);
+
+    const api = {
+      questions,
+      scoring,
+      seeds,
+      bands,
+      scoreAnswers: (answers, questionsData, scoringData) => {
+        const list = toQuestionList(questionsData);
+        const { lensScores, lensMax } = computeLensScores(answers, list);
+        const lensPercents = lensPercentages(lensScores, lensMax);
+        const hdss = clamp(calcHdss(lensPercents, scoringData), 0, 100);
+        const { strongest, weakest } = strongestWeakest(lensPercents);
+        const snapshotId = stableHash(answers);
+        const focus = chooseFocusLens(lensPercents, scoringData, snapshotId);
+        const stage = stageForScore(hdss, bands);
+
+        return {
+          lensScores,
+          lensPercents,
+          lensMax,
+          hdss,
+          strongest,
+          weakest,
+          focus,
+          stage,
+          snapshotId
+        };
+      },
+      buildRationale: (lensKey, questionsData, answers) => {
+        const list = toQuestionList(questionsData);
+        const snapshotId = stableHash(answers);
+        return buildRationaleTemplate(lensKey, scoring, answers, list, snapshotId);
+      },
+      seedsForLens: (lensKey, seedsData) => seedsForLens(lensKey, seedsData),
+      __cache: null
+    };
+
+    api.__cache = api;
+    window.CSSeedForge.__cache = api;
+    return api;
+  }
+
+  window.CSSeedForge = { load };
+})();
+
 (() => {
   "use strict";
 
   /* ---------- HELPERS ---------- */
   const $  = (s, r=document) => r.querySelector(s);
   const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
 
   /* ---------- DOM ---------- */
   const modal     = $("#snapshotModal");
   const backdrop  = modal?.querySelector(".modal-backdrop");
   const panel     = modal?.querySelector(".modal-panel");
   const form      = $("#snapshotForm");
   const result    = $("#snapshotResult");
 
   const nextBtn   = $("#snapshotNext");
   const backBtn   = $("#snapshotBack");
   const closeBtn  = $("#closeSnapshot");
+  const resetBtn  = $("#resetSnapshot");
 
   if (!modal || !panel || !form || !nextBtn || !backBtn) {
     console.warn("[Cyber Seeds] Snapshot modal missing elements");
     return;
   }
 
   /* ---------- STATE ---------- */
   let step = -1;
   let QUESTIONS = [];
   let seedForge = null;
   const answers = {};
 
   const SNAP_KEY = "cyberseeds_snapshot_v3";
+  const LENS_LABELS = {
+    network: "Network",
+    devices: "Devices",
+    privacy: "Accounts & Privacy",
+    scams: "Scams & Messages",
+    wellbeing: "Children & Wellbeing"
+  };
 
   /* ---------- STORAGE ---------- */
   const safeGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
   const safeSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
+  const safeRemove = k => { try { localStorage.removeItem(k); } catch {} };
 
   /* ---------- MODAL CONTROL ---------- */
   function openModal(){
     modal.classList.add("is-open");
     modal.setAttribute("aria-hidden","false");
     document.body.classList.add("modal-open");
     nextBtn.focus({ preventScroll:true });
   }
 
   function closeModal(){
     modal.classList.remove("is-open");
     modal.setAttribute("aria-hidden","true");
     document.body.classList.remove("modal-open");
   }
 
   /* ---------- RESET ---------- */
   function resetFlow(){
     step = -1;
     Object.keys(answers).forEach(k => delete answers[k]);
     form.innerHTML = "";
     if (result) result.hidden = true;
 
     nextBtn.textContent = "Start";
     nextBtn.disabled = false;
     nextBtn.style.display = "";
     backBtn.disabled = true;
     backBtn.style.display = "";
   }
 
   /* ---------- LOAD QUESTIONS ---------- */
   async function ensureReady(){
     if (seedForge && QUESTIONS.length) return;
 
-    seedForge = await window.CSSeedForge.load();
-    QUESTIONS = seedForge.questions.questions
-      .slice()
-      .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));
+    try {
+      seedForge = await window.CSSeedForge.load();
+      QUESTIONS = seedForge.questions.questions
+        .slice()
+        .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));
+    } catch (error){
+      console.error("[Cyber Seeds] Snapshot failed to load", error);
+      form.innerHTML = `
+        <p class="muted">We couldn’t load the snapshot questions right now.</p>
+        <p class="muted">Please refresh the page or try again in a moment.</p>
+      `;
+      nextBtn.disabled = true;
+      backBtn.disabled = true;
+    }
   }
 
   /* ---------- RENDER: INTRO ---------- */
   function renderIntro(){
     form.innerHTML = `
       <p class="muted">
         This is a calm check-in — not a test.
       </p>
       <p class="muted">
         Answer honestly. You’ll get one clear focus and simple next steps.
       </p>
     `;
   }
 
   /* ---------- RENDER: QUESTION ---------- */
   function renderQuestion(){
     const q = QUESTIONS[step];
     if (!q) return;
 
     form.innerHTML = `
       <p><strong>${q.prompt}</strong></p>
 
       <div class="choices">
         ${q.options.map((o,i)=>`
           <label class="choice">
@@ -108,97 +308,108 @@
       ${q.reassurance ? `
         <p class="muted">${q.reassurance}</p>
       ` : ""}
     `;
 
     nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
     nextBtn.disabled = true;
     backBtn.disabled = step === 0;
 
     $$("input", form).forEach(radio => {
       radio.addEventListener("change", () => {
         answers[q.id] = Number(radio.value);
         nextBtn.disabled = false;
       });
     });
   }
 
   /* ---------- FINISH ---------- */
   function finish(){
     const scored = seedForge.scoreAnswers(
       answers,
       seedForge.questions,
       seedForge.scoring
     );
 
+    const focusLens = scored.focus || scored.weakest;
+    const focusLabel = LENS_LABELS[focusLens] || focusLens;
+    const strongestLabel = LENS_LABELS[scored.strongest] || scored.strongest;
+
     const rationale = seedForge.buildRationale(
-      scored.weakest,
+      focusLens,
       QUESTIONS,
       answers
     );
 
     const seed = seedForge.seedsForLens(
-      scored.weakest,
+      focusLens,
       seedForge.seeds
     )[0] || null;
 
     const snapshot = {
       ts: Date.now(),
       answers,
+      focus: focusLens,
       ...scored,
       seed
     };
 
     safeSet(SNAP_KEY, JSON.stringify(snapshot));
-    renderResult(scored, seed, rationale);
+    renderResult(scored, seed, rationale, {
+      focusLabel,
+      strongestLabel
+    });
   }
 
   /* ---------- RENDER: RESULT ---------- */
-  function renderResult(scored, seed, rationale){
+  function renderResult(scored, seed, rationale, labels){
+    const focusLabel = labels?.focusLabel || LENS_LABELS[scored.focus] || scored.focus;
+    const strongestLabel = labels?.strongestLabel || LENS_LABELS[scored.strongest] || scored.strongest;
     result.hidden = false;
     result.classList.add("reveal");
 
     result.innerHTML = `
       <div class="snapshot-summary">
         <h3>Your household snapshot</h3>
 
         <p class="lead">
           This is not a judgement — it’s a signal.
         </p>
 
         <div class="snapshot-insight">
-          <p><strong>Strongest area:</strong> ${scored.strongest}</p>
-          <p><strong>Best place to start:</strong> ${scored.weakest}</p>
+          <p><strong>Strongest area:</strong> ${strongestLabel}</p>
+          <p><strong>Best place to start:</strong> ${focusLabel}</p>
           <p class="muted">
             Overall signal: <strong>${scored.stage.label}</strong>
           </p>
         </div>
 
         ${rationale ? `
           <div class="snapshot-why">
             <p><strong>Why this focus?</strong></p>
             <p>${rationale}</p>
+            <p class="muted">${scored.stage.desc}</p>
           </div>
         ` : ""}
 
         ${seed ? `
           <div class="snapshot-seed">
             <h4>${seed.title}</h4>
             <ul>
               <li><strong>Today:</strong> ${seed.today}</li>
               <li><strong>This week:</strong> ${seed.this_week}</li>
               <li><strong>This month:</strong> ${seed.this_month}</li>
             </ul>
           </div>
         ` : ""} 
       </div>
     `;
 
     nextBtn.style.display = "none";
     backBtn.style.display = "none";
   }
 
   /* ---------- CONTROLS ---------- */
   nextBtn.addEventListener("click", async () => {
     if (step < 0){
       await ensureReady();
       step = 0;
@@ -218,33 +429,38 @@
   backBtn.addEventListener("click", () => {
     if (step <= 0){
       step = -1;
       renderIntro();
       backBtn.disabled = true;
       return;
     }
     step--;
     renderQuestion();
   });
 
   /* ---------- OPEN ---------- */
   document.addEventListener("click", e => {
     const btn = e.target.closest("[data-open-snapshot]");
     if (!btn) return;
 
     e.preventDefault();
     resetFlow();
     openModal();
     renderIntro();
   });
 
   /* ---------- CLOSE ---------- */
   if (closeBtn) closeBtn.addEventListener("click", closeModal);
   if (backdrop) backdrop.addEventListener("click", closeModal);
+  if (resetBtn) resetBtn.addEventListener("click", () => {
+    safeRemove(SNAP_KEY);
+    resetFlow();
+    renderIntro();
+  });
 
   document.addEventListener("keydown", e => {
     if (e.key === "Escape" && modal.classList.contains("is-open")) {
       closeModal();
     }
   });
 
 })();
