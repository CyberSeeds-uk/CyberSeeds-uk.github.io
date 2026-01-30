/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   v1.2 Public (Canon-aligned)
   Finished UX Pass
   =========================================================== */

(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, m =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])
    );

  /* ---------- Storage ---------- */
  const STORE = "cyberseeds_snapshot_v1";
  const save = (data) => {
    try { localStorage.setItem(STORE, JSON.stringify({ ...data, ts: Date.now() })); }
    catch {}
  };

  /* ---------- Modal Body Lock (iOS-safe) ---------- */
  let scrollY = 0;
  const lockBody = () => {
    scrollY = window.scrollY;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${scrollY}px`;
  };
  const unlockBody = () => {
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, scrollY);
  };

  /* ---------- State ---------- */
  const answers = {};
  let step = -1;

  /* ---------- DOM ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const strongestEl = $("#strongestLens");
  const weakestEl = $("#weakestLens");
  const headline = $("#resultHeadline");
  const resourceList = $("#personalResources");

  if (!modal) return;

  /* ---------- Snapshot Model ---------- */
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
            { t: "Still using defaults", s: 2 },
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
            "Other",
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
      ],
    },
    {
      id: "children",
      title: "Children’s Online Safety",
      purpose: "Support, guidance and openness",
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

  const LENS_MAP = {
    Network: ["wifi"],
    Devices: ["devices"],
    Privacy: ["accounts"],
    Wellbeing: ["children"],
  };

  const RESOURCE_MAP = {
    Privacy: [{ title: "Strengthen account privacy", link: "/resources/privacy.html" }],
    Devices: [{ title: "Keep devices updated", link: "/resources/device-updates.html" }],
    Network: [{ title: "Secure your router", link: "/resources/router-basics.html" }],
    Wellbeing: [{ title: "Healthy digital boundaries", link: "/resources/wellbeing.html" }],
  };

  /* ---------- Scoring ---------- */
  const scoreMulti = (arr) =>
    arr.length <= 2 ? 4 : arr.length <= 4 ? 3 : arr.length <= 6 ? 2 : 1;

  function computeScores() {
    const section = {};
    Object.entries(answers).forEach(([id, vals]) => {
      const scores = vals.map(v => Array.isArray(v) ? scoreMulti(v) : v);
      section[id] = scores.reduce((a,b)=>a+b,0) / scores.length;
    });

    const lens = {};
    Object.entries(LENS_MAP).forEach(([k, ids]) => {
      const vals = ids.map(id => section[id]).filter(Boolean);
      lens[k] = vals.reduce((a,b)=>a+b,0) / vals.length;
    });

    return { section, lens };
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
        answers[sec.id][qi] ??= [];
        q.a.forEach((t, oi) => {
          html += `
            <label class="choice multi">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>${esc(t)}</span>
            </label>
          `;
        });
      } else {
        q.a.forEach(o => {
          html += `
            <label class="choice">
              <input type="radio" name="${sec.id}_${qi}" value="${o.s}">
              <span>${esc(o.t)}</span>
            </label>
          `;
        });
      }

      html += `</div>`;
    });

    form.innerHTML = html;
    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    backBtn.disabled = step === 0;
    nextBtn.disabled = true;

    bindInputs(sec);
  }

  function bindInputs(sec) {
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        $$(`input[data-q="${qi}"]`).forEach(cb => {
          cb.addEventListener("change", () => {
            const idx = +cb.dataset.o;
            const arr = answers[sec.id][qi];
            cb.checked ? arr.push(idx) : answers[sec.id][qi] = arr.filter(i=>i!==idx);
            updateChoiceStyles();
            nextBtn.disabled = arr.length === 0;
          });
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`).forEach(r => {
          r.addEventListener("change", () => {
            answers[sec.id][qi] = +r.value;
            updateChoiceStyles();
            nextBtn.disabled = false;
          });
        });
      }
    });
  }

  function updateChoiceStyles() {
    $$(".choice").forEach(c => c.classList.remove("is-selected"));
    $$("input:checked").forEach(i => i.closest(".choice")?.classList.add("is-selected"));
  }

  function renderResult() {
    // 🔴 CRITICAL: remove all questions
    form.innerHTML = "";

    const { lens } = computeScores();
    const sorted = Object.entries(lens).sort((a,b)=>b[1]-a[1]);
    const strongest = sorted[0][0];
    const weakest = sorted[sorted.length-1][0];

    headline.textContent = `Calm signal — start with ${weakest}.`;
    strongestEl.textContent = strongest;
    weakestEl.textContent = weakest;

    resourceList.innerHTML = "";
    RESOURCE_MAP[weakest]?.forEach(r => {
      resourceList.innerHTML += `<li><a href="${r.link}">${r.title}</a></li>`;
    });

    result.hidden = false;
    save({ lens, strongest, weakest });

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
      lockBody();
      render();
    })
  );

  $("#snapshotClose")?.addEventListener("click", () => {
    modal.classList.remove("is-open");
    unlockBody();
  });

})();
