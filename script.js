/* =========================================================
   Cyber Seeds — SeedForge + Snapshot Engine (V2 FINAL)
   ========================================================= */

window.CSSeedForge = (() => {
  const FILES = {
    manifest: "manifest.json",
    questions: "questions.json",
    scoring: "scoring.json",
    seeds: "seeds.json",
  };

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
    if (!res.ok) throw new Error(`SeedForge fetch failed: ${url}`);
    return res.json();
  }

  async function detectBase() {
    if (_base) return _base;
    const stamp = Date.now();
    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}/${FILES.manifest}?v=${stamp}`, { cache: "no-store" });
        if (res.ok) return (_base = base);
      } catch {}
    }
    return (_base = "/generated");
  }

  async function load() {
    if (_cache) return _cache;
    const base = await detectBase();
    const manifest = await fetchJson(`${base}/${FILES.manifest}?v=${Date.now()}`).catch(() => ({ built_at: Date.now() }));
    const v = encodeURIComponent(manifest.built_at || Date.now());

    const [questions, scoring, seeds] = await Promise.all([
      fetchJson(`${base}/${FILES.questions}?v=${v}`),
      fetchJson(`${base}/${FILES.scoring}?v=${v}`),
      fetchJson(`${base}/${FILES.seeds}?v=${v}`),
    ]);

    return (_cache = { manifest, questions, scoring, seeds, base });
  }

  function normalizeLens(lens) {
    const s = String(lens || "").toLowerCase();
    if (s.startsWith("net")) return "network";
    if (s.startsWith("dev")) return "devices";
    if (s.startsWith("pri")) return "privacy";
    if (s.startsWith("sca")) return "scams";
    if (s.startsWith("wel")) return "wellbeing";
    return s;
  }

  function stageFor(hdss, scoring) {
    const bands = scoring?.bands || [];
    return bands.find(b => hdss >= b.min && hdss <= b.max) || { label: "Snapshot" };
  }

  function pickFocusLens(lensScores, cfg) {
    const floor = cfg.focus_lens?.healthy_floor ?? 75;
    const threshold = Math.round((floor / 100) * 20);
    const pool = cfg.focus_lens?.rotation_pool_when_healthy ?? [];

    const allStrong = Object.values(lensScores).every(v => v >= threshold);

    if (allStrong && pool.length) {
      return pool[Date.now() % pool.length];
    }

    return Object.entries(lensScores).sort((a, b) => a[1] - b[1])[0][0];
  }

  function buildRationale(focusLens, questions, answers) {
    for (const q of questions) {
      if (normalizeLens(q.lens) !== focusLens) continue;
      const raw = answers[q.id];
      const opt = q.options?.[raw];
      if (opt?.key === "low" || opt?.key === "mid") {
        return `You mentioned that ${q.prompt.toLowerCase()} — that’s why we’re starting here.`;
      }
    }
    return null;
  }

  function scoreAnswers(answers, qYaml, sYaml) {
    const questions = qYaml.questions || [];
    const cfg = sYaml.scoring_v2 || {};
    const lenses = ["network", "devices", "privacy", "scams", "wellbeing"];

    const totals = {}, mins = {}, maxs = {};
    lenses.forEach(l => (totals[l] = mins[l] = maxs[l] = 0));

    for (const q of questions) {
      const lens = normalizeLens(q.lens);
      if (!totals[lens]) continue;

      const v2 = q.scoring_v2 || {};
      const importance = v2.importance ?? 1;
      const maxPts = v2.max_points ?? 20;
      const minPts = v2.min_points ?? 0;

      maxs[lens] += maxPts * importance;
      mins[lens] += minPts * importance;

      const raw = answers[q.id];
      let earned = 0;

      if (typeof raw === "number") {
        const opt = q.options?.[raw];
        if (opt?.key && v2.answer_weights) {
          earned = (v2.answer_weights[opt.key] ?? 0) * maxPts;
        } else {
          earned = opt?.points ?? 0;
        }
      }

      totals[lens] += earned * importance;
    }

    const lensScores = {};
    lenses.forEach(l => {
      const span = maxs[l] - mins[l];
      const norm = span > 0 ? (totals[l] - mins[l]) / span : 0;
      lensScores[l] = Math.round(Math.max(0, Math.min(20, norm * 20)));
    });

    const hdss = lenses.reduce((s, l) => s + lensScores[l], 0);
    const stage = stageFor(hdss, sYaml);

    const strongest = [...lenses].sort((a, b) => lensScores[b] - lensScores[a])[0];
    const rawWeakest = [...lenses].sort((a, b) => lensScores[a] - lensScores[b])[0];
    const weakest = pickFocusLens(lensScores, cfg);

    return { lensScores, hdss, stage, strongest, weakest, rawWeakest };
  }

  function seedsForLens(lens, seedsYaml) {
    return (seedsYaml.seeds || []).filter(s => normalizeLens(s.lens) === normalizeLens(lens));
  }

  return { load, scoreAnswers, seedsForLens, normalizeLens, stageFor, buildRationale };
})();

/* =========================================================
   Snapshot App
   ========================================================= */

(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");

  if (!modal || !form) return;

  let step = -1;
  let sf = null;
  let QUESTIONS = [];
  const answers = {};

  async function ensureReady() {
    if (sf) return;
    sf = await CSSeedForge.load();
    QUESTIONS = sf.questions.questions;
  }

  function renderIntro() {
    form.innerHTML = `
      <p class="muted">This is a calm check-in — not a test.</p>
      <p class="muted">You’ll get one clear focus and simple next steps.</p>
    `;
    nextBtn.textContent = "Start";
    backBtn.disabled = true;
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    form.innerHTML = `
      <p><strong>${q.prompt}</strong></p>
      ${q.options.map((o,i)=>`
        <label class="choice">
          <input type="radio" name="q_${q.id}" value="${i}">
          <span>${o.label}</span>
        </label>`).join("")}
      <p class="muted">${q.reassurance || ""}</p>
    `;
    nextBtn.textContent = step === QUESTIONS.length-1 ? "Finish" : "Next";
    backBtn.disabled = step === 0;

    form.querySelectorAll("input").forEach(r=>{
      r.addEventListener("change",()=>answers[q.id]=Number(r.value));
    });
  }

  function renderResult(scored, seed, rationale) {
    result.innerHTML = `
      <div class="cs-card">
        <h3>Start with ${scored.weakest}</h3>
        <p>Strongest: ${scored.strongest}</p>
        <p>HDSS: ${scored.hdss} / 100</p>
        ${rationale ? `<p><strong>Why:</strong> ${rationale}</p>` : ""}
        <hr>
        ${seed ? `
          <p><strong>${seed.title}</strong></p>
          <ul>
            <li><strong>Today:</strong> ${seed.today}</li>
            <li><strong>This week:</strong> ${seed.this_week}</li>
            <li><strong>This month:</strong> ${seed.this_month}</li>
          </ul>` : ""}
      </div>
    `;
  }

  async function finish() {
    await ensureReady();
    const scored = CSSeedForge.scoreAnswers(answers, sf.questions, sf.scoring);
    const rationale = CSSeedForge.buildRationale(scored.weakest, QUESTIONS, answers);
    const seed = CSSeedForge.seedsForLens(scored.weakest, sf.seeds)[0] || null;
    renderResult(scored, seed, rationale);
  }

  nextBtn.onclick = async () => {
    if (step < 0) {
      await ensureReady();
      step = 0;
      renderQuestion();
      return;
    }
    if (step === QUESTIONS.length - 1) return finish();
    step++;
    renderQuestion();
  };

  backBtn.onclick = () => {
    if (step <= 0) return renderIntro();
    step--;
    renderQuestion();
  };

  document.addEventListener("click", e => {
    if (e.target.closest("[data-open-snapshot]")) {
      modal.classList.add("is-open");
      step = -1;
      renderIntro();
    }
  });
})();
