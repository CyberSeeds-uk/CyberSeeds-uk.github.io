/* =========================================================
   Cyber Seeds — SeedForge + Snapshot Engine (V2 FINAL)
   FIXES:
   ✅ Mobile open reliability (click + touch + pointer)
   ✅ aria-hidden toggled correctly (CSS-safe)
   ✅ Backdrop click closes
   ✅ Next/Back restored on every open
   ✅ Choice layout polished (desktop + mobile)
   ✅ Hard reset on open
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

  const BASE_CANDIDATES = ["/generated", "generated", "./generated", "../generated", "../../generated"];
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
    const bands = scoring?.bands || [];
    return bands.find(b => hdss >= b.min && hdss <= b.max) || { min: 0, max: 100, label: "Snapshot" };
  }

  function pickFocusLens(lensScores, cfg) {
    const floor = cfg?.focus_lens?.healthy_floor ?? 75;
    const threshold = Math.round((floor / 100) * 20);
    const pool = cfg?.focus_lens?.rotation_pool_when_healthy ?? [];
    const allStrong = Object.values(lensScores).every(v => v >= threshold);

    if (allStrong && pool.length) return pool[Date.now() % pool.length];
    return Object.entries(lensScores).sort((a, b) => a[1] - b[1])[0][0];
  }

  function buildRationale(focusLens, questions, answers) {
    for (const q of questions) {
      if (normalizeLens(q.lens) !== focusLens) continue;
      const raw = answers[q.id];
      if (typeof raw !== "number") continue;

      const opt = q.options?.[raw];
      if (opt?.key === "low" || opt?.key === "mid") {
        return `You mentioned that ${String(q.prompt || "").toLowerCase()} — that’s why we’re starting here.`;
      }
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
        if (opt?.key && v2.answer_weights) earned = (v2.answer_weights[opt.key] ?? 0) * maxPts;
        else earned = opt?.points ?? 0;
      }

      totals[lens] += earned * importance;
    }

    const lensScores = {};
    lenses.forEach(l => {
      const span = maxs[l] - mins[l];
      const norm = span > 0 ? (totals[l] - mins[l]) / span : 0;
      lensScores[l] = Math.round(Math.max(0, Math.min(20, norm * 20)));
    });

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

  // Prevent double-binding if another script tries to init again
  if (window.__CS_SNAPSHOT_ENGINE_BOUND__) return;
  window.__CS_SNAPSHOT_ENGINE_BOUND__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const SNAP_KEY = "cyberseeds_snapshot_v2";

  const modal = $("#snapshotModal");
  const backdrop = modal ? modal.querySelector(".modal-backdrop") : null; // your HTML has .modal-backdrop
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");

  if (!modal || !form || !nextBtn || !backBtn) return;

  /* ---------- Small injected polish layer (desktop + mobile) ---------- */
  function injectModalPolish() {
    if (document.getElementById("cs-snapshot-polish")) return;

    const css = `
      /* Snapshot modal polish */
      .modal.is-open{ display:block; }
      .modal[aria-hidden="true"]{ display:none; }

      /* Make choices wrap cleanly */
      #snapshotForm .choices,
      #snapshotForm .quiz,
      #snapshotForm{
        width:100%;
      }

      /* Your markup uses labels.choice already */
      #snapshotForm .choices{ display:flex; flex-wrap:wrap; gap:.5rem; }

      /* If .choices wrapper doesn't exist, we still make .choice behave nicely */
      #snapshotForm .choice{
        display:inline-flex;
        align-items:center;
        gap:.5rem;
        border-radius:999px;
        border:1px solid rgba(15,47,42,.18);
        background:#fff;
        padding:.55rem .75rem;
        line-height:1.25;
        max-width:100%;
        cursor:pointer;
        user-select:none;
      }

      #snapshotForm .choice span{
        display:block;
        white-space:normal;
      }

      #snapshotForm .choice input{
        margin:0;
        width:18px;
        height:18px;
        flex:0 0 auto;
      }

      /* Make question text breathe */
      #snapshotForm p{ margin:.2rem 0 .75rem 0; }
      #snapshotForm p.muted{ margin-top:.75rem; }

      /* Mobile: stack choices (cleaner) */
      @media (max-width: 520px){
        #snapshotForm .choices{ display:grid; grid-template-columns:1fr; gap:.55rem; }
        #snapshotForm .choice{ border-radius:16px; padding:.7rem .8rem; }
      }
    `;

    const style = document.createElement("style");
    style.id = "cs-snapshot-polish";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Storage guards ---------- */
  function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
  function safeRemove(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }

  function loadSnapshot() {
    const raw = safeGet(SNAP_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /* ---------- State ---------- */
  let step = -1;
  let sf = null;
  let QUESTIONS = [];
  const answers = {};

  function orderQuestionsDeterministically(list) {
    const hasOrder = list.some(q => typeof q.order === "number");
    if (hasOrder) return [...list].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    return [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  async function ensureReady() {
    if (sf && QUESTIONS.length) return;
    sf = await window.CSSeedForge.load();
    const raw = sf?.questions?.questions || [];
    if (!Array.isArray(raw) || !raw.length) throw new Error("SeedForge questions missing/empty.");
    QUESTIONS = orderQuestionsDeterministically(raw);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hardResetState() {
    step = -1;
    for (const k in answers) delete answers[k];

    // restore controls every time
    nextBtn.style.display = "";
    backBtn.style.display = "";
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;

    if (result) result.hidden = true;
    form.innerHTML = "";
  }

  function openModal() {
    injectModalPolish();

    // ✅ critical: aria-hidden must be false or CSS may keep it hidden on mobile
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    // focus management (helps iOS)
    nextBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function renderIntro() {
    form.innerHTML = `
      <p class="muted">This is a calm check-in — not a test.</p>
      <p class="muted">You’ll get one clear focus and simple next steps.</p>
    `;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    if (!q) return;

    const reassurance = q.reassurance ? `<p class="muted">${escapeHtml(q.reassurance)}</p>` : "";

    // Wrap options in .choices so your CSS can style it nicely
    form.innerHTML = `
      <p><strong>${escapeHtml(q.prompt || "")}</strong></p>
      <div class="choices">
        ${(q.options || []).map((o, i) => `
          <label class="choice">
            <input type="radio" name="q_${escapeHtml(q.id)}" value="${i}">
            <span>${escapeHtml(o.label || "")}</span>
          </label>
        `).join("")}
      </div>
      ${reassurance}
    `;

    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    backBtn.disabled = (step === 0);
    nextBtn.disabled = true;

    // restore prior selection
    const prev = answers[q.id];
    if (typeof prev === "number") {
      const input = form.querySelector(`input[type="radio"][value="${prev}"]`);
      if (input) input.checked = true;
      nextBtn.disabled = false;
    }

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

    const strongestEl = $("#strongestLens");
    const weakestEl = $("#weakestLens");
    const headlineEl = $("#resultHeadline");

    if (strongestEl) strongestEl.textContent = scored.strongest;
    if (weakestEl) weakestEl.textContent = scored.weakest;
    if (headlineEl) headlineEl.textContent =
      `Your ecosystem is strongest in ${scored.strongest} and needs the most support in ${scored.weakest}.`;

    // keep your existing result section; just add a clean seed/rationale block
    const extra = document.createElement("div");
    extra.className = "cs-card";
    extra.style.padding = "1rem";
    extra.style.marginTop = "1rem";
    extra.innerHTML = `
      ${rationale ? `<p style="margin:0 0 .75rem 0;"><strong>Why this lens —</strong> ${escapeHtml(rationale)}</p>` : ""}
      ${seed ? `
        <p style="margin:.1rem 0 .5rem 0;"><strong>${escapeHtml(seed.title || "")}</strong></p>
        <ul style="margin:.25rem 0 0 1.1rem;">
          <li><strong>Today:</strong> ${escapeHtml(seed.today || "")}</li>
          <li><strong>This week:</strong> ${escapeHtml(seed.this_week || "")}</li>
          <li><strong>This month:</strong> ${escapeHtml(seed.this_month || "")}</li>
        </ul>
      ` : `<p class="muted" style="margin:0;">Your snapshot saved — seed content will appear here once available.</p>`}
    `;

    const old = result.querySelector(".cs-card");
    if (old) old.remove();
    result.appendChild(extra);
  }

  async function finish() {
    await ensureReady();

    const scored = window.CSSeedForge.scoreAnswers(answers, sf.questions, sf.scoring);
    const rationale = window.CSSeedForge.buildRationale(scored.weakest, QUESTIONS, answers);
    const seed = window.CSSeedForge.seedsForLens(scored.weakest, sf.seeds)[0] || null;

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

    safeSet(SNAP_KEY, JSON.stringify(snapshotV2));

    renderResult(scored, seed, rationale);

    // hide controls after finishing (your UX choice)
    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    const go = document.getElementById("goToResources");
    if (go) go.style.display = "inline-flex";

    // Optional: if you have a unified result modal elsewhere
    if (typeof window.CSOpenSnapshotResult === "function") {
      window.CSOpenSnapshotResult();
    }
  }

  /* ---------- Controls ---------- */
  nextBtn.addEventListener("click", async () => {
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
  });

  backBtn.addEventListener("click", () => {
    if (step <= 0) {
      step = -1;
      renderIntro();
      return;
    }
    step--;
    renderQuestion();
  });

  /* ---------- OPEN handlers (mobile-safe) ---------- */
  function handleOpen(e) {
    const t = e.target?.closest?.("[data-open-snapshot]");
    if (!t) return;

    e.preventDefault();
    hardResetState();
    openModal();
    renderIntro();
  }

  // Click (desktop)
  document.addEventListener("click", handleOpen, { passive: false });

  // Touchend (mobile Safari)
  document.addEventListener("touchend", handleOpen, { passive: false });

  // Pointerup (newer mobile browsers)
  document.addEventListener("pointerup", handleOpen, { passive: false });

  /* ---------- Close handlers ---------- */
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Backdrop click closes (your HTML uses .modal-backdrop with data-close)
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // Reset snapshot (clears stored result + resets flow)
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      safeRemove(SNAP_KEY);
      hardResetState();
      renderIntro();
    });
  }

  // On load: if snapshot exists, reveal resources button
  document.addEventListener("DOMContentLoaded", () => {
    const snap = loadSnapshot();
    const btn = document.getElementById("goToResources");
    if (btn && snap) btn.style.display = "inline-flex";

    // Ensure modal is initially hidden properly
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
  });

})();
