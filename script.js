/* =========================================
   Cyber Seeds — Site + Snapshot + Resources
   iPhone/Safari hardened (menu + body lock)
   ========================================= */

console.log("✅ Cyber Seeds loaded");

window.addEventListener("error", e =>
  console.error("SCRIPT ERROR:", e.error || e.message)
);
window.addEventListener("unhandledrejection", e =>
  console.error("UNHANDLED PROMISE:", e.reason)
);

document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel, root = document) => root?.querySelector?.(sel) || null;
  const $$ = (sel, root = document) =>
    Array.from(root?.querySelectorAll?.(sel) || []);

  /* =============================
     YEAR
  ============================= */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* =============================
     MOBILE NAV (iOS SAFE)
  ============================= */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  if (navToggle && navMenu) {
    const closeNav = () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$("a", navMenu).forEach(a => a.addEventListener("click", closeNav));

    document.addEventListener("click", e => {
      if (!navMenu.classList.contains("is-open")) return;
      if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* =============================
     SNAPSHOT ELEMENTS
  ============================= */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMeta = $("#stepMeta");
  const controls = $("#snapshotControls");
  const closeBtn = $("#closeSnapshot");
  const chipsWrap = $("#snapshotChips");
  const exportBtn = $("#exportSnapshot");
  const retakeBtn = $("#retakeSnapshot");

  if (!modal || !form || !nextBtn || !backBtn) return;

  /* =============================
     QUESTIONS (Lens-specific)
  ============================= */
  const QUESTIONS = [
    {
      lens: "Network",
      q: "How protected is your home Wi-Fi beyond just the Wi-Fi password?",
      a: [
        { t: "Locked down", sub: "Router admin password changed • WPS off • guest Wi-Fi used", s: 4 },
        { t: "Mostly protected", sub: "Strong Wi-Fi password but unsure about router settings", s: 3 },
        { t: "Basic / default", sub: "Old/shared password • router never checked", s: 2 },
        { t: "No idea", sub: "I wouldn’t know where to look", s: 1 }
      ]
    },
    {
      lens: "Devices",
      q: "How safe are the devices people actually use day-to-day?",
      a: [
        { t: "Hardened", sub: "Auto-updates • screen locks • backups working", s: 4 },
        { t: "Mostly OK", sub: "Updates usually happen, some lag behind", s: 3 },
        { t: "Patchy", sub: "Old devices or missing locks/backups", s: 2 },
        { t: "Unsure", sub: "We just use them — no setup", s: 1 }
      ]
    },
    {
      lens: "Privacy",
      q: "How protected are your most important accounts (email, Apple/Google, banking)?",
      a: [
        { t: "Strongly protected", sub: "Unique passwords • password manager • 2-step on email", s: 4 },
        { t: "Some protection", sub: "Some 2-step but passwords reused", s: 3 },
        { t: "Weak protection", sub: "Reused passwords or recovery not reviewed", s: 2 },
        { t: "Overwhelmed", sub: "I avoid account settings", s: 1 }
      ]
    },
    {
      lens: "Scams",
      q: "If a message creates urgency (bank, parcel, ‘pay now’), what happens?",
      a: [
        { t: "Pause + verify", sub: "We check via official app or saved number", s: 4 },
        { t: "Cautious", sub: "We hesitate but sometimes click first", s: 3 },
        { t: "Pressured", sub: "Urgency sometimes wins", s: 2 },
        { t: "Already affected", sub: "We’ve lost money/data before", s: 1 }
      ]
    },
    {
      lens: "Wellbeing",
      q: "How is digital life affecting sleep, focus, and calm at home?",
      a: [
        { t: "Balanced", sub: "Boundaries feel calm • sleep mostly protected", s: 4 },
        { t: "A bit noisy", sub: "Some disruption, but manageable", s: 3 },
        { t: "Strained", sub: "Arguments, exhaustion, stress", s: 2 },
        { t: "Overwhelming", sub: "It regularly feels out of control", s: 1 }
      ]
    }
  ];

  const CHIPS = [
    "Runs locally on this device",
    "No accounts • no tracking",
    "2 minutes • 5 questions",
    "Clear next steps"
  ];

  /* =============================
     STATE
  ============================= */
  let step = -1;
  let answers = new Array(QUESTIONS.length).fill(null);

  /* =============================
     iOS BODY LOCK
  ============================= */
  let scrollY = 0;
  const lockBody = () => {
    scrollY = window.scrollY || 0;
    document.documentElement.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  };
  const unlockBody = () => {
    document.documentElement.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  };

  /* =============================
     HELPERS
  ============================= */
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* =============================
     CALCULATION
  ============================= */
  function calc() {
    const scores = {};
    QUESTIONS.forEach(q => (scores[q.lens] = 0));
    QUESTIONS.forEach((q, i) => {
      if (answers[i] != null) scores[q.lens] += answers[i];
    });

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((s, [, v]) => s + v, 0);

    let stage;
    if (total >= 18) stage = { name: "Clear", desc: "Your system feels stable — keep it steady." };
    else if (total >= 13) stage = { name: "Emerging", desc: "A few risk flows need tightening." };
    else stage = { name: "Vulnerable", desc: "Small, calm changes will reduce stress and risk quickly." };

    return {
      stage,
      strongest: ranked[0][0],
      weakest: ranked[ranked.length - 1][0],
      scores,
      total
    };
  }

  /* =============================
     RENDER
  ============================= */
  function renderIntro() {
    stepMeta.textContent = "";
    form.innerHTML =
      `<p class="muted">This is a calm signal — not a test. Answer as you are.</p>`;
    result.hidden = true;
    controls.style.display = "flex";
    backBtn.disabled = true;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    const current = answers[step];
    stepMeta.textContent = `${step + 1} / ${QUESTIONS.length}`;

    form.innerHTML = `
      <h3 class="q-title">${escapeHtml(q.q)}</h3>
      <div class="choices">
        ${q.a.map(opt => `
          <label class="choice">
            <input type="radio" name="q" value="${opt.s}" ${current === opt.s ? "checked" : ""}>
            <div><b>${escapeHtml(opt.t)}</b><span>${escapeHtml(opt.sub)}</span></div>
          </label>
        `).join("")}
      </div>
    `;

    backBtn.disabled = false;
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = current == null;

    $$(".choice", form).forEach(label => {
      label.addEventListener("click", () => {
        const input = $("input", label);
        if (!input) return;
        input.checked = true;
        answers[step] = Number(input.value);
        nextBtn.disabled = false;
      });
    });
  }

  function renderResult() {
    const out = calc();
    form.innerHTML = "";
    resultHeadline.textContent = `${out.stage.name} signal — ${out.stage.desc}`;
    strongestLensEl.textContent = out.strongest;
    weakestLensEl.textContent = out.weakest;
    localStorage.setItem("seed_snapshot_v1", JSON.stringify(out));
    result.hidden = false;
    controls.style.display = "none";
  }

  function render() {
    if (step < 0) return renderIntro();
    if (step >= QUESTIONS.length) return renderResult();
    return renderQuestion();
  }

  /* =============================
     MODAL CONTROL
  ============================= */
  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    if (chipsWrap) {
      chipsWrap.innerHTML = CHIPS.map(c => `<div class="chip">${escapeHtml(c)}</div>`).join("");
    }
    lockBody();
    step = -1;
    answers.fill(null);
    render();
    nextBtn.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();
  }

  $$("[data-open-snapshot]").forEach(btn =>
    btn.addEventListener("click", openModal)
  );

  closeBtn?.addEventListener("click", closeModal);
  $("[data-close]", modal)?.addEventListener("click", closeModal);

  nextBtn.addEventListener("click", () => {
    if (nextBtn.disabled) return;
    if (step < 0) step = 0;
    else if (answers[step] != null) step++;
    render();
  });

  backBtn.addEventListener("click", () => {
    step = step <= 0 ? -1 : step - 1;
    render();
  });

  exportBtn?.addEventListener("click", () => {
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) return;
    const data = JSON.parse(raw);
    const text =
`CYBER SEEDS — HOUSEHOLD SNAPSHOT

Overall Signal:
${data.stage.name}
${data.stage.desc}

Strongest Lens:
${data.strongest}

Weakest Lens:
${data.weakest}

Lens Breakdown:
- Network:   ${data.scores.Network}/4
- Devices:   ${data.scores.Devices}/4
- Privacy:   ${data.scores.Privacy}/4
- Scams:     ${data.scores.Scams}/4
- Wellbeing: ${data.scores.Wellbeing}/4

Nothing was sent anywhere.
This snapshot exists only on this device.
`;
    downloadText("Cyber-Seeds-Household-Snapshot.txt", text);
  });

  retakeBtn?.addEventListener("click", () => {
    step = -1;
    answers.fill(null);
    render();
  });
});
