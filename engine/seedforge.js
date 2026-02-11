// /engine/seedforge.js
(() => {
  "use strict";

  if (window.CSSeedForge) return;

  const LENS_ORDER = ["network","devices","privacy","scams","wellbeing"];
  const sum = arr => arr.reduce((a,b)=>a+b,0);
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  function stableHash(obj){
    const str = JSON.stringify(obj);
    let h = 0;
    for (let i=0;i<str.length;i++){
      h = ((h<<5)-h)+str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  async function load(){
    if (window.CSSeedForge.__cache) return window.CSSeedForge.__cache;

    const [questions, scoring, seeds, bands] = await Promise.all([
      fetch("/generated/questions.json").then(r=>r.json()),
      fetch("/generated/scoring.json").then(r=>r.json()),
      fetch("/generated/seeds.json").then(r=>r.json()),
      fetch("/generated/bands.json").then(r=>r.json())
    ]);

    const qList = Array.isArray(questions.questions)
      ? questions.questions
      : questions;

    function scoreAnswers(answers){

      const scores = {};
      const maxes  = {};
      LENS_ORDER.forEach(l => { scores[l]=0; maxes[l]=0; });

      qList.forEach(q=>{
        const lens = q.lens;
        if (!lens) return;

        const idx = answers[q.id];
        const importance = q.scoring_v2?.importance ?? 1;
        const max = q.scoring_v2?.max_points ??
          Math.max(...q.options.map(o=>o.points ?? 0));

        maxes[lens] += max * importance;

        if (Number.isInteger(idx)){
          const points = q.options[idx]?.points ?? 0;
          scores[lens] += points * importance;
        }
      });

      const percents = {};
      LENS_ORDER.forEach(l=>{
        percents[l] = maxes[l]
          ? (scores[l]/maxes[l])*100
          : 0;
      });

      const weights = scoring.scoring_v2?.hdss?.lens_weights || {};
      const totalWeight = sum(LENS_ORDER.map(l=>weights[l]??1));

      const hdss = clamp(Math.round(
        sum(LENS_ORDER.map(l=>(percents[l]??0)*(weights[l]??1)))
        /(totalWeight||1)
      ),0,100);

      return {
        lensScores:scores,
        lensMax:maxes,
        lensPercents:percents,
        hdss,
        snapshotId: stableHash(answers)
      };
    }

    const api = { questions:qList, scoring, seeds, bands, scoreAnswers };
    Object.freeze(api);
    window.CSSeedForge = { load, __cache:api };

    return api;
  }

  window.CSSeedForge = { load, __cache:null };

})();
