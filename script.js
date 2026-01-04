// =========== PRACTITIONER MODE (SECRET) ==========
// Desktop: press P+R together | Mobile: long-press footer 3s
let practitionerEnabled = false;
const overlay = document.getElementById("practitionerOverlay");
document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "p") window._p = true;
  if (e.key.toLowerCase() === "r" && window._p) togglePractitioner();
});
document.addEventListener("keyup", () => window._p = false);
document.querySelector("footer").addEventListener("touchstart", e => {
  let t = setTimeout(togglePractitioner, 3000);
  document.querySelector("footer").addEventListener("touchend", () => clearTimeout(t), { once:true });
});
function togglePractitioner(){
  practitionerEnabled = !practitionerEnabled;
  overlay.classList.toggle("active", practitionerEnabled);
}

// =========== SIMULATOR DATA MODEL ==========
const questions = [
  {
    lens: 0,
    text: "How confident do you feel about the devices connected to your home?",
    options: [
      { label: "Very confident", value: 0.2 },
      { label: "Mostly confident", value: 0.4 },
      { label: "Unsure", value: 0.6 },
      { label: "Not confident", value: 0.8 }
    ]
  },
  {
    lens: 1,
    text: "Do you know which apps and services are used most in your household?",
    options: [
      { label: "Yes, clearly", value: 0.2 },
      { label: "Roughly", value: 0.4 },
      { label: "Not really", value: 0.6 },
      { label: "No idea", value: 0.8 }
    ]
  },
  {
    lens: 2,
    text: "How comfortable are you managing accounts and privacy settings?",
    options: [
      { label: "Comfortable", value: 0.3 },
      { label: "Somewhat", value: 0.5 },
      { label: "Uncomfortable", value: 0.7 }
    ]
  },
  {
    lens: 3,
    text: "How does your household usually respond to suspicious messages or scams?",
    options: [
      { label: "Calm and cautious", value: 0.3 },
      { label: "Unsure, but careful", value: 0.5 },
      { label: "Reactive or rushed", value: 0.7 }
    ]
  },
  {
    lens: 4,
    text: "How clear are children’s digital routines and boundaries?",
    options: [
      { label: "Clear and healthy", value: 0.3 },
      { label: "Somewhat clear", value: 0.5 },
      { label: "Unclear", value: 0.7 }
    ]
  }
];
let step = 0;
let answers = Array(questions.length).fill(null);
let values = [0.4,0.4,0.4,0.4,0.4];

const qEl = document.getElementById("simQuestion");
const oEl = document.getElementById("simOptions");
const stepEl = document.getElementById("simStep");
const nextBtn = document.getElementById("simNext");
const backBtn = document.getElementById("simBack");

// Scroll to simulator section when button is clicked
document.getElementById("scrollSimulator").onclick = function() {
  document.getElementById("simulator").scrollIntoView({behavior: "smooth"});
};

// Lens card flip animation for quick learning
document.querySelectorAll('.lens-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
});

// RENDERING SIMULATOR QUESTION & OPTIONS
function renderQuestion(){
  const q = questions[step];
  stepEl.textContent = `Question ${step+1} of ${questions.length}`;
  qEl.textContent = q.text;
  oEl.innerHTML = "";
  q.options.forEach((opt,i)=>{
    const d = document.createElement("div");
    d.textContent = opt.label;
    d.className = "sim-opt";
    d.onclick = () => {
      answers[step] = opt;
      values[q.lens] = opt.value;
      [...oEl.children].forEach(c=>c.classList.remove("selected"));
      d.classList.add("selected");
      nextBtn.disabled = false;
      renderSignal();
      drawSnapshot();
    };
    if(answers[step] === opt) d.classList.add("selected");
    oEl.appendChild(d);
  });
  backBtn.disabled = step === 0;
  nextBtn.disabled = answers[step] === null;
}
nextBtn.onclick = ()=>{
  if(step < questions.length-1){
    step++;
    renderQuestion();
  }
};
backBtn.onclick = ()=>{
  if(step > 0){
    step--;
    renderQuestion();
  }
};
renderQuestion();

// =========== SIGNAL DIAL ==========

const arcs=[...Array(5)].map((_,i)=>document.getElementById("arc"+i));
const mood=document.getElementById("signalMood");

function polar(cx,cy,r,a){
  const rad=(a-90)*Math.PI/180;
  return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};
}
function arcPath(i){
  const s=i*72+6,e=(i+1)*72-6;
  const p1=polar(160,160,112,s);
  const p2=polar(160,160,112,e);
  return `M ${p1.x} ${p1.y} A 112 112 0 0 1 ${p2.x} ${p2.y}`;
}
function color(v){
  return v<.45?"#2bb673":v<.6?"#f5b700":"#e5533d";
}
function renderSignal(){
  values.forEach((v,i)=>{
    arcs[i].setAttribute("d",arcPath(i));
    arcs[i].style.stroke=color(v);
  });
  const avg=values.reduce((a,b)=>a+b)/5;
  mood.textContent = avg < .45 ? "Calm" : avg < .6 ? "Developing" : "Attention helps";
}
renderSignal();

// =========== SNAPSHOT EXPORT ==========
const canvas=document.getElementById("snapshotCanvas");
const ctx=canvas.getContext("2d");
function drawSnapshot(){
  ctx.clearRect(0,0,420,260);
  // Title
  ctx.fillStyle="#0b2540";
  ctx.font="bold 18px Fraunces";
  ctx.fillText("Household Digital Snapshot",20,34);
  // Bar graph
  values.forEach((v,i)=>{
    ctx.fillStyle=color(v);
    ctx.fillRect(40+i*70,80,50,120);
    ctx.fillStyle="#0b2540";
    ctx.font="11px Inter";
    ctx.fillText(
      ["Net","Dev","Priv","Scam","Child"][i],
      52+i*70,220
    );
  });
  // Signal Mood
  ctx.font="bold 16px Inter";
  ctx.fillStyle=color(values.reduce((a,b)=>a+b)/5);
  ctx.fillText("Signal: "+(mood.textContent),20,55);
}
drawSnapshot();

document.getElementById("downloadSnapshot").onclick=()=>{
  drawSnapshot();
  const a=document.createElement("a");
  a.download="cyber-seeds-household-snapshot.png";
  a.href=canvas.toDataURL("image/png");
  a.click();
};
