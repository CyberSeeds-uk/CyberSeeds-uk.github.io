/* =========================================================
   Cyber Seeds — SeedForge Engine (Local-first)
   Deterministic • Canon • Public-sector safe
   ========================================================= */
(() => {
  "use strict";

  if (window.CSSeedForge) return;

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function stableHash(input){
    const str = typeof input === "string" ? input : JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < str.length; i++){
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  const toQuestionList = d =>
    Array.isArray(d) ? d : Array.isArray(d?.questions) ? d.questions : [];

  function extractLensMax(q){
    const s = q.scoring_v2 || {};
    const importance = s.importance ?? 1;
    const max = s.max_points ?? Math.max(...(q.options || []).map(o => o.points ?? 0));
    return max * importance;
  }

  function extractLensScore(q, idx){
    if (!Number.isInteger(idx)) return 0;
    const s = q.scoring_v2 || {};
    const importance = s.importance ?? 1;
    return ((q.options?.[idx]?.points ?? 0) * importance);
  }

  function computeLensScores(answers, questions){
    const scores = Object.fromEntries(LENS_ORDER.map(l => [l, 0]));
    const maxes  = Object.fromEntries(LENS_ORDER.map(l => [l, 0]));

    questions.forEach(q => {
      if (!q?.lens) return;
      if (!scores.hasOwnProperty(q.lens)) return;
      scores[q.lens] += extractLensScore(q, answers[q.id]);
      maxes[q.lens]  += extractLensMax(q);
    });

    return { lensScores: scores, lensMax: maxes };
  }

  function lensPercentages(scores, maxes){
    const out = {};
    LENS_ORDER.forEach(l => {
      out[l] = maxes[l] ? (scores[l] / maxes[l]) * 100 : 0;
    });
    return out;
  }

  function calcHdss(percs, scoring){
    const w = scoring?.scoring_v2?.hdss?.lens_weights || {};
    const total = sum(LENS_ORDER.map(l => w[l] ?? 1));
    return Math.round(
      sum(LENS_ORDER.map(l => (percs[l] ?? 0) * (w[l] ?? 1))) / (total || 1)
    );
  }

  function strongestWeakest(percs){
    const sorted = [...LENS_ORDER]
      .map(l => [l, percs[l] ?? 0])
      .sort((a, b) => a[1] - b[1]);
    return {
      weakest: sorted[0]?.[0] || "privacy",
      strongest: sorted.at(-1)?.[0] || "privacy"
    };
  }

  function stageForScore(hdss, bands){
    const list = Array.isArray(bands?.bands) ? bands.bands : [];
    return (
      list.find(b => hdss >= b.min && hdss <= b.max) ||
      list.at(-1) ||
      { label: "Emerging", message: "Small changes will reduce risk quickly." }
    );
  }

  function chooseFocusLens(percs, scoring, snapId){
    const cfg = scoring?.scoring_v2?.focus_lens || {};
    const floor = cfg.healthy_floor ?? 75;

    if (!LENS_ORDER.every(l => (percs[l] ?? 0) >= floor)){
      return strongestWeakest(percs).weakest;
    }

    const pool = cfg.rotation_pool_when_healthy || LENS_ORDER;
    return pool[stableHash(String(snapId)) % pool.length];
  }

  function buildRationale(lens, scoring, answers, questions, snapId){
    const pool = scoring?.scoring_v2?.rationale?.templates?.[lens] || [];
    if (!pool.length) return "";
    const base = pool[stableHash(`${lens}:${snapId}`) % pool.length];
    const q = questions.find(x => x.lens === lens && Number.isInteger(answers[x.id]));
    const opt = q?.options?.[answers[q.id]]?.label;
    return opt ? `${base} You said: “${opt}”.` : base;
  }

  const seedsForLens = (lens, seeds) =>
    (Array.isArray(seeds?.seeds) ? seeds.seeds : []).filter(s => s.lens === lens);

  async function load(){
    if (window.CSSeedForge.__cache) return window.CSSeedForge.__cache;

    const [questions, scoring, seeds, bands] = await Promise.all([
      fetch("/generated/questions.json", { cache: "no-store" }).then(r => r.json()),
      fetch("/generated/scoring.json",   { cache: "no-store" }).then(r => r.json()),
      fetch("/generated/seeds.json",     { cache: "no-store" }).then(r => r.json()),
      fetch("/generated/bands.json",     { cache: "no-store" }).then(r => r.json())
    ]);

    const qList = toQuestionList(questions);

    const api = {
      questions, scoring, seeds, bands,

      scoreAnswers(answers){
        const { lensScores, lensMax } = computeLensScores(answers, qList);
        const lensPercents = lensPercentages(lensScores, lensMax);
        const hdss = clamp(calcHdss(lensPercents, scoring), 0, 100);
        const { strongest, weakest } = strongestWeakest(lensPercents);
        const snapshotId = stableHash(answers);

        return {
          lensScores, lensMax, lensPercents,
          hdss, strongest, weakest,
          focus: chooseFocusLens(lensPercents, scoring, snapshotId),
          stage: stageForScore(hdss, bands),
          snapshotId
        };
      },

      buildRationale(lens, answers){
        return buildRationale(lens, scoring, answers, qList, stableHash(answers));
      },

      seedsForLens(lens){
        return seedsForLens(lens, seeds);
      }
    };

    Object.freeze(api);
    window.CSSeedForge.__cache = api;
    return api;
  }

  window.CSSeedForge = { load, __cache: null, stableHash };

  window.__CS_SNAPSHOT_READY__ = true;
  window.dispatchEvent(new Event("cs:snapshot-ready"));
})();
