/* ===========================================================
   Cyber Seeds — script.js (Unified + Bulletproof)
   - Mobile nav (iOS safe)
   - Smooth scroll
   - Snapshot modal controller (single source of truth)
   - Household Snapshot Engine v4.2
   - Works with your existing HTML IDs + results layout
   - Saves to multiple keys so /resources/ always works
   =========================================================== */

(() => {
  "use strict";

  /* -------------------- HELPERS -------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function safeJSONParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function safeSet(k, v) {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    try { localStorage.setItem(k, s); return true; } catch {}
    try { sessionStorage.setItem(k, s); return true; } catch {}
    return false;
  }

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch {}
    try { return sessionStorage.getItem(k); } catch {}
    return null;
  }

  function safeRemove(k) {
    try { localStorage.removeItem(k); } catch {}
    try { sessionStorage.removeItem(k); } catch {}
  }

  /* -------------------- YEAR -------------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* -------------------- NAV (MOBILE) -------------------- */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close menu when a link is clicked (mobile)
    $$("a", navMenu).forEach((a) => {
      a.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* -------------------- SMOOTH SCROLL -------------------- */
  $$("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.includes("#")) return;
      const hash = href.split("#")[1];
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${hash}`);
    });
  });

  /* ===========================================================
     SNAPSHOT ENGINE (v4.2)
     =========================================================== */

  const API_BASE = "https://cyberseeds-api.onrender.com";

  async function postSnapshot(payload) {
    // Optional submit. Never break UI if this fails.
    try {
      const res = await fetch(`${API_BASE}/api/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Snapshot failed");
      return data;
    } catch (e) {
      console.warn("API submit failed:", e);
      return null;
    }
  }

  /* -------------------- MODEL -------------------- */
  const SECTIONS = [
    {
      id: "wifi",
      title: "Home Wi-Fi & Router",
      purpose: "The gateway to everything else",
      questions: [
        {
          q: "Have you changed the router’s default Wi-Fi and admin passwords?",
          a: [
            { t: "Yes, both changed", s: 4 },
            { t: "Only the Wi-Fi password", s: 3 },
            { t: "Still using default passwords", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do you keep your router software (firmware) up to date?",
          a: [
            { t: "It updates automatically", s: 4 },
            { t: "I check occasionally", s: 3 },
            { t: "Never checked", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do visitors or smart devices use a separate Wi-Fi or guest network?",
          a: [
            { t: "Yes", s: 4 },
            { t: "No", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "devices",
      title: "Connected Devices & Updates",
      purpose: "What lives on the network, and how healthy it is",
      questions: [
        {
          q: "Which devices are used in your home? (tick all that apply)",
          a: [
            { t: "Smartphones / tablets", s: 0 },
            { t: "Laptops / PCs", s: 0 },
            { t: "Games consoles", s: 0 },
            { t: "Smart TVs", s: 0 },
            { t: "Smart speakers", s: 0 },
            { t: "Cameras / doorbells / baby monitors", s: 0 },
            { t: "Wearables", s: 0 },
            { t: "Other", s: 0 },
          ],
          multi: true,
        },
        {
          q: "Do your devices install updates automatically?",
          a: [
            { t: "All or most do", s: 4 },
            { t: "Some do, some don’t", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do you back up important photos or files?",
          a: [
            { t: "Yes, automatically", s: 4 },
            { t: "Occasionally", s: 3 },
            { t: "Never", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "accounts",
      title: "Accounts & Passwords",
      purpose: "Your digital identity and access",
      questions: [
        {
          q: "How do you manage passwords?",
          a: [
            { t: "Password manager with unique passwords", s: 4 },
            { t: "No manager, but interested", s: 3 },
            { t: "Not sure what that is", s: 2 },
            { t: "I reuse the same few passwords", s: 1 },
          ],
        },
        {
          q: "Is extra sign-in protection (2-step verification) enabled on important accounts?",
          a: [
            { t: "Yes, on most accounts", s: 4 },
            { t: "On one or two accounts", s: 3 },
            { t: "Not yet", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Have you checked whether your email addresses or passwords have appeared in past data breaches?",
          a: [
            { t: "Yes, and I’ve changed them", s: 4 },
            { t: "I’ve checked but haven’t changed", s: 3 },
            { t: "No", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "scams",
      title: "Scam Awareness & Response",
      purpose: "How the household handles pressure and urgency",
      questions: [
        {
          q: "How do you handle unexpected emails, texts or calls that ask for money or personal information?",
          a: [
            { t: "We ignore and verify via official contacts", s: 4 },
            { t: "We hesitate but sometimes click or answer", s: 3 },
            { t: "We often feel pressured to respond", s: 2 },
            { t: "Someone has fallen victim before", s: 1 },
          ],
        },
        {
          q: "Has anyone in your household received scam or suspicious messages recently?",
          a: [
            { t: "None", s: 4 },
            { t: "Scam text or phone call", s: 3 },
            { t: "Phishing email or login alert", s: 2 },
            { t: "Multiple suspicious incidents", s: 1 },
          ],
        },
        {
          q: "Do you talk with family members (including children) about recognising and reporting scams?",
          a: [
            { t: "Regularly discuss", s: 4 },
            { t: "Sometimes", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
      ],
    },
    {
      id: "children",
      title: "Children’s Online Safety",
      optional: true,
      purpose: "Protection plus communication",
      questions: [
        {
          q: "Do you use parental-control tools or screen-time settings on children’s devices?",
          a: [
            { t: "Yes, regularly", s: 4 },
            { t: "We’ve tried but don’t maintain them", s: 3 },
            { t: "No, but would like help", s: 2 },
            { t: "Not applicable", s: 4 },
          ],
        },
        {
          q: "How confident are you that your children understand online privacy and know when to ask for help?",
          a: [
            { t: "Very confident", s: 4 },
            { t: "Somewhat confident", s: 3 },
            { t: "Not confident", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do children in your home talk openly with you about what they see or do online?",
          a: [
            { t: "Yes, often", s: 4 },
            { t: "Sometimes", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
      ],
    },
    {
      id: "iot",
      title: "Smart Home & IoT Devices",
      purpose: "Quiet devices that go unmanaged",
      questions: [
        {
          q: "Do you change default passwords or PINs on smart cameras, doorbells or baby monitors?",
          a: [
            { t: "Yes, always", s: 4 },
            { t: "Only on some devices", s: 3 },
            { t: "No", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Are smart devices connected to a separate network or guest Wi-Fi?",
          a: [
            { t: "Yes", s: 4 },
            { t: "No", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do you review which devices are connected to your network? (e.g., via router app)",
          a: [
            { t: "Yes, regularly", s: 4 },
            { t: "Sometimes", s: 3 },
            { t: "Never", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },
    {
      id: "wellbeing",
      title: "Digital Habits & Wellbeing",
      purpose: "Calm, sleep, and focus",
      questions: [
        {
          q: "Which online activities are most common in your household? (tick all that apply)",
          a: [
            { t: "Streaming TV/films", s: 0 },
            { t: "Online gaming", s: 0 },
            { t: "Social media", s: 0 },
            { t: "Remote work or study", s: 0 },
            { t: "Online shopping", s: 0 },
            { t: "Video calls", s: 0 },
            { t: "Other", s: 0 },
          ],
          multi: true,
        },
        {
          q: "Do you have device-free times (e.g., meals, bedtime) for adults and/or children?",
          a: [
            { t: "Yes, daily", s: 4 },
            { t: "Occasionally", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
        {
          q: "Do you set boundaries around notifications and screen use to protect sleep and focus?",
          a: [
            { t: "Yes, we use Do Not Disturb/app limits", s: 4 },
            { t: "We try but often forget", s: 3 },
            { t: "Not yet", s: 2 },
            { t: "Not applicable", s: 4 },
          ],
        },
      ],
    },
    {
      id: "composition",
      title: "Household Composition & Support Needs",
      purpose: "Tailor guidance to the household",
      questions: [
        {
          q: "How many adults live in your home?",
          a: [
            { t: "1", s: 4 },
            { t: "2", s: 3 },
            { t: "3+", s: 2 },
            { t: "Prefer not to say", s: 3 },
          ],
        },
        {
          q: "Are there children or teenagers using devices?",
          a: [
            { t: "Under 7", s: 2 },
            { t: "7–10", s: 2 },
            { t: "11–16", s: 2 },
            { t: "17+", s: 3 },
            { t: "No children", s: 4 },
          ],
        },
        {
          q: "Which kind of guidance would you find most helpful? (choose up to two)",
          a: [
            { t: "Securing Wi-Fi and router", s: 0 },
            { t: "Managing devices & updates", s: 0 },
            { t: "Protecting accounts & passwords", s: 0 },
            { t: "Recognising scams", s: 0 },
            { t: "Children’s online safety", s: 0 },
            { t: "Setting digital-wellbeing boundaries", s: 0 },
            { t: "Managing smart home devices", s: 0 },
          ],
          multi: true,
          max: 2,
        },
      ],
    },
  ];

  // Lens grouping for your results bar chart + resources hub
  const LENS_MAP = {
    Network: ["wifi"],
    Devices: ["devices", "iot"],
    Privacy: ["accounts"],
    Scams: ["scams"],
    Wellbeing: ["children", "wellbeing", "composition"],
  };

  /* -------------------- STORAGE KEYS -------------------- */
  const STORAGE_KEY = "seed_snapshot_v4";

  // Keys your /resources/ page already searches for (compatibility)
  const COMPAT_KEYS = [
    "seed_snapshot_v2",
    "cyberseeds_snapshot_last",
    "cyberSeeds_snapshot_last",
    "cs_snapshot_last",
    "snapshot_last",
    "cyberseeds_snapshot",
    "cyberSeedsSnapshot",
    "cyberSeeds.snapshot",
    "cs.snapshot.last",
    "cs:lastSnapshot",
  ];

  function clearAllSnapshotKeys() {
    safeRemove(STORAGE_KEY);
    COMPAT_KEYS.forEach(safeRemove);
    safeRemove("seed_snapshot_v2_ts");
  }

  /* -------------------- STATE -------------------- */
  let step = -1; // -1 intro, 0..n-1 questions, n results
  const answers = {}; // sectionId -> per-question answer (number for radio, array for multi)

  /* -------------------- CALC -------------------- */
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  function multiScore(selectedIndices) {
    // Fewer selected = lower complexity/exposure => higher score
    const count = Array.isArray(selectedIndices) ? selectedIndices.length : 0;
    if (count <= 2) return 4;
    if (count <= 4) return 3;
    if (count <= 6) return 2;
    return 1;
  }

  function buildNumericAnswers() {
    const out = {};
    SECTIONS.forEach((sec) => {
      const secAns = answers[sec.id];
      if (!secAns) return;
      const list = [];
      sec.questions.forEach((q, qi) => {
        if (q.multi) list.push(multiScore(secAns[qi] || []));
        else if (typeof secAns[qi] === "number") list.push(secAns[qi]);
      });
      out[sec.id] = list;
    });
    return out;
  }

  function sectionScoresFromNumeric(numeric) {
    const scores = {};
    SECTIONS.forEach((sec) => {
      const vals = numeric[sec.id];
      if (!vals || !vals.length) return;
      const a = avg(vals);
      if (a == null) return;
      scores[sec.title] = Math.round(a * 10) / 10;
    });
    return scores;
  }

  function lensScoresFromSectionScores(sectionScores) {
    const lensScores = {};
    Object.keys(LENS_MAP).forEach((lens) => {
      const secIds = LENS_MAP[lens];
      const vals = [];
      secIds.forEach((sid) => {
        const sec = SECTIONS.find((s) => s.id === sid);
        if (!sec) return;
        const v = sectionScores[sec.title];
        if (typeof v === "number") vals.push(v);
      });
      if (vals.length) lensScores[lens] = Math.round(avg(vals) * 10) / 10;
    });
    return lensScores;
  }

  function stageFromLensScores(lensScores) {
    const vals = Object.values(lensScores).filter((n) => typeof n === "number");
    const total = vals.reduce((a, b) => a + b, 0);

    if (total >= 18) {
      return { name: "Clear", desc: "Your digital ecosystem feels stable. Keep routines steady and protect the basics." };
    }
    if (total >= 13) {
      return { name: "Emerging", desc: "A few risk flows need tightening. Small changes will reduce stress and risk quickly." };
    }
    return { name: "Vulnerable", desc: "This is common — not a failing. Start with one calm fix — you’ll feel the difference fast." };
  }

  function strongWeak(lensScores) {
    const entries = Object.entries(lensScores).filter(([, v]) => typeof v === "number");
    if (!entries.length) return { strongest: "Balanced", weakest: "Balanced" };
    entries.sort((a, b) => b[1] - a[1]);
    const allEqual = entries[0][1] === entries[entries.length - 1][1];
    return {
      strongest: allEqual ? "Balanced" : entries[0][0],
      weakest: allEqual ? "Balanced" : entries[entries.length - 1][0],
    };
  }

  function priorities(sectionScores) {
    const entries = Object.entries(sectionScores).filter(([, v]) => typeof v === "number");
    entries.sort((a, b) => a[1] - b[1]);
    return entries.slice(0, 2).map(([title, score]) => ({ title, score }));
  }

  function computeSnapshot() {
    const numericAnswers = buildNumericAnswers();
    const sectionScores = sectionScoresFromNumeric(numericAnswers);
    const lensScores = lensScoresFromSectionScores(sectionScores);
    const stage = stageFromLensScores(lensScores);
    const { strongest, weakest } = strongWeak(lensScores);
    const prio = priorities(sectionScores);

    return {
      version: "v4.2",
      ts: Date.now(),
      sectionScores,
      lensScores,
      stage,
      strongest,
      weakest,
      priorities: prio,
    };
  }

  /* -------------------- DOM (Modal) -------------------- */
  const modal = $("#snapshotModal");
  const formEl = $("#snapshotForm");
  const scrollEl = $("#snapshotScroll");
  const controlsEl = $("#snapshotControls");
  const resultSection = $("#snapshotResult");

  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMetaEl = $("#stepMeta");

  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");
  const retakeBtn = $("#retakeSnapshot");
  const goToResources = $("#goToResources");
  const backdrop = modal ? $(".modal-backdrop", modal) : null;

  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");

  // Bars
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

  // If modal isn’t on this page, do nothing.
  if (!modal || !formEl || !nextBtn || !backBtn) return;

  /* -------------------- iOS SAFE SCROLL LOCK -------------------- */
  let _scrollY = 0;

  function lockBodyScroll() {
    _scrollY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    // iOS: freeze body
    document.body.style.position = "fixed";
    document.body.style.top = `-${_scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockBodyScroll() {
    document.body.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, _scrollY);
  }

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockBodyScroll();
    // reset scroll within modal
    if (scrollEl) scrollEl.scrollTop = 0;
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBodyScroll();
  }

  /* -------------------- VALIDATION (per step) -------------------- */
  function sectionIsComplete(secIndex) {
    const sec = SECTIONS[secIndex];
    if (!sec) return true;
    const secAns = answers[sec.id];
    if (!secAns) return false;

    // each question must have an answer
    for (let qi = 0; qi < sec.questions.length; qi++) {
      const q = sec.questions[qi];
      const v = secAns[qi];
      if (q.multi) {
        // some multi are optional-ish, but we require at least 1 OR allow empty (calm)
        // For “devices used” / “activities” empty is allowed but neutral.
        if (!Array.isArray(v)) secAns[qi] = [];
        // If max specified, enforce
        if (q.max && Array.isArray(v) && v.length > q.max) return false;
      } else {
        if (typeof v !== "number") return false;
      }
    }
    return true;
  }

  function setNextEnabled() {
    // Intro always enabled
    if (step < 0) {
      nextBtn.disabled = false;
      return;
    }
    // Results not using next
    if (step >= SECTIONS.length) {
      nextBtn.disabled = true;
      return;
    }
    nextBtn.disabled = !sectionIsComplete(step);
  }

  /* -------------------- RENDER -------------------- */
  function renderIntro() {
    formEl.innerHTML = `
      <p class="muted">
        This is a calm reading of your home’s digital ecosystem.
        There are no right answers — only useful signals.
      </p>
      <p class="muted">
        You’ll get a strongest lens, weakest lens, and 1–2 priority areas.
      </p>
    `;
    if (resultSection) resultSection.hidden = true;
    if (controlsEl) controlsEl.style.display = "flex";

    backBtn.disabled = true;
    nextBtn.textContent = "Start";
    if (stepMetaEl) stepMetaEl.textContent = "";
    setNextEnabled();
  }

  function renderSection() {
    const sec = SECTIONS[step];
    answers[sec.id] = answers[sec.id] || [];

    let html = `
      <h3>${escapeHTML(sec.title)}</h3>
      <p class="muted">${escapeHTML(sec.purpose)}</p>
    `;

    sec.questions.forEach((q, qi) => {
      html += `<p class="q-title"><b>${escapeHTML(q.q)}</b></p><div class="choices">`;

      if (q.multi) {
        const current = answers[sec.id][qi] || [];
        q.a.forEach((opt, oi) => {
          const checked = current.includes(oi) ? "checked" : "";
          html += `
            <label class="choice">
              <input type="checkbox" name="${sec.id}_${qi}_${oi}" ${checked} />
              <span>${escapeHTML(opt.t)}</span>
            </label>
          `;
        });

        if (q.max) {
          html += `<p class="micro muted">Choose up to ${q.max}.</p>`;
        }
      } else {
        const currentVal = answers[sec.id][qi];
        q.a.forEach((opt) => {
          const checked = currentVal === opt.s ? "checked" : "";
          html += `
            <label class="choice">
              <input type="radio" name="${sec.id}_${qi}" value="${opt.s}" ${checked} />
              <span>${escapeHTML(opt.t)}</span>
            </label>
          `;
        });
      }

      html += `</div>`;
    });

    formEl.innerHTML = html;

    // buttons + meta
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    backBtn.disabled = step === 0;
    if (stepMetaEl) stepMetaEl.textContent = `${step + 1} / ${SECTIONS.length}`;
    if (controlsEl) controlsEl.style.display = "flex";
    if (resultSection) resultSection.hidden = true;

    // Reset modal internal scroll to top each section (desktop polish)
    if (scrollEl) scrollEl.scrollTop = 0;

    // Bind changes (single render; no duplicate closures)
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        q.a.forEach((_, oi) => {
          const cb = $(`input[name="${sec.id}_${qi}_${oi}"]`, formEl);
          if (!cb) return;

          cb.addEventListener("change", () => {
              // Ensure array exists
              if (!Array.isArray(answers[sec.id][qi])) {
                answers[sec.id][qi] = [];
              }
            
              const idx = oi;
            
              if (cb.checked) {
                if (!answers[sec.id][qi].includes(idx)) {
                  answers[sec.id][qi].push(idx);
                }
              } else {
                answers[sec.id][qi] = answers[sec.id][qi].filter(i => i !== idx);
              }
            
              // Enforce max selection if defined
              if (q.max && answers[sec.id][qi].length > q.max) {
                cb.checked = false;
                answers[sec.id][qi].pop();
              }
            
              setNextEnabled();
            });
 
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`, formEl).forEach((inp) => {
          inp.addEventListener("change", () => {
            answers[sec.id][qi] = Number(inp.value);
            setNextEnabled();
          });
        });
      }
    });

    setNextEnabled();
  }

  function updateBars(lensScores) {
    Object.keys(barEls).forEach((lens) => {
      const v = lensScores[lens];
      const pct = typeof v === "number" ? Math.round((v / 4) * 100) : 0;
      if (barEls[lens]) barEls[lens].style.width = `${clamp(pct, 0, 100)}%`;
      if (valEls[lens]) valEls[lens].textContent = typeof v === "number" ? `${v.toFixed(1)}/4` : "—";
    });
  }

  function persistForResources(snapshot) {
    // Format that your /resources/ page already understands
    const lens = snapshot.lensScores || {};
    const normalized = {
      ts: snapshot.ts,
      stage: { name: snapshot.stage?.name || "Emerging", desc: snapshot.stage?.desc || "" },
      lenses: {
        network: typeof lens.Network === "number" ? `${lens.Network.toFixed(1)}/4` : "—",
        devices: typeof lens.Devices === "number" ? `${lens.Devices.toFixed(1)}/4` : "—",
        privacy: typeof lens.Privacy === "number" ? `${lens.Privacy.toFixed(1)}/4` : "—",
        scams: typeof lens.Scams === "number" ? `${lens.Scams.toFixed(1)}/4` : "—",
        wellbeing: typeof lens.Wellbeing === "number" ? `${lens.Wellbeing.toFixed(1)}/4` : "—",
      },
      strongest: snapshot.strongest,
      weakest: snapshot.weakest,
      priorities: snapshot.priorities || [],
      sectionScores: snapshot.sectionScores || {},
      version: snapshot.version,
    };

    safeSet(STORAGE_KEY, snapshot);
    // Compatibility keys (so /resources always finds *something*)
    COMPAT_KEYS.forEach((k) => safeSet(k, normalized));
    safeSet("seed_snapshot_v2_ts", String(snapshot.ts));
  }

  function renderResult() {
    const snapshot = computeSnapshot();

    persistForResources(snapshot);

    // Optional API submit (never blocks UI)
    postSnapshot({ snapshot }).catch(() => {});

    // Hide the next/back controls block (you still have X/reset visible in header)
    if (controlsEl) controlsEl.style.display = "none";

    // Headline
    if (resultHeadline) {
      const names = (snapshot.priorities || []).map((p) => p.title).slice(0, 2);
      const prioLine = names.length ? ` Priority areas: ${names.join(" & ")}.` : "";
      resultHeadline.textContent = `${snapshot.stage.name} signal — ${snapshot.stage.desc}${prioLine}`;
    }

    // Strong / weak
    if (strongestLensEl) strongestLensEl.textContent = snapshot.strongest || "Balanced";
    if (weakestLensEl) weakestLensEl.textContent = snapshot.weakest || "Balanced";

    // Bars
    updateBars(snapshot.lensScores || {});

    // Show results
    if (resultSection) resultSection.hidden = false;

    // Ensure buttons remain clickable (some desktop overlay bugs come from scroll position)
    if (scrollEl) scrollEl.scrollTop = 0;

    // Make sure resources CTA always works
    if (goToResources) {
      goToResources.addEventListener("click", () => {
        // allow normal navigation
      }, { once: true });
    }
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* -------------------- CONTROLS (Single source of truth) -------------------- */

  function resetSessionOnly() {
    // don’t wipe storage; just restart current run
    step = -1;
    Object.keys(answers).forEach((k) => delete answers[k]);
    if (controlsEl) controlsEl.style.display = "flex";
    if (resultSection) resultSection.hidden = true;
    render();
  }

  function resetEverywhere() {
    clearAllSnapshotKeys();
    resetSessionOnly();
  }

  // Open from any [data-open-snapshot]
  $$("[data-open-snapshot]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      resetSessionOnly();
      openModal();
    });
  });

  // Next / Back
  nextBtn.addEventListener("click", () => {
    if (step >= 0 && step < SECTIONS.length) {
      // block advancing if incomplete
      if (!sectionIsComplete(step)) {
        // calm nudge (no alert spam)
        if (stepMetaEl) stepMetaEl.textContent = `${step + 1} / ${SECTIONS.length} — please answer the questions above`;
        return;
      }
    }
    step += 1;
    render();
  });

  backBtn.addEventListener("click", () => {
    step = Math.max(-1, step - 1);
    if (controlsEl) controlsEl.style.display = "flex";
    if (resultSection) resultSection.hidden = true;
    render();
  });

  // Close + Backdrop + ESC
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
  });

  // Reset icon
  if (resetBtn) resetBtn.addEventListener("click", resetEverywhere);

  // Retake button inside results
  if (retakeBtn) retakeBtn.addEventListener("click", () => {
    resetSessionOnly();
    // keep modal open
  });

  // If you have “Print / Download HTML” buttons, ensure they never break the modal
  const printBtn = $("#printSnapshot");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      try { window.print(); } catch {}
    });
  }

  const dlBtn = $("#downloadSnapshotHtml");
  if (dlBtn) {
    dlBtn.addEventListener("click", () => {
      try {
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Cyber Seeds Snapshot</title></head><body>
        <h1>Cyber Seeds — Snapshot</h1>
        <pre>${escapeHTML(safeGet(STORAGE_KEY) || "No snapshot found")}</pre>
        </body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cyber-seeds-snapshot.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1200);
      } catch {}
    });
  }

  // Load last snapshot to pre-fill bars on page load (nice touch)
  const last = safeJSONParse(safeGet(STORAGE_KEY));
  if (last && last.lensScores) {
    updateBars(last.lensScores);
    if (strongestLensEl) strongestLensEl.textContent = last.strongest || "";
    if (weakestLensEl) weakestLensEl.textContent = last.weakest || "";
  }

  // Initial render state (modal closed)
  renderIntro();
})();
