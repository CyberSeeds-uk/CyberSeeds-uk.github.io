// ===============================
// CYBER SEEDS SNAPSHOT ENGINE (PRODUCTION)
// ===============================

console.log("\u2705 Cyber Seeds snapshot engine loaded");

window.addEventListener("error", e =>
  console.error("SCRIPT ERROR:", e.error)
);
window.addEventListener("unhandledrejection", e =>
  console.error("UNHANDLED PROMISE REJECTION:", e.reason)
);


document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ===============================
     QUESTIONS
     =============================== */
  const QUESTIONS = [
    {
      lens: "Network",
      q: "How confident do you feel about your home Wi-Fi setup?",
      a: [
        { t: "Very confident", sub: "Passwords, updates, guest network handled", s: 4 },
        { t: "Mostly confident", sub: "Some gaps but generally OK", s: 3 },
        { t: "Not very confident", sub: "I’m unsure what’s set up", s: 2 },
        { t: "No idea", sub: "I’ve never looked at it", s: 1 }
      ]
    },
    {
      lens: "Devices",
      q: "How well are devices kept up to date?",
      a: [
        { t: "Automatically updated", sub: "Phones, tablets, laptops covered", s: 4 },
        { t: "Mostly updated", sub: "Some delays or old devices", s: 3 },
        { t: "Rarely updated", sub: "Updates often ignored", s: 2 },
        { t: "Never checked", sub: "I wouldn’t know how", s: 1 }
      ]
    },
    {
      lens: "Privacy",
      q: "How comfortable are you managing privacy and accounts?",
      a: [
        { t: "Very comfortable", sub: "Passwords, 2FA, privacy settings handled", s: 4 },
        { t: "Somewhat comfortable", sub: "Basic protection in place", s: 3 },
        { t: "Uncomfortable", sub: "I reuse passwords or feel unsure", s: 2 },
        { t: "Overwhelmed", sub: "I avoid thinking about it", s: 1 }
      ]
    },
    {
      lens: "Scams",
      q: "How prepared do you feel for scams or fraud?",
      a: [
        { t: "Very prepared", sub: "I can spot and stop them", s: 4 },
        { t: "Somewhat prepared", sub: "I’m cautious but unsure", s: 3 },
        { t: "Not prepared", sub: "I worry about mistakes", s: 2 },
        { t: "Already affected", sub: "We’ve been caught before", s: 1 }
      ]
    },
    {
      lens: "Wellbeing",
      q: "How healthy does digital life feel in your home?",
      a: [
        { t: "Balanced", sub: "Boundaries feel calm and respected", s: 4 },
        { t: "Mostly OK", sub: "Some tension or disruption", s: 3 },
        { t: "Strained", sub: "Arguments, exhaustion, stress", s: 2 },
        { t: "Overwhelming", sub: "It feels out of control", s: 1 }
      ]
    }
  ];

  /* ===============================
     STATE
     =============================== */
  let step = -1;
  let answers = new Array(QUESTIONS.length).fill(null);

  /* ===============================
     ELEMENTS (GUARDED)
     =============================== */
  const modal = $("#snapshotModal");

// Do NOT abort script if modal is missing
// This allows buttons & future hydration to still bind


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
  const backdrop = $(".modal-backdrop", modal);

  const openBtns = ["#openSnapshotTop", "#openSnapshotCard"]
    .map(id => $(id))
    .filter(Boolean);

  /* ===============================
     BODY LOCK
     =============================== */
  const lockBody = () => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };
  const unlockBody = () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

  /* ===============================
     CALCULATION
     =============================== */
  function calc() {
    const scores = {};
    QUESTIONS.forEach(q => (scores[q.lens] = 0));
    QUESTIONS.forEach((q, i) => answers[i] != null && (scores[q.lens] += answers[i]));

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((s, [, v]) => s + v, 0);

    let stage;
    if (total >= 18) stage = { name: "Clear", desc: "Your system is largely stable" };
    else if (total >= 13) stage = { name: "Emerging", desc: "Some risk flows need attention" };
    else stage = { name: "Vulnerable", desc: "Small, calm changes will help" };

    return { stage, strongest: ranked[0][0], weakest: ranked.at(-1)[0], scores, total };
  }

  /* ===============================
     RENDER
     =============================== */
  function render() {
    stepMeta.textContent = step < 0 ? "" : `${step + 1} / ${QUESTIONS.length}`;

    if (step < 0) {
      form.innerHTML = `<p class="muted">This is a calm signal — not a test.</p>`;
      result.hidden = true;
      backBtn.disabled = true;
      nextBtn.textContent = "Start";
      nextBtn.disabled = false;
      controls.style.display = "flex";
      return;
    }

    if (step >= QUESTIONS.length) {
      const out = calc();
      resultHeadline.textContent = `${out.stage.name} signal — ${out.stage.desc}`;
      strongestLensEl.textContent = out.strongest;
      weakestLensEl.textContent = out.weakest;
      localStorage.setItem("seed_snapshot_v1", JSON.stringify(out));
      result.hidden = false;
      controls.style.display = "none";
      return;
    }

    const q = QUESTIONS[step];
    const current = answers[step];

    form.innerHTML = `
      <h3 class="q-title">${q.q}</h3>
      <div class="choices">
        ${q.a
          .map(
            opt => `
          <label class="choice">
            <input type="radio" name="q" value="${opt.s}" ${current === opt.s ? "checked" : ""}>
            <div><b>${opt.t}</b><span>${opt.sub}</span></div>
          </label>`
          )
          .join("")}
      </div>
    `;

    backBtn.disabled = step === 0;
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = current == null;

    $$("input[type=radio]", form).forEach(r =>
      r.addEventListener("change", () => {
        answers[step] = Number(r.value);
        nextBtn.disabled = false;
      })
    );
  }

  /* ===============================
     MODAL CONTROL
     =============================== */
  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
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

  openBtns.forEach(btn => btn.addEventListener("click", openModal));
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);
  window.addEventListener("keydown", e => e.key === "Escape" && closeModal());

  nextBtn?.addEventListener("click", () => {
    if (step < 0) step = 0;
    else if (answers[step] != null) step++;
    render();
  });

  backBtn?.addEventListener("click", () => {
    if (step > 0) step--;
    render();
  });
});
