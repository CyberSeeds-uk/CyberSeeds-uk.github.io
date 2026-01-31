/* =========================================================
   Cyber Seeds — SeedForge + Snapshot Engine (V2)
   - Config-driven questions from generated/questions.json
   - V2 scoring immediately (lens 0..20, HDSS 0..100, bands)
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

  // Try multiple bases so this works on:
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

    // If manifest missing, still try default base
    _base = "/generated";
    return _base;
  }

  async function load() {
    if (_cache) return _cache;

    const base = await detectBase();

    // Load manifest first for cache-busting, but do not hard-fail if missing
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
   * Each option contains points 0..20 in questions.json
   */
  function scoreAnswers(answers, questionsYaml, scoringYaml) {
    const questions = (questionsYaml && questionsYaml.questions) || [];
    const lensBuckets = { network: [], devices: [], privacy: [], scams: [], wellbeing: [] };

    for (const q of questions) {
      const qid = q.id;
      const lens = normalizeLens(q.lens);
      const raw = answers ? answers[qid] : null;

      if (!lensBuckets[lens]) continue;

      // Single: raw is index
      if (typeof raw === "number") {
        const opt = q.options && q.options[raw];
        const pts = opt && typeof opt.points === "number" ? opt.points : 0;
        lensBuckets[lens].push(pts);
        continue;
      }

      // Multi: raw is indices[]
      if (Array.isArray(raw)) {
        for (const idx of raw) {
          const opt = q.options && q.options[idx];
          const pts = opt && typeof opt.points === "number" ? opt.points : 0;
          lensBuckets[lens].push(pts);
        }
        continue;
      }

      // unanswered => 0
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
   App + Snapshot Modal
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ----------------- Year ----------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ----------------- Storage ----------------- */
  const STORE_V2 = "cyberseeds_snapshot_v2";
  const STORE_V1 = "cyberseeds_snapshot_v1"; // mirrored for backwards compatibility

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function saveSnapshotV2(payload) {
    return safeSet(STORE_V2, JSON.stringify(payload));
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
    } catch {
      // ignore
    }
  }

  document.addEventListener("cyberseeds:snapshot-complete", () => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });

  document.addEventListener("DOMContentLoaded", () => {
    // Preload SeedForge (doesn't block UI)
    CSSeedForge.load().catch(err => {
      console.warn("SeedForge failed to load.", err);
    });

    revealResourcesButtonIfSnapshotExists();
  });

  /* ----------------- Modal Elements ----------------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn = $("#closeSnapshot");

  if (!modal || !form || !nextBtn || !backBtn) return;

  /* ----------------- Lens meta (display only) ----------------- */
  const LENS_META = {
    network:   { title: "Home Wi-Fi", purpose: "The digital front door" },
    devices:   { title: "Devices", purpose: "What connects to the home" },
    privacy:   { title: "Accounts & Privacy", purpose: "What protects everything else" },
    scams:     { title: "Scams & Messages", purpose: "How your home handles pressure" },
    wellbeing: { title: "Children & Wellbeing", purpose: "Calm boundaries that actually stick" },
  };

  /* ----------------- State ----------------- */
  let step = -1;               // -1 intro, 0..n-1 questions, n result
  let sf = null;               // SeedForge loaded bundle
  let QUESTIONS = [];          // questions array from generated/questions.json
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

  /* ----------------- Rendering ----------------- */
  function renderIntro() {
    form.innerHTML = `
      <p class="muted">
        This is a calm check-in — not a test.
        Answer honestly. You can change anything later.
      </p>
    `;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
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

  function isAnswered(q) {
    const v = answers[q.id];
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    return typeof v === "number";
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    if (!q) return;

    const lens = CSSeedForge.normalizeLens(q.lens);
    const meta = LENS_META[lens] || { title: lens, purpose: "" };

    // Prepare default answer container
    if (q.type === "multi") {
      if (!Array.isArray(answers[q.id])) answers[q.id] = [];
    } else {
      if (typeof answers[q.id] !== "number") answers[q.id] = null;
    }

    const stepLabel = `Question ${step + 1} of ${QUESTIONS.length}`;

    let html = `
      <div class="snapshot-step">
        <p class="muted" style="margin:0 0 .5rem 0;">${stepLabel}</p>
        <h3 style="margin:.1rem 0 .25rem 0;">${meta.title}</h3>
        ${meta.purpose ? `<p class="muted" style="margin:0 0 .75rem 0;">${meta.purpose}</p>` : ""}
        <p><strong>${escapeHtml(q.prompt || "")}</strong></p>
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

  function updateChoiceStyles() {
    $$(".choice", form).forEach(c => c.classList.remove("is-selected"));
    $$("input:checked", form).forEach(i => i.closest(".choice")?.classList.add("is-selected"));
  }

  function renderResult(scored, seed) {
    form.innerHTML = "";

    // Try to fill your existing result placeholders if present:
    const h = $("#resultHeadline");
    const strongEl = $("#strongestLens");
    const weakEl = $("#weakestLens");
    const scoreEl = $("#hdssScore");
    const stageEl = $("#stageLabel");

    const lensName = (lens) => {
      const meta = LENS_META[lens] || { title: lens };
      return meta.title;
    };

    if (h) h.textContent = `Start with ${lensName(scored.weakest)}.`;
    if (strongEl) strongEl.textContent = lensName(scored.strongest);
    if (weakEl) weakEl.textContent = lensName(scored.weakest);
    if (scoreEl) scoreEl.textContent = String(scored.hdss);
    if (stageEl) stageEl.textContent = String(scored.stage.label || "Snapshot");

    // Seed injection (safe fallback)
    if (result) {
      const existing = $("#csSeedForgeSeeds", result);
      if (existing) existing.remove();

      const wrap = document.createElement("div");
      wrap.id = "csSeedForgeSeeds";
      wrap.style.marginTop = "1rem";

      if (seed) {
        wrap.innerHTML = `
          <div class="card" style="padding:1rem;border:1px solid var(--line,#dfecea);border-radius:14px;">
            <p class="muted" style="margin:0 0 .25rem 0;">Your next “Digital Seed”</p>
            <p style="margin:.1rem 0 .75rem 0;"><strong>${escapeHtml(seed.title)}</strong></p>
            <ul style="margin:0;padding-left:1.2rem;">
              <li><strong>Today:</strong> ${escapeHtml(seed.today)}</li>
              <li><strong>This week:</strong> ${escapeHtml(seed.this_week)}</li>
              <li><strong>This month:</strong> ${escapeHtml(seed.this_month)}</li>
            </ul>
          </div>
        `;
      } else {
        wrap.innerHTML = `
          <p class="muted" style="margin:0;">
            Your snapshot saved — next steps will appear here once seed content is available for this lens.
          </p>
        `;
      }

      result.hidden = false;
      result.classList.add("reveal");
      result.appendChild(wrap);
    }

    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    // Dispatch completion for button reveal, resources hub, etc.
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

    renderResult(scored, snapshotV2.seed);
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= QUESTIONS.length) {
      // should never hit; we finish on last question
    } else renderQuestion();
  }

  /* ----------------- Controls ----------------- */
  nextBtn.onclick = async () => {
    // intro -> load questions then show q1
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

    // if last question, finish
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

  /* ----------------- Tiny escaping helpers ----------------- */
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
