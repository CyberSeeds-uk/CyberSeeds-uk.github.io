/* =========================================================
   Cyber Seeds — SeedForge + Snapshot Engine (V2 FINAL)
   - Config-driven questions (generated/*.json)
   - Enforced deterministic question order (fixes “opens on Q5”)
   - Hard reset on open (fixes stale state + Finish appearing early)
   - Safe localStorage guards (iOS friendly)
   ========================================================= */

/* =========================================================
   SeedForge Runtime
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
    if (!res.ok) throw new Error(`SeedForge fetch failed: ${url} (${res.status})`);
    return res.json();
  }

  async function detectBase() {
    if (_base) return _base;

    const stamp = Date.now();
    for (const base of BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}/${FILES.manifest}?v=${stamp}`, { cache: "no-store" });
        if (res.ok) return (_base = base);
      } catch {
        // keep trying
      }
    }
    return (_base = "/generated");
  }

  async function load() {
    if (_cache) return _cache;

    const base = await detectBase();

    const manifest = await fetchJson(`${base}/${FILES.manifest}?v=${Date.now()}`)
      .catch(() => ({ built_at: Date.now() }));

    const v = encodeURIComponent(manifest.built_at || Date.now());

    const [questions, scoring, seeds] = await Promise.all([
      fetchJson(`${base}/${FILES.questions}?v=${v}`),
      fetchJson(`${base}/${FILES.scoring}?v=${v}`),
      fetchJson(`${base}/${FILES.seeds}?v=${v}`),
    ]);

    _cache = { manifest, questions, scoring, seeds, base };
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
    const bands = scoring?.bands || [];
    return bands.find(b => hdss >= b.min && hdss <= b.max) || { min: 0, max: 100, label: "Snapshot" };
  }

  function pickFocusLens(lensScores, cfg) {
    const floor = cfg?.focus_lens?.healthy_floor ?? 75;               // percent
    const threshold = Math.round((floor / 100) * 20);                 // 0..20
    const pool = cfg?.focus_lens?.rotation_pool_when_healthy ?? [];

    const allStrong = Object.values(lensScores).every(v => v >= threshold);

    if (allStrong && pool.length) {
      // deterministic-ish rotation
      return pool[Date.now() % pool.length];
    }

    // true weakest
    return Object.entries(lensScores).sort((a, b) => a[1] - b[1])[0][0];
  }

  function buildRationale(focusLens, questions, answers) {
    for (const q of questions) {
      if (normalizeLens(q.lens) !== focusLens) continue;

      const raw = answers[q.id];
      if (typeof raw !== "number") continue;

      const opt = q.options?.[raw];
      // If you use opt.key like low/mid/high:
      if (opt?.key === "low" || opt?.key === "mid") {
        return `You mentioned that ${String(q.prompt || "").toLowerCase()} — that’s why we’re starting here.`;
      }

      // fallback: if user picked anything other than first option, treat as “needs support”
      if (raw > 0 && q.prompt) {
        return `You mentioned that ${String(q.prompt).toLowerCase()} — that’s why we’re starting here.`;
      }
    }
    return null;
  }

  function scoreAnswers(answers, qYaml, sYaml) {
    const questions = qYaml?.questions || [];
    const cfg = sYaml?.scoring_v2 || {};
    const lenses = ["network", "devices", "privacy", "scams", "wellbeing"];

    const totals = {}, mins = {}, maxs = {};
    lenses.forEach(l => { totals[l] = 0; mins[l] = 0; maxs[l] = 0; });

    for (const q of questions) {
      const lens = normalizeLens(q.lens);
      if (!(lens in totals)) continue;

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

    // HDSS is sum of lenses (0..100)
    const hdss = lenses.reduce((sum, l) => sum + (lensScores[l] ?? 0), 0);

    const stage = stageFor(hdss, sYaml);

    const strongest = [...lenses].sort((a, b) => lensScores[b] - lensScores[a])[0];
    const rawWeakest = [...lenses].sort((a, b) => lensScores[a] - lensScores[b])[0];
    const weakest = pickFocusLens(lensScores, cfg);

    return { lensScores, hdss, stage, strongest, weakest, rawWeakest };
  }

  function seedsForLens(lens, seedsYaml) {
    const key = normalizeLens(lens);
    return (seedsYaml?.seeds || []).filter(s => normalizeLens(s.lens) === key);
  }

  return { load, scoreAnswers, seedsForLens, normalizeLens, stageFor, buildRationale };
})();

/* =========================================================
   Snapshot App (Modal)
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const SNAP_KEY = "cyberseeds_snapshot_v2";
  const BASELINE_KEY = "cyberseeds_snapshot_baseline_v2";

  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");

  if (!modal || !form || !nextBtn || !backBtn) return;

  // ---------- Storage guards ----------
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }

  function saveSnapshot(payload) {
    safeSet(SNAP_KEY, JSON.stringify(payload));
  }
  function loadSnapshot() {
    const raw = safeGet(SNAP_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function saveBaseline(payload) {
    if (!payload) return;
    safeSet(BASELINE_KEY, JSON.stringify(payload));
  }
  function loadBaseline() {
    const raw = safeGet(BASELINE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // ---------- App state ----------
  let step = -1;              // -1 intro, 0..n-1 questions
  let sf = null;
  let QUESTIONS = [];
  const answers = {};

  // ---------- Deterministic order helper (IMPORTANT FIX) ----------
  function orderQuestionsDeterministically(list) {
    // prefer explicit "order" field if present, else stable id sort
    const hasOrder = list.some(q => typeof q.order === "number");
    if (hasOrder) {
      return [...list].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    }
    return [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  async function ensureReady() {
    if (sf && QUESTIONS.length) return;
    sf = await CSSeedForge.load();

    const raw = sf?.questions?.questions || [];
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("SeedForge questions missing/empty.");
    }

    // ✅ FIX: enforce deterministic order
    QUESTIONS = orderQuestionsDeterministically(raw);
  }

  // ---------- UI helpers ----------
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Hard reset (IMPORTANT FIX) ----------
  function hardResetState() {
    step = -1;
    for (const k in answers) delete answers[k];
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
    // clear any checked inputs that might remain in DOM
    if (form) form.innerHTML = "";
  }

  function openModal() {
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  function renderIntro() {
    form.innerHTML = `
      <p class="muted">This is a calm check-in — not a test.</p>
      <p class="muted">You’ll get one clear focus and simple next steps.</p>
    `;
    nextBtn.textContent = "Start";
    backBtn.disabled = true;
    nextBtn.disabled = false;
    if (result) result.hidden = true;
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    if (!q) return;

    const reassurance = q.reassurance ? `<p class="muted">${escapeHtml(q.reassurance)}</p>` : "";

    form.innerHTML = `
      <p><strong>${escapeHtml(q.prompt || "")}</strong></p>
      ${(q.options || []).map((o, i) => `
        <label class="choice">
          <input type="radio" name="q_${escapeHtml(q.id)}" value="${i}">
          <span>${escapeHtml(o.label || "")}</span>
        </label>
      `).join("")}
      ${reassurance}
    `;

    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    backBtn.disabled = (step === 0);
    nextBtn.disabled = true;

    // restore selection if any
    const prev = answers[q.id];
    if (typeof prev === "number") {
      const input = form.querySelector(`input[type="radio"][value="${prev}"]`);
      if (input) input.checked = true;
      nextBtn.disabled = false;
    }

    // bind changes
    $$("input[type=radio]", form).forEach(r => {
      r.addEventListener("change", () => {
        answers[q.id] = Number(r.value);
        nextBtn.disabled = false;
      });
    });
  }

  function renderResult(scored, seed, rationale) {
    if (!result) return;
    result.hidden = false;

    // If your HTML already contains result sub-elements, keep it simple:
    const strongestEl = $("#strongestLens");
    const weakestEl = $("#weakestLens");
    const headlineEl = $("#resultHeadline");

    if (strongestEl) strongestEl.textContent = scored.strongest;
    if (weakestEl) weakestEl.textContent = scored.weakest;
    if (headlineEl) headlineEl.textContent =
      `Your ecosystem is strongest in ${scored.strongest} and needs the most support in ${scored.weakest}.`;

    // If you want to print a minimal card inside result:
    const extra = document.createElement("div");
    extra.className = "cs-card";
    extra.style.padding = "1rem";
    extra.style.marginTop = "1rem";
    extra.innerHTML = `
      <h3 style="margin:.1rem 0 .4rem 0;">Start with ${escapeHtml(scored.weakest)}</h3>
      <p style="margin:.1rem 0;">Strongest: <strong>${escapeHtml(scored.strongest)}</strong></p>
      <p style="margin:.1rem 0;">HDSS: <strong>${escapeHtml(scored.hdss)}</strong> / 100</p>
      <p style="margin:.35rem 0 0 0;">Stage: <strong>${escapeHtml(scored.stage?.label || "Snapshot")}</strong></p>
      ${rationale ? `<p style="margin:.6rem 0 0 0;"><strong>Why this lens —</strong> ${escapeHtml(rationale)}</p>` : ""}
      ${seed ? `
        <hr style="margin:1rem 0; border:none; height:1px; background:#dfecea;">
        <p style="margin:.1rem 0 .5rem 0;"><strong>${escapeHtml(seed.title || "")}</strong></p>
        <ul style="margin:.25rem 0 0 1.1rem;">
          <li><strong>Today:</strong> ${escapeHtml(seed.today || "")}</li>
          <li><strong>This week:</strong> ${escapeHtml(seed.this_week || "")}</li>
          <li><strong>This month:</strong> ${escapeHtml(seed.this_month || "")}</li>
        </ul>
      ` : ""}
    `;

    // clear any previous appended extra card
    const old = result.querySelector(".cs-card");
    if (old) old.remove();
    result.appendChild(extra);
  }

  async function finish() {
    await ensureReady();

    const scored = CSSeedForge.scoreAnswers(answers, sf.questions, sf.scoring);
    const rationale = CSSeedForge.buildRationale(scored.weakest, QUESTIONS, answers);
    const seed = CSSeedForge.seedsForLens(scored.weakest, sf.seeds)[0] || null;

    const snapshotV2 = {
      v: 2,
      ts: Date.now(),
      engine: { built_at: sf.manifest?.built_at || null, base: sf.base || null },
      answers: { ...answers },
      hdss: scored.hdss,
      stage: scored.stage?.label || "Snapshot",
      band: scored.stage || null,
      lensScores: scored.lensScores,
      strongest: scored.strongest,
      weakest: scored.weakest,
      rationale: rationale || null,
      seed: seed ? {
        id: seed.id,
        lens: seed.lens,
        title: seed.title,
        today: seed.today,
        this_week: seed.this_week,
        this_month: seed.this_month
      } : null
    };

    saveSnapshot(snapshotV2);

    // render output
    renderResult(scored, seed, rationale);

    // hide nav controls in-modal if you want
    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    // show resources button if exists
    const go = document.getElementById("goToResources");
    if (go) go.style.display = "inline-flex";

    // Optional hook if you also have unified result modal elsewhere
    if (typeof window.CSOpenSnapshotResult === "function") {
      window.CSOpenSnapshotResult();
    }
  }

  // ---------- Controls ----------
  nextBtn.onclick = async () => {
    if (step < 0) {
      try {
        nextBtn.disabled = true;
        await ensureReady();
        step = 0;
        nextBtn.disabled = false;
        renderQuestion();
      } catch (e) {
        console.error(e);
        form.innerHTML = `<p class="muted">The snapshot couldn’t load right now. Please refresh and try again.</p>`;
        nextBtn.textContent = "Refresh";
        nextBtn.disabled = false;
        nextBtn.onclick = () => location.reload();
      }
      return;
    }

    if (step === QUESTIONS.length - 1) {
      await finish();
      return;
    }

    step++;
    renderQuestion();
  };

  backBtn.onclick = () => {
    if (step <= 0) {
      step = -1;
      renderIntro();
      return;
    }
    step--;
    renderQuestion();
  };

  // ✅ IMPORTANT FIX: Hard reset + open
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-snapshot]");
    if (!t) return;

    e.preventDefault();

    // HARD RESET to prevent “opens on Q5 / Finish early”
    hardResetState();
    openModal();
    renderIntro();
  });

  // Close
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Reset snapshot (clears stored result + resets flow)
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      safeRemove(SNAP_KEY);
      // keep baseline; you can also clear baseline if desired:
      // safeRemove(BASELINE_KEY);
      hardResetState();
      renderIntro();
    });
  }

  // ESC closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // If you want: reveal “resources hub” CTA when existing snapshot exists
  document.addEventListener("DOMContentLoaded", () => {
    const snap = loadSnapshot();
    const btn = document.getElementById("goToResources");
    if (btn && snap) btn.style.display = "inline-flex";
  });

})();
