/* =========================================================
   Cyber Seeds — Snapshot Insights + Ring Renderer (CANON)
   snapshot-insights.js
   ---------------------------------------------------------
   Purpose:
   - Convert scoring outputs into meaningful, calm, governed
     household insights (national adoption ready).
   - Render the 5-lens ring (SVG) from lens percentages.
   - Populate "Personalised resources" UI from stored snapshot.
   ---------------------------------------------------------
   Canon commitments:
   - Safety without shame (no blame language, no fear framing)
   - Deterministic outputs (same inputs -> same meaning)
   - Explainable logic (audit-friendly)
   - Behaviour-first (digital seeds -> routines)
   ========================================================= */

(() => {
  "use strict";

  if (window.CSSnapshotInsights) return;

  /* ----------------------- CONFIG ----------------------- */

  // Keep in sync with your snapshot modal engine
  const SNAP_KEY = "cyberseeds_snapshot_v3";

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  const LENS_LABELS = {
    network:   "Network",
    devices:   "Devices",
    privacy:   "Accounts & Privacy",
    scams:     "Scams & Messages",
    wellbeing: "Children & Wellbeing"
  };

  // Canon metaphor (garden/ecosystem) translated into short, usable UI hints
  const LENS_METAPHOR = {
    network:   { tag: "Circulation",   line: "Wi-Fi is the home’s circulation system — steady flow supports everything else." },
    devices:   { tag: "Organs",        line: "Devices are the organs — simple upkeep prevents avoidable strain." },
    privacy:   { tag: "Immune system", line: "Accounts are the immune system — small boundaries reduce unwanted access." },
    scams:     { tag: "Infections",    line: "Scams behave like infections — calm pause habits stop spread." },
    wellbeing: { tag: "Sleep & diet",  line: "Wellbeing is digital sleep and diet — routines protect rest and focus." }
  };

  // UI hooks (you can rename in HTML; these are safe defaults)
  const HOOKS = {
    ring:              "[data-cs-ring]",
    ringLegend:        "[data-cs-ring-legend]",
    signalTitle:       "[data-cs-signal-title]",
    signalMessage:     "[data-cs-signal-message]",
    focusTitle:        "[data-cs-focus-title]",
    focusWhy:          "[data-cs-focus-why]",
    focusNow:          "[data-cs-focus-now]",
    seedTitle:         "[data-cs-seed-title]",
    seedToday:         "[data-cs-seed-today]",
    seedWeek:          "[data-cs-seed-week]",
    seedMonth:         "[data-cs-seed-month]",
    lensCards:         "[data-cs-lens-cards]",
    auditJson:         "[data-cs-audit-json]" // optional: for institutional QA/debug
  };

  /* ----------------------- HELPERS ----------------------- */

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const sum = (arr) => arr.reduce((a,b) => a + b, 0);

  function pct(x){
    return Math.round(clamp(Number(x) || 0, 0, 100));
  }

  function safeText(v){
    return String(v ?? "").trim();
  }

  function safeGet(k){
    try { return localStorage.getItem(k); } catch { return null; }
  }

  function safeSet(k,v){
    try { localStorage.setItem(k,v); } catch {}
  }

  function stableHash(input){
    const str = typeof input === "string" ? input : JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < str.length; i++){
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function lensEntries(lensPercents){
    return LENS_ORDER.map(l => [l, pct(lensPercents?.[l])]);
  }

  function strongestWeakest(lensPercents){
    const sorted = lensEntries(lensPercents).sort((a,b)=>a[1]-b[1]);
    return { weakest: sorted[0]?.[0] || "privacy", strongest: sorted[sorted.length-1]?.[0] || "privacy" };
  }

  function topKLowest(lensPercents, k, exclude = new Set()){
    return lensEntries(lensPercents)
      .filter(([l]) => !exclude.has(l))
      .sort((a,b)=>a[1]-b[1])
      .slice(0, k)
      .map(([l])=>l);
  }

  function tierForLensPercent(p){
    // National-safe tier labels (no "fail", no "bad")
    const x = pct(p);
    if (x >= 85) return { key:"strong",  label:"Strong",  hint:"Mostly embedded — maintain gently." };
    if (x >= 70) return { key:"steady",  label:"Steady",  hint:"Protective foundations — one upgrade lifts it." };
    if (x >= 50) return { key:"forming", label:"Forming", hint:"In progress — consistency is the unlock." };
    return            { key:"emerging",label:"Emerging",hint:"Start small — one step creates momentum." };
  }

  function bandForHdss(hdss, bands){
    const s = pct(hdss);
    const list = Array.isArray(bands?.bands) ? bands.bands : [];
    const match = list.find(b => s >= b.min && s <= b.max) || list[list.length - 1];
    if (match) return { label: safeText(match.label), message: safeText(match.message) };

    // fallback if bands missing
    if (s >= 86) return { label:"Flourishing", message:"Digital life here supports calm, safety, and wellbeing. Maintain and grow gently." };
    if (s >= 71) return { label:"Healthy",     message:"Strong habits are in place. Refine small areas and keep routines steady." };
    if (s >= 51) return { label:"Stabilising", message:"Foundations are forming. Focused improvements bring calmer rhythm." };
    if (s >= 31) return { label:"Vulnerable",  message:"Some protections exist, but gaps can cause stress under pressure. Small changes help fast." };
    return            { label:"Fragile",     message:"The household is carrying more digital strain than it should. This is a starting point, not a failure." };
  }

  /* ----------------------- GOVERNED INSIGHT LIBRARY ----------------------- */
  // Built to be stable, explainable, and procurement-safe.
  // Choose copy deterministically (seeded by snapshotId) rather than improvising.

  const INSIGHTS = {
    network: {
      emerging: [
        { h:"Your network may be carrying hidden responsibility", b:"Many households never revisit router settings after day one. One small check here protects everything behind it." },
        { h:"Your Wi-Fi safety may rely on defaults", b:"Defaults are common. A few simple settings reduce exposure without changing anyone’s routine." }
      ],
      forming: [
        { h:"Foundations are forming in the network layer", b:"A light routine — knowing where settings live, keeping admin access tidy — strengthens the whole system." }
      ],
      steady: [
        { h:"Your Wi-Fi foundation looks steady", b:"When the network layer is stable, device and scam protections tend to ‘stick’ more easily." }
      ],
      strong: [
        { h:"Your network layer is a strong foundation", b:"This reduces background risk and gives the household more breathing room everywhere else." }
      ]
    },

    devices: {
      emerging: [
        { h:"Devices may be missing small maintenance that adds up", b:"Updates and basic hygiene are like servicing a car — not exciting, but quietly protective." }
      ],
      forming: [
        { h:"Some device hygiene is happening — consistency is the unlock", b:"A light routine (updates + lock + backup) reduces most avoidable incidents without adding stress." }
      ],
      steady: [
        { h:"Device hygiene looks steady", b:"This reduces account issues, scam impact, and recoverability problems." }
      ],
      strong: [
        { h:"Your device foundations look strong", b:"This is one of the best predictors of household resilience when something unexpected happens." }
      ]
    },

    privacy: {
      emerging: [
        { h:"Your household boundaries may be easy to cross by accident", b:"Privacy isn’t secrecy — it’s reducing unwanted access and surprises. Small boundaries change the feeling of safety." }
      ],
      forming: [
        { h:"Account protection is forming", b:"One or two improvements — especially around your main email and recovery options — can lift confidence quickly." }
      ],
      steady: [
        { h:"Accounts and privacy look steady", b:"This makes scams less effective and reduces long-tail stress after an incident." }
      ],
      strong: [
        { h:"Your account and privacy layer is strong", b:"Fewer lockouts, fewer surprises, easier recovery if something goes wrong." }
      ]
    },

    scams: {
      emerging: [
        { h:"Your household may be exposed to common scam pathways", b:"Scams rely on pressure, not intelligence. A simple pause-and-verify habit changes outcomes fast." }
      ],
      forming: [
        { h:"Scam resilience is forming", b:"A few shared rules around links, payments, and delivery texts can remove most of the pressure." }
      ],
      steady: [
        { h:"Scam resilience looks steady", b:"This reduces stress and protects children and older family members too." }
      ],
      strong: [
        { h:"Your household shows strong scam resilience", b:"This layer prevents sudden losses and emotional disruption." }
      ]
    },

    wellbeing: {
      emerging: [
        { h:"Wellbeing routines may still be forming", b:"Routines don’t have to be perfect to be protective. ‘Most of the time’ is enough to work." }
      ],
      forming: [
        { h:"You’re building wellbeing protection", b:"When routines are consistent, screen pressure drops and the household feels calmer and easier to steer." }
      ],
      steady: [
        { h:"Wellbeing routines look steady", b:"This makes everything else easier — less conflict, better follow-through, less overwhelm." }
      ],
      strong: [
        { h:"Your wellbeing layer is strong", b:"This is a long-term resilience signal — especially for children and learning." }
      ]
    }
  };

  function pickDeterministic(pool, seedStr){
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const idx = stableHash(seedStr) % pool.length;
    return pool[idx];
  }

  /* ----------------------- SEEDS INTEGRATION ----------------------- */

  function pickSeedForLens(seedsData, lensKey, snapshotId){
    const list = Array.isArray(seedsData?.seeds) ? seedsData.seeds : [];
    const pool = list.filter(s => s.lens === lensKey);
    return pickDeterministic(pool, `${lensKey}:${snapshotId}:seed`);
  }

  /* ----------------------- RATIONALE (SCORING TEMPLATES) ----------------------- */

  function buildRationaleFromScoring(scoringData, lensKey, snapshotId){
    const templates = scoringData?.scoring_v2?.rationale?.templates || {};
    const pool = templates[lensKey] || [];
    const chosen = pickDeterministic(pool, `${lensKey}:${snapshotId}:rationale`);
    return safeText(chosen);
  }

  /* ----------------------- RING RENDERER (SVG) ----------------------- */
  // Produces a clean 5-segment donut ring with focus highlight.
  // No fear colours; uses CSS variables so your theme governs colour.

  function polarToCartesian(cx, cy, r, angleDeg){
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + (r * Math.cos(angleRad)), y: cy + (r * Math.sin(angleRad)) };
  }

  function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle){
    const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const endOuter   = polarToCartesian(cx, cy, rOuter, startAngle);
    const startInner = polarToCartesian(cx, cy, rInner, startAngle);
    const endInner   = polarToCartesian(cx, cy, rInner, endAngle);

    const largeArc = (endAngle - startAngle) <= 180 ? "0" : "1";

    return [
      "M", startOuter.x, startOuter.y,
      "A", rOuter, rOuter, 0, largeArc, 0, endOuter.x, endOuter.y,
      "L", startInner.x, startInner.y,
      "A", rInner, rInner, 0, largeArc, 1, endInner.x, endInner.y,
      "Z"
    ].join(" ");
  }

  function renderRingSVG(model){
    // model: { overall, focus, arcs:[{lens,label,value,tier,isFocus}] }
    const size = 220;
    const cx = size/2, cy = size/2;
    const rOuter = 92;
    const rInner = 66;

    const gap = 2;          // degrees between segments
    const total = 360;
    const seg = total / model.arcs.length;

    const paths = model.arcs.map((a, i) => {
      const start = (i * seg) + (gap/2);
      const end   = ((i+1) * seg) - (gap/2);

      // Fill strength: we draw a background segment + a filled overlay proportional to value.
      const fillSpan = ((end - start) * (a.value / 100));
      const fillEnd = start + fillSpan;

      const bgD   = describeArc(cx, cy, rOuter, rInner, start, end);
      const fillD = describeArc(cx, cy, rOuter, rInner, start, fillEnd);

      // Classes let CSS control colour and focus styling
      const lensClass = `cs-ring-seg cs-lens-${a.lens} ${a.isFocus ? "is-focus" : ""}`;
      const fillClass = `cs-ring-fill cs-lens-${a.lens} ${a.isFocus ? "is-focus" : ""}`;

      // Accessible labels: value + tier
      const aria = `${a.label}: ${a.value} percent, ${a.tier.label}`;

      return `
        <g class="${lensClass}" role="listitem" aria-label="${aria}">
          <path class="cs-ring-bg" d="${bgD}"></path>
          <path class="${fillClass}" d="${fillD}"></path>
        </g>
      `;
    }).join("");

    const center = `
      <g class="cs-ring-center" aria-hidden="true">
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="cs-ring-score">${pct(model.overall)}</text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" class="cs-ring-caption">overall</text>
      </g>
    `;

    return `
      <svg class="cs-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="list" aria-label="Five lens ring">
        ${paths}
        ${center}
      </svg>
    `;
  }

  function buildRingModel(lensPercents, focusLens){
    const arcs = LENS_ORDER.map(l => {
      const v = pct(lensPercents?.[l]);
      return {
        lens: l,
        label: LENS_LABELS[l],
        value: v,
        tier: tierForLensPercent(v),
        isFocus: l === focusLens
      };
    });
    const overall = Math.round(sum(arcs.map(a => a.value)) / (arcs.length || 1));
    return { overall, focus: focusLens, arcs };
  }

  /* ----------------------- INSIGHT ENGINE ----------------------- */

  function buildLensCard({ lensKey, lensPercents, focusLens, snapshotId, scoring, seeds }){
    const value = pct(lensPercents?.[lensKey]);
    const tier = tierForLensPercent(value);

    const insightPool = INSIGHTS?.[lensKey]?.[tier.key] || [];
    const insight = pickDeterministic(insightPool, `${lensKey}:${tier.key}:${snapshotId}:insight`) || { h:"", b:"" };

    const metaphor = LENS_METAPHOR[lensKey] || { tag:"", line:"" };

    const seed = pickSeedForLens(seeds, lensKey, snapshotId);

    // Optional rationale only for focus lens (keeps UI calm + short)
    const rationale = (lensKey === focusLens)
      ? buildRationaleFromScoring(scoring, focusLens, snapshotId)
      : "";

    return {
      lens: lensKey,
      label: LENS_LABELS[lensKey] || lensKey,
      value,
      tier,
      isFocus: lensKey === focusLens,
      metaphor: { tag: safeText(metaphor.tag), line: safeText(metaphor.line) },
      insight: { headline: safeText(insight.h), body: safeText(insight.b) },
      rationale,
      seed: seed ? {
        id: safeText(seed.id),
        title: safeText(seed.title),
        today: safeText(seed.today),
        this_week: safeText(seed.this_week),
        this_month: safeText(seed.this_month)
      } : null
    };
  }

  function buildNarrative({ scored, band, focusLens, strongestLens, lensPercents }){
    const focusLabel = LENS_LABELS[focusLens] || focusLens;
    const strongestLabel = LENS_LABELS[strongestLens] || strongestLens;

    // Why focus (national-safe)
    const why = [
      `Your best place to start is <strong>${focusLabel}</strong>.`,
      `That doesn’t mean anything is “wrong” — it marks the fastest improvement path.`,
      `Your strongest area is <strong>${strongestLabel}</strong>, which can support progress elsewhere.`
    ].join(" ");

    // What now (signal + actionable stance)
    const focusTier = tierForLensPercent(lensPercents?.[focusLens]);
    const whatNow = [
      `Overall signal: <strong>${safeText(band.label)}</strong>.`,
      safeText(band.message),
      `Focus status: <strong>${safeText(focusTier.label)}</strong> — ${safeText(focusTier.hint)}`
    ].filter(Boolean).join(" ");

    return { why, whatNow };
  }

  function buildAudit({ scored, band, focusLens, strongestLens, weakestLens, lensPercents, questionsCount, answeredCount }){
    return {
      schema: "cs.snapshot.audit.v1",
      version: "snapshot-insights.js@1.0.0",
      generated_at: new Date().toISOString(),
      snapshot_id: scored?.snapshotId ?? stableHash(scored),
      inputs: {
        hdss: pct(scored?.hdss),
        lens_percents: Object.fromEntries(LENS_ORDER.map(l => [l, pct(lensPercents?.[l])]))
      },
      decisions: {
        band: { label: safeText(band.label), message: safeText(band.message) },
        focus_lens: focusLens,
        strongest_lens: strongestLens,
        weakest_lens: weakestLens,
        completion_pct: (questionsCount ? Math.round((answeredCount / questionsCount) * 100) : null)
      },
      principles: [
        "Safety without shame",
        "Deterministic meaning selection",
        "Explainable focus selection",
        "Behaviour-first action seeds",
        "Canon-aligned language"
      ]
    };
  }

  function interpret(seedForge, snapshot){
    // snapshot can be:
    // A) Stored from modal: { answers, focus, lensPercents, hdss, strongest, weakest, stage, snapshotId, ... }
    // B) Or minimal: { answers } -> we re-score via SeedForge.

    const questionsData = seedForge?.questions;
    const scoringData   = seedForge?.scoring;
    const seedsData     = seedForge?.seeds;
    const bandsData     = seedForge?.bands;

    const answers = snapshot?.answers || {};
    const scored = snapshot?.hdss != null && snapshot?.lensPercents
      ? snapshot
      : seedForge.scoreAnswers(answers, questionsData, scoringData);

    const lensPercents = scored?.lensPercents || {};
    const snapshotId = scored?.snapshotId ?? stableHash(answers);

    const sw = strongestWeakest(lensPercents);
    const strongestLens = scored?.strongest || sw.strongest;
    const weakestLens   = scored?.weakest   || sw.weakest;

    // Use canonical focus if present; else fall back to weakest
    const focusLens = scored?.focus || weakestLens;

    const band = bandForHdss(scored?.hdss, bandsData);

    // Build ring + cards
    const ring = buildRingModel(lensPercents, focusLens);

    const cards = LENS_ORDER.map(lensKey => buildLensCard({
      lensKey,
      lensPercents,
      focusLens,
      snapshotId,
      scoring: scoringData,
      seeds: seedsData
    }));

    // Prioritised: focus + two lowest (excluding focus)
    const extra = topKLowest(lensPercents, 2, new Set([focusLens]));
    const prioritisedOrder = [focusLens, ...extra];
    const prioritised = prioritisedOrder.map(l => cards.find(c => c.lens === l)).filter(Boolean);

    const narrative = buildNarrative({
      scored,
      band,
      focusLens,
      strongestLens,
      lensPercents
    });

    // Seed for focus lens (primary “Digital Seed”)
    const focusCard = cards.find(c => c.lens === focusLens) || prioritised[0] || null;
    const focusSeed = focusCard?.seed || null;

    // Institutional-safe one paragraph summary
    const summary = [
      `Your snapshot shows an overall signal of ${safeText(band.label)}.`,
      `Your strongest area is ${safeText(LENS_LABELS[strongestLens] || strongestLens)}.`,
      `Your best place to start is ${safeText(LENS_LABELS[focusLens] || focusLens)}.`,
      `This is not a judgement — it’s a signal you can act on with small, repeatable steps.`
    ].join(" ");

    const questionsCount = Array.isArray(questionsData?.questions) ? questionsData.questions.length : 0;
    const answeredCount = Object.keys(answers || {}).length;

    const audit = buildAudit({
      scored,
      band,
      focusLens,
      strongestLens,
      weakestLens,
      lensPercents,
      questionsCount,
      answeredCount
    });

    return {
      version: "cs.snapshot.insights.v1",
      snapshotId,
      band,
      scored: {
        hdss: pct(scored?.hdss),
        focus: focusLens,
        strongest: strongestLens,
        weakest: weakestLens,
        lensPercents: Object.fromEntries(LENS_ORDER.map(l => [l, pct(lensPercents?.[l])]))
      },
      ring,
      narrative,
      summary,
      lensCards: cards,
      prioritised,
      focusSeed,
      audit
    };
  }

  /* ----------------------- UI RENDERERS ----------------------- */

  function renderRing(mount, ringModel){
    if (!mount) return;
    mount.innerHTML = renderRingSVG(ringModel);
  }

  function renderRingLegend(mount, ringModel){
    if (!mount) return;
    const items = ringModel.arcs.map(a => {
      const focusBadge = a.isFocus ? `<span class="cs-badge">Focus</span>` : "";
      return `
        <li class="cs-ring-legend-item cs-lens-${a.lens}">
          <span class="cs-dot" aria-hidden="true"></span>
          <span class="cs-name">${a.label}</span>
          <span class="cs-val">${a.value}%</span>
          <span class="cs-tier">${a.tier.label}</span>
          ${focusBadge}
        </li>
      `;
    }).join("");

    mount.innerHTML = `<ul class="cs-ring-legend" role="list">${items}</ul>`;
  }

  function renderLensCards(mount, cards){
    if (!mount) return;

    const html = cards.map(c => {
      const focus = c.isFocus ? `<div class="cs-card-focus">Your focus</div>` : "";
      const seed = c.seed ? `
        <div class="cs-seed">
          <div class="cs-seed-title">${c.seed.title}</div>
          <ul class="cs-seed-steps">
            <li><strong>Today:</strong> ${c.seed.today}</li>
            <li><strong>This week:</strong> ${c.seed.this_week}</li>
            <li><strong>This month:</strong> ${c.seed.this_month}</li>
          </ul>
        </div>
      ` : "";

      const rationale = c.rationale ? `
        <div class="cs-rationale">
          <div class="cs-rationale-title">Why this focus?</div>
          <div class="cs-rationale-body">${c.rationale}</div>
        </div>
      ` : "";

      return `
        <article class="cs-lens-card cs-lens-${c.lens} ${c.isFocus ? "is-focus" : ""}">
          ${focus}
          <header class="cs-lens-head">
            <div class="cs-lens-title">${c.label}</div>
            <div class="cs-lens-metric">
              <span class="cs-lens-pct">${c.value}%</span>
              <span class="cs-lens-tier">${c.tier.label}</span>
            </div>
          </header>

          <div class="cs-lens-metaphor">
            <span class="cs-tag">${c.metaphor.tag}</span>
            <span class="cs-line">${c.metaphor.line}</span>
          </div>

          <div class="cs-lens-insight">
            <div class="cs-insight-h">${c.insight.headline}</div>
            <div class="cs-insight-b">${c.insight.body}</div>
          </div>

          ${rationale}
          ${seed}
        </article>
      `;
    }).join("");

    mount.innerHTML = `<div class="cs-lens-cards-grid">${html}</div>`;
  }

  function renderText(mount, html){
    if (!mount) return;
    mount.innerHTML = html;
  }

  function renderSeedFields(root, seed){
    if (!root) return;
    const t = $(HOOKS.seedTitle, root);
    const d = $(HOOKS.seedToday, root);
    const w = $(HOOKS.seedWeek, root);
    const m = $(HOOKS.seedMonth, root);

    if (!seed){
      if (t) t.textContent = "Your next step";
      if (d) d.textContent = "Complete your snapshot to receive a clear next step.";
      if (w) w.textContent = "";
      if (m) m.textContent = "";
      return;
    }

    if (t) t.textContent = seed.title;
    if (d) d.textContent = seed.today;
    if (w) w.textContent = seed.this_week;
    if (m) m.textContent = seed.this_month;
  }

  function applyInsightsToDOM(root, insight){
    // Signal
    const signalTitle = $(HOOKS.signalTitle, root);
    const signalMsg   = $(HOOKS.signalMessage, root);

    if (signalTitle) signalTitle.textContent = safeText(insight.band.label);
    if (signalMsg)   signalMsg.textContent   = safeText(insight.band.message);

    // Focus narrative
    const focusTitle = $(HOOKS.focusTitle, root);
    const focusWhy   = $(HOOKS.focusWhy, root);
    const focusNow   = $(HOOKS.focusNow, root);

    const focusLabel = LENS_LABELS[insight.scored.focus] || insight.scored.focus;
    if (focusTitle) focusTitle.textContent = `Best place to start: ${focusLabel}`;
    if (focusWhy)   focusWhy.innerHTML = insight.narrative.why;
    if (focusNow)   focusNow.innerHTML = insight.narrative.whatNow;

    // Ring
    renderRing($(HOOKS.ring, root), insight.ring);
    renderRingLegend($(HOOKS.ringLegend, root), insight.ring);

    // Lens cards
    renderLensCards($(HOOKS.lensCards, root), insight.lensCards);

    // Seed (focus seed)
    renderSeedFields(root, insight.focusSeed);

    // Optional audit blob
    const auditMount = $(HOOKS.auditJson, root);
    if (auditMount){
      auditMount.textContent = JSON.stringify(insight.audit, null, 2);
    }
  }

  /* ----------------------- BOOTSTRAP ----------------------- */

  async function loadSeedForge(){
    if (!window.CSSeedForge?.load) {
      throw new Error("CSSeedForge.load() not found. Ensure seedforge engine script loads before snapshot-insights.js");
    }
    return window.CSSeedForge.load();
  }

  function readSnapshot(){
    const raw = safeGet(SNAP_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async function mount(root=document){
    // If no mounts exist, do nothing (safe on all pages)
    const anyMount =
      $(HOOKS.ring, root) ||
      $(HOOKS.signalTitle, root) ||
      $(HOOKS.lensCards, root) ||
      $(HOOKS.focusWhy, root);

    if (!anyMount) return { ok:false, reason:"no-mounts" };

    const snap = readSnapshot();

    // If there is no snapshot, present gentle empty-state
    if (!snap?.answers) {
      const empty = {
        band: { label:"No snapshot yet", message:"Take a snapshot to receive a calm signal and next steps." },
        scored: { focus:"network" },
        ring: buildRingModel({}, "network"),
        narrative: { why:"", whatNow:"" },
        lensCards: [],
        focusSeed: null,
        audit: null
      };
      applyInsightsToDOM(root, empty);
      return { ok:true, reason:"empty-state" };
    }

    const seedForge = await loadSeedForge();

    // Ensure bands loaded in CSSeedForge cache (your engine fetches /generated/bands.json)
    if (!seedForge.bands) {
      // If your engine didn't fetch bands, try here (silent)
      try {
        seedForge.bands = await fetch("/generated/bands.json").then(r => r.json());
      } catch {}
    }

    const insight = interpret(seedForge, snap);
    applyInsightsToDOM(root, insight);

    return { ok:true, insight };
  }

  // Optional: re-render when snapshot is updated in another tab
  window.addEventListener("storage", (e) => {
    if (e.key === SNAP_KEY) {
      mount(document).catch(()=>{});
    }
  });

  // Public API
  window.CSSnapshotInsights = {
    mount,
    interpret,               // for programmatic use
    renderRingSVG,           // if you want to render elsewhere
    buildRingModel,          // advanced usage
    VERSION: "1.0.0"
  };

  // Auto-mount on DOM ready
  document.addEventListener("DOMContentLoaded", () => {
    mount(document).catch((err) => console.warn("[Cyber Seeds] snapshot-insights:", err?.message || err));
  });

})();
