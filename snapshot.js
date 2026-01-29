/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   v1.0 Public (Canon-aligned)
   =========================================================== */

(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, m =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])
    );

  /* ---------- Storage ---------- */
  const STORE = "cyberseeds_snapshot_v1";

  const save = (data) => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...data, ts: Date.now() }));
    } catch {}
  };

  const clear = () => {
    try { localStorage.removeItem(STORE); } catch {}
  };

  /* ---------- Snapshot Model ---------- */
  let SECTIONS = [
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
      purpose: "What lives on the network",
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
      purpose: "Digital identity and recovery",
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
      purpose: "Handling urgency and pressure",
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
      purpose: "Sleep, calm, boundaries",
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
      purpose: "Support, guidance and openness",
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
    Network: [
      { title: "Secure your Wi-Fi router", link: "/resources/router-basics.html" },
    ],
    Devices: [
      { title: "Keep devices updated", link: "/resources/device-updates.html" },
    ],
    Privacy: [
      { title: "Password managers explained", link: "/resources/passwords.html" },
      { title: "Turn on 2-step verification", link: "/resources/2fa.html" },
    ],
    Scams: [
      { title: "Pause & verify habit", link: "/resources/scams.html" },
    ],
    Wellbeing: [
      { title: "Digital boundaries at home", link: "/resources/wellbeing.html" },
    ],
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

  /* ---------- Scoring ---------- */
  function scoreMulti(arr) {
    const c = arr.length;
    return c <= 2 ? 4 : c <= 4 ? 3 : c <= 6 ? 2 : 1;
  }

  function computeSectionScores() {
    const scores = {};
    Object.entries(answers).forEach(([id, qs]) => {
      const vals = qs.map(v => Array.isArray(v) ? scoreMulti(v) : v);
      scores[id] = Math.round(
        (vals.reduce((a,b)=>a+b,0) / vals.length) * 10
      ) / 10;
    });
    return scores;
  }

  function computeLensScores(sectionScores) {
    const lens = {};
    Object.entries(LENS_MAP).forEach(([k, ids]) => {
      const vals = ids.map(id => sectionScores[id]).filter(Boolean);
      if (vals.length)
        lens[k] = Math.round(
          (vals.reduce((a,b)=>a+b,0) / vals.length) * 10
        ) / 10;
    });
    return lens;
  }

  function stageFromLens(lens) {
    const total = Object.values(lens).reduce((a,b)=>a+b,0);
    if (total >= 16) return "Clear";
    if (total >= 11) return "Emerging";
    return "Vulnerable";
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
    result.hidden = true;
  }

  function renderSection() {
    const sec = SECTIONS[step];
    answers[sec.id] ??= [];

    let html = `
      <h3>${esc(sec.title)}</h3>
      <p class="muted">${esc(sec.purpose)}</p>
    `;

    sec.questions.forEach((q, qi) => {
      html += `<p><b>${esc(q.q)}</b></p><div class="choices">`;
      if (q.multi) {
        html += `<div class="multi-hint">Tick any that apply</div>`;
        q.a.forEach((t, oi) => {
          html += `
            <label class="choice multi">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>${esc(t)}</span>
            </label>`;
        });
      } else {
        q.a.forEach(o => {
          html += `
            <label class="choice">
              <input type="radio" name="${sec.id}_${qi}" value="${o.s}">
              <span>${esc(o.t)}</span>
            </label>`;
        });
      }
      html += `</div>`;
    });

    form.innerHTML = html;
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = true;
    backBtn.disabled = step === 0;

    bindInputs(sec);
  }

  function bindInputs(sec) {
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        answers[sec.id][qi] ??= [];
        $$(`input[data-q="${qi}"]`).forEach(cb => {
          cb.addEventListener("change", () => {
            const idx = +cb.dataset.o;
            const arr = answers[sec.id][qi];
            cb.checked ? arr.push(idx) : answers[sec.id][qi] = arr.filter(i=>i!==idx);
            nextBtn.disabled = arr.length === 0;
          });
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`).forEach(r => {
          r.addEventListener("change", () => {
            answers[sec.id][qi] = +r.value;
            nextBtn.disabled = false;
          });
        });
      }
    });
  }

  function renderResult() {
    const sectionScores = computeSectionScores();
    const lensScores = computeLensScores(sectionScores);
    const stage = stageFromLens(lensScores);

    const sorted = Object.entries(lensScores).sort((a,b)=>b[1]-a[1]);
    strongestEl.textContent = sorted[0][0];
    weakestEl.textContent = sorted[sorted.length-1][0];

    headline.textContent =
      `${stage} signal — start with ${sorted[sorted.length-1][0]}.`;

    // Resources
    if (resourceList) {
      resourceList.innerHTML = "";
      RESOURCE_MAP[sorted[sorted.length-1][0]]?.forEach(r => {
        resourceList.innerHTML += `<li><a href="${r.link}">${r.title}</a></li>`;
      });
    }

    result.hidden = false;
    save({ stage, lensScores, sectionScores });

    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete"));
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ---------- Controls ---------- */
  nextBtn.onclick = () => { step++; render(); };
  backBtn.onclick = () => { step--; render(); };

  $$("[data-open-snapshot]").forEach(btn =>
    btn.addEventListener("click", () => {
      step = -1;
      Object.keys(answers).forEach(k => delete answers[k]);
      modal.classList.add("is-open");
      render();
    })
  );

})();
