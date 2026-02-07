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

  // Guard to prevent duplicate event bindings when the modal script is reloaded.
  if (window.__CS_SNAPSHOT_BOUND__) return;
  window.__CS_SNAPSHOT_BOUND__ = true;

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
  const compareSelect = $("#snapshotCompareSelect");
  const compareOutput = $("#snapshotCompareOutput");
  const downloadPassportBtn = $("#downloadPassport");
  const downloadSummaryBtn = $("#downloadSummary");
  const printSnapshotBtn = $("#printSnapshot");
  const downloadSnapshotHtmlBtn = $("#downloadSnapshotHtml");

  if (!modal||!panel||!form||!nextBtn||!backBtn) return;

  let step=-1, QUESTIONS=[], seedForge=null;
  const answers={};
  const SNAP_KEY="cyberseeds_snapshot_v3";
  const HISTORY_KEY="cyberseeds_snapshots_v1";
  const PASSPORT_KEY="cyberseeds_digital_passport_v1";
  const SNAPSHOT_LAST_KEY="cyberseeds_snapshot_last";

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];
  const LENS_LABELS={
    network:"Network",
    devices:"Devices",
    privacy:"Accounts & Privacy",
    scams:"Scams & Messages",
    wellbeing:"Children & Wellbeing"
  };

  const safeSet=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
  const safeGet=k=>{try{return localStorage.getItem(k);}catch{} return null;};
  const safeRemove=k=>{try{localStorage.removeItem(k);}catch{}};

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const formatDate = (ts) => {
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
  };

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadHistory(){
    const raw = safeGet(HISTORY_KEY);
    const parsed = safeParse(raw, []);
    const list = Array.isArray(parsed) ? parsed : [];
    const normalized = list.map(coerceHistoryEntry).filter(Boolean);
    if (normalized.length && JSON.stringify(normalized) !== JSON.stringify(list)){
      saveHistory(normalized);
    }
    return normalized;
  }

  function saveHistory(history){
    safeSet(HISTORY_KEY, JSON.stringify(history));
  }

  function buildPassport(history){
    return {
      schema: "cs.digital.passport.v1",
      updated_at: new Date().toISOString(),
      snapshots: history.map(entry => ({
        id: entry.id,
        snapshot_id: entry.snapshotId,
        saved_at: new Date(entry.ts).toISOString(),
        totalScore: Math.round(entry.totalScore ?? entry.hdss ?? 0),
        focus: entry.focus,
        strongest: entry.strongest,
        weakest: entry.weakest,
        lensPercents: entry.perLens || entry.lensPercents || {},
        patterns: entry.patterns || [],
        strengths: entry.strengths || [],
        phasePlan: entry.phasePlan || [],
        signal: entry.signal || null,
        trajectory: entry.trajectory || null
      }))
    };
  }

  function sanitizeLensPercents(input){
    const data = input && typeof input === "object" ? input : {};
    return Object.fromEntries(LENS_ORDER.map(l => [l, Math.round(Number(data[l] ?? 0))]));
  }

  function coerceHistoryEntry(entry){
    if (!entry || typeof entry !== "object") return null;
    const ts = entry.ts ?? entry.timestamp ?? (entry.date ? new Date(entry.date).getTime() : null) ?? Date.now();
    const totalScore = Math.round(entry.totalScore ?? entry.hdss ?? entry.total ?? 0);
    const perLens = sanitizeLensPercents(entry.perLens || entry.lensPercents || entry.lenses);
    return {
      ...entry,
      id: entry.id || `${entry.snapshotId || entry.snapshot_id || stableHash(entry)}-${ts}`,
      ts,
      totalScore,
      perLens,
      lensPercents: entry.lensPercents || perLens,
      hdss: entry.hdss ?? totalScore,
      patterns: Array.isArray(entry.patterns) ? entry.patterns : [],
      strengths: Array.isArray(entry.strengths) ? entry.strengths : [],
      phasePlan: Array.isArray(entry.phasePlan) ? entry.phasePlan : []
    };
  }

  function isCanonicalSnapshot(snapshot){
    return snapshot
      && typeof snapshot === "object"
      && snapshot.id
      && snapshot.timestamp
      && typeof snapshot.total === "number"
      && snapshot.lenses;
  }

  function buildSignal(totalScore, trajectoryLabel, lensPercents){
    const total = Math.round(totalScore ?? 0);
    let overall = "STABLE";
    if (total >= 80) overall = "STRONG";
    else if (total >= 60) overall = "STABLE";
    else if (total >= 40) overall = "FRAGILE";
    else overall = "STRAINED";

    const lowest = Math.min(...LENS_ORDER.map(l => lensPercents[l] ?? 0));
    const riskPressure = lowest < 45 || total < 45 ? "High" : lowest < 65 || total < 60 ? "Medium" : "Low";
    const resilienceIndex = total >= 75 ? "Growing" : total >= 55 ? "Flat" : "Weak";
    const summary = {
      STRONG: "Strong foundations are visible. Keep routines steady and build gently.",
      STABLE: "A steady base with clear opportunities to strengthen.",
      FRAGILE: "Some protections are in place, but a few gaps may feel heavy.",
      STRAINED: "The household is carrying a lot right now. Small, calm steps will help."
    }[overall];

    return {
      overall,
      score: total,
      trajectory: trajectoryLabel,
      riskPressure,
      resilienceIndex,
      summary
    };
  }

  function buildTrajectory(currentScore, previousScore){
    if (previousScore == null) return { label: "Stable", diff: 0, change: "No earlier snapshot yet." };
    const diff = Math.round(currentScore - previousScore);
    if (diff >= 4) return { label: "Improving", diff, change: `Up ${diff} points since the last snapshot.` };
    if (diff <= -4) return { label: "Declining", diff, change: `Down ${Math.abs(diff)} points since the last snapshot.` };
    return { label: "Stable", diff, change: "Holding steady since the last snapshot." };
  }

  const PATTERN_RULES = [
    {
      id: "passive-exposure-loop",
      title: "Passive Exposure Loop",
      when: lens => lens.network < 55 && lens.scams < 55,
      explanation: "When the network and scam layers are both low, pressure can reach the household unnoticed.",
      why: "A small pause-and-check routine reduces incoming strain quickly."
    },
    {
      id: "update-delay-risk",
      title: "Update Delay Risk",
      when: lens => lens.devices < 55,
      explanation: "Devices may be running behind on small maintenance.",
      why: "Fresh updates prevent quiet issues from stacking up."
    },
    {
      id: "boundary-drift",
      title: "Boundary Drift",
      when: lens => lens.privacy < 55,
      explanation: "Account boundaries may be too relaxed to feel dependable.",
      why: "Reinforcing recovery and sign-in steps builds calm control."
    },
    {
      id: "device-sprawl",
      title: "Device Sprawl",
      when: lens => lens.devices < 50 && lens.network < 60,
      explanation: "More devices than the network can comfortably manage.",
      why: "A short inventory makes the rest of the household feel lighter."
    },
    {
      id: "recovery-fragility",
      title: "Recovery Fragility",
      when: lens => lens.privacy < 50 || lens.wellbeing < 50,
      explanation: "Recovery paths may feel uncertain if something unexpected happens.",
      why: "Simple recovery checks prevent stress during pressured moments."
    }
  ];

  function detectPatterns(lensPercents){
    const lens = sanitizeLensPercents(lensPercents);
    return PATTERN_RULES.filter(rule => rule.when(lens)).map(rule => ({
      id: rule.id,
      title: rule.title,
      explanation: rule.explanation,
      why: rule.why
    }));
  }

  function buildStrengths(lensPercents){
    const sorted = LENS_ORDER.map(l => [l, lensPercents[l] ?? 0])
      .sort((a,b)=>b[1]-a[1])
      .slice(0,2);
    return sorted.map(([lens, value]) => ({
      lens,
      label: LENS_LABELS[lens] || lens,
      value: Math.round(value)
    }));
  }

  const PHASE_LIBRARY = {
    network: {
      stabilise: "Check who has access to the router and save the login details somewhere safe.",
      harden: "Separate guest access so household devices stay on the main network.",
      grow: "Add a gentle monthly check-in for firmware updates."
    },
    devices: {
      stabilise: "Pick one device to update today and turn on automatic updates.",
      harden: "Enable screen locks and backups on the most-used devices.",
      grow: "Set a reminder to refresh devices and remove old ones every 3 months."
    },
    privacy: {
      stabilise: "Secure the main email account with two-step verification.",
      harden: "Check recovery options so the household can regain access calmly.",
      grow: "Review shared accounts and reduce unnecessary logins."
    },
    scams: {
      stabilise: "Agree one family rule: pause and double-check unexpected requests.",
      harden: "Add trusted contacts or payment checks for higher-risk moments.",
      grow: "Share one calm scam update with the household each month."
    },
    wellbeing: {
      stabilise: "Make one quiet digital boundary for rest or homework time.",
      harden: "Set shared routines around device-free moments.",
      grow: "Review screen routines together every term."
    }
  };

  function buildPhasePlan(lensPercents){
    const lensList = LENS_ORDER.map(l => [l, lensPercents[l] ?? 0]).sort((a,b)=>a[1]-b[1]);
    const focusLenses = lensList.slice(0,2).map(([l])=>l);
    const pickLine = (lens, key) => PHASE_LIBRARY[lens]?.[key];
    return [
      { phase: "Phase 1 (7 days) — Stabilise", actions: focusLenses.map(l => pickLine(l, "stabilise")).filter(Boolean) },
      { phase: "Phase 2 (30 days) — Harden", actions: focusLenses.map(l => pickLine(l, "harden")).filter(Boolean) },
      { phase: "Phase 3 (90 days) — Grow", actions: focusLenses.map(l => pickLine(l, "grow")).filter(Boolean) }
    ];
  }

  function buildPlainSummary(snapshot, strengths, patterns, phasePlan, trajectory){
    const lensLines = LENS_ORDER.map(l => `${LENS_LABELS[l]}: ${Math.round(snapshot.lenses[l] ?? 0)}%`).join(", ");
    const strengthText = strengths.length
      ? strengths.map(s => s.label).join(" and ")
      : "steady foundations";
    const patternText = patterns.length
      ? patterns.map(p => p.title).join(", ")
      : "no strong patterns detected";
    const phaseText = phasePlan.map(p => `${p.phase}: ${p.actions.join(" ")}`).join(" ");
    return [
      `Household Signal: ${snapshot.signal.overall} (${snapshot.signal.score}/100).`,
      `Trajectory: ${trajectory.label}.`,
      `Lens summary: ${lensLines}.`,
      `Strengths: ${strengthText}.`,
      `Patterns: ${patternText}.`,
      `Priority pathways: ${phaseText}`
    ].join(" ");
  }

  const LEGACY_SNAPSHOT_KEYS = [
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
      id: raw.id || `${raw.snapshotId || stableHash(raw)}-${timestamp}`,
      timestamp,
      total,
      lenses,
      patterns,
      strengths,
      phasePlan,
      signal,
      trajectory,
      snapshotId: raw.snapshotId,
      lensPercents: raw.lensPercents || lenses,
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

  function downloadText(filename, content){
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

    return {
      snapshot,
      strengths,
      patterns,
      phasePlan,
      trajectory,
      plainSummary: buildPlainSummary(snapshot, strengths, patterns, phasePlan, trajectory),
      reportHtml: buildReportHtml(snapshot, strengths, patterns, phasePlan, trajectory)
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
    step=-1;
    Object.keys(answers).forEach(k=>delete answers[k]);
    form.innerHTML="";
    result.hidden=true;
    result.classList.remove("reveal");
    nextBtn.textContent="Begin";
    backBtn.disabled=true;
    nextBtn.disabled=false;
    nextBtn.style.display="";
    backBtn.style.display="";
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
        const now = Math.round(currentEntry.perLens?.[lens] ?? currentEntry.lensPercents?.[lens] ?? 0);
        const then = Math.round(selected.perLens?.[lens] ?? selected.lensPercents?.[lens] ?? 0);
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
    nextBtn.disabled=!Number.isInteger(answers[q.id]);
    backBtn.disabled=step===0;

    $$("input",form).forEach(r=>{
      if (Number(r.value) === answers[q.id]) r.checked = true;
      r.addEventListener("change",()=>{
        answers[q.id]=Number(r.value);
        nextBtn.disabled=!Number.isInteger(answers[q.id]);
      });
    });
  }

    function finish(){

     if (!QUESTIONS.length) return;
   
     const lastIndex = QUESTIONS.length - 1;
     const current = QUESTIONS[Math.min(step, lastIndex)];
   
     if (!current || !Number.isInteger(answers[current.id])){
       nextBtn.disabled = true;
       return;
     }
   
     const scored = seedForge.scoreAnswers(answers);
   
     const focusLabel = LENS_LABELS[scored.focus];
     const strongestLabel = LENS_LABELS[scored.strongest];
     const weakestLabel = LENS_LABELS[scored.weakest];
   
     const rationale = seedForge.buildRationale(scored.focus,answers);
     const seed = seedForge.seedsForLens(scored.focus)[0]||null;
   
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
   }

   function renderSnapshotResults(data){

  const {
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
  } = data;

  $("#resultHeadline").textContent =
    `Best place to start: ${focusLabel}.`;

  $("#resultStage").textContent =
    `Overall signal: ${scored.stage.label} — ${scored.stage.message}`;

  $("#strongestLens").textContent = strongestLabel;
  $("#weakestLens").textContent = weakestLabel;

  $("#resultRationale").textContent =
    rationale || `Focus on ${focusLabel}.`;

  renderLensMap(lensPercents);
  renderLensDetails(lensPercents);
  renderStrengths(strengths);
  renderPatterns(patterns);
  renderPhasePlan(phasePlan);

  $("#signalOverall").textContent = signal.overall;
  $("#signalSummary").textContent = signal.summary;
  $("#signalScore").textContent = `${signal.score}/100`;
  $("#signalTrajectory").textContent = signal.trajectory;
  $("#signalRisk").textContent = signal.riskPressure;
  $("#signalResilience").textContent = signal.resilienceIndex;
  $("#signalChange").textContent = trajectory.change;

  $("#resultSeedTitle").textContent =
    seed?.title || "Your next Digital Seed";

  $("#resultSeedToday").textContent =
    seed?.today || " ";

  $("#resultSeedWeek").textContent = seed?.this_week || " ";
  $("#resultSeedMonth").textContent = seed?.this_month || " ";


  const timestamp = Date.now();

  const entry = {
    id: `${scored.snapshotId}-${timestamp}`,
    ts: timestamp,
    date: new Date(timestamp).toISOString(),

    snapshotId: scored.snapshotId,

    ...scored,

    seed,
    totalScore: scored.hdss,
    perLens: lensPercents,

    patterns,
    strengths,
    phasePlan,
    signal,
    trajectory
  };


  const canonical = coerceSnapshot(entry, history);

  if (canonical){
    safeSet(SNAP_KEY, JSON.stringify(canonical));
    safeSet(SNAPSHOT_LAST_KEY, canonical.id);
  }

  history.unshift(entry);

  saveHistory(history.slice(0,24));

  safeSet(
    PASSPORT_KEY,
    JSON.stringify(buildPassport(history.slice(0,24)))
  );

  renderComparison(entry);
  renderHistorySection(history, entry);


  result.hidden = false;
  result.classList.add("reveal");

  nextBtn.style.display = "none";
  backBtn.style.display = "none";
}


    const patterns = detectPatterns(lensPercents);
    const strengths = buildStrengths(lensPercents);
    const phasePlan = buildPhasePlan(lensPercents);

    const headlineEl = $("#resultHeadline");
    const stageEl = $("#resultStage");
    const strongestEl = $("#strongestLens");
    const weakestEl = $("#weakestLens");
    const rationaleEl = $("#resultRationale");
    const seedTitleEl = $("#resultSeedTitle");
    const seedTodayEl = $("#resultSeedToday");
    const seedWeekEl = $("#resultSeedWeek");
    const seedMonthEl = $("#resultSeedMonth");
    const signalOverallEl = $("#signalOverall");
    const signalSummaryEl = $("#signalSummary");
    const signalScoreEl = $("#signalScore");
    const signalTrajectoryEl = $("#signalTrajectory");
    const signalRiskEl = $("#signalRisk");
    const signalResilienceEl = $("#signalResilience");
    const signalChangeEl = $("#signalChange");

    if (headlineEl) headlineEl.textContent = `Best place to start: ${focusLabel}.`;
    if (stageEl) stageEl.textContent = `Overall signal: ${scored.stage.label} — ${scored.stage.message}`;
    if (strongestEl) strongestEl.textContent = strongestLabel;
    if (weakestEl) weakestEl.textContent = weakestLabel;
    if (rationaleEl) rationaleEl.textContent = rationale || `Focus on ${focusLabel} for the fastest, calmest improvement.`;

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

    if (signalOverallEl) signalOverallEl.textContent = signal.overall;
    if (signalSummaryEl) signalSummaryEl.textContent = signal.summary;
     const systemSummaryEl = document.getElementById("systemSummary");
     if (systemSummaryEl){
       systemSummaryEl.textContent = generateSystemSummary(snapshotForSummary);
     }
   
    if (signalScoreEl) signalScoreEl.textContent = `${signal.score}/100`;
    if (signalTrajectoryEl) signalTrajectoryEl.textContent = signal.trajectory;
    if (signalRiskEl) signalRiskEl.textContent = signal.riskPressure;
    if (signalResilienceEl) signalResilienceEl.textContent = signal.resilienceIndex;
    if (signalChangeEl) signalChangeEl.textContent = trajectory.change;

    renderLensMap(lensPercents);
    renderLensDetails(lensPercents);
    renderStrengths(strengths);
    renderPatterns(patterns);
    renderPhasePlan(phasePlan);

    if (seedTitleEl) seedTitleEl.textContent = seed?.title || "Your next Digital Seed";
    if (seedTodayEl) seedTodayEl.textContent = seed?.today || "Complete your snapshot to receive a clear next step.";
    if (seedWeekEl) seedWeekEl.textContent = seed?.this_week || " ";
    if (seedMonthEl) seedMonthEl.textContent = seed?.this_month || " ";

    const timestamp = Date.now();
    const entry = {
      id: `${scored.snapshotId}-${timestamp}`,
      ts: timestamp,
      date: new Date(timestamp).toISOString(),
      snapshotId: scored.snapshotId,
      answers: { ...answers },
      ...scored,
      seed,
      totalScore: scored.hdss,
      perLens: lensPercents,
      patterns,
      strengths,
      phasePlan,
      signal,
      trajectory
    };

    const canonicalSnapshot = coerceSnapshot(entry, history);
    if (canonicalSnapshot){
      safeSet(SNAP_KEY, JSON.stringify(canonicalSnapshot));
      safeSet(SNAPSHOT_LAST_KEY, canonicalSnapshot.id);
    }
    history.unshift(entry);
    saveHistory(history.slice(0, 24));
    safeSet(PASSPORT_KEY, JSON.stringify(buildPassport(history.slice(0, 24))));
    renderComparison(entry);
    renderHistorySection(history, entry);

    result.hidden=false;
    result.classList.add("reveal");
    nextBtn.style.display="none";
    backBtn.style.display="none";
  }

  migrateLegacySnapshot();

  nextBtn.addEventListener("click",async()=>{

     if(step < 0){
       await ensureReady();
       step = 0;
       renderQuestion();
       return;
     }
   
     const lastIndex = QUESTIONS.length - 1;
     const current = QUESTIONS[Math.min(step, lastIndex)];
   
     if (!current || !Number.isInteger(answers[current.id])){
       nextBtn.disabled = true;
       return;
     }
   
     if(step >= lastIndex){
       finish();
       return;
     }
   
     step++;
     renderQuestion();
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
  resetBtn?.addEventListener("click",()=>{
    safeRemove(SNAP_KEY);
    safeRemove(HISTORY_KEY);
    safeRemove(PASSPORT_KEY);
    safeRemove(SNAPSHOT_LAST_KEY);
    resetFlow();
    renderIntro();
  });
  $("#retakeSnapshot")?.addEventListener("click", () => {
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
    downloadJSON("cyber-seeds-digital-passport.json", passport);
  });
  downloadSummaryBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle) return;
    downloadText("cyber-seeds-snapshot-summary.txt", bundle.plainSummary);
  });
  downloadSnapshotHtmlBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle) return;
    downloadHtml("cyber-seeds-snapshot-report.html", bundle.reportHtml);
  });
  printSnapshotBtn?.addEventListener("click", () => {
    const bundle = getExportBundle();
    if (!bundle) return;
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
