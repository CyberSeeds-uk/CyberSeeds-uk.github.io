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
   
     result.innerHTML = `
       <div class="snapshot-summary">
         <h3>Your household snapshot</h3>
   
         <p class="lead">
           This is not a judgement — it’s a signal.
           Your household already has strengths, and a clear next place to focus.
         </p>
   
         <div class="snapshot-insight">
           <p>
             <strong>Strongest area:</strong>
             <span>${scored.strongest}</span>
           </p>
   
           <p>
             <strong>Best place to start:</strong>
             <span>${scored.weakest}</span>
           </p>
   
           <p class="muted">
             Overall signal: <strong>${scored.stage.label}</strong>
           </p>
         </div>
   
         ${rationale ? `
           <div class="snapshot-why">
             <p><strong>Why this focus?</strong></p>
             <p>${rationale}</p>
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
   
             <p class="muted">
               You don’t need to do everything at once.
               One small step is enough.
             </p>
           </div>
         ` : ""}
   
         <div class="snapshot-next">
           <p class="muted">
             Your snapshot stays on this device.
             You can revisit it or explore the Family Pack when you’re ready.
           </p>
         </div>
       </div>
     `;
   
     nextBtn.style.display = "none";
     backBtn.style.display = "none";
   }


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
