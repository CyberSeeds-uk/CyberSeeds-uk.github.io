/* =========================
   DATA (anonymised, pilot-style)
   ========================= */

const LENSES = [
  {
    key: "Network & Wi-Fi",
    short: "Network",
    protects: "The household gateway: router settings, Wi-Fi sharing, guest access, default credentials.",
    moment: "Someone says “the Wi-Fi is playing up” — but the real issue is a router set up years ago and never revisited.",
    seed: "Create a guest Wi-Fi and change the router admin password. (One action, big calm.)",
    tag: "Gateway"
  },
  {
    key: "Devices & Apps",
    short: "Devices",
    protects: "Phones, tablets, laptops, TVs, consoles — and what’s quietly installed or outdated.",
    moment: "A forgotten tablet turns on in a drawer… still logged into an old email and connected to Wi-Fi.",
    seed: "Make a simple device list: keep / retire / update. Remove what doesn’t belong.",
    tag: "Inventory"
  },
  {
    key: "Privacy & Identity",
    short: "Privacy",
    protects: "Email accounts, recovery methods, old logins, and what the household exposes online.",
    moment: "A delivery message arrives for someone in the home — but it’s actually linked to an old email account nobody checks.",
    seed: "Pick one ‘core email’ per adult. Update recovery phone/email. Close or secure the rest.",
    tag: "Identity"
  },
  {
    key: "Scams & Behaviour",
    short: "Scams",
    protects: "How the household responds under pressure: calls, texts, ‘urgent’ messages, social engineering.",
    moment: "A text says ‘Mum, I’ve lost my phone’ — the message feels emotional and urgent, not logical.",
    seed: "Create a family verification phrase + a 10-second pause rule for money or codes.",
    tag: "Decisions"
  },
  {
    key: "Children’s Wellbeing",
    short: "Children",
    protects: "How children experience digital life: boundaries, sleep, confidence, safety, and support.",
    moment: "A child looks ‘fine’ — but they’re staying up late because the phone is the only quiet space they control.",
    seed: "A gentle tech routine: charge outside bedroom + one shared check-in conversation weekly.",
    tag: "Care"
  }
];

/**
 * Each household has BEFORE and AFTER lens intensities.
 * 0.0 = strongest (green), 1.0 = needs more attention (darker focus)
 * We intentionally avoid "risk score" language.
 */
const HOUSEHOLDS = [
  {
    name: "Family A · “Busy Wi-Fi House”",
    moodBefore: "A bit fuzzy",
    moodAfter: "Calm clarity",
    before: [0.72, 0.58, 0.62, 0.48, 0.44],
    after:  [0.32, 0.30, 0.34, 0.26, 0.28],
    examples: [
      { k:"Before", v:"Router admin password never changed (installed years ago).", type:"focus" },
      { k:"After",  v:"Guest Wi-Fi created + admin password changed.", type:"good" },
      { k:"Family win", v:"“We finally know what’s connected to our home.”", type:"good" }
    ]
  },
  {
    name: "Family B · “Two Phones + Kids”",
    moodBefore: "Overloaded",
    moodAfter: "More in control",
    before: [0.52, 0.66, 0.54, 0.46, 0.72],
    after:  [0.30, 0.34, 0.32, 0.28, 0.40],
    examples: [
      { k:"Before", v:"Child’s screen time drifted late because routines weren’t clear.", type:"focus" },
      { k:"After",  v:"Charging moved outside bedrooms + softer bedtime structure.", type:"good" },
      { k:"Family win", v:"“The house feels quieter at night.”", type:"good" }
    ]
  },
  {
    name: "Household C · “Grandparent + Scams”",
    moodBefore: "Vulnerable moments",
    moodAfter: "Protected confidence",
    before: [0.44, 0.40, 0.58, 0.76, 0.30],
    after:  [0.28, 0.26, 0.34, 0.38, 0.26],
    examples: [
      { k:"Before", v:"Pressure-texts caused worry (“urgent”, “account locked”, “fine due”).", type:"focus" },
      { k:"After",  v:"10-second pause rule + verification phrase agreed.", type:"good" },
      { k:"Family win", v:"“Now we don’t panic — we check.”", type:"good" }
    ]
  }
];

/* =========================
   UI refs
   ========================= */
const arcEls = [...Array(5)].map((_,i)=>document.getElementById(`arc${i}`));
const moodEl = document.getElementById("signalMood");
const householdNameEl = document.getElementById("householdName");

const lensTitle = document.getElementById("lensTitle");
const lensDesc = document.getElementById("lensDesc");
const lensProtects = document.getElementById("lensProtects");
const lensMoment = document.getElementById("lensMoment");
const lensSeed = document.getElementById("lensSeed");

const lensGrid = document.getElementById("lensGrid");
const exampleGrid = document.getElementById("exampleGrid");

let currentHouse = 0;
let currentView = "before"; // before|after
let currentLens = null;

/* =========================
   Helpers: SVG arc math
   ========================= */
function polarToCartesian(cx, cy, r, angleDeg){
  const a = (angleDeg - 90) * Math.PI/180;
  return { x: cx + (r * Math.cos(a)), y: cy + (r * Math.sin(a)) };
}
function describeArc(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx,cy,r,endAngle);
  const end = polarToCartesian(cx,cy,r,startAngle);
  const largeArcFlag = (endAngle - startAngle) <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/**
 * intensity: 0..1
 * We map:
 *  - 0.0 => strongest (bright green)
 *  - 1.0 => needs attention (darker ink)
 */
