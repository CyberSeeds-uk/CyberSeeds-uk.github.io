export function stableHash(input) {
  // Deterministic non-crypto hash (fast + stable for snapshot IDs)
  const s = typeof input === "string" ? input : JSON.stringify(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export function scoreSnapshot({ questions, scoring, answers }) {
  // scoring.json decides how each question contributes.
  // If your scoring.json is different, adapt only here (UI never changes).
  const lensTotals = {};
  const lensCounts = {};

  for (const q of questions) {
    const lens = q.lens || "unknown";
    if (!lensTotals[lens]) { lensTotals[lens] = 0; lensCounts[lens] = 0; }

    const chosen = answers[q.id];
    const opt = (q.options || []).find(o => o.id === chosen);

    // default “neutral” = 0.5 if unanswered or unknown
    let value01 = 0.5;

    // If you ship explicit scoring rules: scoring.questions[qid].options[oid] -> value01
    const rule = scoring && scoring.questions ? scoring.questions[q.id] : null;
    if (rule && rule.options && chosen && typeof rule.options[chosen] === "number") {
      value01 = clamp01(rule.options[chosen]);
    } else if (opt && typeof opt.weight === "number") {
      // optional: allow weight in questions.json itself
      value01 = clamp01(opt.weight);
    }

    lensTotals[lens] += value01;
    lensCounts[lens] += 1;
  }

  const lenses = {};
  let overall01 = 0;
  let lensN = 0;

  for (const [lens, sum] of Object.entries(lensTotals)) {
    const n = lensCounts[lens] || 1;
    const avg01 = sum / n;
    const pct = Math.round(avg01 * 100);
    lenses[lens] = pct;
    overall01 += avg01;
    lensN += 1;
  }

  const overall = Math.round((overall01 / Math.max(1, lensN)) * 100);

  return { overall, lenses };
}

export function bandFromOverall(overall, bands) {
  // bands.json can be [{min,max,label,slug}] or {bands:[...]}
  const list = Array.isArray(bands) ? bands : (bands && bands.bands ? bands.bands : []);
  for (const b of list) {
    const min = typeof b.min === "number" ? b.min : 0;
    const max = typeof b.max === "number" ? b.max : 100;
    if (overall >= min && overall <= max) return b;
  }
  return { label: "Unknown", slug: "unknown", min: 0, max: 100 };
}

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
