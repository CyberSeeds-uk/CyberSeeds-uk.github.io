/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   v1.1 Public (Canon-aligned)
   Hardened: selection UI, iOS body-lock, close controls, saving
   =========================================================== */

(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
    );

  /* ---------- Storage ---------- */
  const STORE = "cyberseeds_snapshot_v1";

  const saveFinal = (data) => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...data, ts: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };

  const loadFinal = () => {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearFinal = () => {
    try {
      localStorage.removeItem(STORE);
    } catch {}
  };

  /* ---------- iOS-safe body lock ---------- */
  let __scrollY = 0;

  function lockBody() {
    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("modal-open");
    // position:fixed technique
    document.body.style.top = `-${__scrollY}px`;
  }

  function unlockBody() {
    document.body.classList.remove("modal-open");
    const top = document.body.style.top;
    document.body.style.top = "";
    const y = top ? Math.abs(parseInt(top, 10)) : __scrollY;
    window.scrollTo(0, y || 0);
  }

  /* ---------- Snapshot Model ---------- */
  const SECTIONS = [
    {
      id: "wifi",
      title: "Home Wi-Fi & Router",
      purpose: "The gateway to everything else.",
      questions: [
        {
          q: "Have you changed the router’s default Wi-Fi and admin passwords?",
          a: [
            { t: "Yes, both changed", s: 4 },
            { t: "Only the Wi-Fi password", s: 3 },
            { t: "Still using defaults", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Does your router update automatically?",
          a: [
            { t: "Yes", s: 4 },
            { t: "I check sometimes", s: 3 },
            { t: "Never", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "devices",
      title: "Devices & Updates",
      purpose: "What lives on the network.",
      questions: [
        {
          q: "Which devices are used in your home?",
          multi: true,
          a: [
            "Phones / tablets",
            "Laptops / PCs",
            "Games consoles",
            "Smart TVs",
            "Smart speakers",
            "Cameras / doorbells",
            "Wearables",
            "Other",
          ],
        },
        {
          q: "Do devices update automatically?",
          a: [
            { t: "All or most", s: 4 },
            { t: "Some", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "accounts",
      title: "Accounts & Passwords",
      purpose: "Digital identity and recovery.",
      questions: [
        {
          q: "How are passwords managed?",
          a: [
            { t: "Password manager", s: 4 },
            { t: "Interested but not using", s: 3 },
            { t: "Not sure", s: 2 },
            { t: "Reuse passwords", s: 1 },
          ],
        },
        {
          q: "Is 2-step verification enabled?",
          a: [
            { t: "On most accounts", s: 4 },
            { t: "On one or two", s: 3 },
            { t: "Not yet", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "scams",
      title: "Scam Awareness",
      purpose: "Handling urgency and pressure.",
      questions: [
        {
          q: "When a message asks for money or info, what happens?",
          a: [
            { t: "Pause and verify", s: 4 },
            { t: "Sometimes respond", s: 3 },
            { t: "Feel pressured", s: 2 },
            { t: "Been caught before", s: 1 },
          ],
        },
      ],
    },
    {
      id: "wellbeing",
      title: "Digital Habits & Wellbeing",
      purpose: "Sleep, calm, boundaries.",
      questions: [
        {
          q: "Do you have device-free times?",
          a: [
            { t: "Yes, daily", s: 4 },
            { t: "Occasionally", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
      ],
    },
    {
      id: "children",
      title: "Children’s Online Safety",
      purpose: "Support, guidance and openness.",
      optional: true,
      questions: [
        {
          q: "Do you use parental controls?",
          a: [
            { t: "Yes, regularly", s: 4 },
            { t: "Tried but inconsistent", s: 3 },
            { t: "No, but would like help", s: 2 },
            { t: "Not applicable", s: 4 },
          ],
        },
      ],
    },
  ];

  /* ---------- Lens Map ---------- */
  const LENS_MAP = {
    Network: ["wifi"],
    Devices: ["devices"],
    Privacy: ["accounts"],
    Scams: ["scams"],
    Wellbeing: ["wellbeing", "children"],
  };

  /* ---------- Resources ---------- */
  const RESOURCE_MAP = {
    Network: [{ title: "Secure your Wi-Fi router", link: "/resources/router-basics.html" }],
    Devices: [{ title: "Keep devices updated", link: "/resources/device-updates.html" }],
    Privacy: [
      { title: "Password managers explained", link: "/resources/passwords.html" },
      { title: "Turn on 2-step verification", link: "/resources/2fa.html" },
    ],
    Scams: [{ title: "Pause & verify habit", link: "/resources/scams.html" }],
    Wellbeing: [{ title: "Digital boundaries at home", link: "/resources/wellbeing.html" }],
  };

  /* ---------- State ---------- */
  const answers = {};
  let step = -1;

  /* ---------- DOM ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const headline = $("#resultHeadline");
  const strongestEl = $("#strongestLens");
  const weakestEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const resourceList = $("#personalResources");
  const closeBtn = $("#snapshotClose");
  const backdrop = $("#snapshotBackdrop");

  if (!modal || !form || !nextBtn || !backBtn) {
    // If markup isn't present, fail quietly (prevents console chaos on other pages)
    return;
  }

  /* ---------- Scoring ---------- */
  function scoreMulti(arr) {
    const c = Array.isArray(arr) ? arr.length : 0;
    return c <= 2 ? 4 : c <= 4 ? 3 : c <= 6 ? 2 : 1;
  }

  function computeSectionScores() {
    const scores = {};
    Object.entries(answers).forEach(([id, qs]) => {
      const vals = qs.map((v) => (Array.isArray(v) ? scoreMulti(v) : v));
      if (!vals.length) return;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      scores[id] = Math.round(avg * 10) / 10;
    });
    return scores;
  }

  function computeLensScores(sectionScores) {
    const lens = {};
    Object.entries(LENS_MAP).forEach(([k, ids]) => {
      const vals = ids.map((id) => sectionScores[id]).filter((v) => typeof v === "number");
      if (!vals.length) return;
      lens[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    });
    return lens;
  }

  function stageFromLens(lens) {
    const total = Object.values(lens).reduce((a, b) => a + b, 0);
    if (total >= 16) return "Clear";
    if (total >= 11) return "Emerging";
    return "Vulnerable";
  }

  /* ---------- UI: Selection polish ---------- */
  function refreshChoiceSelectedStyles(sec) {
    // Radios
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        const arr = answers[sec.id]?.[qi] || [];
        $$(`input[type="checkbox"][data-q="${qi}"]`).forEach((cb) => {
          const label = cb.closest(".choice");
          if (!label) return;
          const idx = +cb.dataset.o;
          label.classList.toggle("is-selected", arr.includes(idx));
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`).forEach((r) => {
          const label = r.closest(".choice");
          if (!label) return;
          label.classList.toggle("is-selected", r.checked);
        });
      }
    });
  }

  /* ---------- Validation ---------- */
  function sectionComplete(sec) {
    const qs = answers[sec.id] || [];
    for (let i = 0; i < sec.questions.length; i++) {
      const q = sec.questions[i];
      const v = qs[i];
      if (q.multi) {
        if (!Array.isArray(v) || v.length === 0) return false;
      } else {
        if (typeof v !== "number") return false;
      }
    }
    return true;
  }

  /* ---------- Rendering ---------- */
  function renderIntro() {
    form.innerHTML = `
      <p class="muted">
        This is a calm reading of your household’s digital ecosystem.
        There are no right answers — only useful signals.
      </p>
    `;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    if (result) result.hidden = true;
  }

  function renderSection() {
    const sec = SECTIONS[step];
    answers[sec.id] ??= [];

    let html = `
      <div class="quiz-block">
        <div class="modal-eyebrow">Snapshot</div>
        <div class="q-title">${esc(sec.title)}</div>
        <p class="muted">${esc(sec.purpose)}</p>
      </div>
    `;

    sec.questions.forEach((q, qi) => {
      html += `<div class="quiz-block">`;
      html += `<p><b>${esc(q.q)}</b></p><div class="choices">`;

      if (q.multi) {
        answers[sec.id][qi] ??= [];
        html += `<div class="multi-hint">Tick any that apply</div>`;
        q.a.forEach((t, oi) => {
          html += `
            <label class="choice multi">
              <input type="checkbox" data-q="${qi}" data-o="${oi}" />
              <span>${esc(t)}</span>
            </label>
          `;
        });
      } else {
        q.a.forEach((o) => {
          html += `
            <label class="choice">
              <input type="radio" name="${sec.id}_${qi}" value="${o.s}" />
              <span>${esc(o.t)}</span>
            </label>
          `;
        });
      }

      html += `</div></div>`;
    });

    form.innerHTML = html;

    backBtn.disabled = step === 0;
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = !sectionComplete(sec);

    bindInputs(sec);
    refreshChoiceSelectedStyles(sec);
  }

  function bindInputs(sec) {
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        $$(`input[type="checkbox"][data-q="${qi}"]`, form).forEach((cb) => {
          cb.addEventListener("change", () => {
            const idx = +cb.dataset.o;
            const arr = answers[sec.id][qi];

            if (cb.checked) {
              if (!arr.includes(idx)) arr.push(idx);
            } else {
              answers[sec.id][qi] = arr.filter((i) => i !== idx);
            }

            nextBtn.disabled = !sectionComplete(sec);
            refreshChoiceSelectedStyles(sec);
          });
        });
      } else {
        $$(`input[type="radio"]`, form).forEach((r) => {
          r.addEventListener("change", () => {
            answers[sec.id][qi] = +r.value;
            nextBtn.disabled = !sectionComplete(sec);
            refreshChoiceSelectedStyles(sec);
          });
        });
      }
    });
  }

  function renderResult() {
    const sectionScores = computeSectionScores();
    const lensScores = computeLensScores(sectionScores);
    const stage = stageFromLens(lensScores);

    const sorted = Object.entries(lensScores).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0]?.[0] || "—";
    const weakest = sorted[sorted.length - 1]?.[0] || "—";

    if (strongestEl) strongestEl.textContent = strongest;
    if (weakestEl) weakestEl.textContent = weakest;

    if (headline) headline.textContent = `${stage} signal — start with ${weakest}.`;

    // Resources (weakest lens first)
    if (resourceList) {
      resourceList.innerHTML = "";
      (RESOURCE_MAP[weakest] || []).forEach((r) => {
        resourceList.innerHTML += `<li><a href="${r.link}">${esc(r.title)}</a></li>`;
      });
    }

    if (result) result.hidden = false;

    const ok = saveFinal({ stage, lensScores, sectionScores });

    // Always dispatch the event (even if localStorage failed) to keep flow alive
    document.dispatchEvent(
      new CustomEvent("cyberseeds:snapshot-complete", {
        detail: { ok, stage, weakest, strongest },
      })
    );
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ---------- Modal open/close ---------- */
  function openModal() {
    step = -1;
    Object.keys(answers).forEach((k) => delete answers[k]);

    modal.classList.add("is-open");
    modal.removeAttribute("aria-hidden");
    lockBody();
    render();

    // Move focus to Next for keyboard users
    setTimeout(() => nextBtn.focus?.(), 0);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();
  }

  // Open buttons
  $$("[data-open-snapshot]").forEach((btn) => btn.addEventListener("click", openModal));

  // Close controls
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
  });

  /* ---------- Controls ---------- */
  nextBtn.addEventListener("click", () => {
    // If user tries to advance without completing, block softly
    if (step >= 0 && step < SECTIONS.length) {
      const sec = SECTIONS[step];
      if (!sectionComplete(sec)) return;
    }
    step++;
    render();
  });

  backBtn.addEventListener("click", () => {
    step--;
    render();
  });

  /* ---------- Optional: expose a reset hook ---------- */
  const resetBtn = $("#snapshotReset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearFinal();
      closeModal();
      // optional: hide resources button if you want
      const go = $("#goToResources");
      if (go) go.style.display = "none";
    });
  }

  /* ---------- Boot ---------- */
  // If a completed snapshot exists, reveal resources immediately.
  const existing = loadFinal();
  if (existing?.stage) {
    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete", { detail: existing }));
  }
})();
