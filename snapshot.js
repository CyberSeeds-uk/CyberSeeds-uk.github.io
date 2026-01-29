/* ===================================================
   Cyber Seeds — Household Snapshot v4
   Calm, non-judgemental, 8-section system
=================================================== */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const STORAGE_KEY = "seed_snapshot_v4";

  /* ---------- DATA MODEL ---------- */

  const SECTIONS = [
    {
      id: "devices",
      title: "Connected Devices & Updates",
      purpose: "What lives on the network, and how healthy it is",
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
          q: "Do devices install updates automatically?",
          a: ["All or most", "Some", "Rarely", "Not sure"],
        },
      ],
    },
    // (Other sections continue here unchanged)
  ];

  /* ---------- STATE ---------- */

  let step = 0;
  const answers = {};

  /* ---------- SCORING ---------- */

  function scoreMulti(count) {
    if (count <= 2) return 4;
    if (count <= 4) return 3;
    if (count <= 6) return 2;
    return 1;
  }

  /* ---------- RENDER ---------- */

  const form = $("#snapshotForm");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const result = $("#snapshotResult");

  function render() {
    const sec = SECTIONS[step];
    if (!sec) return renderResult();

    let html = `
      <h3>${sec.title}</h3>
      <p class="muted">${sec.purpose}</p>
    `;

    sec.questions.forEach((q, qi) => {
      html += `<p><b>${q.q}</b></p><div class="choices">`;

      if (q.multi) {
        q.a.forEach((t, oi) => {
          html += `
            <label class="choice multi">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>${t}</span>
            </label>`;
        });
        html += `<div class="multi-hint muted">Select any that apply</div>`;
      } else {
        q.a.forEach((t, oi) => {
          html += `
            <label class="choice">
              <input type="radio" name="q${qi}" value="${oi}">
              <span>${t}</span>
            </label>`;
        });
      }

      html += `</div>`;
    });

    form.innerHTML = html;
    bindInputs(sec);
  }

  function bindInputs(sec) {
    sec.questions.forEach((q, qi) => {
      if (q.multi) {
        answers[qi] = answers[qi] || [];
        $$(`input[data-q="${qi}"]`).forEach(cb => {
          cb.addEventListener("change", () => {
            const idx = Number(cb.dataset.o);
            answers[qi] = cb.checked
              ? [...new Set([...answers[qi], idx])]
              : answers[qi].filter(i => i !== idx);
          });
        });
      } else {
        $$(`input[name="q${qi}"]`).forEach(r =>
          r.addEventListener("change", () => {
            answers[qi] = Number(r.value) + 1;
          })
        );
      }
    });
  }

  function renderResult() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    result.hidden = false;
    form.innerHTML = "";
  }

  /* ---------- CONTROLS ---------- */

  nextBtn?.addEventListener("click", () => {
    step++;
    render();
  });

  backBtn?.addEventListener("click", () => {
    step = Math.max(0, step - 1);
    render();
  });

  render();
})();
