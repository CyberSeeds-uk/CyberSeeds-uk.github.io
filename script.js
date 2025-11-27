/* MOBILE MENU */
document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

/* ========================
   DIGITAL MOT DEMO QUIZ
======================== */

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
    let q = questions[qi];
    let html = `<h4>${q.q}</h4>`;
    q.a.forEach((ans,i)=>{
      html += `<button class="btn btn-outline" onclick="answerQ(${q.r[i]})">${ans}</button>`;
    });
    box.innerHTML = html;
  } else showResult();
}

function answerQ(add) {
  risk += add;
  qi++;
  nextQ();
}

function showResult() {
  document.getElementById("demo-quiz").style.display="none";
  document.getElementById("demo-result").style.display="block";

  const meter = document.getElementById("risk-meter");
  const feedback = document.getElementById("risk-feedback");

  if (risk <= 1) {
    meter.innerHTML = "🟢 LOW RISK";
    feedback.innerHTML = "Strong start — but small gaps may still exist.";
  } else if (risk <= 3) {
    meter.innerHTML = "🟡 MEDIUM RISK";
    feedback.innerHTML = "Some issues found — a full MOT is recommended.";
  } else {
    meter.innerHTML = "🔴 HIGH RISK";
    feedback.innerHTML = "Your home is at high digital risk — don’t worry, we can fix this.";
  }
}

document.getElementById("retake-btn").addEventListener("click", () => {
  qi = 0; risk = 0;
  document.getElementById("demo-result").style.display="none";
  document.getElementById("demo-quiz").style.display="block";
  nextQ();
});

nextQ();

/* ========================
   BUBBLE SPREAD SIMULATION
======================== */

const canvas = document.getElementById("bubbleCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let bubbles = [];
for (let i = 0; i < 22; i++) {
  bubbles.push({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    r: 10 + Math.random()*6,
    dx: (Math.random()-0.5)*0.4,
    dy: (Math.random()-0.5)*0.4,
    infected:false,
    safe:false
  });
}
bubbles[0].infected = true;

function infectionStep() {
  bubbles.forEach((b,i)=>{
    if (!b.infected) return;
    bubbles.forEach((o,j)=>{
      if (i===j) return;
      let d = Math.hypot(b.x-o.x,b.y-o.y);
      if (d < 80 && Math.random()<0.12) o.infected = true;
    });
  });
}

function healAll() {
  bubbles.forEach(b=>{ b.infected=false; b.safe=true; });
  const overlay = document.getElementById("bubbleOverlay");
  overlay.innerHTML="Secured ✔";
  overlay.style.color="#2bbf69";
  overlay.style.opacity=1;
}

function animate() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  bubbles.forEach(b=>{
    b.x+=b.dx; b.y+=b.dy;
    if (b.x<b.r || b.x>canvas.width-b.r) b.dx*=-1;
    if (b.y<b.r || b.y>canvas.height-b.r) b.dy*=-1;
  });

  bubbles.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    if (b.safe) ctx.fillStyle="#2ecc71";
    else if (b.infected) ctx.fillStyle="#ff4d4d";
    else ctx.fillStyle="#1377d6";
    ctx.globalAlpha=0.85;
    ctx.fill();
    ctx.globalAlpha=1;
  });

  requestAnimationFrame(animate);
}
animate();

let infectInterval=setInterval(infectionStep,400);
setTimeout(()=>{ clearInterval(infectInterval); healAll(); },7000);

<script>
// ====== BUBBLE SPREAD SIMULATION WITH FRIENDLY NARRATOR ======

const bubbleCanvas = document.getElementById("bubbleCanvas");
const bctx = bubbleCanvas.getContext("2d");
const bubbleNarrator = document.getElementById("bubbleNarrator");

function resizeBubbleCanvas() {
  bubbleCanvas.width = bubbleCanvas.offsetWidth;
  bubbleCanvas.height = bubbleCanvas.offsetHeight;
}

resizeBubbleCanvas();
window.addEventListener("resize", resizeBubbleCanvas);

let bubbles = [];
let infectionInterval;
let narrationStep = 0;

// Create bubbles
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

// Infect one bubble
bubbles[0].infected = true;

// Narration messages (Option A)
const narration = [
  "Each circle is a device in a typical UK home.",
  "This one unsafe device becomes vulnerable…",
  "Watch how the risk quietly spreads to others.",
  "Outdated apps, weak passwords — it spreads fast.",
  "Now security is applied…",
  "Everything becomes safe again ✔"
];

// Show narration bubble
function showNarration(text) {
  bubbleNarrator.innerText = text;
  bubbleNarrator.style.opacity = 1;

  setTimeout(() => {
    bubbleNarrator.style.opacity = 0;
  }, 2000);
}

// Narration timer
function startNarration() {
  let timings = [0, 800, 2600, 4300, 6000, 7200];

  timings.forEach((time, i) => {
    setTimeout(() => showNarration(narration[i]), time);
  });
}

// Spread infection
function infectSpread() {
  bubbles.forEach((b1, i) => {
    if (!b1.infected) return;

    bubbles.forEach((b2, j) => {
      if (i === j) return;

      let d = Math.hypot(b1.x - b2.x, b1.y - b2.y);

      if (d < 80 && Math.random() < 0.1) {
        b2.infected = true;
      }
    });
  });
}

// Healing
function healAll() {
  bubbles.forEach(b => {
    b.infected = false;
    b.safe = true;
  });
}

// Animate movement + drawing
function animateBubbles() {
  bctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);

  bubbles.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;

    if (b.x < b.r || b.x > bubbleCanvas.width - b.r) b.dx *= -1;
    if (b.y < b.r || b.y > bubbleCanvas.height - b.r) b.dy *= -1;
  });

  bubbles.forEach(b => {
    bctx.beginPath();
    bctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);

    if (b.safe) bctx.fillStyle = "#32d47e";       // safe green
    else if (b.infected) bctx.fillStyle = "#ff4d4d"; // infected red
    else bctx.fillStyle = "#1377d6";               // normal blue

    bctx.globalAlpha = 0.85;
    bctx.fill();
    bctx.globalAlpha = 1;
  });

  requestAnimationFrame(animateBubbles);
}

// Start simulation
animateBubbles();
startNarration();

infectionInterval = setInterval(infectSpread, 400);

setTimeout(() => {
  clearInterval(infectionInterval);
  healAll();
}, 6500);

</script>
