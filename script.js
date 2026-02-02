/* =========================================================
   Cyber Seeds — Household Snapshot Engine
   Calm • Deterministic • Canon
   ========================================================= */

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

  /* ---------- STORAGE ---------- */
  const safeGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const safeSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };

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

    seedForge = await window.CSSeedForge.load();
    QUESTIONS = seedForge.questions.questions
      .slice()
      .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));
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
            <input type="radio" name="q_${q.id}" value="${i}">
            <span>${o.label}</span>
          </label>
        `).join("")}
      </div>

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

    const rationale = seedForge.buildRationale(
      scored.weakest,
      QUESTIONS,
      answers
    );

    const seed = seedForge.seedsForLens(
      scored.weakest,
      seedForge.seeds
    )[0] || null;

    const snapshot = {
      ts: Date.now(),
      answers,
      ...scored,
      seed
    };

    safeSet(SNAP_KEY, JSON.stringify(snapshot));
    renderResult(scored, seed, rationale);
  }

  /* ---------- RENDER: RESULT ---------- */
  function renderResult(scored, seed, rationale){
    result.hidden = false;
    result.classList.add("reveal");

    result.innerHTML = `
      <div class="snapshot-summary">
        <h3>Your household snapshot</h3>

        <p class="lead">
          This is not a judgement — it’s a signal.
        </p>

        <div class="snapshot-insight">
          <p><strong>Strongest area:</strong> ${scored.strongest}</p>
          <p><strong>Best place to start:</strong> ${scored.weakest}</p>
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
      renderQuestion();
      return;
    }

    if (step === QUESTIONS.length - 1){
      finish();
      return;
    }

    step++;
    renderQuestion();
  });

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

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

})();
