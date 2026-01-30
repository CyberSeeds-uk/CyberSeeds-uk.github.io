(() => {
  "use strict";

  /* ----------------- Helpers ----------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ----------------- Storage ----------------- */
  const STORE = "cyberseeds_snapshot_v1";

  function saveSnapshot(data){
    try{
      localStorage.setItem(STORE, JSON.stringify({
        ...data,
        ts: Date.now()
      }));
      return true;
    }catch{
      return false;
    }
  }

  /* ----------------- Modal ----------------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");

  if (!modal || !form) return;

  let step = -1;
  const answers = {};

  /* ----------------- Model ----------------- */
  const SECTIONS = [
    {
      id: "network",
      title: "Home Wi-Fi",
      purpose: "The digital front door",
      q: "Have you changed the router’s default passwords?",
      options: [
        { t: "Yes", s: 4 },
        { t: "Partially", s: 3 },
        { t: "No", s: 2 },
        { t: "Not sure", s: 1 },
      ],
    },
    {
      id: "devices",
      title: "Devices",
      purpose: "What connects to the home",
      q: "Which devices are used?",
      multi: true,
      options: [
        "Phones",
        "Laptops",
        "Smart TVs",
        "Games consoles",
        "Smart speakers",
      ],
    },
    {
      id: "privacy",
      title: "Accounts",
      purpose: "What protects everything else",
      q: "How are passwords managed?",
      options: [
        { t: "Password manager", s: 4 },
        { t: "Some reuse", s: 3 },
        { t: "Mostly reuse", s: 2 },
        { t: "Not sure", s: 1 },
      ],
    },
    {
      id: "wellbeing",
      title: "Children & Wellbeing",
      purpose: "Calm boundaries",
      q: "Do you use parental controls?",
      options: [
        { t: "Yes", s: 4 },
        { t: "Sometimes", s: 3 },
        { t: "Not yet", s: 2 },
        { t: "Not applicable", s: 4 },
      ],
    },
  ];

  /* ----------------- Rendering ----------------- */
  function renderIntro(){
    form.innerHTML = `
      <p class="muted">
        This is a calm check-in — not a test.
        Answer honestly. You can change anything later.
      </p>`;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    result.hidden = true;
  }

  function renderQuestion(){
    const s = SECTIONS[step];
    answers[s.id] ??= s.multi ? [] : null;

    let html = `
      <h3>${s.title}</h3>
      <p class="muted">${s.purpose}</p>
      <p><strong>${s.q}</strong></p>
      <div class="choices">`;

    if (s.multi){
      s.options.forEach((t, i) => {
        html += `
          <label class="choice">
            <input type="checkbox" data-i="${i}">
            <span>${t}</span>
          </label>`;
      });
    } else {
      s.options.forEach(o => {
        html += `
          <label class="choice">
            <input type="radio" name="q" value="${o.s}">
            <span>${o.t}</span>
          </label>`;
      });
    }

    html += `</div>`;
    form.innerHTML = html;

    nextBtn.textContent = step === SECTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = true;
    backBtn.disabled = step === 0;

    bindInputs(s);
  }

  function bindInputs(s){
    if (s.multi){
      $$("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
          const idx = +cb.dataset.i;
          const arr = answers[s.id];

          if (cb.checked && !arr.includes(idx)) arr.push(idx);
          if (!cb.checked) answers[s.id] = arr.filter(v => v !== idx);

          nextBtn.disabled = answers[s.id].length === 0;
          updateChoiceStyles();
        });
      });
    } else {
      $$("input[type=radio]").forEach(r => {
        r.addEventListener("change", () => {
          answers[s.id] = +r.value;
          nextBtn.disabled = false;
          updateChoiceStyles();
        });
      });
    }
  }

  function updateChoiceStyles(){
    $$(".choice").forEach(c => c.classList.remove("is-selected"));
    $$("input:checked").forEach(i => i.closest(".choice")?.classList.add("is-selected"));
  }

  function renderResult(){
    form.innerHTML = "";

    const scores = {};
    SECTIONS.forEach(s => {
      if (Array.isArray(answers[s.id])){
        scores[s.id] = answers[s.id].length <= 2 ? 4 : 2;
      } else {
        scores[s.id] = answers[s.id];
      }
    });

    const sorted = Object.entries(scores).sort((a,b)=>a[1]-b[1]);
    const weakest = sorted[0][0];
    const strongest = sorted.at(-1)[0];

    saveSnapshot({ scores, weakest, strongest });

    $("#resultHeadline").textContent = `Start with ${weakest}.`;
    $("#strongestLens").textContent = strongest;
    $("#weakestLens").textContent = weakest;

    result.hidden = false;
    result.classList.add("reveal");

    nextBtn.style.display = "none";
    backBtn.style.display = "none";
  }

  function render(){
    if (step < 0) renderIntro();
    else if (step >= SECTIONS.length) renderResult();
    else renderQuestion();
  }

  /* ----------------- Controls ----------------- */
  nextBtn.onclick = () => {
    step++;
    render();
  };

  backBtn.onclick = () => {
    step--;
    render();
  };

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open-snapshot]");
    if (!t) return;
    e.preventDefault();
    step = -1;
    Object.keys(answers).forEach(k => delete answers[k]);
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    nextBtn.style.display = "";
    backBtn.style.display = "";
    render();
  });

  $("#closeSnapshot")?.addEventListener("click", () => {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  });

})();
