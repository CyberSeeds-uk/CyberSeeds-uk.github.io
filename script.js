/* ============================
   MOBILE MENU
============================ */
document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

/* ============================
   DIGITAL MOT DEMO
============================ */
const questions = [
  { q:"How old is your WiFi router?", a:["< 2 years","2+ years","I don’t know"], r:[0,1,1] },
  { q:"Do your kids have private social profiles?", a:["Yes","No / Not sure"], r:[0,1] },
  { q:"Have you changed your WiFi password?", a:["Yes","No / Not sure"], r:[0,1] },
  { q:"Are all devices set to auto-update?", a:["Yes","No / Not sure"], r:[0,1] },
  { q:"Checked your email for leaks?", a:["Yes","No / Not sure"], r:[0,1] }
];

let qi = 0;
let risk = 0;

function nextQ() {
  const box = document.getElementById("demo-quiz");

  if (qi < questions.length) {
    const q = questions[qi];
    let html = `<h4>${q.q}</h4>`;
    q.a.forEach((ans, i) => {
      html += `<button class="btn btn-outline" onclick="answerQ(${q.r[i]})">${ans}</button>`;
    });
    box.innerHTML = html;
  } else showResult();
}

function answerQ(val) {
  risk += val;
  qi++;
  nextQ();
}

function showResult() {
  document.getElementById("demo-quiz").style.display = "none";
  document.getElementById("demo-result").style.display = "block";

  const meter = document.getElementById("risk-meter");
  const fb = document.getElementById("risk-feedback");

  if (risk <= 1) {
    meter.innerHTML = "🟢 LOW RISK";
    fb.innerHTML = "Strong start — but small gaps may still exist.";
  } else if (risk <= 3) {
    meter.innerHTML = "🟡 MEDIUM RISK";
    fb.innerHTML = "Some issues found — a full MOT is recommended.";
  } else {
    meter.innerHTML = "🔴 HIGH RISK";
    fb.innerHTML = "Your home is at high digital risk — don’t worry, we can fix this.";
  }
}

document.getElementById("retake-btn").addEventListener("click", () => {
  qi = 0;
  risk = 0;
  document.getElementById("demo-result").style.display = "none";
  document.getElementById("demo-quiz").style.display = "block";
  nextQ();
});

nextQ();

/* ============================
   BUBBLE SIMULATION
============================ */
const bubbleCanvas = document.getElementById("bubbleCanvas");
const ctx = bubbleCanvas.getContext("2d");
const narrator = document.getElementById("bubbleNarrator");
const replayBtn = document.getElementById("replaySim");

function resizeSim() {
  bubbleCanvas.width = bubbleCanvas.offsetWidth;
  bubbleCanvas.height = bubbleCanvas.offsetHeight;
}
resizeSim();
window.addEventListener("resize", resizeSim);

let bubbles = [];
let infectInterval;

// Narration messages
const narration = [
  "Each bubble is a device in your home.",
  "This one device becomes vulnerable…",
  "The risk quietly spreads to others.",
  "Outdated apps, weak passwords make it worse.",
  "Security applied…",
  "Everything becomes safe again ✔"
];

// Show floating narration
function say(text) {
  narrator.innerText = text;
  narrator.style.opacity = 1;

  setTimeout(() => {
    narrator.style.opacity = 0;
  }, 2200);
}

// Start narration timeline
function startNarration() {
  const timings = [0, 900, 2600, 4300, 6000, 7200];
  timings.forEach((t, i) => setTimeout(() => say(narration[i]), t));
}

// Create new bubble array
function initBubbles() {
  bubbles = [];
  for (let i = 0; i < 22; i++) {
    bubbles.push({
      x: Math.random() * bubbleCanvas.width,
      y: Math.random() * bubbleCanvas.height,
      r: 10 + Math.random() * 6,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      infected: false,
      safe: false
    });
  }
  bubbles[0].infected = true; // patient zero
}

// Infection spread
function spread() {
  bubbles.forEach((b1, i) => {
    if (!b1.infected) return;
    bubbles.forEach((b2, j) => {
      if (i === j) return;
      const d = Math.hypot(b1.x - b2.x, b1.y - b2.y);
      if (d < 80 && Math.random() < 0.1) b2.infected = true;
    });
  });
}

// Heal all devices
function heal() {
  bubbles.forEach(b => { b.infected = false; b.safe = true; });
}

// Draw animation
function animate() {
  ctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);

  bubbles.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;

    if (b.x < b.r || b.x > bubbleCanvas.width - b.r) b.dx *= -1;
    if (b.y < b.r || b.y > bubbleCanvas.height - b.r) b.dy *= -1;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);

    if (b.safe) ctx.fillStyle = "#32d47e";
    else if (b.infected) ctx.fillStyle = "#ff4d4d";
    else ctx.fillStyle = "#1377d6";

    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  requestAnimationFrame(animate);
}

// RUN SIMULATION
function startSimulation() {
  initBubbles();
  startNarration();

  clearInterval(infectInterval);
  infectInterval = setInterval(spread, 400);

  setTimeout(() => {
    clearInterval(infectInterval);
    heal();
  }, 6500);
}

animate();
startSimulation();

// Replay button
replayBtn.addEventListener("click", () => {
  narrator.style.opacity = 0;
  startSimulation();
});
