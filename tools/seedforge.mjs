// tools/seedforge.mjs
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "generated");

const LENSES = new Set(["network", "devices", "privacy", "scams", "wellbeing"]);

function readYaml(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return yaml.load(fs.readFileSync(p, "utf8"));
}

function writeJson(file, obj) {
  const p = path.join(OUT_DIR, file);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function validateQuestions(q) {
  assert(Array.isArray(q.questions), "questions.v2.yml must contain: questions: []");
  for (const item of q.questions) {
    assert(item.id && item.prompt, "Every question needs id + prompt");
    assert(LENSES.has(item.lens), `Invalid lens in ${item.id}: ${item.lens}`);
    assert(item.type === "single" || item.type === "multi", `Invalid type in ${item.id}`);
    assert(Array.isArray(item.options) && item.options.length >= 2, `Need options in ${item.id}`);
    for (const opt of item.options) {
      assert(typeof opt.points === "number", `Option points must be number in ${item.id}`);
      assert(opt.points >= 0 && opt.points <= 20, `Option points out of range (0..20) in ${item.id}`);
    }
  }
}

function validateScoring(s) {
  assert(Array.isArray(s.bands), "scoring.v2.yml must contain: bands: []");
  for (const b of s.bands) {
    assert(typeof b.min === "number" && typeof b.max === "number", "band needs min/max");
    assert(b.min <= b.max, "band min must be <= max");
    assert(b.label, "band needs label");
  }
}

function validateSeeds(seeds) {
  assert(Array.isArray(seeds.seeds), "seeds.v2.yml must contain: seeds: []");
  for (const s of seeds.seeds) {
    assert(s.id && s.lens && s.title, "seed needs id/lens/title");
    assert(LENSES.has(s.lens), `Invalid seed lens: ${s.lens}`);
    assert(s.today && s.this_week && s.this_month, `seed ${s.id} needs today/this_week/this_month`);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const questions = readYaml("questions.v2.yml");
const scoring = readYaml("scoring.v2.yml");
const seeds = readYaml("seeds.v2.yml");

validateQuestions(questions);
validateScoring(scoring);
validateSeeds(seeds);

const manifest = {
  built_at: new Date().toISOString(),
  counts: {
    questions: questions.questions.length,
    seeds: seeds.seeds.length,
    bands: scoring.bands.length
  }
};

writeJson("questions.json", questions);
writeJson("scoring.json", scoring);
writeJson("seeds.json", seeds);
writeJson("manifest.json", manifest);

console.log("SeedForge OK:", manifest);
