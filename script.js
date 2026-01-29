/* ===========================================================
   Cyber Seeds — Household Snapshot v4
   - 8-section Domestic Cyber Ecology snapshot
   - Calm, non‑judgemental language
   - Works with existing HTML results layout
   - Computes both section and lens scores
   - Identifies strongest/weakest lens and priority sections
   - Adds full navigation controls (open, back, finish, reset, retake, close)
   - Persists results in localStorage and optionally posts to API
   =========================================================== */

(function () {
  "use strict";

  /* ================= API ================= */
  const API_BASE = "https://cyberseeds-api.onrender.com";

  async function postSnapshot(payload) {
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
      console.warn("API submit failed", e);
      return null;
    }
  }

  /* =============== HELPERS =============== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHTML = (str) =>
    String(str).replace(/[&<>\"]|'/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));

  /* =============== STORAGE =============== */
  const STORAGE_KEY = "seed_snapshot_v4";

  function saveSnapshot(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...obj, ts: Date.now() }));
    } catch {
      /* ignore */
    }
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearSnapshot() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  /* ============= SNAPSHOT MODEL ============= */
  // Eight sections as specified by the design. Each question returns a score 1–4 (higher is better).
  const SECTIONS = [
    {
      id: "wifi",
      title: "Home Wi‑Fi & Router",
      purpose: "The gateway to everything else",
      questions: [
        {
          q: "Have you changed the router’s default Wi‑Fi and admin passwords?",
          a: [
            { t: "Yes, both changed", s: 4 },
            { t: "Only the Wi‑Fi password", s: 3 },
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
          q: "Do visitors or smart devices use a separate Wi‑Fi or guest network?",
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
          // Multi-select question: approximate scoring by count of device categories checked.
          // Score 4 if 0–2 categories, 3 if 3–4, 2 if 5–6, 1 if 7+.  We derive the score in code.
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
          q: "Is extra sign‑in protection (2‑step verification) enabled on important accounts?",
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
      purpose: "Explore parental controls, guidance and communication",
      questions: [
        {
          q: "Do you use parental‑control tools or screen‑time settings on children’s devices?",
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
      purpose: "Address the unique risks of connected cameras, speakers and wearables",
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
          q: "Are smart devices connected to a separate network or guest Wi‑Fi?",
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
      purpose: "Explore screen‑time boundaries, bedtime routines and digital‑free spaces",
      questions: [
        {
          q: "Which online activities are most common in your household? (tick all that apply)",
          // Multi-select: assign scoring by number of activities chosen; more activities may indicate higher exposure.
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
          q: "Do you have device‑free times (e.g., meals, bedtime) for adults and/or children?",
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
      purpose: "Tailor guidance to the number of people and types of users",
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
            { t: "Securing Wi‑Fi and router", s: 0 },
            { t: "Managing devices & updates", s: 0 },
            { t: "Protecting accounts & passwords", s: 0 },
            { t: "Recognising scams", s: 0 },
            { t: "Children’s online safety", s: 0 },
            { t: "Setting digital‑wellbeing boundaries", s: 0 },
            { t: "Managing smart home devices", s: 0 },
          ],
          multi: true,
        },
      ],
    },
  ];

  /* ============== STATE ============== */
  let step = -1; // -1 for intro, 0..n-1 for questions, n for results
  const answers = {}; // sectionId -> array of scores or sets (multi-select will be recorded separately)

  /* ============== LENS MAPPING ============== */
  // Map sections to high-level lenses used for the bar chart. Each entry lists the section ids contributing to that lens.
  const LENS_MAP = {
    Network: ["wifi"],
    Devices: ["devices", "iot"],
    Privacy: ["accounts"],
    Scams: ["scams"],
    Wellbeing: ["children", "wellbeing", "composition"],
  };

  /* ============== CALCULATIONS ============== */
  function average(values) {
    if (!values || !values.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  function deriveSectionScores() {
    const sectionScores = {};
    SECTIONS.forEach((section) => {
      const vals = answers[section.id];
      if (!vals || vals.length === 0) return;
      // For multi-select questions, we compute a derived score based on count.
      // The answers array stores either numbers or arrays (for multi-select). We'll handle here.
      const flat = vals.flat();
      const numeric = flat.filter((x) => typeof x === "number");
      if (!numeric.length) return;
      const avg = average(numeric);
      // round to one decimal
      sectionScores[section.title] = Math.round(avg * 10) / 10;
    });
    return sectionScores;
  }

  function deriveLensScores(sectionScores) {
    const lensScores = {};
    Object.keys(LENS_MAP).forEach((lens) => {
      const secIds = LENS_MAP[lens];
      const vals = [];
      secIds.forEach((sid) => {
        // find section title by id
        const sec = SECTIONS.find((s) => s.id === sid);
        if (sec && sectionScores[sec.title] != null) {
          vals.push(sectionScores[sec.title]);
        }
      });
      if (vals.length) {
        const avg = average(vals);
        lensScores[lens] = Math.round(avg * 10) / 10;
      }
    });
    return lensScores;
  }

  function deriveStage(lensScores) {
    // Stage determined by total sum of lens scores (1–4 per lens). 5 lenses, total 5..20.
    const vals = Object.values(lensScores).filter((n) => typeof n === "number");
    if (!vals.length) return { name: "", desc: "" };
    const total = vals.reduce((a, b) => a + b, 0);
    if (total >= 18) {
      return {
        name: "Clear",
        desc: "Your digital ecosystem feels stable. Keep routines steady and protect the basics.",
      };
    }
    if (total >= 13) {
      return {
        name: "Emerging",
        desc: "A few risk flows need tightening. Small changes will reduce stress and risk quickly.",
      };
    }
    return {
      name: "Vulnerable",
      desc: "This is common — not a failing. Start with one calm fix — you’ll feel the difference fast.",
    };
  }

  function deriveStrongWeak(lensScores) {
    const entries = Object.entries(lensScores).filter(([, v]) => typeof v === "number");
    if (!entries.length) return { strongest: "Balanced", weakest: "Balanced", isAllEqual: true };
    entries.sort((a, b) => b[1] - a[1]);
    const allEqual = entries[0][1] === entries[entries.length - 1][1];
    return {
      strongest: allEqual ? "Balanced" : entries[0][0],
      weakest: allEqual ? "Balanced" : entries[entries.length - 1][0],
      isAllEqual: allEqual,
    };
  }

  function derivePriorities(sectionScores) {
    const entries = Object.entries(sectionScores).filter(([, v]) => typeof v === "number");
    if (!entries.length) return [];
    entries.sort((a, b) => a[1] - b[1]);
    // return up to two lowest scoring sections
    return entries.slice(0, 2).map(([title, score]) => ({ title, score }));
  }

  function calculateSnapshot() {
    const sectionScores = deriveSectionScores();
    const lensScores = deriveLensScores(sectionScores);
    const stage = deriveStage(lensScores);
    const { strongest, weakest, isAllEqual } = deriveStrongWeak(lensScores);
    const priorities = derivePriorities(sectionScores);
    return { sectionScores, lensScores, stage, strongest, weakest, isAllEqual, priorities };
  }

  /* ============== RENDERING ============== */
  // Modal and elements
  const modal = $("#snapshotModal");
  const modalBody = modal ? modal.querySelector(".modal-body") : null;
  const formEl = $("#snapshotForm");
  const resultSection = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMetaEl = $("#stepMeta");
  const controlsEl = $("#snapshotControls");
  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");
  const retakeBtn = $("#retakeSnapshot");
  const backdrop = modal ? modal.querySelector(".modal-backdrop") : null;

  // Bar elements for each lens
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

  function updateBars(lensScores) {
    Object.keys(barEls).forEach((lens) => {
      const val = lensScores[lens];
      const pct = typeof val === "number" ? Math.round((val / 4) * 100) : 0;
      if (barEls[lens]) barEls[lens].style.width = `${pct}%`;
      if (valEls[lens]) valEls[lens].textContent = typeof val === "number" ? `${val.toFixed(1)}/4` : "—";
    });
  }

  function renderIntro() {
    // Intro page: description and start button
    if (formEl) {
      formEl.innerHTML =
        `<p class="muted">This is a calm reading of your home’s digital ecosystem. There are no right answers — only useful signals.</p>`;
    }
    if (controlsEl) controlsEl.style.display = "flex";
    if (resultSection) resultSection.hidden = true;
    backBtn.disabled = true;
    nextBtn.textContent = "Start";
    if (stepMetaEl) stepMetaEl.textContent = "";
  }

  function renderSection() {
    const section = SECTIONS[step];
    const secAns = (answers[section.id] = answers[section.id] || []);
    let html = `<h3>${escapeHTML(section.title)}</h3><p class="muted">${escapeHTML(section.purpose)}</p>`;
    section.questions.forEach((q, qi) => {
      html += `<p><b>${escapeHTML(q.q)}</b></p><div class="choices">`;
      if (q.multi) {
        // multi-select: use checkboxes
        q.a.forEach((opt, oi) => {
          const checked = secAns[qi] && secAns[qi].includes(oi) ? "checked" : "";
          html += `<label class="choice multi"><input type="checkbox" name="${section.id}_${qi}_${oi}" ${checked}><span>${escapeHTML(opt.t)}</span></label>`;
        });
      } else {
        q.a.forEach((opt) => {
          const checked = secAns[qi] === opt.s ? "checked" : "";
          html += `<label class="choice"><input type="radio" name="${section.id}_${qi}" value="${opt.s}" ${checked}><span>${escapeHTML(opt.t)}</span></label>`;
        });
      }
      html += `</div>`;
    });
    if (formEl) formEl.innerHTML = html;
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    backBtn.disabled = step <= 0;
    if (stepMetaEl) stepMetaEl.textContent = `${step + 1} / ${SECTIONS.length}`;
    if (controlsEl) controlsEl.style.display = "flex";
    if (resultSection) resultSection.hidden = true;

    // attach change handlers
    section.questions.forEach((q, qi) => {
      if (q.multi) {
        // each checkbox
        q.a.forEach((_, oi) => {
          const cb = $(`input[name="${section.id}_${qi}_${oi}"]`);
          if (cb) {
            cb.addEventListener("change", () => {
              // gather all checked indices for this question
              const selected = [];
              q.a.forEach((__, idx) => {
                const el = $(`input[name="${section.id}_${qi}_${idx}"]`);
                if (el && el.checked) selected.push(idx);
              });
              secAns[qi] = selected;
            });
          }
        });
      } else {
        $$(`input[name="${section.id}_${qi}"]`).forEach((input) => {
          input.addEventListener("change", () => {
            secAns[qi] = Number(input.value);
          });
        });
      }
    });
  }

  function deriveMultiScore(selectedIndices) {
    // For multi-select questions, assign a score based on how many options were selected.
    // Fewer selections indicates lower complexity (higher security/wellbeing), so higher score.
    if (!Array.isArray(selectedIndices)) return 3; // default neutral
    const count = selectedIndices.length;
    if (count <= 2) return 4;
    if (count <= 4) return 3;
    if (count <= 6) return 2;
    return 1;
  }

  function transformAnswersForScoring() {
    // Convert answers structure into numeric arrays per section.
    // For multi-select questions, compute a derived score.
    const scores = {};
    SECTIONS.forEach((section) => {
      const secAns = answers[section.id];
      if (!secAns) return;
      const arr = [];
      section.questions.forEach((q, qi) => {
        if (q.multi) {
          const selected = secAns[qi] || [];
          arr.push(deriveMultiScore(selected));
        } else {
          const val = secAns[qi];
          if (typeof val === "number") arr.push(val);
        }
      });
      scores[section.id] = arr;
    });
    return scores;
  }

  function renderResult() {
    // convert multi-select choices to derived numeric scores
    const numericAnswers = transformAnswersForScoring();
    Object.assign(answers, numericAnswers);
    const snapshot = calculateSnapshot();
    saveSnapshot(snapshot);
    // Optionally post to API (uses section and lens scores)
    postSnapshot({ scores: snapshot });
    // hide controls
    if (controlsEl) controlsEl.style.display = "none";
    // update result headline
    if (resultHeadline) {
      if (snapshot.priorities && snapshot.priorities.length) {
        const names = snapshot.priorities.map((p) => p.title).join(" & ");
        resultHeadline.textContent = `${snapshot.stage.name} signal — ${snapshot.stage.desc} Your priority areas: ${names}.`;
      } else {
        resultHeadline.textContent = `${snapshot.stage.name} signal — ${snapshot.stage.desc}`;
      }
    }
    // update strongest/weakest lens
    if (strongestLensEl) strongestLensEl.textContent = snapshot.strongest;
    if (weakestLensEl) weakestLensEl.textContent = snapshot.weakest;
    // update bars
    updateBars(snapshot.lensScores);
    // show result section
    if (resultSection) resultSection.hidden = false;
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ============== CONTROLS ============== */
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      step++;
      render();
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      step--;
      render();
    });
  }
  // open snapshot from any button with data-open-snapshot
  $$('[data-open-snapshot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      step = -1;
      // reset answers
      Object.keys(answers).forEach((k) => delete answers[k]);
      if (resultSection) resultSection.hidden = true;
      modal.classList.add('is-open');
      render();
    });
  });
  // close snapshot via × icon
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('is-open');
    });
  }
  // reset snapshot via ↺ icon
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearSnapshot();
      step = -1;
      Object.keys(answers).forEach((k) => delete answers[k]);
      if (resultSection) resultSection.hidden = true;
      if (controlsEl) controlsEl.style.display = 'flex';
      render();
    });
  }
  // retake snapshot via retake button in result actions
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      step = -1;
      Object.keys(answers).forEach((k) => delete answers[k]);
      if (resultSection) resultSection.hidden = true;
      if (controlsEl) controlsEl.style.display = 'flex';
      render();
    });
  }
  // close snapshot by clicking backdrop
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      modal.classList.remove('is-open');
    });
  }

  // initial state for last saved snapshot on page load (optional)
  const lastSnapshot = loadSnapshot();
  if (lastSnapshot && lastSnapshot.lensScores) {
    // populate the bars on page load if needed
    updateBars(lastSnapshot.lensScores);
    if (strongestLensEl) strongestLensEl.textContent = lastSnapshot.strongest || '';
    if (weakestLensEl) weakestLensEl.textContent = lastSnapshot.weakest || '';
  }
})();
