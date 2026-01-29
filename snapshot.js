/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   Snapshot v1.0 (Canon-ready)
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

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE));
    } catch {
      return null;
    }
  };

  const clear = () => {
    try { localStorage.removeItem(STORE); } catch {}
  };

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
          q: "Do these devices install updates automatically?",
          a: [
            { t: "All or most do", s: 4 },
            { t: "Some do, some don’t", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Not sure", s: 1 },
          ],
        },
      ],
    },

    {
      id: "accounts",
      title: "Accounts & Passwords",
      purpose: "Your digital identity",
      questions: [
        {
          q: "How do you manage passwords?",
          a: [
            { t: "Password manager", s: 4 },
            { t: "Interested but not using one", s: 3 },
            { t: "Not sure what that is", s: 2 },
            { t: "Reuse passwords", s: 1 },
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
            { t: "Hesitate but sometimes respond", s: 3 },
            { t: "Feel pressured", s: 2 },
            { t: "Been caught before", s: 1 },
          ],
        },
      ],
    },

    {
      id: "wellbeing",
      title: "Digital Wellbeing",
      purpose: "Sleep, calm, focus",
      questions: [
        {
          q: "Do you have device-free times (meals / bedtime)?",
          a: [
            { t: "Yes, daily", s: 4 },
            { t: "Occasionally", s: 3 },
            { t: "Rarely", s: 2 },
            { t: "Never", s: 1 },
          ],
        },
      ],
    },
  ];

  const answers = {};
  let step = -1;

  /* ---------- DOM ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const headline = $("#resultHeadline");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const closeBtn = $("#closeSnapshot");
  const resetBtn = $("#resetSnapshot");
  const retakeBtn = $("#retakeSnapshot");

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
        q.a.forEach((label, oi) => {
          html += `
            <label class="choice multi" tabindex="0">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>${esc(label)}</span>
            </label>
          `;
        });
      } else {
        q.a.forEach(opt => {
          html += `
            <label class="choice" tabindex="0">
              <input type="radio" name="${sec.id}_${qi}" value="${opt.s}">
              <span>${esc(opt.t)}</span>
            </label>
          `;
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
            const idx = Number(cb.dataset.o);
            const arr = answers[sec.id][qi];
            cb.checked
              ? arr.includes(idx) || arr.push(idx)
              : answers[sec.id][qi] = arr.filter(i => i !== idx);
            nextBtn.disabled = answers[sec.id][qi].length === 0;
          });
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`).forEach(r => {
          r.addEventListener("change", () => {
            answers[sec.id][qi] = Number(r.value);
            nextBtn.disabled = false;
          });
        });
      }
    });
  }

  function renderResult() {
    const flatScores = [];

    Object.values(answers).forEach(sec =>
      sec.forEach(v => {
        if (Array.isArray(v)) {
          const c = v.length;
          flatScores.push(c <= 2 ? 4 : c <= 4 ? 3 : 2);
        } else {
          flatScores.push(v);
        }
      })
    );

    const avg = Math.round((flatScores.reduce((a,b)=>a+b,0) / flatScores.length) * 10) / 10;
    const stage =
      avg >= 3.5 ? "Clear" :
      avg >= 2.5 ? "Emerging" :
      "Vulnerable";

    headline.textContent =
      `${stage} signal — your household has clear next steps, not problems.`;

    result.hidden = false;
    save({ avg, stage, answers });

    // allow resource navigation
    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete"));
  }

  function render() {
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderSection();
  }

    const stepMeta = document.getElementById("stepMeta");
    if (stepMeta) {
      stepMeta.textContent =
        step < 0
          ? ""
          : `Step ${step + 1} of ${SECTIONS.length}`;
    }

  /* ---------- Controls ---------- */
  nextBtn.addEventListener("click", () => {
    step++;
    render();
  });

  backBtn.addEventListener("click", () => {
    step--;
    render();
  });

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  closeBtn?.addEventListener("click", closeModal);
  $$("[data-close]").forEach(el => el.addEventListener("click", closeModal));

  resetBtn?.addEventListener("click", () => { clear(); step = -1; render(); });
  retakeBtn?.addEventListener("click", () => { step = -1; render(); });

  $$("[data-open-snapshot]").forEach(btn =>
    btn.addEventListener("click", () => {
      step = -1;
      Object.keys(answers).forEach(k => delete answers[k]);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      render();

    })
  );
const LENS_MAP = {
  Network: ["wifi"],
  Devices: ["devices"],
  Privacy: ["accounts"],
  Scams: ["scams"],
  Wellbeing: ["children", "wellbeing"]
};

function computeLensScores(sectionScores) {
  const lensScores = {};

  Object.entries(LENS_MAP).forEach(([lens, sectionIds]) => {
    const vals = sectionIds
      .map(id => sectionScores[id])
      .filter(v => typeof v === "number");

    if (vals.length) {
      lensScores[lens] = Math.round(
        (vals.reduce((a, b) => a + b, 0) / vals.length) * 10
      ) / 10;
    }
  });

  return lensScores;
}

})();
