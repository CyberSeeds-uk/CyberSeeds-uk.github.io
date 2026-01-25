/* =========================================
   Cyber Seeds — robust snapshot + navigation
   - Modal always opens
   - Back button closes modal safely
   - Reset snapshot (clears local storage)
   - Personalised resources handoff
   - Printable + downloadable HTML report
   ========================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "seed_snapshot_v2";
  const STORAGE_TS_KEY = "seed_snapshot_v2_ts";

  // ---------- YEAR ----------
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- MOBILE NAV ----------
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  const closeNav = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$("a", navMenu).forEach(a => a.addEventListener("click", closeNav));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeNav();
    });

    document.addEventListener("click", e => {
      if (!navMenu.classList.contains("is-open")) return;
      if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });
  }

  // ---------- SMOOTH SCROLL (handles #hash) ----------
  $$("[data-scroll]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      closeNav();
      const y = target.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", href);
    });
  });

  // ---------- SNAPSHOT MODAL ELEMENTS ----------
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const resultSection = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMeta = $("#stepMeta");
  const controls = $("#snapshotControls");
  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");
  const chipsWrap = $("#snapshotChips");
  const scrollEl = $("#snapshotScroll");

  // Optional result bars (if you add them in HTML)
  const barEls = {
    Network: $("#barNetwork"),
    Devices: $("#barDevices"),
    Privacy: $("#barPrivacy"),
    Scams: $("#barScams"),
    Wellbeing: $("#barWellbeing"),
  };
  const valEls = {
    Network: $("#valNetwork"),
    Devices: $("#valDevices"),
    Privacy: $("#valPrivacy"),
    Scams: $("#valScams"),
    Wellbeing: $("#valWellbeing"),
  };

  const printBtn = $("#printSnapshot");
  const dlHtmlBtn = $("#downloadSnapshotHtml");
  const retakeBtn = $("#retakeSnapshot");

  // Resources page container (may exist on /resources/)
  const resourcesEl = $("#resourcesHub");

  const hasSnapshotUI = !!(modal && form && nextBtn && backBtn);

  // ---------- QUESTIONS ----------
  const QUESTIONS = [
    {
      lens: "Network",
      q: "How protected is your home Wi-Fi beyond the Wi-Fi password?",
      a: [
        { t: "Locked down", sub: "Router admin password changed • WPS off • guest Wi-Fi used", s: 4 },
        { t: "Mostly protected", sub: "Strong Wi-Fi password but unsure about router settings", s: 3 },
        { t: "Basic / default", sub: "Old/shared password • router never checked", s: 2 },
        { t: "No idea", sub: "I wouldn’t know where to look", s: 1 }
      ]
    },
    {
      lens: "Devices",
      q: "How steady are everyday devices (phones, tablets, laptops)?",
      a: [
        { t: "Hardened", sub: "Auto-updates • screen locks • backups working", s: 4 },
        { t: "Mostly OK", sub: "Updates usually happen, some lag behind", s: 3 },
        { t: "Patchy", sub: "Old devices or missing locks/backups", s: 2 },
        { t: "Unsure", sub: "We just use them — no setup", s: 1 }
      ]
    },
    {
      lens: "Privacy",
      q: "How protected are key accounts (email, Apple/Google, banking)?",
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

  // ---------- STATE ----------
  let step = -1; // -1 intro, 0..n-1 question, n result
  let answers = new Array(QUESTIONS.length).fill(null);

  // ---------- iOS BODY LOCK HELPERS ----------
  let scrollY = 0;

  const lockBody = () => {
    scrollY = window.scrollY || 0;
    document.documentElement.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.webkitOverflowScrolling = "auto"; 
  };

  const unlockBody = () => {
    document.documentElement.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
    document.body.style.webkitOverflowScrolling = ""; 
  };

  // ---------- STORAGE ----------
  const saveSnapshot = (snapshot) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }
  };

  const loadSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearSnapshot = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TS_KEY);
    } catch (e) {
      console.warn("LocalStorage clear failed:", e);
    }
  };

  // ---------- CALCULATION ----------
  function calcSnapshot() {
    const scores = { Network: 0, Devices: 0, Privacy: 0, Scams: 0, Wellbeing: 0 };
    QUESTIONS.forEach((q, i) => {
      if (answers[i] != null) scores[q.lens] += Number(answers[i]);
    });

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((sum, [, val]) => sum + val, 0);

    // Stage: 5 questions, each 1..4 => total 5..20
    let stage;
    if (total >= 18) stage = { name: "Clear", desc: "Your digital ecosystem feels stable. Keep routines steady and protect the basics." };
    else if (total >= 13) stage = { name: "Emerging", desc: "A few risk flows need tightening. Small changes will reduce stress and risk quickly." };
    else stage = { name: "Vulnerable", desc: "This is common, not a failing. Start with one calm fix — you’ll feel the difference fast." };

    const strongest = ranked[0][0];
    const weakest = ranked[ranked.length - 1][0];

    // Tie detection
    const isAllEqual = ranked[0][1] === ranked[ranked.length - 1][1];

    return { stage, strongest, weakest, scores, total, isAllEqual };
  }

  // ---------- RENDERING ----------
  function renderIntro() {
    if (!hasSnapshotUI) return;
    stepMeta.textContent = "";
    form.innerHTML = `
      <p class="muted">
        This is a calm signal — not a test. Answer as you are. We only ask what helps you take a useful next step.
      </p>
    `;
    if (resultSection) resultSection.hidden = true;
    if (controls) controls.style.display = "flex";
    backBtn.disabled = true;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    if (scrollEl) scrollEl.scrollTop = 0;
  }

  function renderQuestion() {
    if (!hasSnapshotUI) return;
    const q = QUESTIONS[step];
    const current = answers[step];

    stepMeta.textContent = `${step + 1} / ${QUESTIONS.length}`;

    form.innerHTML = `
      <h3 class="q-title">${escapeHTML(q.q)}</h3>
      <div class="choices">
        ${q.a.map(opt => `
          <label class="choice" role="button" tabindex="0">
            <input type="radio" name="q${step}" value="${opt.s}" ${current === opt.s ? "checked" : ""} />
            <div>
              <b>${escapeHTML(opt.t)}</b>
              <span>${escapeHTML(opt.sub)}</span>
            </div>
          </label>
        `).join("")}
      </div>
    `;

    backBtn.disabled = false;
    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    nextBtn.disabled = current == null;

    // Make entire label clickable/keyboard-selectable
    $$(".choice", form).forEach(label => {
      const activate = () => {
        const input = $("input", label);
        if (!input) return;
        input.checked = true;
        answers[step] = Number(input.value);
        nextBtn.disabled = false;
      };
      label.addEventListener("click", activate);
      label.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });

    if (scrollEl) scrollEl.scrollTop = 0;
  }

  function renderResult() {
    if (!hasSnapshotUI) return;

    const snapshot = calcSnapshot();

    // Save snapshot for Resources hub
    saveSnapshot(snapshot);

    // Update headline + strongest/weakest labels
    if (resultHeadline) resultHeadline.textContent = `${snapshot.stage.name} signal — ${snapshot.stage.desc}`;

    if (snapshot.isAllEqual) {
      if (strongestLensEl) strongestLensEl.textContent = "Balanced";
      if (weakestLensEl) weakestLensEl.textContent = "Balanced";
    } else {
      if (strongestLensEl) strongestLensEl.textContent = snapshot.strongest;
      if (weakestLensEl) weakestLensEl.textContent = snapshot.weakest;
    }

    // Optional bar UI updates if present
    updateBars(snapshot);

    form.innerHTML = "";
    if (resultSection) resultSection.hidden = false;
    if (controls) controls.style.display = "none";
    if (scrollEl) scrollEl.scrollTop = 0;

    // If we're on resources page, populate immediately
    if (resourcesEl) populateResourcesHub(snapshot);
  }

  function render() {
    if (!hasSnapshotUI) return;
    if (step < 0) renderIntro();
    else if (step >= QUESTIONS.length) renderResult();
    else renderQuestion();
  }

  // ---------- MODAL OPEN/CLOSE + BACK BUTTON ----------
  function openModal() {
    if (!hasSnapshotUI) return;

    // Inject chips
    if (chipsWrap) {
      chipsWrap.innerHTML = CHIPS.map(c => `<div class="chip">${escapeHTML(c)}</div>`).join("");
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBody();

    // Reset state each open
    step = -1;
    answers = new Array(QUESTIONS.length).fill(null);
    render();

    // Push state so browser Back closes modal
    // Use a distinct state marker (avoid stacking duplicates)
    const st = history.state || {};
    if (!st.__seedModal) {
       history.replaceState(history.state || {}, "", "#");
       history.pushState({ ...(st || {}), __seedModal: true }, "", "#snapshot");
    }
  }

  function closeModal({ viaPop = false } = {}) {
    if (!hasSnapshotUI) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();

    // If closed by UI (not popstate), tidy the URL/state
    if (!viaPop) {
      const st = history.state || {};
      if (st.__seedModal) history.back();
      else history.replaceState(st, "", "#");
    }
  }

  // Listen for back button
  window.addEventListener("popstate", () => {
    if (!hasSnapshotUI) return;
    if (modal.classList.contains("is-open")) {
      // Close modal but do not trigger history.back() again
      closeModal({ viaPop: true });
    }
  });

  // ---------- BUTTON WIRING ----------
  // Open modal triggers
  $$("[data-open-snapshot]").forEach(btn => btn.addEventListener("click", openModal));

  // Close on close button or backdrop
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal());
  const backdrop = modal ? $("[data-close]", modal) : null;
  if (backdrop) backdrop.addEventListener("click", () => closeModal());

  // Next/Back controls inside modal
  if (hasSnapshotUI) {
    nextBtn.addEventListener("click", () => {
      if (nextBtn.disabled) return;
      if (step < 0) step = 0;
      else if (answers[step] != null) step++;
      render();
    });

    backBtn.addEventListener("click", () => {
      if (step <= 0) step = -1;
      else step--;
      render();
    });
  }

  // Retake within result
  if (retakeBtn) {
    retakeBtn.addEventListener("click", () => {
      step = -1;
      answers = new Array(QUESTIONS.length).fill(null);
      if (controls) controls.style.display = "flex";
      if (resultSection) resultSection.hidden = true;
      render();
    });
  }

  // Reset snapshot: clears storage + restarts (useful if user wants fresh resources)
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearSnapshot();
      step = -1;
      answers = new Array(QUESTIONS.length).fill(null);
      if (controls) controls.style.display = "flex";
      if (resultSection) resultSection.hidden = true;
      render();
    });
  }

  // Print report (opens a print-friendly window)
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const snap = loadSnapshot() || calcSnapshotFromStorageOrNull();
      if (!snap) return;
      const html = buildReportHTML(snap, { forPrint: true });
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    });
  }

  // Download full HTML report (finalised)
  if (dlHtmlBtn) {
    dlHtmlBtn.addEventListener("click", () => {
      const snap = loadSnapshot() || calcSnapshotFromStorageOrNull();
      if (!snap) return;
      const html = buildReportHTML(snap, { forPrint: false });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Cyber-Seeds-Household-Snapshot-Report.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // ---------- RESOURCES HUB CONTENT (Personalised, valuable) ----------
  const RESOURCES_CONTENT = {
    Network: {
      title: "Network Lens — make the home Wi-Fi trustworthy",
      why: "Your router is the gateway to everything in the home. A few calm settings reduce risk for everyone.",
      steps: [
        { t: "Change the router admin password", d: "This is different from the Wi-Fi password. If it’s still the default, anyone with access to the label/manual can guess it." },
        { t: "Disable WPS", d: "WPS (push-button pairing) is convenient, but it reduces the effort needed for unwanted connection attempts." },
        { t: "Create a Guest Wi-Fi", d: "Put visitors, smart TVs, and ‘unknown’ devices on guest Wi-Fi so your main devices stay more protected." },
        { t: "Check updates (router firmware)", d: "If your ISP router updates automatically, great. If not, check the model page or ISP help page for updates." }
      ],
      seed: "Digital Seed: once a month, spend 2 minutes checking ‘who’s connected’ in your router/app."
    },
    Devices: {
      title: "Devices Lens — keep everyday devices steady",
      why: "Most household risks arrive through devices people actually touch every day: phones, tablets, laptops.",
      steps: [
        { t: "Turn on automatic updates", d: "Security fixes work best when they happen quietly in the background." },
        { t: "Use screen locks on every device", d: "A lost phone shouldn’t become an open door. Prefer PIN + biometrics." },
        { t: "Confirm backups are real", d: "A backup that hasn’t been tested is a hope, not a safety net. Check one photo/file can be restored." },
        { t: "Remove unused apps & old accounts", d: "Less surface area, less confusion, less risk." }
      ],
      seed: "Digital Seed: ‘Update + Lock + Backup’ — a 30-second family ritual on Sundays."
    },
    Privacy: {
      title: "Privacy Lens — protect accounts that protect everything else",
      why: "If email or Apple/Google accounts are compromised, attackers can reset passwords elsewhere.",
      steps: [
        { t: "Add 2-step verification to your email first", d: "Email is the password-reset key for most services. Protect it like your house keys." },
        { t: "Use a password manager (optional but powerful)", d: "It reduces reuse and removes mental load. Choose one that feels simple." },
        { t: "Review account recovery options", d: "Remove old phone numbers and emails. Ensure only you can reset access." },
        { t: "Reduce public exposure", d: "Audit what’s visible on social profiles; remove address, school details, or routines if present." }
      ],
      seed: "Digital Seed: protect the ‘root accounts’ (email + Apple/Google) before everything else."
    },
    Scams: {
      title: "Scam Defence Lens — build a calm pause reflex",
      why: "Scams succeed by urgency. The household skill is not ‘never click’ — it’s ‘pause, verify, proceed’.",
      steps: [
        { t: "Create one household rule: ‘No money moves via links’ ", d: "If a message asks for payment, open the official app/site yourself." },
        { t: "Use saved numbers, not message numbers", d: "If your bank calls, hang up and ring the number from the back of your card/app." },
        { t: "Share scam attempts as a family", d: "A 30-second conversation teaches pattern recognition faster than any poster." },
        { t: "Report suspicious messages", d: "Forward scam texts to 7726 (UK) and delete; report phishing emails in your mail app." }
      ],
      seed: "Digital Seed: teach the ‘PAUSE’ habit: Pause • Ask • Use official route • Save evidence • Exit."
    },
    Wellbeing: {
      title: "Child Digital Wellbeing Lens — reduce friction, protect sleep",
      why: "Safety isn’t only about attacks; it’s also about attention, mood, rest, and family calm.",
      steps: [
        { t: "Protect sleep first", d: "Create one device-down time (e.g., 30–60 minutes before bed). Start gentle, not strict." },
        { t: "Use built-in Screen Time / Digital Wellbeing tools", d: "Not as punishment — as visibility. Children often self-regulate better when they can see patterns." },
        { t: "Make ‘open door’ conversations normal", d: "If something feels weird online, the rule is ‘tell us early’ — no blame." },
        { t: "Separate ‘private’ from ‘secret’", d: "Children deserve privacy. But secrecy around risk should be discussable with trusted adults." }
      ],
      seed: "Digital Seed: one weekly ‘digital check-in’ question: “Anything online feel confusing this week?”"
    }
  };

  function populateResourcesHub(snapshot = null) {
    if (!resourcesEl) return;

    const snap = snapshot || loadSnapshot();
    if (!snap) {
      resourcesEl.innerHTML = `
        <div class="card">
          <h2>Personalised resources appear after a snapshot</h2>
          <p class="muted">Take the 2-minute snapshot on this device to receive a calm, prioritised action plan.</p>
        </div>
      `;
      return;
    }

    const focusLens = snap.isAllEqual ? "Privacy" : snap.weakest; // fallback focus if fully balanced
    const pack = RESOURCES_CONTENT[focusLens];

    resourcesEl.innerHTML = `
      <div class="card">
        <p class="eyebrow">Your prioritised focus</p>
        <h2>${escapeHTML(pack.title)}</h2>
        <p class="muted">${escapeHTML(pack.why)}</p>
      </div>

      <div class="card">
        <h3>Small actions you can do today</h3>
        <ol class="steps">
          ${pack.steps.map(s => `
            <li>
              <b>${escapeHTML(s.t)}</b>
              <div class="muted">${escapeHTML(s.d)}</div>
            </li>
          `).join("")}
        </ol>
        <div class="seed-note">
          <b>${escapeHTML(pack.seed.split(":")[0])}:</b> ${escapeHTML(pack.seed.split(":").slice(1).join(":").trim())}
      </div>

      <div class="card">
        <h3>Your snapshot overview</h3>
        <p class="muted"><b>${escapeHTML(snap.stage.name)}</b> — ${escapeHTML(snap.stage.desc)}</p>
        <div class="mini-bars">
          ${Object.keys(snap.scores).map(l => {
            const pct = Math.round((snap.scores[l] / 4) * 100);
            return `
              <div class="mini-row">
                <span>${escapeHTML(l)}</span>
                <div class="mini-track"><div class="mini-fill" style="width:${pct}%"></div></div>
                <span class="mini-val">${snap.scores[l]}/4</span>
              </div>
            `;
          }).join("")}
        </div>
    `;
  }

  // Populate resources on load if on that page
  if (resourcesEl) populateResourcesHub();

  // ---------- HELPERS ----------
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function updateBars(snapshot) {
    // Each lens max score 4 (single question), so percent = score/4
    Object.keys(snapshot.scores).forEach(lens => {
      const pct = Math.round((snapshot.scores[lens] / 4) * 100);
      if (barEls[lens]) barEls[lens].style.width = `${pct}%`;
      if (valEls[lens]) valEls[lens].textContent = `${snapshot.scores[lens]}/4`;
    });
  }

  function calcSnapshotFromStorageOrNull() {
    // If user tries to print/download without taking snapshot, use stored if any.
    const snap = loadSnapshot();
    return snap || null;
  }

  function buildReportHTML(snapshot, { forPrint }) {
    const dateStr = new Date().toLocaleString();
    const lensRows = Object.keys(snapshot.scores).map(l => {
      const pct = Math.round((snapshot.scores[l] / 4) * 100);
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e6eceb;"><b>${escapeHTML(l)}</b></td>
          <td style="padding:10px 8px;border-bottom:1px solid #e6eceb;">
            <div style="height:10px;background:#eaf4f3;border-radius:999px;overflow:hidden;">
              <div style="height:10px;width:${pct}%;background:#0f2f2a;border-radius:999px;"></div>
            </div>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e6eceb;text-align:right;">${snapshot.scores[l]}/4</td>
        </tr>
      `;
    }).join("");

    const focusLens = snapshot.isAllEqual ? "Privacy" : snapshot.weakest;
    const pack = RESOURCES_CONTENT[focusLens];

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cyber Seeds — Household Snapshot Report</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#10201d;margin:0;background:#f6fbfa}
  .wrap{max-width:900px;margin:0 auto;padding:28px}
  .card{background:#fff;border:1px solid #e6eceb;border-radius:14px;padding:18px 18px;margin:14px 0;box-shadow:0 10px 30px rgba(10,30,25,.06)}
  h1{font-size:28px;margin:0 0 6px}
  h2{font-size:18px;margin:0 0 10px}
  p{margin:8px 0;line-height:1.55}
  .muted{color:#4e6a63}
  .tag{display:inline-block;padding:6px 10px;border-radius:999px;background:#eaf4f3;color:#0f2f2a;font-size:12px;margin-right:8px}
  table{width:100%;border-collapse:collapse}
  .seed{margin-top:12px;padding:12px;border-radius:12px;background:#f2fbf9;border:1px solid #e0efec}
  ol{padding-left:18px}
  li{margin:10px 0}
  @media print {
    body{background:#fff}
    .wrap{padding:0}
    .noprint{display:none !important}
    .card{box-shadow:none}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-end;">
        <div>
          <h1>Cyber Seeds — Household Snapshot Report</h1>
          <div class="muted">Generated: ${escapeHTML(dateStr)} • Runs locally • No data sent</div>
        </div>
        ${forPrint ? "" : `<div class="noprint">
          <button onclick="window.print()" style="background:#0f2f2a;color:#fff;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;">Print</button>
        </div>`}
      </div>
      <div style="margin-top:12px;">
        <span class="tag">${escapeHTML(snapshot.stage.name)} signal</span>
        <span class="tag">Strongest: ${escapeHTML(snapshot.isAllEqual ? "Balanced" : snapshot.strongest)}</span>
        <span class="tag">Focus: ${escapeHTML(focusLens)}</span>
      </div>
      <p style="margin-top:10px;"><b>${escapeHTML(snapshot.stage.name)}</b> — ${escapeHTML(snapshot.stage.desc)}</p>
    </div>


    <div class="card">
      <h2>Snapshot overview</h2>
      <table>
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e6eceb;">Lens</th>
            <th style="padding:8px;border-bottom:2px solid #e6eceb;">Strength</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #e6eceb;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${lensRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Your priority focus</h2>
      <p class="muted">${escapeHTML(pack.why)}</p>
      <ol>
        ${pack.steps.map(s => `
          <li>
            <b>${escapeHTML(s.t)}</b><br>
            <span class="muted">${escapeHTML(s.d)}</span>
          </li>
        `).join("")}
      </ol>
      <div class="seed">
        <b>${escapeHTML(pack.seed.split(":")[0])}:</b>
        ${escapeHTML(pack.seed.split(":").slice(1).join(":").trim())}
      </div>
    </div>

    ="card">
      <h2>What to do next</h2>
      <p>
        This snapshot is not a judgement — it’s a starting signal.
        Pick <b>one small action</b> from the focus lens above and do it this week.
      </p>
      <p class="muted">
        Cyber safety improves through calm routines, not fear or perfection.
      </p>
    </div>

    <div class="card noprint">
      <p class="muted">
        Generated locally on your device. No accounts. No tracking.
      </p>
    </div>

  </div>
</body>
</html>`;
  }

})();
