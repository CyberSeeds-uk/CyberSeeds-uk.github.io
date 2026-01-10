document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---------- NAV TOGGLE ----------
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close on link click (mobile)
    $$("a", navMenu).forEach(a => a.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded","false");
    }));
  }

  // ---------- YEAR ----------
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------- SMOOTH SCROLL ----------
  $$("[data-scroll]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

    // ---------- SCROLL LOCK (MOBILE SAFE) ----------
  // IMPORTANT:
  // Do NOT use position:fixed on body (breaks iOS modals)
  const lockBody = () => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };

  const unlockBody = () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

  // ---------- SNAPSHOT QUIZ ----------
  const modal = $("#snapshotModal");
  const openBtns = ["#openSnapshotTop", "#openSnapshotCard"]
    .map(id => $(id))
    .filter(Boolean);

  const closeBtn = $("#closeSnapshot");
  const backdrop = modal ? $(".modal-backdrop", modal) : null;

  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");

  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMeta = $("#stepMeta");
  const controls = $("#snapshotControls");

  const exportBtn = $("#exportSnapshot");
  const retakeBtn = $("#retakeSnapshot");

  const LENSES = ["Network", "Devices", "Privacy", "Scams", "Wellbeing"];

  let step = -1;
  let answers = new Array(QUESTIONS.length).fill(null);

  const setStepMeta = () => {
    if (!stepMeta) return;
    if (step < 0) stepMeta.textContent = "";
    else stepMeta.textContent = `${step + 1} / ${QUESTIONS.length}`;
  };

  const render = () => {
    if (!form || !nextBtn || !backBtn) return;

    setStepMeta();

    // INTRO
    if (step < 0) {
      form.innerHTML = `
        <p class="muted">
          This is a calm household signal — not a test.
          Answer as you are today.
        </p>
      `;
      result.hidden = true;
      backBtn.disabled = true;
      nextBtn.textContent = "Start";
      nextBtn.disabled = false;
      controls.style.display = "flex";
      return;
    }

    // FINISH
    if (step >= QUESTIONS.length) {
      const out = calc();
      resultHeadline.textContent =
        `${out.stage.name} signal — ${out.stage.desc}`;

      strongestLensEl.textContent = out.strongest;
      weakestLensEl.textContent = out.weakest;

      try {
        localStorage.setItem("seed_snapshot_v1", JSON.stringify(out));
      } catch {}

      result.hidden = false;
      controls.style.display = "none";
      return;
    }

    // QUESTION
    const q = QUESTIONS[step];
    const current = answers[step];

    form.innerHTML = `
      <h3 class="q-title">${q.q}</h3>
      <div class="choices">
        ${q.a.map(opt => `
          <label class="choice">
            <input type="radio" name="q" value="${opt.s}" ${current === opt.s ? "checked" : ""}>
            <div>
              <b>${opt.t}</b>
              <span>${opt.sub}</span>
            </div>
          </label>
        `).join("")}
      </div>
    `;

    backBtn.disabled = step === 0;
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = current == null;
    controls.style.display = "flex";

    $$("input[type=radio]", form).forEach(r => {
      r.addEventListener("change", () => {
        answers[step] = parseInt(r.value, 10);
        nextBtn.disabled = false;
      });
    });
  };

  const openModal = () => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBody();
    step = -1;
    render();
    nextBtn.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();
  };

  openBtns.forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    openModal();
  }));

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  nextBtn?.addEventListener("click", e => {
    e.preventDefault();
    if (step < 0) { step = 0; render(); return; }
    if (answers[step] == null) return;
    step++;
    render();
  });

  backBtn?.addEventListener("click", e => {
    e.preventDefault();
    if (step <= 0) return;
    step--;
    render();
  });

  retakeBtn?.addEventListener("click", e => {
    e.preventDefault();
    answers.fill(null);
    step = -1;
    render();
  });

  exportBtn?.addEventListener("click", () => {
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cyber-seeds-snapshot.json";
    a.click();
  });

  // Initial safety render
  if (modal) render();
});
