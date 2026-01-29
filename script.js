/* =========================================
   Cyber Seeds — Household Snapshot v3
   - 8-section Domestic Cyber Ecology snapshot
   - Calm, non-judgemental
   - Priority Areas (1–2 only)
   - Local-first + optional API submit
   ========================================= */

(() => {
  "use strict";

  /* ================= API ================= */

  const API_BASE = "https://cyberseeds-api.onrender.com";

  async function postSnapshot(payload) {
    const res = await fetch(`${API_BASE}/api/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.error || "Snapshot failed");
    return data;
  }

  /* =============== HELPERS =============== */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));

  /* =============== STORAGE =============== */

  const STORAGE_KEY = "seed_snapshot_v3";

  const saveSnapshot = (snap) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snap, ts: Date.now() }));
    } catch {}
  };

  const loadSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const clearSnapshot = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  /* ============= SNAPSHOT MODEL ============= */

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
          q: "Do you keep your router software up to date?",
          a: [
            { t: "It updates automatically", s: 4 },
            { t: "I check occasionally", s: 3 },
            { t: "Never checked", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
        {
          q: "Do visitors or smart devices use a separate Wi-Fi?",
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
          q: "Is extra sign-in protection enabled on key accounts?",
          a: [
            { t: "Yes, on most", s: 4 },
            { t: "On one or two", s: 3 },
            { t: "Not yet", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },

    {
      id: "scams",
      title: "Scam Awareness & Response",
      purpose: "How pressure is handled",
      questions: [
        {
          q: "When a message asks for money or info, what happens?",
          a: [
            { t: "We verify independently", s: 4 },
            { t: "We hesitate but sometimes respond", s: 3 },
            { t: "We feel pressured", s: 2 },
            { t: "Someone was caught before", s: 1 },
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
          q: "Do you use parental controls or screen-time tools?",
          a: [
            { t: "Yes, regularly", s: 4 },
            { t: "Tried but don’t maintain", s: 3 },
            { t: "No, but would like help", s: 2 },
            { t: "Not applicable", s: 4 },
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
          q: "Do you change default passwords on smart devices?",
          a: [
            { t: "Always", s: 4 },
            { t: "On some devices", s: 3 },
            { t: "No", s: 2 },
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
          q: "Do you have device-free times?",
          a: [
            { t: "Daily", s: 4 },
            { t: "Occasionally", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
      ],
    },
  ];

  /* ============== STATE ============== */

  let step = -1;
  let answers = {}; // sectionId -> [scores]

  /* ============== CALCULATION ============== */

  function calcSnapshot() {
    const sectionScores = {};

    SECTIONS.forEach((s) => {
      if (!answers[s.id] || !answers[s.id].length) return;
      const avg =
        answers[s.id].reduce((a, b) => a + b, 0) / answers[s.id].length;
      sectionScores[s.title] = Math.round(avg * 10) / 10;
    });

    const ranked = Object.entries(sectionScores).sort((a, b) => a[1] - b[1]);

    const priorities = ranked.slice(0, 2).map(([title, score]) => ({
      title,
      score,
    }));

    return {
      sectionScores,
      priorities,
    };
  }

  /* ============== RENDERING ============== */

  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const resultSection = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");

  function renderIntro() {
    form.innerHTML = `
      <p class="muted">
        This is a calm reading of your home’s digital ecosystem.
        There are no right answers — only useful signals.
      </p>`;
    nextBtn.textContent = "Start";
    backBtn.disabled = true;
  }

  function renderSection() {
    const section = SECTIONS[step];
    answers[section.id] = answers[section.id] || [];

    let html = `<h3>${escapeHTML(section.title)}</h3>
                <p class="muted">${escapeHTML(section.purpose)}</p>`;

    section.questions.forEach((q, qi) => {
      html += `<p><b>${escapeHTML(q.q)}</b></p>
        <div class="choices">`;
      q.a.forEach((opt) => {
        html += `
          <label class="choice">
            <input type="radio" name="${section.id}_${qi}" value="${opt.s}">
            <span>${escapeHTML(opt.t)}</span>
          </label>`;
      });
      html += `</div>`;
    });

    form.innerHTML = html;
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    backBtn.disabled = false;

    $$("input[type=radio]", form).forEach((i) =>
      i.addEventListener("change", () => {
        const scores = [];
        section.questions.forEach((_, qi) => {
          const sel = $(`input[name="${section.id}_${qi}"]:checked`, form);
          if (sel) scores.push(Number(sel.value));
        });
        answers[section.id] = scores;
      })
    );
  }

  function renderResult() {
    const snapshot = calcSnapshot();
    saveSnapshot(snapshot);

    resultHeadline.textContent = "Your priority focus areas";
    form.innerHTML = "";

    resultSection.innerHTML = snapshot.priorities
      .map(
        (p) => `
      <div class="card">
        <h3>${escapeHTML(p.title)}</h3>
        <p class="muted">This area would benefit from one calm improvement.</p>
      </div>`
      )
      .join("");

    resultSection.hidden = false;
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ============== CONTROLS ============== */

  nextBtn.addEventListener("click", () => {
    step++;
    render();
  });

  backBtn.addEventListener("click", () => {
    step--;
    render();
  });

  $$("[data-open-snapshot]").forEach((b) =>
    b.addEventListener("click", () => {
      step = -1;
      answers = {};
      modal.classList.add("is-open");
      render();
    })
  );

})();
