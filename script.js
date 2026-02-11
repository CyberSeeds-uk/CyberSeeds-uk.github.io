/* Dev checklist: snapshot modal binding guard + deterministic question render + retake reset flow. */
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

    Object.freeze(api);
    window.CSSeedForge.__cache = api;
    return api;
  }

  // B-1: ensure the snapshot engine registers without breaking script execution.
  window.CSSeedForge = { load, __cache:null, stableHash };

  // Signal that snapshot engine is ready
  window.__CS_SNAPSHOT_READY__ = true;
  window.dispatchEvent(new Event("cs:snapshot-ready"));
})();


  // Normalize legacy snapshot shapes into the v3 canonical structure.
  function coerceSnapshot(raw, fallbackHistory){
    if (!raw || typeof raw !== "object") return null;
    const timestamp = raw.timestamp ?? raw.ts ?? Date.now();
    const lenses = sanitizeLensPercents(raw.lenses || raw.lensPercents || raw.perLens);
    const total = Math.round(raw.total ?? raw.hdss ?? raw.score ?? 0);
    const previous = fallbackHistory?.[0]?.totalScore ?? null;
    const trajectory = raw.trajectory || buildTrajectory(total, previous);
    const patterns = Array.isArray(raw.patterns) ? raw.patterns : detectPatterns(lenses);
    const strengths = Array.isArray(raw.strengths) ? raw.strengths : buildStrengths(lenses);
    const phasePlan = Array.isArray(raw.phasePlan) ? raw.phasePlan : buildPhasePlan(lenses);
    const signal = raw.signal || buildSignal(total, trajectory.label, lenses);

    return {
      schema: raw.schema || SNAPSHOT_SCHEMA,
      id: raw.id || `${raw.snapshotId || stableHash(raw)}-${timestamp}`,
      timestamp,
      total,
      lenses,
      lensPercents: raw.lensPercents || lenses,
      lensScores: raw.lensScores || {},
      lensMax: raw.lensMax || {},
      answers: raw.answers || {},
      patterns,
      strengths,
      phasePlan,
      signal,
      trajectory,
      snapshotId: raw.snapshotId,
      hdss: raw.hdss ?? total,
      focus: raw.focus,
      strongest: raw.strongest,
      weakest: raw.weakest,
      seed: raw.seed
    };
  }

  function migrateLegacySnapshot(){
    const history = loadHistory();
    const currentRaw = safeParse(safeGet(SNAP_KEY), null);
    if (isCanonicalSnapshot(currentRaw)) return currentRaw;

    const candidates = [currentRaw, ...LEGACY_SNAPSHOT_KEYS.map(k => safeParse(safeGet(k), null))];
    const legacy = candidates.find(item => item && typeof item === "object");
    if (!legacy) return null;

    const migrated = coerceSnapshot(legacy, history);
    if (migrated){
      safeSet(SNAP_KEY, JSON.stringify(migrated));
      safeSet(SNAPSHOT_LAST_KEY, migrated.id);
    }
    return migrated;
  }

  function lensStatus(pct){
    const score = Math.round(pct ?? 0);
    if (score >= 75) return { icon: "🟢", label: "Steady", note: "Foundations feel reliable and predictable." };
    if (score >= 50) return { icon: "🟠", label: "Forming", note: "In progress — small routines will lift this quickly." };
    return { icon: "🔴", label: "Fragile", note: "This lens needs gentle support right now." };
  }

  function renderLensMap(lensPercents){
    const targets = {
      network: { status: $("#statusNetwork"), section: $("#lens-network") },
      devices: { status: $("#statusDevices"), section: $("#lens-devices") },
      privacy: { status: $("#statusPrivacy"), section: $("#lens-privacy") },
      scams: { status: $("#statusScams"), section: $("#lens-scams") },
      wellbeing: { status: $("#statusWellbeing"), section: $("#lens-wellbeing") }
    };

    Object.entries(targets).forEach(([lens, nodes]) => {
      const status = lensStatus(lensPercents[lens]);
      if (nodes.status) nodes.status.textContent = `${status.icon} ${status.label}`;
    });

    $$("#lensMap [data-lens-target]").forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.getAttribute("data-lens-target");
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      };
    });
  }

  function renderLensDetails(lensPercents){
    const entries = {
      network: { status: $("#lensNetworkStatus"), note: $("#lensNetworkNote") },
      devices: { status: $("#lensDevicesStatus"), note: $("#lensDevicesNote") },
      privacy: { status: $("#lensPrivacyStatus"), note: $("#lensPrivacyNote") },
      scams: { status: $("#lensScamsStatus"), note: $("#lensScamsNote") },
      wellbeing: { status: $("#lensWellbeingStatus"), note: $("#lensWellbeingNote") }
    };
    Object.entries(entries).forEach(([lens, nodes]) => {
      const status = lensStatus(lensPercents[lens]);
      if (nodes.status) nodes.status.textContent = `${status.label} • ${Math.round(lensPercents[lens] ?? 0)}%`;
      if (nodes.note) nodes.note.textContent = status.note;
    });
  }

  function renderStrengths(strengths){
    const list = $("#strengthsList");
    if (!list) return;
    if (!strengths.length){
      list.innerHTML = `<li>Every household has strengths. Keep the routines that already feel calm.</li>`;
      return;
    }
    list.innerHTML = strengths.map(item =>
      `<li><strong>${item.label}</strong> feels supportive (${item.value}%).</li>`
    ).join("");
  }

  function renderPatterns(patterns){
    const container = $("#patternList");
    if (!container) return;
    if (!patterns.length){
      container.innerHTML = `<p class="muted">No strong pattern signals detected — keep your routines steady.</p>`;
      return;
    }
    container.innerHTML = patterns.map(pattern => `
      <article class="pattern-card">
        <h5>${pattern.title}</h5>
        <p>${pattern.explanation}</p>
        <p class="muted"><strong>Why this matters:</strong> ${pattern.why}</p>
      </article>
    `).join("");
  }

  function renderPhasePlan(phasePlan){
    const container = $("#phasePlan");
    if (!container) return;
    container.innerHTML = phasePlan.map(phase => `
      <div class="phase-card">
        <h5>${phase.phase}</h5>
        <ul>${phase.actions.map(action => `<li>${action}</li>`).join("")}</ul>
      </div>
    `).join("");
  }

  function renderHistorySection(history, currentEntry){
    const section = $("#snapshotHistorySection");
    const list = $("#snapshotHistory");
    const change = $("#historyChange");
    const trend = $("#historyTrend");
    if (!section || !list) return;
    const items = history.slice().sort((a,b)=>b.ts-a.ts).slice(0, 3);
    if (!items.length){
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = items.map(entry => {
      const total = Math.round(entry.totalScore ?? entry.hdss ?? 0);
      return `<li>${formatDate(entry.ts)} — ${total}% overall signal</li>`;
    }).join("");
    const previous = history.find(entry => entry.id !== currentEntry.id);
    const trajectory = buildTrajectory(currentEntry.totalScore ?? currentEntry.hdss ?? 0, previous?.totalScore ?? previous?.hdss);
    if (change) change.textContent = trajectory.change;
    if (trend) trend.textContent = `Trend indicator: ${trajectory.label}.`;
  }

  function buildReportHtml(snapshot, strengths, patterns, phasePlan, trajectory){
    const lensRows = LENS_ORDER.map(l => `
      <tr>
        <td>${LENS_LABELS[l]}</td>
        <td>${Math.round(snapshot.lenses[l] ?? 0)}%</td>
      </tr>
    `).join("");
    const strengthList = strengths.map(item => `<li>${item.label} (${item.value}%)</li>`).join("") || "<li>Noted strengths are forming.</li>";
    const patternList = patterns.map(item => `<li><strong>${item.title}:</strong> ${item.explanation}</li>`).join("") || "<li>No strong pattern signals detected.</li>";
    const phaseBlocks = phasePlan.map(phase => `
      <h4>${phase.phase}</h4>
      <ul>${phase.actions.map(action => `<li>${action}</li>`).join("")}</ul>
    `).join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cyber Seeds Snapshot Report</title>
  <style>
    body{font-family:Arial, sans-serif; color:#0f2f2a; margin:24px; line-height:1.5;}
    h1,h2,h3{color:#1a6a5d;}
    table{width:100%; border-collapse:collapse; margin:12px 0;}
    th,td{border:1px solid #d8e6e2; padding:8px; text-align:left;}
    .note{color:#4c6a63; font-size:0.95rem;}
  </style>
</head>
<body>
  <h1>Household Snapshot Report</h1>
  <p class="note">This file is for backup and sharing. You do not need to read it.</p>
  <h2>Overall signal</h2>
  <p><strong>${snapshot.signal.overall}</strong> (${snapshot.signal.score}/100) — ${snapshot.signal.summary}</p>
  <p>Trajectory: ${trajectory.label}. Risk pressure: ${snapshot.signal.riskPressure}. Resilience index: ${snapshot.signal.resilienceIndex}.</p>
  <h2>Lens scores</h2>
  <table>
    <thead><tr><th>Lens</th><th>Score</th></tr></thead>
    <tbody>${lensRows}</tbody>
  </table>
  <h2>Strengths</h2>
  <ul>${strengthList}</ul>
  <h2>Pattern check</h2>
  <ul>${patternList}</ul>
  <h2>Priority Seed Pathways</h2>
  ${phaseBlocks}
  <p class="note">Generated locally on your device. Nothing is uploaded.</p>
</body>
</html>`;
  }

  function downloadHtml(filename, content){
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadDoc(filename, content){
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getExportBundle(){
    const history = loadHistory();
    const snapshotRaw = safeParse(safeGet(SNAP_KEY), null);
    const snapshot = isCanonicalSnapshot(snapshotRaw)
      ? snapshotRaw
      : coerceSnapshot(history[0], history);
    if (!snapshot) return null;

    const strengths = snapshot.strengths?.length ? snapshot.strengths : buildStrengths(snapshot.lenses);
    const patterns = snapshot.patterns?.length ? snapshot.patterns : detectPatterns(snapshot.lenses);
    const phasePlan = snapshot.phasePlan?.length ? snapshot.phasePlan : buildPhasePlan(snapshot.lenses);
    const trajectory = snapshot.trajectory || buildTrajectory(snapshot.total, history[1]?.totalScore ?? history[1]?.hdss);
    const signal = snapshot.signal || buildSignal(snapshot.total, trajectory.label, snapshot.lenses);

    return {
      snapshot: { ...snapshot, signal },
      strengths,
      patterns,
      phasePlan,
      trajectory,
      summaryHtml: buildSummaryHtml({ ...snapshot, signal }, strengths, patterns, phasePlan, trajectory),
      reportHtml: buildReportHtml({ ...snapshot, signal }, strengths, patterns, phasePlan, trajectory)
    };
  }

  function downloadJSON(filename, payload){
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
    step = -1;

    Object.keys(answers).forEach(k => delete answers[k]);

    if (form){
      form.hidden = false;
      form.style.display = "";
      form.innerHTML = "";
    }

    hideResult();

    nextBtn.textContent = "Begin";
    backBtn.disabled = true;
    nextBtn.disabled = false;
    nextBtn.style.display = "";
    backBtn.style.display = "";
  }

  // B-5: keep export controls calm and explicit until a snapshot exists.
  function setExportState(hasSnapshot){
    const buttons = [downloadPassportBtn, downloadSummaryBtn, downloadSnapshotHtmlBtn, printSnapshotBtn];
    buttons.forEach(btn => {
      if (!btn) return;
      btn.disabled = !hasSnapshot;
      btn.setAttribute("aria-disabled", String(!hasSnapshot));
    });
    if (exportHint){
      exportHint.textContent = hasSnapshot
        ? ""
        : "Complete a snapshot to enable local exports.";
    }
  }

  function renderComparison(currentEntry){
    if (!compareSelect || !compareOutput) return;
    const history = loadHistory().slice().sort((a,b)=>b.ts-a.ts);
    const options = history.filter(entry => entry.id !== currentEntry.id);

    if (!options.length){
      compareSelect.innerHTML = `<option value="">No earlier snapshot yet</option>`;
      compareSelect.disabled = true;
      compareOutput.innerHTML = `<p class="muted">Compare with a previous snapshot once you have more than one saved.</p>`;
      return;
    }

    compareSelect.disabled = false;
    compareSelect.innerHTML = `
      <option value="">Choose an earlier snapshot</option>
      ${options.map(entry => `<option value="${entry.id}">${formatDate(entry.ts)}</option>`).join("")}
    `;
    compareOutput.innerHTML = `<p class="muted">Compare with a previous snapshot to see what has shifted over time.</p>`;

    compareSelect.onchange = () => {
      const selected = options.find(entry => entry.id === compareSelect.value);
      if (!selected){
        compareOutput.innerHTML = `<p class="muted">Compare with a previous snapshot to see what has shifted over time.</p>`;
        return;
      }

      const nowScore = Math.round(currentEntry.totalScore ?? currentEntry.hdss ?? 0);
      const thenScore = Math.round(selected.totalScore ?? selected.hdss ?? 0);
      const diff = nowScore - thenScore;
      const diffText = diff === 0 ? "no change" : diff > 0 ? `+${diff}` : `${diff}`;

      const deltas = LENS_ORDER.map(lens => {
        const now = Math.round(currentEntry.lenses?.[lens] ?? currentEntry.perLens?.[lens] ?? currentEntry.lensPercents?.[lens] ?? 0);
        const then = Math.round(selected.lenses?.[lens] ?? selected.perLens?.[lens] ?? selected.lensPercents?.[lens] ?? 0);
        const delta = now - then;
        const label = LENS_LABELS[lens] || lens;
        const deltaText = delta === 0 ? "no change" : delta > 0 ? `+${delta}` : `${delta}`;
        return `<li><strong>${label}:</strong> ${deltaText} points</li>`;
      }).join("");

      compareOutput.innerHTML = `
        <div class="compare-card">
          <p><strong>From ${formatDate(selected.ts)} to ${formatDate(currentEntry.ts)}</strong></p>
          <p>This suggests an overall shift from ${thenScore}% to ${nowScore}% (${diffText} points).</p>
          <ul class="compare-list">${deltas}</ul>
        </div>
      `;
    };
  }

  async function ensureReady(){
  seedForge = await window.CSSeedForge.load();

  const qRaw = seedForge.questions;
  const list = Array.isArray(qRaw?.questions) ? qRaw.questions : qRaw;

  QUESTIONS = list
    .slice()
    .sort((a,b)=>(a.order??9999)-(b.order??9999));
}

    // Accepts an answers map { [questionId]: optionIndex }
    async finishFromAnswers(answerMap){
      await ensureReady();

      // Use the same internal pipeline as the legacy Finish button:
      // score -> interpret -> render -> persist/export
      const scored = seedForge.scoreAnswers(answerMap);

      const focusLabel = LENS_LABELS[scored.focus];
      const strongestLabel = LENS_LABELS[scored.strongest];
      const weakestLabel = LENS_LABELS[scored.weakest];

      const rationale = seedForge.buildRationale(scored.focus, answerMap);
      const seed = seedForge.seedsForLens(scored.focus)[0] || null;

      const lensPercents = scored.lensPercents || {};
      const history = loadHistory();
      const previous = history[0];

      const trajectory = buildTrajectory(
        scored.hdss,
        previous?.totalScore ?? previous?.hdss
      );

      const signal = buildSignal(
        scored.hdss,
        trajectory.label,
        lensPercents
      );

      const patterns = detectPatterns(lensPercents);
      const strengths = buildStrengths(lensPercents);
      const phasePlan = buildPhasePlan(lensPercents);

      renderSnapshotResults({
        scored,
        focusLabel,
        strongestLabel,
        weakestLabel,
        rationale,
        seed,
        lensPercents,
        signal,
        trajectory,
        patterns,
        strengths,
        phasePlan,
        history
      });

      // Ensure other pages/components update immediately
      window.CSSnapshotInsights?.mount?.(document).catch(()=>{});
      window.dispatchEvent(new Event("cs:snapshot-updated"));
    }
  };

  if (!document.querySelector("cyber-seeds-snapshot")) {
    document.addEventListener("click", e => {
         if (!e.target.closest("[data-open-snapshot]")) return;
         e.preventDefault();
       
         if (form) form.hidden = false;
         hideResult();
       
         resetFlow();
         openModal();
         renderIntro();
       
         const scroll = $("#snapshotScroll");
         if (scroll) scroll.scrollTop = 0;
       });
  }


  if (!document.querySelector("cyber-seeds-snapshot")){
    closeBtn?.addEventListener("click",closeModal);
    backdrop?.addEventListener("click",closeModal);
  }
  resetBtn?.addEventListener("click",()=>{
    safeRemove(SNAP_KEY);
    safeRemove(HISTORY_KEY);
    safeRemove(PASSPORT_KEY);
    safeRemove(SNAPSHOT_LAST_KEY);

    // If using the Web Component snapshot, avoid touching legacy modal internals.
    if (document.querySelector("cyber-seeds-snapshot")){
      hideResult();
      setExportState(false);
      window.CSSnapshotInsights?.mount?.(document).catch(()=>{});
      window.dispatchEvent(new Event("cs:snapshot-reset"));
      return;
    }

    resetFlow();
    renderIntro();
  });
  $("#retakeSnapshot")?.addEventListener("click", () => {
    if (document.querySelector("cyber-seeds-snapshot")){
      document.querySelector("cyber-seeds-snapshot")?.open?.();
      return;
    }


     if (form) form.hidden = false;
     hideResult();
   
     resetFlow();
     renderIntro();
   
     const scroll = $("#snapshotScroll");
     if (scroll){
       scroll.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
     } else if (panel){
       panel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
     }
   });

  downloadPassportBtn?.addEventListener("click", () => {
    const history = loadHistory();
    const passport = buildPassport(history);
    if (!passport?.snapshots?.length){
      setExportState(false);
      return;
    }
    downloadJSON("cyber-seeds-digital-passport.json", passport);
  });
  downloadSummaryBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle){
      setExportState(false);
      return;
    }
    downloadDoc("cyber-seeds-snapshot-summary.doc", bundle.summaryHtml);
  });
  downloadSnapshotHtmlBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle){
      setExportState(false);
      return;
    }
    downloadHtml("cyber-seeds-snapshot-report.html", bundle.reportHtml);
  });
  printSnapshotBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle){
      setExportState(false);
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(bundle.reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&modal.classList.contains("is-open"))closeModal();
  });
  setExportState(Boolean(getExportBundle()));
})();

/* =========================================================
   Systems Map Insight Panel
   ========================================================= */

   (() => {
     "use strict";
   
     const nodes = Array.from(document.querySelectorAll(".cs-node"));
     if (!nodes.length) return;
   
   const kicker = document.getElementById("csInsightKicker");
   const title  = document.getElementById("csInsightTitle");
   const body   = document.getElementById("csInsightBody");
   const meta   = document.getElementById("csInsightMeta");
   const impactList = document.getElementById("impactList");
   const reset  = document.getElementById("csResetSystems");
   const statusItems = {
     network: document.getElementById("statusNetworkMini"),
     devices: document.getElementById("statusDevicesMini"),
     privacy: document.getElementById("statusPrivacyMini"),
     scams: document.getElementById("statusScamsMini"),
     wellbeing: document.getElementById("statusWellbeingMini")
   };
 
   const statusLabels = {
     network: "Network",
     devices: "Devices",
     privacy: "Privacy",
     scams: "Scams",
     wellbeing: "Wellbeing"
   };
   
   const defaults = {
     kicker: "Household view",
     title: "The invisible becomes visible",
     body: "Tap any system in the map to see what it means in daily life — calmly and proportionately.",
     impact: [
       "Every system shapes the others, so small shifts ripple gently across the home.",
       "The map keeps attention on connection rather than blame.",
       "You can start anywhere and still make progress."
     ],
     status: {
       network: "Steady",
       devices: "Steady",
       privacy: "Steady",
       scams: "Steady",
       wellbeing: "Steady"
     }
   };
   
   const insights = {
     network: {
       kicker: "Network lens",
       title: "Your Wi-Fi is the home’s circulation system",
       body: "Stable router settings quietly support everything else.",
       impact: [
         "Connectivity affects every device and shared routine.",
         "Router settings shape who can enter the household system.",
         "Small adjustments can reduce daily friction."
       ],
       status: {
         network: "In focus",
         devices: "Connected",
         privacy: "Connected",
         scams: "Connected",
         wellbeing: "Connected"
       }
     },
     devices: {
       kicker: "Devices lens",
       title: "Devices are the working organs",
       body: "Simple upkeep keeps daily life running smoothly.",
       impact: [
         "Updates and backups prevent sudden disruption.",
         "Healthy devices keep school, work, and play more stable.",
         "Maintenance reduces stress during busy weeks."
       ],
       status: {
         network: "Connected",
         devices: "In focus",
         privacy: "Connected",
         scams: "Connected",
         wellbeing: "Connected"
       }
     },
     privacy: {
       kicker: "Privacy lens",
       title: "Accounts form the immune system",
       body: "Strong boundaries prevent sudden loss or stress.",
       impact: [
         "Secure accounts protect everyone’s access and memories.",
         "Recovery routes keep the household resilient when things go wrong.",
         "Clear boundaries reduce confusion and urgency."
       ],
       status: {
         network: "Connected",
         devices: "Connected",
         privacy: "In focus",
         scams: "Connected",
         wellbeing: "Connected"
       }
     },
     scams: {
       kicker: "Scams lens",
       title: "Scams test the perimeter",
       body: "Calm verification routines prevent urgency from becoming damage.",
       impact: [
         "Pausing before action lowers pressure for everyone.",
         "Shared scripts make it easier to check suspicious messages.",
         "A calm response reduces ripple effects."
       ],
       status: {
         network: "Connected",
         devices: "Connected",
         privacy: "Connected",
         scams: "In focus",
         wellbeing: "Connected"
       }
     },
     wellbeing: {
       kicker: "Wellbeing lens",
       title: "Wellbeing keeps the system calm",
       body: "Small routines around screens and rest reduce friction at home.",
       impact: [
         "Screen rhythms shape mood, sleep, and attention.",
         "Shared expectations help everyone feel safer and calmer.",
         "Gentle limits keep the system sustainable."
       ],
       status: {
         network: "Connected",
         devices: "Connected",
         privacy: "Connected",
         scams: "Connected",
         wellbeing: "In focus"
       }
     }
   };

   function renderStatus(statuses){
     Object.entries(statusItems).forEach(([key, element]) => {
       if (!element) return;
       const value = statuses?.[key] || defaults.status[key] || "—";
       element.innerHTML = `<span class="status-label">${statusLabels[key]}</span><span class="status-value">${value}</span>`;
     });
   }

   function renderImpact(items){
     if (!impactList) return;
     impactList.innerHTML = "";
     (items || []).forEach(text => {
       const li = document.createElement("li");
       li.textContent = text;
       impactList.appendChild(li);
     });
   }
   
   function resetView(){
     nodes.forEach(n => n.classList.remove("is-active"));
     if (kicker) kicker.textContent = defaults.kicker;
     if (title)  title.textContent  = defaults.title;
     if (body)   body.textContent   = defaults.body;
     if (meta)   meta.hidden = true;
     renderStatus(defaults.status);
     renderImpact(defaults.impact);
   }
   
   function setInsight(key){
     const data = insights[key];
     if (!data) return;
   
       nodes.forEach(n =>
         n.classList.toggle("is-active", n.dataset.node === key)
       );
   
     if (kicker) kicker.textContent = data.kicker;
     if (title)  title.textContent  = data.title;
     if (body)   body.textContent   = data.body;
     if (meta)   meta.hidden = false;
     renderStatus(data.status);
     renderImpact(data.impact);
   }
   
   nodes.forEach(node => {
     node.addEventListener("click", () => {
       setInsight(node.dataset.node);
     });
 
     node.addEventListener("focus", () => {
       setInsight(node.dataset.node);
     });
 
     node.addEventListener("keydown", event => {
       if (event.key === "Enter" || event.key === " ") {
         event.preventDefault();
         setInsight(node.dataset.node);
       }
     });
   });
   
     reset?.addEventListener("click", resetView);
   
     resetView();
   })();




/* =========================================================
   Cyber Seeds — Lens Guidance Toggles
   Canon behaviour: closed by default
   ========================================================= */

   (() => {
     "use strict";
   
     const toggles = Array.from(document.querySelectorAll("[data-lens-toggle]"));
   
     function closeAll(exceptBtn = null){
       toggles.forEach(btn => {
         if (btn === exceptBtn) return;
         const id = btn.getAttribute("aria-controls");
         const panel = id && document.getElementById(id);
         btn.setAttribute("aria-expanded","false");
         if (panel) panel.hidden = true;
       });
     }
   
     toggles.forEach(btn => {
       const id = btn.getAttribute("aria-controls");
       const panel = id && document.getElementById(id);
   
       // hard reset
       btn.setAttribute("aria-expanded","false");
       if (panel) panel.hidden = true;
   
       btn.addEventListener("click", () => {
         const isOpen = btn.getAttribute("aria-expanded") === "true";
         closeAll(btn);
         btn.setAttribute("aria-expanded", String(!isOpen));
         if (panel) panel.hidden = isOpen;
       });
     });
   })();
