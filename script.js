/* =========================================================
   CYBER SEEDS — Canon Script (2026)
   Signal simulator • Snapshot export • Lens expansion
   Practitioner overlay: hidden access gesture
========================================================= */

/* ------------------ Smooth navigation ------------------ */
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

document.getElementById("scrollToSignal")?.addEventListener("click", () => scrollTo("signal"));
document.getElementById("heroSignal")?.addEventListener("click", () => scrollTo("signal"));
document.getElementById("backToSignal")?.addEventListener("click", () => scrollTo("signal"));
document.getElementById("jumpToLenses")?.addEventListener("click", () => scrollTo("lenses"));
document.getElementById("openMiniMap")?.addEventListener("click", () => scrollTo("problem"));

/* ------------------ Lens expand (system, not flip gimmick) ------------------ */
document.querySelectorAll(".lensCard .lensHead").forEach(btn => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".lensCard");
    const isOpen = card.classList.contains("open");

    // close others (keeps page calm)
    document.querySelectorAll(".lensCard.open").forEach(c => {
      if (c !== card) {
        c.classList.remove("open");
        c.querySelector(".lensHead")?.setAttribute("aria-expanded", "false");
      }
    });

    card.classList.toggle("open", !isOpen);
    btn.setAttribute("aria-expanded", String(!isOpen));
  });
});

/* ------------------ Practitioner overlay (secret) ------------------
   Desktop: press and hold Shift, then type "seed" within 1.2s
   Mobile: long-press footer note for 4s, then double-tap logo
*/
let practitionerEnabled = false;
const overlay = document.getElementById("practitionerOverlay");
const poClose = document.getElementById("poClose");

function togglePractitioner(force) {
  practitionerEnabled = typeof force === "boolean" ? force : !practitionerEnabled;
  overlay?.classList.toggle("active", practitionerEnabled);
  overlay?.setAttribute("aria-hidden", practitionerEnabled ? "false" : "true");
}

poClose?.addEventListener("click", () => togglePractitioner(false));

/* Desktop gesture */
let seedBuffer = "";
let seedTimer = null;
document.addEventListener("keydown", (e) => {
  // require shift held to avoid accidental activation
  if (!e.shiftKey) return;

  const k = e.key.toLowerCase();
  if (!/^[a-z]$/.test(k)) return;

  seedBuffer += k;
  clearTimeout(seedTimer);
  seedTimer = setTimeout(() => { seedBuffer = ""; }, 1200);

  if (seedBuffer.endsWith("seed")) {
    seedBuffer = "";
    togglePractitioner();
  }
});

/* Mobile gesture */
let footerHoldTimer = null;
let footerArmed = false;

const footNote = document.getElementById("footNote");
const logo = document.querySelector(".logo");

footNote?.addEventListener("touchstart", () => {
  footerHoldTimer = setTimeout(() => {
    footerArmed = true;
    // a subtle haptic-like cue via a tiny UI change (no popup)
    footNote.style.opacity = "1";
    footNote.textContent = "—";
    setTimeout(() => {
      footNote.style.opacity = "";
      footNote.textContent = "No monitoring · No personal data stored · Calm by design";
    }, 700);
  }, 4000);
}, { passive: true });

footNote?.addEventListener("touchend", () => {
  clearTimeout(footerHoldTimer);
}, { passive: true });

let logoTapCount = 0;
let logoTapTimer = null;

logo?.addEventListener("touchend", () => {
  if (!footerArmed) return;
  logoTapCount++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 900);

  if (logoTapCount >= 2) {
    footerArmed = false;
    logoTapCount = 0;
    togglePractitioner();
  }
}, { passive: true });

/* ------------------ Signal Simulator Model ------------------ */
const LENS_NAMES = ["Network", "Devices", "Privacy", "Scams", "Children"];

/*
  Values represent "tension" (0 = calm / 1 = attention helps).
  We never present a grade; we present a directional signal.
*/
const questions = [
  {
    lens: 0,
    text: "How confident do you feel about your home Wi-Fi and router settings?",
    options: [
      { label: "Confident", value: 0.25, quip: "Lovely. The front door feels… properly shut." },
      { label: "Mostly confident", value: 0.42, quip: "Good. A few hinges might want a tiny tighten." },
      { label: "Not sure", value: 0.62, quip: "Normal. Routers are famously quiet about what they’re doing." },
      { label: "Not confident", value: 0.78, quip: "That’s okay. Clarity beats guessing every time." }
    ]
  },
  {
    lens: 1,
    text: "Do you know what apps and devices are most active in the household?",
    options: [
      { label: "Yes, clearly", value: 0.25, quip: "You know the rooms in the house. That’s power." },
      { label: "Roughly", value: 0.45, quip: "Solid. A little inventory turns chaos into calm." },
      { label: "Not really", value: 0.64, quip: "Fair. Devices multiply like socks in the laundry." },
      { label: "No idea", value: 0.80, quip: "Also fair. We’ll map it without judgement." }
    ]
  },
  {
    lens: 2,
    text: "How comfortable are you managing accounts, logins, and privacy settings?",
    options: [
      { label: "Comfortable", value: 0.30, quip: "Nice. Your identity has a steady anchor." },
      { label: "Somewhat", value: 0.50, quip: "Good. ‘Somewhat’ is where most households live." },
      { label: "Uncomfortable", value: 0.72, quip: "You’re not alone. Privacy menus were not designed by poets." }
    ]
  },
  {
    lens: 3,
    text: "When something looks suspicious (texts, emails, calls), what’s the household rhythm?",
    options: [
      { label: "Pause and verify", value: 0.28, quip: "Elite household move: the pause." },
      { label: "Careful, but uncertain", value: 0.52, quip: "Good instincts. A simple rule makes it effortless." },
      { label: "Rushed / reactive", value: 0.74, quip: "That’s human. Scams love busy brains." }
    ]
  },
  {
    lens: 4,
    text: "How clear are children’s digital routines and boundaries (time, apps, expectations)?",
    options: [
      { label: "Clear and healthy", value: 0.30, quip: "Beautiful. Structure is a kindness." },
      { label: "Somewhat clear", value: 0.52, quip: "Good. A tiny ritual can make this feel easy." },
      { label: "Unclear", value: 0.72, quip: "Normal. Families are busy. We make it practical." }
    ]
  }
];

