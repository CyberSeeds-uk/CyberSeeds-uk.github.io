function scrollToSignal(){
  document.getElementById("signal").scrollIntoView({behavior:"smooth"});
}

const questions=[
 {text:"How confident do you feel about the devices connected to your home?",v:[.2,.4,.6,.8]},
 {text:"Do you know which apps are used most?",v:[.2,.4,.6,.8]},
 {text:"How comfortable are you managing privacy settings?",v:[.3,.5,.7]},
 {text:"How does your household respond to suspicious messages?",v:[.3,.5,.7]},
 {text:"How clear are children’s digital routines?",v:[.3,.5,.7]}
];

let step=0,values=[.4,.4,.4,.4,.4];

const q=document.getElementById("simQuestion");
const o=document.getElementById("simOptions");
const s=document.getElementById("simStep");
const next=document.getElementById("simNext");
const back=document.getElementById("simBack");
const mood=document.getElementById("signalMood");

function render(){
 s.textContent=`Question ${step+1} of 5`;
 q.textContent=questions[step].text;
 o.innerHTML="";
 questions[step].v.forEach(v=>{
   const d=document.createElement("div");
   d.textContent="Select";
   d.onclick=()=>{values[step]=v;next.disabled=false;update()};
   o.appendChild(d);
 });
 back.disabled=step===0;
}
function update(){
 const avg=values.reduce((a,b)=>a+b)/5;
 mood.textContent=avg<.45?"Calm":avg<.6?"Developing":"Attention helps";
}
next.onclick=()=>{if(step<4){step++;render()}};
back.onclick=()=>{if(step>0){step--;render()}};

render();
