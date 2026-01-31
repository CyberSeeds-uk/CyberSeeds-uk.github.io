/* =========================================================
   Cyber Seeds — SeedForge + Snapshot Engine (V2+)
   - Config-driven questions from generated/questions.json
   - V2 scoring immediately (lens 0..20, HDSS 0..100, bands)
   - Cyber Seeds tone + insight upgrades
   - Progress View: Baseline vs Follow-Up lens graph
   - Works on / and subpages like /resources/
   - iOS Safari friendly (no-store fetch, localStorage guards)
   ========================================================= */

/* =========================================================
   SeedForge Runtime (loads generated/*.json + scoring helpers)
   ========================================================= */
window.CSSeedForge = (() => {
  const FILES = {
    manifest: "manifest.json",
    questions: "questions.json",
    scoring: "scoring.json",
    seeds: "seeds.json",
  };

  // Works on:
  // - custom domain at site root: /generated/...
  // - GitHub Pages repo path: ./generated or ../generated
  const BASE_CANDIDATES = [
    "/generated",
    "generated",
    "./generated",
    "../generated",
    "../../generated",
  ];

  let _cache = null;
  let _base = null;

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`SeedForge fetch failed: ${url} (${res.status})`);
    return await res.json();
  }

  async function detectBase() {
    if (_base) return _base;

    const stamp = Date.now();
    for (const base of BASE_CANDIDATES) {
      const url = `${base}/${FILES.manifest}?v=${stamp}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          _base = base;
          return _base;
        }
      } catch {
        // keep trying
      }
    }

    _base = "/generated";
    return _base;
  }

  async function load() {
    if (_cache) return _cache;

    const base = await detectBase();

    let manifest = null;
    try {
      manifest = await fetchJson(`${base}/${FILES.manifest}?v=${Date.now()}`);
    } catch {
      manifest = { built_at: String(Date.now()) };
    }

    const v = encodeURIComponent(manifest.built_at || Date.now());

    const [questions, scoring, seeds] = await Promise.all([
      fetchJson(`${base}/${FILES.questions}?v=${v}`),
      fetchJson(`${base}/${FILES.scoring}?v=${v}`),
      fetchJson(`${base}/${FILES.seeds}?v=${v}`),
    ]);

    _cache = { manifest, questions, scoring, seeds, base };
    window.__CS_SEEDFORGE__ = _cache; // debug handle
    return _cache;
  }

  function normalizeLens(lens) {
    const s = String(lens || "").toLowerCase().trim();
    if (s.startsWith("net")) return "network";
    if (s.startsWith("dev")) return "devices";
    if (s.startsWith("pri")) return "privacy";
    if (s.startsWith("sca")) return "scams";
    if (s.startsWith("wel")) return "wellbeing";
    return s;
  }

  function stageFor(hdss, scoring) {
    const bands = (scoring && scoring.bands) || [];
    for (const b of bands) {
      if (hdss >= b.min && hdss <= b.max) return b;
    }
    return { min: 0, max: 100, label: "Snapshot" };
  }

  /**
   * V2 scoring:
   * - answers[qid] is option index (number) for single
   * - answers[qid] is array of option indices for multi
   * Each option contains points 0..20
   */
  function scoreAnswers(answers, questionsYaml, scoringYaml) {
    const questions = (questionsYaml && questionsYaml.questions) || [];
    const lensBuckets = { network: [], devices: [], privacy: [], scams: [], wellbeing: [] };

    for (const q of questions) {
      const qid = q.id;
      const lens = normalizeLens(q.lens);
      const raw = answers ? answers[qid] : null;

      if (!lensBuckets[lens]) continue;

      if (typeof raw === "number") {
        const opt = q.options && q.options[raw];
        const pts = opt && typeof opt.points === "number" ? opt.points : 0;
        lensBuckets[lens].push(pts);
        continue;
      }

      if (Array.isArray(raw)) {
        for (const idx of raw) {
          const opt = q.options && q.options[idx];
          const pts = opt && typeof opt.points === "number" ? opt.points : 0;
          lensBuckets[lens].push(pts);
        }
        continue;
      }

      // unanswered
      lensBuckets[lens].push(0);
    }

    // Lens score = round(average points) clamped 0..20
    const lensScores = {};
    for (const lens of Object.keys(lensBuckets)) {
      const arr = lensBuckets[lens];
      const avg = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      lensScores[lens] = Math.max(0, Math.min(20, Math.round(avg)));
    }

    // HDSS = sum of 5 lenses (0..100)
    const hdss =
      lensScores.network +
      lensScores.devices +
      lensScores.privacy +
      lensScores.scams +
      lensScores.wellbeing;

    const entries = Object.entries(lensScores).sort((a, b) => b[1] - a[1]);
    const strongest = entries[0] ? entries[0][0] : "network";
    const weakest = entries[entries.length - 1] ? entries[entries.length - 1][0] : "network";

    return {
      lensScores,
      hdss,
      stage: stageFor(hdss, scoringYaml),
      strongest,
      weakest,
    };
  }

  function seedsForLens(lens, seedsYaml) {
    const key = normalizeLens(lens);
    const all = (seedsYaml && seedsYaml.seeds) || [];
    return all.filter(s => normalizeLens(s.lens) === key);
  }

  return { load, scoreAnswers, seedsForLens, normalizeLens, stageFor };
})();

/* =========================================================
   App + Snapshot Modal (Cyber Seeds upgrades + progress view)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ----------------- Inject Cyber Seeds UI Styles (no CSS edits needed) ----------------- */
  function injectV2Styles() {
    if (document.getElementById("cs-v2-style")) return;

    const css = `
      /* ===== Cyber Seeds V2 UI Layer ===== */
      .cs-chip{
        display:inline-flex;align-items:center;gap:.4rem;
        padding:.22rem .62rem;border-radius:999px;
        background:rgba(232,246,245,.95);
        border:1px solid rgba(207,227,224,.9);
        color:#1a6a5d;font-weight:700;font-size:.85rem;
        white-space:nowrap;
      }
      .cs-chip b{ color:#0f2f2a; font-weight:800; }
      .cs-card{
        background:linear-gradient(180deg,#f6fbfa,#eef7f6);
        border:1px solid #cfe3e0;
        box-shadow:0 10px 24px rgba(20,32,30,.06);
        border-radius:16px;
      }
      .cs-divider{ height:1px;background:#dfecea;margin:.9rem 0; }
      .cs-mini{ font-size:.9rem; color:#51615f; }
      .cs-title{ color:#0f2f2a; font-weight:900; }
      .cs-soft{ color:#51615f; }
      .cs-eco{
        font-size:.95rem;
        color:#51615f;
        margin:.25rem 0 0 0;
      }
      .cs-seed-title{
        display:flex;align-items:center;gap:.5rem;
        font-weight:900;color:#0f2f2a;margin:0 0 .4rem 0;
      }
      .cs-seed-title .sprout{
        width:26px;height:26px;border-radius:10px;
        display:grid;place-items:center;
        background:#e8f6f5;border:1px solid #cfe3e0;
      }
      .cs-seed-list{ margin:.35rem 0 0 0; padding-left:1.2rem; }
      .cs-seed-list li{ margin:.25rem 0; }
      .cs-signal{
        padding:1rem;
      }
      .cs-signal h3{ margin:.15rem 0 .35rem 0; }
      .cs-signal p{ margin:.25rem 0; }
      .cs-progress{
        margin-top:1rem;
        padding:1rem;
      }
      .cs-progress h4{ margin:0 0 .5rem 0; }
      .cs-progress-grid{
        display:grid; gap:.65rem;
      }
      .cs-row{
        display:grid;
        grid-template-columns: 110px 1fr;
        gap:.75rem;
        align-items:center;
      }
      .cs-row .label{
        font-weight:800;color:#0f2f2a;font-size:.92rem;
      }
      .cs-bars{
        display:grid; gap:.35rem;
      }
      .cs-bar-wrap{
        display:flex; align-items:center; gap:.6rem;
      }
      .cs-bar-track{
        flex:1;
        height:10px;
        border-radius:999px;
        background:#edf4f3;
        border:1px solid #dfecea;
        overflow:hidden;
      }
      .cs-bar-fill{
        height:100%;
        width:0%;
        border-radius:999px;
        background:linear-gradient(90deg,#1a6a5d,#0f2f2a);
        opacity:.9;
      }
      .cs-bar-meta{
        min-width:74px;
        text-align:right;
        font-variant-numeric: tabular-nums;
        color:#51615f;
        font-size:.9rem;
        font-weight:700;
      }
      .cs-delta{
        display:inline-flex;align-items:center;gap:.35rem;
        margin-left:.5rem;
        padding:.12rem .48rem;border-radius:999px;
        border:1px solid #dfecea;
        background:#fff;
        font-size:.82rem;
        font-weight:800;
        color:#0f2f2a;
      }
      .cs-delta.positive{ border-color:#cfe3e0; background:#f6fbfa; }
      .cs-delta.negative{ border-color:#edd7d7; background:#fff7f7; }
      .cs-actions{
        display:flex; flex-wrap:wrap; gap:.5rem;
        margin:.75rem 0 0 0;
      }
      .cs-actions .btn{
        display:inline-flex; align-items:center; gap:.45rem;
      }
      .cs-actions .btn small{ opacity:.85; font-weight:700; }
      .cs-note{
        margin-top:.65rem;
        padding:.75rem .9rem;
        border-radius:14px;
        background:#ffffff;
        border:1px solid #dfecea;
        color:#51615f;
        font-size:.93rem;
      }
    `;

    const style = document.createElement("style");
    style.id = "cs-v2-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ----------------- Year ----------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ----------------- Storage ----------------- */
  const STORE_V2 = "cyberseeds_snapshot_v2";
  const STORE_V1 = "cyberseeds_snapshot_v1"; // mirror for compatibility
  const BASELINE_V2 = "cyberseeds_snapshot_baseline_v2";

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }

  function saveSnapshotV2(payload) {
    return safeSet(STORE_V2, JSON.stringify(payload));
  }
  function loadSnapshotV2() {
    const raw = safeGet(STORE_V2);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  function saveBaselineV2(payload) {
    return safeSet(BASELINE_V2, JSON.stringify(payload));
  }
  function loadBaselineV2() {
    const raw = safeGet(BASELINE_V2);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // Mirror a minimal v1 shape so existing pages don’t break
  function mirrorSnapshotToV1(v2) {
    const v1 = {
      ts: v2.ts,
      stage: v2.stage,
      hdss: v2.hdss,
      scores: v2.lensScores,
      strongest: v2.strongest,
      weakest: v2.weakest,
      seed: v2.seed ? { title: v2.seed.title, lens: v2.seed.lens } : null
    };
    safeSet(STORE_V1, JSON.stringify(v1));
  }

  function revealResourcesButtonIfSnapshotExists() {
    const btn = $("#goToResources");
    if (!btn) return;

    const raw2 = safeGet(STORE_V2);
    const raw1 = safeGet(STORE_V1);
    try {
      const data = raw2 ? JSON.parse(raw2) : (raw1 ? JSON.parse(raw1) : null);
      if (data && (data.stage || data.hdss != null)) {
        btn.style.display = "inline-flex";
      }
    } catch {}
  }

  document.addEventListener("cyberseeds:snapshot-complete", () => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });

  document.addEventListener("DOMContentLoaded", () => {
    injectV2Styles();

    CSSeedForge.load().catch(err => {
      console.warn("SeedForge failed to load.", err);
    });

    revealResourcesButtonIfSnapshotExists();
  });

  /* ----------------- Lens meta + Cyber Seeds micro-insights ----------------- */
  const LENS_META = {
    network:   { title: "Home Wi-Fi", purpose: "The digital front door" },
    devices:   { title: "Devices", purpose: "What connects to the home" },
    privacy:   { title: "Accounts & Privacy", purpose: "What protects everything else" },
    scams:     { title: "Scams & Messages", purpose: "How your home handles pressure" },
    wellbeing: { title: "Children & Wellbeing", purpose: "Calm boundaries that actually stick" },
  };

  const LENS_INSIGHT = {
    network:   "Your network lens reflects how protected your home’s digital front door is.",
    devices:   "Your device lens reflects how safely everyday devices are configured and maintained.",
    privacy:   "Your privacy lens reflects how well your core accounts protect everything else.",
    scams:     "Your scams lens reflects how your household responds to pressure and deception.",
    wellbeing: "Your wellbeing lens reflects how digital life supports — not harms — sleep and attention."
  };

  const LENS_WHY = {
    network:   "If the network is open, every device inherits the risk.",
    devices:   "If devices drift, protections quietly decay over time.",
    privacy:   "If core accounts fall, everything connected can follow.",
    scams:     "Most real-world losses begin with a single pressured click.",
    wellbeing: "Tired brains make faster mistakes — protection includes rest."
  };

  function lensName(lens) {
    return (LENS_META[lens] && LENS_META[lens].title) ? LENS_META[lens].title : String(lens);
  }

  /* ----------------- Modal Elements ----------------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn = $("#closeSnapshot");

  if (!modal || !form || !nextBtn || !backBtn) return;

  /* ----------------- State ----------------- */
  let step = -1;               // -1 intro, 0..n-1 questions
  let sf = null;               // SeedForge loaded bundle
  let QUESTIONS = [];          // questions array
  const answers = {};          // { [qid]: index | indices[] }

  function resetState() {
    step = -1;
    for (const k of Object.keys(answers)) delete answers[k];
    nextBtn.style.display = "";
    backBtn.style.display = "";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
  }

  async function ensureSeedForgeReady() {
    if (sf && QUESTIONS.length) return;
    sf = await CSSeedForge.load();
    QUESTIONS = (sf.questions && sf.questions.questions) ? sf.questions.questions : [];
    if (!Array.isArray(QUESTIONS) || !QUESTIONS.length) {
      throw new Error("SeedForge questions missing or empty.");
    }
  }

  /* ----------------- Rendering: intro/question ----------------- */
  function renderIntro() {
    form.innerHTML = `
      <p class="muted">
        This is a calm check-in — not a test.
        You’re mapping your household ecosystem, not being judged.
      </p>
      <p class="muted">
        You’ll get a clear signal, one “Digital Seed”, and next steps you can actually do.
      </p>
    `;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
  }

  function isAnswered(q) {
    const v = answers[q.id];
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    return typeof v === "number";
  }

  function updateChoiceStyles() {
    $$(".choice", form).forEach(c => c.classList.remove("is-selected"));
    $$("input:checked", form).forEach(i => i.closest(".choice")?.classList.add("is-selected"));
  }

  function applySavedSelections(q) {
    if (!q) return;

    if (q.type === "multi") {
      const selected = Array.isArray(answers[q.id]) ? answers[q.id] : [];
      $$("input[type=checkbox]", form).forEach(cb => {
        const idx = Number(cb.dataset.i);
        cb.checked = selected.includes(idx);
      });
    } else {
      const selectedIdx = typeof answers[q.id] === "number" ? answers[q.id] : null;
      $$("input[type=radio]", form).forEach(r => {
        r.checked = selectedIdx != null && Number(r.value) === selectedIdx;
      });
    }

    updateChoiceStyles();
    nextBtn.disabled = !isAnswered(q);
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    if (!q) return;

    const lens = CSSeedForge.normalizeLens(q.lens);
    const meta = LENS_META[lens] || { title: lens, purpose: "" };

    if (q.type === "multi") {
      if (!Array.isArray(answers[q.id])) answers[q.id] = [];
    } else {
      if (typeof answers[q.id] !== "number") answers[q.id] = null;
    }

    const stepLabel = `Question ${step + 1} of ${QUESTIONS.length}`;
    const lensInsight = LENS_INSIGHT[lens] || "";

    let html = `
      <div class="snapshot-step">
        <p class="muted" style="margin:0 0 .45rem 0;">${escapeHtml(stepLabel)}</p>

        <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.15rem 0 .25rem 0;">
          <span class="cs-chip"><b>Lens</b> ${escapeHtml(meta.title)}</span>
          ${meta.purpose ? `<span class="cs-chip"><b>Meaning</b> ${escapeHtml(meta.purpose)}</span>` : ""}
        </div>

        ${lensInsight ? `<p class="cs-eco">${escapeHtml(lensInsight)}</p>` : ""}

        <div class="cs-divider"></div>

        <p style="margin:.15rem 0 .65rem 0;"><strong>${escapeHtml(q.prompt || "")}</strong></p>

        <div class="choices">
    `;

    if (q.type === "multi") {
      (q.options || []).forEach((opt, i) => {
        html += `
          <label class="choice">
            <input type="checkbox" data-i="${i}">
            <span>${escapeHtml(opt.label || "")}</span>
          </label>
        `;
      });
    } else {
      (q.options || []).forEach((opt, i) => {
        html += `
          <label class="choice">
            <input type="radio" name="q_${escapeAttr(q.id)}" value="${i}">
            <span>${escapeHtml(opt.label || "")}</span>
          </label>
        `;
      });
    }

    html += `
        </div>

        <p class="muted" style="margin:.8rem 0 0 0;">
          Tip: “Not sure” is a valid answer — it’s part of the signal.
        </p>
      </div>
    `;

    form.innerHTML = html;

    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    backBtn.disabled = (step === 0);
    nextBtn.disabled = true;

    bindInputs(q);
    applySavedSelections(q);
  }

  function bindInputs(q) {
    if (q.type === "multi") {
      $$("input[type=checkbox]", form).forEach(cb => {
        cb.addEventListener("change", () => {
          const idx = Number(cb.dataset.i);
          const arr = Array.isArray(answers[q.id]) ? answers[q.id] : [];

          if (cb.checked && !arr.includes(idx)) arr.push(idx);
          if (!cb.checked) answers[q.id] = arr.filter(v => v !== idx);

          nextBtn.disabled = !isAnswered(q);
          updateChoiceStyles();
        });
      });
    } else {
      $$("input[type=radio]", form).forEach(r => {
        r.addEventListener("change", () => {
          answers[q.id] = Number(r.value);
          nextBtn.disabled = !isAnswered(q);
          updateChoiceStyles();
        });
      });
    }
  }

  /* ----------------- Lens bars (uses your existing IDs if present) ----------------- */
  function setBar(id, val /* 0..20 */) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = (Math.max(0, Math.min(20, val)) * 5) + "%";
  }
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(val);
  }

  /* ----------------- Progress View (Baseline vs Follow-Up) ----------------- */
  function computeDelta(b, c) {
    const d = (c ?? 0) - (b ?? 0);
    return d;
  }

  function deltaBadge(delta) {
    const sign = delta > 0 ? "+" : "";
    const cls = delta > 0 ? "positive" : (delta < 0 ? "negative" : "");
    const arrow = delta > 0 ? "▲" : (delta < 0 ? "▼" : "•");
    return `<span class="cs-delta ${cls}">${arrow} ${sign}${delta}</span>`;
  }

  function renderProgressView(container, baseline, current) {
    if (!container) return;
    if (!baseline || !baseline.lensScores || !current || !current.lensScores) return;

    const lenses = ["network","devices","privacy","scams","wellbeing"];

    const built = document.createElement("div");
    built.className = "cs-progress cs-card";
    built.id = "csProgressView";

    built.innerHTML = `
      <h4 class="cs-title">Progress view</h4>
      <p class="cs-mini">
        Baseline vs your latest snapshot (lens scores 0–20). Small improvements compound.
      </p>
      <div class="cs-progress-grid" id="csProgressGrid"></div>
      <div class="cs-note">
        Households that strengthen their lowest lens first usually see the fastest overall safety gains.
      </div>
    `;

    const grid = built.querySelector("#csProgressGrid");

    for (const lens of lenses) {
      const b = baseline.lensScores[lens] ?? 0;
      const c = current.lensScores[lens] ?? 0;
      const d = computeDelta(b, c);

      const row = document.createElement("div");
      row.className = "cs-row";

      row.innerHTML = `
        <div class="label">${escapeHtml(lensName(lens))}</div>
        <div class="cs-bars">
          <div class="cs-bar-wrap">
            <div class="cs-bar-track"><div class="cs-bar-fill" style="width:${(b*5)}%"></div></div>
            <div class="cs-bar-meta">Baseline: ${b}</div>
          </div>
          <div class="cs-bar-wrap">
            <div class="cs-bar-track"><div class="cs-bar-fill" style="width:${(c*5)}%"></div></div>
            <div class="cs-bar-meta">Now: ${c} ${deltaBadge(d)}</div>
          </div>
        </div>
      `;

      grid.appendChild(row);
    }

    // Replace any existing progress view
    const existing = container.querySelector("#csProgressView");
    if (existing) existing.remove();

    container.appendChild(built);
  }

  /* ----------------- Result rendering (Cyber Seeds tone + value) ----------------- */
  function renderResult(scored, seed, snapshotV2) {
    form.innerHTML = "";

    // Fill existing result placeholders if present
    const h = $("#resultHeadline");
    const strongEl = $("#strongestLens");
    const weakEl = $("#weakestLens");
    const scoreEl = $("#hdssScore");
    const stageEl = $("#stageLabel");

    // Make headline feel like a signal/story
    const headline = `Your digital ecosystem is most protected in ${lensName(scored.strongest)} — and needs the most support in ${lensName(scored.weakest)}.`;

    if (h) h.textContent = `Start with ${lensName(scored.weakest)}.`;
    if (strongEl) strongEl.textContent = lensName(scored.strongest);
    if (weakEl) weakEl.textContent = lensName(scored.weakest);
    if (scoreEl) scoreEl.textContent = String(scored.hdss);
    if (stageEl) stageEl.textContent = String(scored.stage.label || "Snapshot");

    // Update lens bars if your HTML includes them
    setBar("barNetwork", scored.lensScores.network);
    setBar("barDevices", scored.lensScores.devices);
    setBar("barPrivacy", scored.lensScores.privacy);
    setBar("barScams", scored.lensScores.scams);
    setBar("barWellbeing", scored.lensScores.wellbeing);

    setVal("valNetwork", scored.lensScores.network);
    setVal("valDevices", scored.lensScores.devices);
    setVal("valPrivacy", scored.lensScores.privacy);
    setVal("valScams", scored.lensScores.scams);
    setVal("valWellbeing", scored.lensScores.wellbeing);

    if (result) {
      // Clear any prior injected blocks
      const oldSeed = $("#csSeedForgeSeeds", result);
      if (oldSeed) oldSeed.remove();
      const oldSignal = $("#csSignalBlock", result);
      if (oldSignal) oldSignal.remove();
      const oldProg = $("#csProgressView", result);
      if (oldProg) oldProg.remove();
      const oldActions = $("#csProgressActions", result);
      if (oldActions) oldActions.remove();

      // SIGNAL BLOCK
      const signal = document.createElement("div");
      signal.id = "csSignalBlock";
      signal.className = "cs-signal cs-card";
      signal.innerHTML = `
        <p class="cs-chip" style="margin:0 0 .6rem 0;"><b>Household signal</b> calm, shame-free</p>
        <h3 class="cs-title" style="margin:.1rem 0 .35rem 0;">Your Household Signal</h3>
        <p class="cs-soft" style="margin:.2rem 0;">${escapeHtml(headline)}</p>

        <div class="cs-divider"></div>

        <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;">
          <span class="cs-chip"><b>Strongest</b> ${escapeHtml(lensName(scored.strongest))}</span>
          <span class="cs-chip"><b>Focus</b> ${escapeHtml(lensName(scored.weakest))}</span>
          <span class="cs-chip"><b>Stage</b> ${escapeHtml(String(scored.stage.label || "Snapshot"))}</span>
          <span class="cs-chip"><b>HDSS</b> ${escapeHtml(String(scored.hdss))} / 100</span>
        </div>

        <p class="cs-eco" style="margin:.7rem 0 0 0;">
          This isn’t pass/fail. It’s the place where one small seed will grow the most safety.
        </p>

        <p class="cs-eco" style="margin:.35rem 0 0 0;">
          <strong>${escapeHtml(lensName(scored.weakest))} —</strong>
          ${escapeHtml(LENS_INSIGHT[scored.weakest] || "")}
        </p>

        <p class="cs-eco" style="margin:.35rem 0 0 0;">
          <strong>Why it matters —</strong>
          ${escapeHtml(LENS_WHY[scored.weakest] || "")}
        </p>
      `;

      result.hidden = false;
      result.classList.add("reveal");
      result.appendChild(signal);

      // PROGRESS ACTIONS
      const actions = document.createElement("div");
      actions.id = "csProgressActions";
      actions.className = "cs-actions";

      const baseline = loadBaselineV2();
      const hasBaseline = !!(baseline && baseline.lensScores);

      actions.innerHTML = `
        <button type="button" class="btn ghost" id="csSetBaseline">
          Set baseline <small>(first snapshot)</small>
        </button>
        <button type="button" class="btn ghost" id="csCompareBaseline" ${hasBaseline ? "" : "disabled"}>
          Compare to baseline <small>(progress)</small>
        </button>
        <button type="button" class="btn ghost" id="csClearBaseline" ${hasBaseline ? "" : "disabled"}>
          Clear baseline
        </button>
      `;

      result.appendChild(actions);

      // SEED CARD
      const wrap = document.createElement("div");
      wrap.id = "csSeedForgeSeeds";
      wrap.style.marginTop = "1rem";

      if (seed) {
        wrap.innerHTML = `
          <div class="cs-card" style="padding:1rem;">
            <div class="cs-seed-title">
              <span class="sprout">🌱</span>
              <span>Your next Digital Seed</span>
            </div>

            <p class="muted" style="margin:.2rem 0 .6rem 0;">
              Small, repeatable actions grow household resilience faster than big one-off fixes.
            </p>

            <p style="margin:.1rem 0 .6rem 0;"><strong>${escapeHtml(seed.title)}</strong></p>

            <ul class="cs-seed-list">
              <li><strong>Today:</strong> ${escapeHtml(seed.today)}</li>
              <li><strong>This week:</strong> ${escapeHtml(seed.this_week)}</li>
              <li><strong>This month:</strong> ${escapeHtml(seed.this_month)}</li>
            </ul>
          </div>
        `;
      } else {
        wrap.innerHTML = `
          <div class="cs-card" style="padding:1rem;">
            <p class="muted" style="margin:0;">
              Your snapshot saved — seed content will appear here once available for this lens.
            </p>
          </div>
        `;
      }

      result.appendChild(wrap);

      // Add baseline note (subtle)
      const note = document.createElement("div");
      note.className = "cs-note";
      note.textContent = "Tip: If this is your first snapshot, set it as your baseline. In 1–3 months you can retake and see what grew.";
      result.appendChild(note);

      // Wire progress actions
      $("#csSetBaseline", result)?.addEventListener("click", () => {
        saveBaselineV2(snapshotV2);
        // enable buttons
        const cmp = $("#csCompareBaseline", result);
        const clr = $("#csClearBaseline", result);
        if (cmp) cmp.disabled = false;
        if (clr) clr.disabled = false;
        // immediate render progress against itself? show “baseline set” message instead
        const existing = result.querySelector("#csProgressView");
        if (existing) existing.remove();

        const ok = document.createElement("div");
        ok.className = "cs-note";
        ok.id = "csBaselineSetNote";
        ok.textContent = "Baseline set. Retake later to see changes across the five lenses.";
        // replace any prior baseline note
        const old = result.querySelector("#csBaselineSetNote");
        if (old) old.remove();
        result.appendChild(ok);
      });

      $("#csCompareBaseline", result)?.addEventListener("click", () => {
        const b = loadBaselineV2();
        if (!b || !b.lensScores) return;
        renderProgressView(result, b, snapshotV2);
      });

      $("#csClearBaseline", result)?.addEventListener("click", () => {
        safeRemove(BASELINE_V2);
        const cmp = $("#csCompareBaseline", result);
        const clr = $("#csClearBaseline", result);
        if (cmp) cmp.disabled = true;
        if (clr) clr.disabled = true;
        const pv = result.querySelector("#csProgressView");
        if (pv) pv.remove();
        const old = result.querySelector("#csBaselineSetNote");
        if (old) old.remove();
        const msg = document.createElement("div");
        msg.className = "cs-note";
        msg.id = "csBaselineSetNote";
        msg.textContent = "Baseline cleared. You can set a new baseline any time.";
        result.appendChild(msg);
      });

      // If baseline exists and snapshot differs, show progress automatically (optional)
      const b = loadBaselineV2();
      if (b && b.lensScores && b.ts && snapshotV2.ts && b.ts !== snapshotV2.ts) {
        // Auto-show progress can be “a lot”; keep it gentle:
        // renderProgressView(result, b, snapshotV2);
      }
    }

    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    // Dispatch completion event
    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete"));
  }

  async function computeAndSaveResult() {
    await ensureSeedForgeReady();

    const scored = CSSeedForge.scoreAnswers(answers, sf.questions, sf.scoring);
    const focusSeeds = CSSeedForge.seedsForLens(scored.weakest, sf.seeds);
    const seed = focusSeeds && focusSeeds.length ? focusSeeds[0] : null;

    const snapshotV2 = {
      v: 2,
      ts: Date.now(),
      engine: {
        built_at: sf.manifest?.built_at || null,
        base: sf.base || null
      },
      answers: { ...answers },
      hdss: scored.hdss,
      stage: scored.stage.label,
      band: scored.stage,
      lensScores: scored.lensScores,
      strongest: scored.strongest,
      weakest: scored.weakest,
      seed: seed ? {
        id: seed.id,
        lens: seed.lens,
        title: seed.title,
        today: seed.today,
        this_week: seed.this_week,
        this_month: seed.this_month
      } : null
    };

    saveSnapshotV2(snapshotV2);
    mirrorSnapshotToV1(snapshotV2);

    // Open the unified Signal Modal (snapshot + seed + hub handoff)
    if (typeof window.CSOpenSnapshotResult === "function") {
      window.CSOpenSnapshotResult();
    }

    renderResult(scored, snapshotV2.seed, snapshotV2);

  }

  function render() {
    if (step < 0) renderIntro();
    else renderQuestion();
  }

  /* ----------------- Controls ----------------- */
  nextBtn.onclick = async () => {
    if (step < 0) {
      try {
        nextBtn.disabled = true;
        await ensureSeedForgeReady();
        step = 0;
        render();
      } catch (e) {
        console.error(e);
        form.innerHTML = `
          <p class="muted">
            The snapshot couldn’t load right now. Please refresh and try again.
          </p>
        `;
        nextBtn.textContent = "Refresh";
        nextBtn.disabled = false;
        nextBtn.onclick = () => location.reload();
      }
      return;
    }

    // last question -> finish
    if (step === QUESTIONS.length - 1) {
      await computeAndSaveResult();
      return;
    }

    step++;
    render();
  };

  backBtn.onclick = () => {
    if (step <= 0) {
      step = -1;
      render();
      return;
    }
    step--;
    render();
  };

  // Open modal
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-snapshot]");
    if (!t) return;
    e.preventDefault();

    injectV2Styles();
    resetState();
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    render();
  });

  // Close modal
  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // ESC closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  /* ----------------- Escaping helpers ----------------- */
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str) {
    return String(str).replaceAll('"', "&quot;");
  }
})();
