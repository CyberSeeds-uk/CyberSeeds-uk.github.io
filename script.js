/* ------------------------
   PRACTITIONER OVERLAY
------------------------- */
const toggle = document.getElementById("overlayToggle");
const overlay = document.getElementById("practitionerOverlay");
toggle.onclick = ()=>overlay.classList.toggle("active");

/* ------------------------
   LENS FLIP
------------------------- */
document.querySelectorAll(".lens-card").forEach(card=>{
  card.onclick=()=>card.classList.toggle("flipped");
});

/* ------------------------
   SIMULATOR CORE
------------------------- */
const arcs=[...Array(5)].map((_,i)=>document.getElementById("arc"+i));
const mood=document.getElementById("signalMood");

let values=[.4,.4,.4,.4,.4];

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
function render(){
  values.forEach((v,i)=>{
    arcs[i].setAttribute("d",arcPath(i));
    arcs[i].style.stroke=color(v);
  });
  const avg=values.reduce((a,b)=>a+b)/5;
  mood.textContent=avg<.45?"Calm":avg<.6?"Developing":"Attention helps";
}
render();

/* ------------------------
   SNAPSHOT EXPORT
------------------------- */
const canvas=document.getElementById("snapshotCanvas");
const ctx=canvas.getContext("2d");
function drawSnapshot(){
  ctx.clearRect(0,0,420,260);
  ctx.fillStyle="#0b2540";
  ctx.font="20px Fraunces";
  ctx.fillText("Household Digital Snapshot",20,34);
  values.forEach((v,i)=>{
    ctx.fillStyle=color(v);
    ctx.fillRect(20+i*70,80,50,120);
  });
}
drawSnapshot();

document.getElementById("downloadSnapshot").onclick=()=>{
  const link=document.createElement("a");
  link.download="cyber-seeds-household-snapshot.png";
  link.href=canvas.toDataURL();
  link.click();
};