let step = 0;
let answers = Array(questions.length).fill(null);
let values = [0.45, 0.45, 0.45, 0.45, 0.45];

/* UI refs */
const qEl = document.getElementById("simQuestion");
const oEl = document.getElementById("simOptions");
const stepEl = document.getElementById("simStep");
const hintEl = document.getElementById("simHint");
const nextBtn = document.getElementById("simNext");
const backBtn = document.getElementById("simBack");
const microHumour = document.getElementById("microHumour");

/* Lens readout */
const vEls = [
  document.getElementById("v0"),
  document.getElementById("v1"),
  document.getElementById("v2"),
  document.getElementById("v3"),
  document.getElementById("v4")
];

/* ------------------ Dial math ------------------ */
const arcs = [...Array(5)].map((_, i) => document.getElementById("arc" + i));
const moodEl = document.getElementById("signalMood");

function polar(cx, cy, r, a) {
  const rad = (a - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(i) {
  const seg = 360 / 5;
  const pad = 7;
  const s = i * seg + pad;
  const e = (i + 1) * seg - pad;
  const p1 = polar(160, 160, 112, s);
  const p2 = polar(160, 160, 112, e);
  return `M ${p1.x} ${p1.y} A 112 112 0 0 1 ${p2.x} ${p2.y}`;
}

/* Gentle status mapping */
function statusFor(v) {
  if (v < 0.45) return { label: "Calm", key: "calm", color: getCss("--calm") };
  if (v < 0.62) return { label: "Growing", key: "growing", color: getCss("--growing") };
  return { label: "Attention helps", key: "care", color: getCss("--care") };
}

function getCss(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function renderSignal() {
  values.forEach((v, i) => {
    arcs[i].setAttribute("d", arcPath(i));
    arcs[i].style.stroke = statusFor(v).color;
  });

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const s = statusFor(avg);
  moodEl.textContent = s.label;

  // lens readout
  values.forEach((v, i) => {
    vEls[i].textContent = statusFor(v).label;
    vEls[i].style.color = statusFor(v).color;
  });

  // hint line stays calm, slightly contextual
  hintEl.textContent = avg < 0.45
    ? "Stable signal. Keep the rhythm."
    : avg < 0.62
      ? "Growing signal. A few small seeds will help."
      : "Attention helps. Not urgent — just worth noticing.";
}

/* ------------------ Seeds suggestions ------------------ */
const SEEDS = [
  {
    lens: 0,
    name: "Network seed",
    tag: "10 minutes",
    pick: (v) => v >= 0.45,
    text: "Change router admin password + ensure WPA2/WPA3 is enabled. If possible, create a guest network for visitors/IoT."
  },
  {
    lens: 0,
    name: "Boundary seed",
    tag: "once",
    pick: (v) => v >= 0.62,
    text: "Name your networks clearly (Home / Guest). Put smart devices on Guest so one weak device can’t quietly affect others."
  },
  {
    lens: 1,
    name: "Hygiene seed",
    tag: "weekly",
    pick: (v) => v >= 0.45,
    text: "A 7-minute weekly tidy: updates, remove unused apps, check permissions for camera/mic/location on the busiest devices."
  },
  {
    lens: 2,
    name: "Identity seed",
    tag: "15 minutes",
    pick: (v) => v >= 0.45,
    text: "Turn on 2-step verification for your most important accounts and check recovery email/phone are current."
  },
  {
    lens: 3,
    name: "Pause seed",
    tag: "house rule",
    pick: (v) => v >= 0.45,
    text: "Create one household rule: ‘No links when rushed.’ Verify using official apps/sites (not the message)."
  },
  {
    lens: 4,
    name: "Routine seed",
    tag: "gentle",
    pick: (v) => v >= 0.45,
    text: "Agree a simple routine: device-free wind-down, and a shared ‘talk first’ rule for weird messages or uncomfortable content."
  }
];

function renderSeeds() {
  const list = document.getElementById("seedList");
  if (!list) return;
  list.innerHTML = "";

  const picks = [];
  values.forEach((v, i) => {
    SEEDS.filter(s => s.lens === i && s.pick(v)).forEach(s => picks.push(s));
  });

  // cap to keep it calm (not overwhelming)
  const top = picks.slice(0, 4);

  if (top.length === 0) {
    list.innerHTML = `<div class="seedItem"><div class="seedTop"><div class="seedName">Steady signal</div><div class="seedTag">maintain</div></div><div class="seedText">Keep the current rhythm. Small weekly habits are still the win.</div></div>`;
    return;
  }

  top.forEach(s => {
    const div = document.createElement("div");
    div.className = "seedItem";
    div.innerHTML = `
      <div class="seedTop">
        <div class="seedName">${s.name}</div>
        <div class="seedTag">${s.tag}</div>
      </div>
      <div class="seedText">${s.text}</div>
    `;
    list.appendChild(div);
  });
}

/* ------------------ Snapshot drawing ------------------ */
const canvas = document.getElementById("snapshotCanvas");
const ctx = canvas?.getContext("2d");

function drawSnapshot() {
  if (!ctx || !canvas) return;

  const W = canvas.width;
  const H = canvas.height;

  // background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.fillStyle = getCss("--ink") || "#0b2540";
  ctx.font = "600 28px Fraunces";
  ctx.fillText("Household Digital Snapshot", 34, 54);

  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  const s = statusFor(avg);
  ctx.font = "700 18px Inter";
  ctx.fillStyle = s.color;
  ctx.fillText("Signal: " + s.label, 34, 86);

  ctx.font = "400 14px Inter";
  ctx.fillStyle = "rgba(11,37,64,.68)";
  ctx.fillText("A calm, shareable summary of the signal your answers created.", 34, 112);

  // bars
  const labels = ["Net", "Dev", "Priv", "Scam", "Child"];
  const baseY = 340;
  const barW = 82;
  const gap = 46;
  const startX = 70;

  // subtle grid line
  ctx.strokeStyle = "rgba(11,37,64,.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(34, baseY);
  ctx.lineTo(W - 34, baseY);
  ctx.stroke();

  values.forEach((v, i) => {
    const height = 180; // fixed chart height
    const barH = Math.round(height * (0.25 + (1 - v) * 0.75)); // calmer signal = taller bar (positive framing)
    const x = startX + i * (barW + gap);
    const y = baseY - barH;

    const col = statusFor(v).color;

    // bar
    ctx.fillStyle = col;
    roundRect(ctx, x, y, barW, barH, 16);
    ctx.fill();

    // label
    ctx.fillStyle = "rgba(11,37,64,.86)";
    ctx.font = "700 13px Inter";
    ctx.fillText(labels[i], x + 22, baseY + 24);

    // small status
    ctx.fillStyle = col;
    ctx.font = "800 12px Inter";
    ctx.fillText(statusFor(v).label, x - 2, baseY + 44);
  });

  // footer line (data-minimised statement)
  ctx.fillStyle = "rgba(11,37,64,.58)";
  ctx.font = "500 12px Inter";
  ctx.fillText("Cyber Seeds · Signal over score · No monitoring · No personal data stored", 34, H - 28);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ------------------ Render question flow ------------------ */
function renderQuestion() {
  const q = questions[step];

  stepEl.textContent = `Question ${step + 1} of ${questions.length}`;
  qEl.textContent = q.text;

  oEl.innerHTML = "";
  q.options.forEach((opt) => {
    const d = document.createElement("div");
    d.className = "simOpt";
    d.setAttribute("role", "option");
    d.textContent = opt.label;

    if (answers[step] === opt) d.classList.add("selected");

    d.addEventListener("click", () => {
      answers[step] = opt;
      values[q.lens] = opt.value;

      [...oEl.children].forEach(c => c.classList.remove("selected"));
      d.classList.add("selected");

      nextBtn.disabled = false;

      microHumour.textContent = opt.quip;
      renderSignal();
      renderSeeds();
      drawSnapshot();
    });

    oEl.appendChild(d);
  });

  backBtn.disabled = step === 0;
  nextBtn.disabled = answers[step] === null;

  // keep humour panel meaningful even before selection
  microHumour.textContent = answers[step]?.quip || "Choose what feels true today. This isn’t a test — it’s a snapshot.";
}

/* Buttons */
nextBtn.addEventListener("click", () => {
  if (step < questions.length - 1) {
    step++;
    renderQuestion();
  } else {
    // end state (still calm)
    microHumour.textContent = "Snapshot complete. Keep it. Share it. Plant one small seed when ready.";
  }
});

backBtn.addEventListener("click", () => {
  if (step > 0) {
    step--;
    renderQuestion();
  }
});

/* init */
renderQuestion();
renderSignal();
renderSeeds();
drawSnapshot();

/* download */
document.getElementById("downloadSnapshot")?.addEventListener("click", () => {
  drawSnapshot();
  const a = document.createElement("a");
  a.download = "cyber-seeds-household-snapshot.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
});
