/* =========================================================
   SeedForge Runtime (loads generated/*.json + scoring helpers)
   - Works on / and on subpages like /resources/
   - iOS Safari friendly (no-store + cache-bust)
   ========================================================= */

window.CSSeedForge = (() => {
  const PATHS = {
    manifest: "/generated/manifest.json",
    questions: "/generated/questions.json",
    scoring: "/generated/scoring.json",
    seeds: "/generated/seeds.json",
  };

  let _cache = null;

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`SeedForge fetch failed: ${url} (${res.status})`);
    return await res.json();
  }

  async function load() {
    if (_cache) return _cache;

    // Load manifest first (gives us a stable cache-bust token)
    let manifest = null;
    try {
      manifest = await fetchJson(PATHS.manifest + `?v=${Date.now()}`);
    } catch {
      // manifest is optional; keep going
      manifest = { built_at: String(Date.now()) };
    }

    const v = encodeURIComponent(manifest.built_at || Date.now());

    const [questions, scoring, seeds] = await Promise.all([
      fetchJson(PATHS.questions + `?v=${v}`),
      fetchJson(PATHS.scoring + `?v=${v}`),
      fetchJson(PATHS.seeds + `?v=${v}`),
    ]);

    _cache = { manifest, questions, scoring, seeds };
    window.__CS_SEEDFORGE__ = _cache; // debug handle
    return _cache;
  }

  function normalizeLens(lens) {
    const s = String(lens || "").toLowerCase().trim();
    if (s.startsWith("net")) return "network";
    if (s.startsWith("dev")) return "devices";
    if (s.startsWith("pri")) return "privacy";
    if (s.startsWith("sca")) return "scams";
    if (s.startsWith("wel")) return "wellbeing";
    return s;
  }

  function stageFor(hdss, scoring) {
    const bands = (scoring && scoring.bands) || [];
    for (const b of bands) {
      if (hdss >= b.min && hdss <= b.max) return b;
    }
    // fallback
    return { min: 0, max: 100, label: "Snapshot" };
  }

  /**
   * scoreAnswers:
   * answers format is flexible:
   * - answers[qid] can be: option index (number), option label (string), or points (number)
   */
  function scoreAnswers(answers, questionsYaml, scoringYaml) {
    const questions = (questionsYaml && questionsYaml.questions) || [];
    const lensBuckets = { network: [], devices: [], privacy: [], scams: [], wellbeing: [] };

    for (const q of questions) {
      const qid = q.id;
      const lens = normalizeLens(q.lens);
      const raw = answers ? answers[qid] : null;

      // Resolve points from raw answer
      let pts = null;

      if (typeof raw === "number") {
        // Could be index or points. If it matches an option index, prefer that.
        if (Number.isInteger(raw) && q.options && q.options[raw]) pts = q.options[raw].points;
        else pts = raw;
      } else if (typeof raw === "string") {
        const opt = (q.options || []).find(o => String(o.label).trim() === raw.trim());
        pts = opt ? opt.points : null;
      }

      if (typeof pts !== "number") pts = 0;

      if (lensBuckets[lens]) lensBuckets[lens].push(pts);
    }

    // Lens score = round(average points) on a 0..20 scale
    const lensScores = {};
    for (const [lens, arr] of Object.entries(lensBuckets)) {
      const avg = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      lensScores[lens] = Math.max(0, Math.min(20, Math.round(avg)));
    }

    // HDSS = sum(lensScores) scaled to 0..100 (5 lenses * 20 = 100)
    const hdss =
      lensScores.network +
      lensScores.devices +
      lensScores.privacy +
      lensScores.scams +
      lensScores.wellbeing;

    // strongest / weakest
    const entries = Object.entries(lensScores);
    entries.sort((a, b) => b[1] - a[1]);
    const strongest = entries[0]?.[0] || "network";
    const weakest = entries[entries.length - 1]?.[0] || "network";

    return {
      lensScores,
      hdss,
      stage: stageFor(hdss, scoringYaml),
      strongest,
      weakest,
    };
  }

  function seedsForLens(lens, seedsYaml) {
    const key = normalizeLens(lens);
    const all = (seedsYaml && seedsYaml.seeds) || [];
    return all.filter(s => normalizeLens(s.lens) === key);
  }

  return { load, scoreAnswers, seedsForLens, normalizeLens, stageFor };
})();



(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  // ---- Year ----
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Snapshot → Resources Handoff (button reveal) ----
  document.addEventListener("cyberseeds:snapshot-complete", () => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });

  // Optional: if a snapshot already exists, reveal resources immediately
 
   CSSeedForge.load().catch(err => {
     console.warn("SeedForge failed to load, using built-in questions if present.", err);
   });

   document.addEventListener("DOMContentLoaded", () => {
    try {
      const raw = localStorage.getItem("cyberseeds_snapshot_v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.stage) {
        const btn = $("#goToResources");
        if (btn) btn.style.display = "inline-flex";
      }
    } catch {}
  });
})();
