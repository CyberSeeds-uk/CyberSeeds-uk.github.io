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

  // ---------- SCROLL LOCK (iOS-safe) ----------
  let lockedScrollY = 0;
  const lockBody = () => {
    lockedScrollY = window.scrollY || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  };
  const unlockBody = () => {
    document.body.style.position = "";
    const top = document.body.style.top;
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    const y = top ? Math.abs(parseInt(top, 10)) : lockedScrollY;
    window.scrollTo(0, y);
  };

  // ---------- SNAPSHOT QUIZ ----------
  const modal = $("#snapshotModal");
  const openBtns = ["#openSnapshotTop", "#openSnapshotCard", "#openSnapshotMobile"]
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

  const resourcesHub = $("#resourcesHub");

  const LENSES = ["Network", "Devices", "Privacy", "Scams", "Wellbeing"];

  // Each question contributes to ONE primary lens (keep it simple + explainable)
  const QUESTIONS = [
    { lens: "Network",
      q: "Do you know if your router admin password is still the default?",
      a: [
        { t: "Yes — I changed it", s: 2, sub: "Great. This blocks the easiest household takeover path." },
        { t: "Not sure", s: 1, sub: "Common. Most homes never check." },
        { t: "No — probably default", s: 0, sub: "This is a high-leverage fix." },
      ],
    },
    { lens: "Network",
      q: "Do you use a guest Wi-Fi for visitors / smart devices?",
      a: [
        { t: "Yes", s: 2, sub: "Segmentation reduces spread if one thing is compromised." },
        { t: "Sometimes / not consistently", s: 1, sub: "Close — the habit matters." },
        { t: "No", s: 0, sub: "Most homes run everything on one network." },
      ],
    },
    { lens: "Devices",
      q: "How confident are you that phones/laptops update regularly?",
      a: [
        { t: "Updates are on / frequent", s: 2, sub: "Good: fewer known vulnerabilities." },
        { t: "Mixed across devices", s: 1, sub: "One neglected device can carry risk." },
        { t: "Rare / disabled", s: 0, sub: "This is one of the biggest risk multipliers." },
      ],
    },
    { lens: "Devices",
      q: "If a phone was lost today, could you recover important accounts/data?",
      a: [
        { t: "Yes — backups + account recovery set", s: 2, sub: "Excellent resilience." },
        { t: "Partially", s: 1, sub: "Better than nothing; tighten the weak links." },
        { t: "No / unsure", s: 0, sub: "This increases the damage of any incident." },
      ],
    },
    { lens: "Privacy",
      q: "Do you use unique passwords (or a password manager) for key accounts?",
      a: [
        { t: "Yes", s: 2, sub: "This blocks credential-stuffing." },
        { t: "Some accounts", s: 1, sub: "Focus on email, banking, Apple/Google first." },
        { t: "No / reused", s: 0, sub: "This is the most common breach cause." },
      ],
    },
    { lens: "Privacy",
      q: "Do you have 2-step verification (2FA) on your main email?",
      a: [
        { t: "Yes", s: 2, sub: "Email is the root key. This matters." },
        { t: "Not sure", s: 1, sub: "Worth checking today." },
        { t: "No", s: 0, sub: "This is a priority fix." },
      ],
    },
    { lens: "Scams",
      q: "If a message asked for urgent payment or codes, would your household pause and verify?",
      a: [
        { t: "Yes — we have a rule", s: 2, sub: "That rule prevents most losses." },
        { t: "Sometimes", s: 1, sub: "Pressure tactics work when tired/busy." },
        { t: "No / unsure", s: 0, sub: "A simple rule changes everything." },
      ],
    },
    { lens: "Scams",
      q: "Has anyone in the home been caught by a scam in the last 12 months?",
      a: [
        { t: "No", s: 2, sub: "Good — keep your defences steady." },
        { t: "Nearly / suspicious events", s: 1, sub: "Signals exposure; adjust habits." },
        { t: "Yes", s: 0, sub: "This is information, not shame — we harden the system." },
      ],
    },
    { lens: "Wellbeing",
      q: "Do you have any screen boundaries that protect sleep (especially for kids)?",
      a: [
        { t: "Yes", s: 2, sub: "Sleep protection is digital safety." },
        { t: "In progress", s: 1, sub: "Good — make it predictable." },
        { t: "No", s: 0, sub: "Start with one small boundary." },
      ],
    },
    { lens: "Wellbeing",
      q: "Do devices or online conflict regularly cause tension in the household?",
      a: [
        { t: "Rarely", s: 2, sub: "Good — your system is calmer." },
        { t: "Sometimes", s: 1, sub: "Normal — systems reduce friction." },
        { t: "Often", s: 0, sub: "Treat this as a signal to redesign routines." },
      ],
    },
  ];

  let step = -1;
  let answers = new Array(QUESTIONS.length).fill(null);

  const stageFromAvg = (avg) => {
    if (avg >= 1.7) return { name: "Flourish", desc: "Your system is stable. You’re mostly refining and maintaining." };
    if (avg >= 1.1) return { name: "Sprout", desc: "Good foundations. One or two upgrades will change the whole system." };
    return { name: "Seed", desc: "Early-stage signal. The goal is momentum, not perfection." };
  };

  const calc = () => {
    const lensScores = Object.fromEntries(LENSES.map(l => [l, { total:0, count:0 }]));
    answers.forEach((val, i) => {
      if (val == null) return;
      const lens = QUESTIONS[i].lens;
      lensScores[lens].total += val;
      lensScores[lens].count += 1;
    });

    const lensAvg = {};
    LENSES.forEach(l => {
      lensAvg[l] = lensScores[l].count ? (lensScores[l].total / lensScores[l].count) : 0;
    });

    const allAnswered = answers.every(v => v != null);
    const overallAvg = allAnswered
      ? (answers.reduce((a,b)=>a+b,0) / answers.length)
      : 0;

    const strongest = LENSES.slice().sort((a,b)=>lensAvg[b]-lensAvg[a])[0];
    const weakest = LENSES.slice().sort((a,b)=>lensAvg[a]-lensAvg[b])[0];

    return { lensAvg, overallAvg, strongest, weakest, stage: stageFromAvg(overallAvg) };
  };

  const setStepMeta = () => {
    if (!stepMeta) return;
    if (step < 0) { stepMeta.textContent = ""; return; }
    stepMeta.textContent = `${Math.min(step+1, QUESTIONS.length)} / ${QUESTIONS.length}`;
  };

  const render = () => {
    if (!form || !nextBtn || !backBtn || !result || !controls) return;

    setStepMeta();

    // Start screen
    if (step < 0) {
      form.innerHTML = `
        <p class="muted" style="margin:0;">
          This is a quick household “signal” check — not a moral judgement.
          Answer as you are today.
        </p>
      `;
      result.hidden = true;
      controls.style.display = "flex";
      backBtn.disabled = true;
      nextBtn.textContent = "Start";
      nextBtn.disabled = false;
      return;
    }

    // Finished
    if (step >= QUESTIONS.length) {
      const out = calc();
      const weak = out.weakest;
      const strong = out.strongest;

      resultHeadline.textContent =
        `${out.stage.name} signal — ${out.stage.desc} Your next best move is to strengthen ${weak}.`;

      strongestLensEl.textContent = strong;
      weakestLensEl.textContent = weak;

      // persist
      const snapshot = {
        version: "seed_snapshot_v1",
        createdAt: new Date().toISOString(),
        answers,
        lensAvg: out.lensAvg,
        overallAvg: out.overallAvg,
        strongest: strong,
        weakest: weak,
        stage: out.stage
      };
      try { localStorage.setItem("seed_snapshot_v1", JSON.stringify(snapshot)); } catch {}

      // show result, hide controls
      result.hidden = false;
      controls.style.display = "none";

      // refresh resources hub if we're on resources page
      if (resourcesHub) renderResources(resourcesHub, snapshot);

      return;
    }

    // Question view
    const q = QUESTIONS[step];
    const current = answers[step];

    form.innerHTML = `
      <h3 class="q-title">${q.q}</h3>
      <div class="choices">
        ${q.a.map((opt, idx) => {
          const checked = (current === opt.s) ? "checked" : "";
          return `
            <label class="choice">
              <input type="radio" name="q" value="${opt.s}" ${checked} />
              <div>
                <b>${opt.t}</b>
                <span>${opt.sub}</span>
              </div>
            </label>
          `;
        }).join("")}
      </div>
    `;

    result.hidden = true;
    controls.style.display = "flex";

    // back + next button state
    backBtn.disabled = (step === 0);
    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    nextBtn.disabled = (current == null);

    // bind radios
    $$('input[type="radio"]', form).forEach(r => {
      r.addEventListener("change", () => {
        const v = parseInt(r.value, 10);
        answers[step] = v;
        nextBtn.disabled = false;
      });
    });
  };

  const openModal = () => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBody();

    // reset to start, but keep previous answers if they exist (optional)
    step = -1;
    render();

    // focus for accessibility
    const focusTarget = $("#closeSnapshot") || $("#snapshotNext");
    if (focusTarget) focusTarget.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();
  };

  openBtns.forEach(btn => btn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  }));

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  if (nextBtn) nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (step < 0) { step = 0; render(); return; }
    if (answers[step] == null) return;
    step += 1;
    render();
  });

  if (backBtn) backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (step <= 0) return;
    step -= 1;
    render();
  });

  if (retakeBtn) retakeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    answers = new Array(QUESTIONS.length).fill(null);
    step = -1;
    render();
  });

  if (exportBtn) exportBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) return alert("No snapshot found yet. Take the snapshot first.");

    // Download JSON (works on mobile + desktop)
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cyber-seeds-snapshot.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ---------- RESOURCES HUB ----------
  function renderResources(rootEl, snapshot){
    const weak = snapshot.weakest;

    const packs = [
      {
        title: "Your priority pack",
        desc: `Start with the lens that will change your system fastest: ${weak}.`,
        items: getPackForLens(weak)
      },
      {
        title: "The 30-minute household hardening",
        desc: "A short set of moves that reduce risk quickly, without overwhelm.",
        items: [
          { t:"Turn on 2-step verification for email", d:"Email is the root key. Protect it first." },
          { t:"Update phones and laptops", d:"Known vulnerabilities shrink immediately." },
          { t:"Change router admin password", d:"Blocks the easiest household takeover path." },
          { t:"Make a household scam rule", d:"‘Pause + verify’ prevents most losses." },
        ]
      }
    ];

    rootEl.innerHTML = `
      ${packs.map(p => `
        <section class="resource-pack">
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
          <div class="resource-items">
            ${p.items.map(it => `
              <article class="resource-item">
                <h4>${it.t}</h4>
                <p>${it.d}</p>
              </article>
            `).join("")}
          </div>
        </section>
      `).join("")}
    `;
  }

  function getPackForLens(lens){
    switch(lens){
      case "Network":
        return [
          { t:"Change router admin password", d:"Different from Wi-Fi password. Stops admin takeover." },
          { t:"Rename Wi-Fi + use WPA2/WPA3", d:"Avoid default names that reveal router model." },
          { t:"Create a guest network", d:"Keep visitors/smart devices separate from main devices." },
          { t:"Update router firmware", d:"Patch old vulnerabilities at the household edge." },
        ];
      case "Devices":
        return [
          { t:"Enable automatic updates", d:"The easiest protective habit." },
          { t:"Screen lock + strong passcode", d:"Protects the device if lost." },
          { t:"Backups (iCloud/Google/PC)", d:"Reduces damage from loss or compromise." },
          { t:"Remove risky/unused apps", d:"Less surface area, less surprise." },
        ];
      case "Privacy":
        return [
          { t:"Password manager or unique passwords", d:"Stops credential-stuffing domino effects." },
          { t:"2FA on email + banking", d:"Blocks most account takeovers." },
          { t:"Review social sharing", d:"Reduce address/school/location exposure." },
          { t:"Check breached passwords", d:"Replace anything reused." },
        ];
      case "Scams":
        return [
          { t:"Household scam rule", d:"‘Pause + verify’ before paying or sharing codes." },
          { t:"Bank/contact verification list", d:"Use saved numbers, not message links." },
          { t:"Report + recover checklist", d:"Know what to do in the first 10 minutes." },
          { t:"Turn on transaction alerts", d:"Detect fraud early." },
        ];
      case "Wellbeing":
        return [
          { t:"Protect sleep windows", d:"Charge devices outside bedrooms if possible." },
          { t:"One family boundary", d:"E.g., no devices at meals or before school." },
          { t:"Reduce conflict triggers", d:"Set predictable rules, not reactive arguments." },
          { t:"Kids: age-appropriate controls", d:"Defaults help when life is busy." },
        ];
      default:
        return [
          { t:"Start with one small move", d:"Momentum beats perfection." }
        ];
    }
  }

  // If resources hub exists, render from stored snapshot (if present)
  if (resourcesHub) {
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) {
      resourcesHub.innerHTML = `
        <section class="resource-pack">
          <h3>No snapshot yet</h3>
          <p>Take the household snapshot and your personalised hub will appear here.</p>
        </section>
      `;
    } else {
      try {
        const snapshot = JSON.parse(raw);
        renderResources(resourcesHub, snapshot);
      } catch {
        resourcesHub.innerHTML = `
          <section class="resource-pack">
            <h3>Snapshot data couldn’t be read</h3>
            <p>Retake the snapshot to rebuild your hub.</p>
          </section>
        `;
      }
    }
  }

  // Initial render (only if modal exists on page)
  if (modal && form && nextBtn && backBtn) render();
});
