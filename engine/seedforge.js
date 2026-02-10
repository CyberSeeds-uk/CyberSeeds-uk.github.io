import { loadQuestions } from "/engine/questions.js";
import { stableHash, scoreSnapshot, bandFromOverall } from "/engine/scoring.js";

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return await res.json();
}

export async function loadSeedForge() {
  const [questions, scoring, bands, seeds] = await Promise.all([
    loadQuestions("/generated/questions.json"),
    loadJson("/generated/scoring.json"),
    loadJson("/generated/bands.json"),
    loadJson("/generated/seeds.json")
  ]);

  return Object.freeze({
    version: "seedforge-1",
    questions,
    scoring,
    bands,
    seeds
  });
}

export function computeCanonicalSnapshot({ engine, answers }) {
  const createdAt = new Date().toISOString();

  const { overall, lenses } = scoreSnapshot({
    questions: engine.questions,
    scoring: engine.scoring,
    answers
  });

  const band = bandFromOverall(overall, engine.bands);

  const selectedSeeds = selectSeeds({ engine, overall, lenses });

  const snapshotId = stableHash({
    createdAt: createdAt.slice(0, 19), // stable-ish
    answers
  });

  // Canonical contract: deterministic structure
  return Object.freeze({
    schema: "cyberseeds.snapshot.v3",
    createdAt,
    snapshotId,
    overall,
    band: {
      label: band.label || band.name || "—",
      slug: band.slug || "—"
    },
    lenses,
    seeds: selectedSeeds,
    answers: { ...answers } // keep for explainability / audit
  });
}

function selectSeeds({ engine, overall, lenses }) {
  // seeds.json format can evolve; keep selection logic here only.
  // Expect either {seeds:[...]} or [...]
  const list = Array.isArray(engine.seeds) ? engine.seeds : (engine.seeds.seeds || []);
  const out = [];

  for (const s of list) {
    const minOverall = typeof s.minOverall === "number" ? s.minOverall : 0;
    const maxOverall = typeof s.maxOverall === "number" ? s.maxOverall : 100;

    if (overall < minOverall || overall > maxOverall) continue;

    // Optional lens trigger: {lens:"privacy", max:49}
    if (s.lens && typeof s.max === "number") {
      const v = lenses[s.lens];
      if (typeof v === "number" && v > s.max) continue;
    }
    if (s.lens && typeof s.min === "number") {
      const v = lenses[s.lens];
      if (typeof v === "number" && v < s.min) continue;
    }

    out.push({
      id: s.id || s.slug || "seed",
      title: s.title || "Digital Seed",
      lens: s.lens || null,
      summary: s.summary || s.body || "",
      actions: Array.isArray(s.actions) ? s.actions.slice(0, 6) : []
    });
  }

  // Keep it tidy
  return out.slice(0, 8);
}