function colorForIntensity(intensity){
  // clamp
  const t = Math.min(1, Math.max(0, intensity));
  // blend between green and ink-ish
  // green RGB(43,182,115), ink RGB(11,37,64)
  const g = {r:43,g:182,b:115};
  const i = {r:11,g:37,b:64};
  const r = Math.round(g.r + (i.r - g.r) * t);
  const gg = Math.round(g.g + (i.g - g.g) * t);
  const b = Math.round(g.b + (i.b - g.b) * t);
  return `rgb(${r},${gg},${b})`;
}

/* =========================
   Render: Dial
   ========================= */
function renderDial(){
  const h = HOUSEHOLDS[currentHouse];
  const values = currentView === "before" ? h.before : h.after;

  householdNameEl.textContent = h.name;
  moodEl.textContent = currentView === "before" ? h.moodBefore : h.moodAfter;

  // 5 slices around the circle
  // angles: each is 72 degrees wide
  const baseStart = 0;
  const slice = 72;

  values.forEach((v, idx)=>{
    const start = baseStart + idx*slice + 6;     // padding between arcs
    const end   = baseStart + (idx+1)*slice - 6;

    // intensity controls stroke color + slight arc length effect
    // stronger => fuller arc; attention => slightly shorter
    const shrink = 10 * v; // 0..10
    const d = describeArc(160,160,112, start + shrink, end - shrink);
    arcEls[idx].setAttribute("d", d);
    arcEls[idx].style.stroke = colorForIntensity(v);
  });
}

/* =========================
   Render: Lens story panel
   ========================= */
function setLens(idx){
  currentLens = idx;

  const L = LENSES[idx];
  lensTitle.textContent = L.key;
  lensDesc.textContent = "This lens is a protective viewpoint — it helps families see what matters without panic.";
  lensProtects.textContent = L.protects;
  lensMoment.textContent = L.moment;
  lensSeed.textContent = L.seed;

  // highlight labels on dial
  document.querySelectorAll(".lbl").forEach(el=>{
    el.classList.toggle("on", Number(el.dataset.lens) === idx);
  });
}

/* =========================
   Render: Lens flip grid
   ========================= */
function renderLensGrid(){
  lensGrid.innerHTML = "";
  LENSES.forEach((L, i)=>{
    const card = document.createElement("div");
    card.className = "lens-card";
    card.setAttribute("role","button");
    card.setAttribute("tabindex","0");
    card.setAttribute("aria-label", `Lens: ${L.key}. Tap to flip.`);

    card.innerHTML = `
      <div class="face front">
        <div class="tag">${L.tag}</div>
        <div class="title">${L.key}</div>
        <div class="hint">Tap to reveal meaning</div>
      </div>
      <div class="face back">
        <div class="title">${L.short}: in household language</div>
        <div class="desc">${L.protects}</div>
        <div class="desc" style="margin-top:8px;opacity:.92;"><strong>Small seed:</strong> ${L.seed}</div>
      </div>
    `;

    const flip = ()=>{
      card.classList.toggle("flipped");
      setLens(i);
    };

    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        flip();
      }
    });

    lensGrid.appendChild(card);
  });
}

/* =========================
   Render: Example tiles
   ========================= */
function renderExamples(){
  exampleGrid.innerHTML = "";
  HOUSEHOLDS.forEach((h)=>{
    const tile = document.createElement("div");
    tile.className = "ex";
    tile.innerHTML = `
      <div class="head">
        <div class="name">${h.name}</div>
        <div class="sub">A recognisable pattern — and what changes after clarity.</div>
      </div>
      <div class="body">
        ${h.examples.map(x => `
          <div class="kv ${x.type}">
            <div class="k">${x.k}</div>
            <div class="v">${x.v}</div>
          </div>
        `).join("")}
      </div>
    `;
    exampleGrid.appendChild(tile);
  });
}

/* =========================
   Interactions
   ========================= */
function bind(){
  // hero buttons
  document.getElementById("seeMap")?.addEventListener("click", ()=>{
    document.getElementById("map")?.scrollIntoView({behavior:"smooth"});
  });
  document.getElementById("startSignal")?.addEventListener("click", ()=>{
    document.getElementById("signal")?.scrollIntoView({behavior:"smooth"});
  });
  document.getElementById("jumpSnapshot")?.addEventListener("click", ()=>{
    document.getElementById("snapshot")?.scrollIntoView({behavior:"smooth"});
  });
  document.getElementById("scrollTop")?.addEventListener("click", ()=>{
    window.scrollTo({top:0, behavior:"smooth"});
  });

  // before/after segmented
  document.querySelectorAll(".seg").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".seg").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      currentView = btn.dataset.view;
      renderDial();
    });
  });

  // household chips
  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      currentHouse = Number(btn.dataset.house);
      renderDial();

      // if a lens already selected, keep story consistent
      if(currentLens !== null) setLens(currentLens);
    });
  });

  // dial labels clickable
  document.querySelectorAll(".lbl").forEach(lbl=>{
    lbl.addEventListener("click", ()=>{
      setLens(Number(lbl.dataset.lens));
    });
  });
}

/* =========================
   Init
   ========================= */
renderLensGrid();
renderExamples();
bind();
renderDial();
setLens(0);
