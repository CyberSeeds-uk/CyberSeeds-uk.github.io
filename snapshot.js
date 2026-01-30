/* ===========================================================
   Cyber Seeds — Household Snapshot Engine
   v1.3.1 STABLE
   =========================================================== */

(() => {
  "use strict";
console.log("[Cyber Seeds] snapshot.js loaded");

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
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...data, ts: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };

  /* ---------- Body Lock ---------- */
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
  const resourceBtn = $("#goToResources");

  if (!modal || !form) return;

  /* ---------- Snapshot Model (UNCHANGED STRUCTURE) ---------- */
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

  const LENS_EXPLAIN = {
    Network: "Your router is the household’s digital front door.",
    Devices: "Unpatched devices quietly increase risk.",
    Privacy: "Accounts are the most common entry point after incidents.",
    Wellbeing: "Boundaries protect sleep, focus, and children.",
  };

  /* ---------- Scoring ---------- */
  const scoreMulti = (arr) =>
    arr.length <= 2 ? 4 : arr.length <= 4 ? 3 : arr.length <= 6 ? 2 : 1;

  function computeLens() {
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

    return lens;
  }

  /* ---------- UI ---------- */
  function updateChoiceStyles(){
    $$(".choice").forEach(c => c.classList.remove("is-selected"));
    $$("input:checked").forEach(i => i.closest(".choice")?.classList.add("is-selected"));
  }

  function renderIntro(){
    form.innerHTML = `<p class="muted">This is a calm reading of your household’s digital ecosystem.</p>`;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
    backBtn.disabled = true;
    result.hidden = true;
  }

  function renderSection(){
    const sec = SECTIONS[step];
    answers[sec.id] ??= [];

    let html = `<h3>${esc(sec.title)}</h3><p class="muted">${esc(sec.purpose)}</p>`;

    sec.questions.forEach((q,qi)=>{
      html += `<p><b>${esc(q.q)}</b></p><div class="choices">`;

      if(q.multi){
        answers[sec.id][qi] ??= [];
        q.a.forEach((t,oi)=>{
          html += `
            <label class="choice">
              <input type="checkbox" data-q="${qi}" data-o="${oi}">
              <span>${esc(t)}</span>
            </label>`;
        });
      } else {
        q.a.forEach(o=>{
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

  function bindInputs(sec){
    sec.questions.forEach((q,qi)=>{
      if(q.multi){
        $$(`input[data-q="${qi}"]`).forEach(cb=>{
          cb.addEventListener("change",()=>{
            const arr = answers[sec.id][qi];
            const idx = +cb.dataset.o;
            cb.checked && !arr.includes(idx) && arr.push(idx);
            !cb.checked && (answers[sec.id][qi] = arr.filter(i=>i!==idx));
            updateChoiceStyles();
            nextBtn.disabled = answers[sec.id][qi].length === 0;
          });
        });
      } else {
        $$(`input[name="${sec.id}_${qi}"]`).forEach(r=>{
          r.addEventListener("change",()=>{
            answers[sec.id][qi] = +r.value;
            updateChoiceStyles();
            nextBtn.disabled = false;
          });
        });
      }
    });
  }

  function renderResult(){
    form.innerHTML = "";
    const lens = computeLens();
    const sorted = Object.entries(lens).sort((a,b)=>b[1]-a[1]);
    const strongest = sorted[0][0];
    const weakest = sorted.at(-1)[0];

    headline.textContent = `Calm signal — start with ${weakest}.`;
    strongestEl.textContent = strongest;
    weakestEl.textContent = weakest;

    const explain = document.createElement("div");
    explain.className = "lens-explain";
    explain.innerHTML = `
      <div><h4>Why ${weakest}</h4><p>${LENS_EXPLAIN[weakest]}</p></div>
      <div><h4>What’s already working</h4><p>${LENS_EXPLAIN[strongest]}</p></div>`;
    result.appendChild(explain);

    const ok = save({ lens, strongest, weakest });
    const saved = document.createElement("p");
    saved.className = "micro muted saved-line";
    saved.textContent = ok ? "✓ Saved locally on this device" : "Results shown (not saved)";
    result.appendChild(saved);

    result.hidden = false;
    requestAnimationFrame(()=>result.classList.add("reveal"));

    nextBtn.style.display = "none";
    backBtn.style.display = "none";
    resourceBtn.style.display = "inline-flex";

    document.dispatchEvent(new CustomEvent("cyberseeds:snapshot-complete"));
  }

  function render(){
    if(step < 0) renderIntro();
    else if(step >= SECTIONS.length) renderResult();
    else renderSection();
  }

  /* ---------- Controls ---------- */
  nextBtn.onclick = () => {
    if(step === SECTIONS.length - 1){
      step = SECTIONS.length;
      renderResult();
      return;
    }
    step++;
    render();
  };

  backBtn.onclick = () => { step--; render(); };

  function openSnapshot() {
  step = -1;
  Object.keys(answers).forEach(k => delete answers[k]);

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  lockBody();

  nextBtn.style.display = "";
  backBtn.style.display = "";
  nextBtn.disabled = false;

  render();

  // iOS/Safari: force focus into modal for reliable interaction
  setTimeout(() => {
    const focusTarget = $("#snapshotNext") || $("#snapshotForm");
    focusTarget?.focus?.();
  }, 30);
}

// 1) Direct binding for your main CTA IDs if present
["takeSnapshot", "startSnapshot", "snapshotBtn"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", openSnapshot, { passive: true });
});

// 2) Attribute binding (your intended method)
document.addEventListener("click", (e) => {
  const t = e.target.closest?.("[data-open-snapshot]");
  if (t) {
    e.preventDefault();
    openSnapshot();
  }
}, true);

// 3) Failsafe: any button/link with matching text (last resort, harmless)
document.addEventListener("click", (e) => {
  const t = e.target.closest?.("button,a");
  if (!t) return;
  const label = (t.textContent || "").toLowerCase();
  if (label.includes("snapshot") && label.includes("take")) {
    e.preventDefault();
    openSnapshot();
  }
}, true);
 
function closeSnapshot() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  unlockBody();
}

$("#closeSnapshot")?.addEventListener("click", closeSnapshot);
$$("#snapshotModal [data-close], #snapshotModal .modal-backdrop").forEach(el => {
  el.addEventListener("click", closeSnapshot);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("is-open")) closeSnapshot();
});

   
  $("#closeSnapshot")?.onclick = () => {
    modal.classList.remove("is-open");
    unlockBody();
  };
})();
