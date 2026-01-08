/* -----------------------------------------
   Cyber Seeds — Household Snapshot Engine
   Public-facing: calm, no shame, no gimmicks
   ----------------------------------------- */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav
  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const open = mobileNav.hasAttribute("hidden");
      if (open) {
        mobileNav.removeAttribute("hidden");
        navToggle.setAttribute("aria-expanded", "true");
      } else {
        mobileNav.setAttribute("hidden", "");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
    $$("#mobileNav a").forEach(a => a.addEventListener("click", () => {
      mobileNav.setAttribute("hidden", "");
      navToggle.setAttribute("aria-expanded", "false");
    }));
  }

  // Modal controls
  const modal = $("#snapshotModal");
  const openButtons = [
    "#openSnapshot",
    "#openSnapshotTop",
    "#openSnapshotMobile",
    "#openSnapshotCard",
    "#openSnapshotLenses",
    "#openSnapshotResources"
  ].map(id => $(id)).filter(Boolean);

  const closeEls = $$("[data-close]");
  const snapshotForm = $("#snapshotForm");
  const snapshotIntro = $("#snapshotIntro");
  const snapshotNext = $("#snapshotNext");
  const snapshotBack = $("#snapshotBack");
  const snapshotResult = $("#snapshotResult");
  const signalGrid = $("#signalGrid");
  const resultCopy = $("#resultCopy");
  const exportBtn = $("#exportSnapshot");
  const attachSnapshotBtn = $("#attachSnapshotBtn");

  const auditRequestForm = $("#auditRequestForm");

  const storageKey = "cyberseeds_snapshot_v1";
  let stepIndex = -1; // -1 = before start
  let answers = {};   // questionId -> optionValue

  // Five lens registry
  const LENSES = [
    { id: "network",  name: "Network & Wi-Fi" },
    { id: "devices",  name: "Device hygiene" },
    { id: "privacy",  name: "Privacy & exposure" },
    { id: "scams",    name: "Scam & behavioural risk" },
    { id: "children", name: "Children’s wellbeing" }
  ];

  // Snapshot questions
  // Value scale: 0..3 (0 = fragile, 3 = strong)
  // Keep it short, meaningful, and shame-free.
  const QUESTIONS = [
    {
      id: "wifi_password",
      lens: "network",
      title: "Is your home Wi-Fi protected with a strong password (not the one on the router sticker)?",
      help: "This is about reducing easy, accidental access.",
      options: [
        { label: "Yes — we changed it and it’s strong", value: 3 },
        { label: "We changed it, but it’s probably weak / reused", value: 2 },
        { label: "Not sure / think it’s the default", value: 1 },
        { label: "No — it’s open or shared widely", value: 0 }
      ]
    },
    {
      id: "router_updates",
      lens: "network",
      title: "Do you know how to update your router, or have you checked it within the last year?",
      help: "Routers are often the most ignored device in the home.",
      options: [
        { label: "Yes — updated recently / managed carefully", value: 3 },
        { label: "I can, but I haven’t checked in a long time", value: 2 },
        { label: "Not really sure how", value: 1 },
        { label: "No — never touched it", value: 0 }
      ]
    },
    {
      id: "device_updates",
      lens: "devices",
      title: "Are updates turned on for phones/tablets/laptops (and do they install)?",
      help: "Updates quietly close common doors.",
      options: [
        { label: "Mostly yes — updates are on and used", value: 3 },
        { label: "Mixed — some devices update, some don’t", value: 2 },
        { label: "Rarely — we ignore update prompts", value: 1 },
        { label: "No — we avoid updates", value: 0 }
      ]
    },
    {
      id: "backups",
      lens: "devices",
      title: "If you lost a phone today, could you recover photos and important data?",
      help: "Backups are safety, not just convenience.",
      options: [
        { label: "Yes — backups are working", value: 3 },
        { label: "Some things would be saved, some not", value: 2 },
        { label: "Not sure", value: 1 },
        { label: "No — we’d lose a lot", value: 0 }
      ]
    },
    {
      id: "privacy_visibility",
      lens: "privacy",
      title: "Would it be easy for someone to find your family’s school/routine from public profiles?",
      help: "This is about reducing unwanted attention.",
      options: [
        { label: "No — profiles are private / minimal", value: 3 },
        { label: "Mostly no, but there are some clues", value: 2 },
        { label: "Maybe — we haven’t checked", value: 1 },
        { label: "Yes — lots is public", value: 0 }
      ]
    },
    {
      id: "shared_accounts",
      lens: "privacy",
      title: "Do family members share accounts/logins (email, streaming, app stores)?",
      help: "Shared logins can blur boundaries and complicate safety decisions.",
      options: [
        { label: "No — separate logins where it matters", value: 3 },
        { label: "Some shared, but we manage it", value: 2 },
        { label: "Yes — lots of sharing", value: 1 },
        { label: "Everything is shared", value: 0 }
      ]
    },
    {
      id: "pressure_messages",
      lens: "scams",
      title: "How does the household respond to urgent messages (bank, delivery, ‘your account is locked’)?",
      help: "Most harm happens when people are rushed.",
      options: [
        { label: "We pause and verify using official channels", value: 3 },
        { label: "We try, but sometimes act quickly", value: 2 },
        { label: "We often click links to check", value: 1 },
        { label: "We usually act immediately", value: 0 }
      ]
    },
    {
      id: "two_factor",
      lens: "scams",
      title: "Is two-factor authentication (2FA) enabled for key accounts (email, banking, socials)?",
      help: "This protects accounts even if a password leaks.",
      options: [
        { label: "Yes — for most key accounts", value: 3 },
        { label: "Some accounts, not all", value: 2 },
        { label: "Not sure", value: 1 },
        { label: "No", value: 0 }
      ]
    },
    {
      id: "bedtime_devices",
      lens: "children",
      title: "Do children keep devices in the bedroom overnight?",
      help: "This can affect sleep, exposure, and late-night risk.",
      options: [
        { label: "No — devices charge outside bedrooms", value: 3 },
        { label: "Sometimes / depends", value: 2 },
        { label: "Yes — usually", value: 1 },
        { label: "Yes — always", value: 0 }
      ]
    },
    {
      id: "talking_rules",
      lens: "children",
      title: "Do you have a calm, clear family agreement about online behaviour (even a simple one)?",
      help: "Clarity reduces conflict. Repair matters more than punishment.",
      options: [
        { label: "Yes — clear and consistent", value: 3 },
        { label: "Some rules, but inconsistent", value: 2 },
        { label: "Not really", value: 1 },
        { label: "No — we argue about it a lot", value: 0 }
      ]
    }
  ];

  // Render only one question at a time (calmer)
  function renderStep() {
    if (!snapshotForm) return;

    snapshotForm.innerHTML = "";

    // Before start
    if (stepIndex < 0) {
      snapshotIntro.hidden = false;
      snapshotResult.hidden = true;
      snapshotBack.disabled = true;
      snapshotNext.textContent = "Start";
      return;
    }

    // Finished
    if (stepIndex >= QUESTIONS.length) {
      snapshotIntro.hidden = true;
      snapshotResult.hidden = false;
      snapshotBack.disabled = false;
      snapshotNext.textContent = "Done";
      snapshotNext.disabled = true;
      buildResult();
      return;
    }

    snapshotIntro.hidden = true;
    snapshotResult.hidden = true;

    const q = QUESTIONS[stepIndex];

    const wrap = document.createElement("div");
    wrap.className = "q";
    wrap.innerHTML = `
      <p class="q-title">${escapeHtml(q.title)}</p>
      <p class="q-help">${escapeHtml(q.help)}</p>
      <div class="q-opts" role="radiogroup" aria-label="${escapeHtml(q.title)}"></div>
    `;

    const opts = $(".q-opts", wrap);
    q.options.forEach((opt, i) => {
      const id = `${q.id}_${i}`;
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML = `
        <input type="radio" name="${q.id}" id="${id}" value="${opt.value}" />
        <span>${escapeHtml(opt.label)}</span>
      `;
      opts.appendChild(label);
    });

    snapshotForm.appendChild(wrap);

    // Restore selection
    const prev = answers[q.id];
    if (prev !== undefined) {
      const radio = $(`input[name="${q.id}"][value="${prev}"]`, snapshotForm);
      if (radio) radio.checked = true;
    }

    snapshotBack.disabled = stepIndex === 0;
    snapshotNext.textContent = stepIndex === QUESTIONS.length - 1 ? "Finish" : "Next";
    snapshotNext.disabled = !answers[q.id] && answers[q.id] !== 0; // require selection
  }

  function getSelectionForCurrent() {
    const q = QUESTIONS[stepIndex];
    const checked = $(`input[name="${q.id}"]:checked`, snapshotForm);
    if (!checked) return null;
    return Number(checked.value);
  }

  function openModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    stepIndex = -1;
    answers = {};
    const saved = loadSnapshot();
    if (saved?.answers) answers = saved.answers;
    renderStep();
    // Focus
    setTimeout(() => snapshotNext?.focus(), 40);
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Attach open handlers
  openButtons.forEach(btn => btn.addEventListener("click", openModal));
  closeEls.forEach(el => el.addEventListener("click", closeModal));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") closeModal();
  });

  // Quiz navigation
  if (snapshotNext) {
    snapshotNext.addEventListener("click", () => {
      if (stepIndex < 0) {
        stepIndex = 0;
        renderStep();
        return;
      }
      if (stepIndex >= QUESTIONS.length) return;

      const val = getSelectionForCurrent();
      if (val === null) return;

      const q = QUESTIONS[stepIndex];
      answers[q.id] = val;

      stepIndex += 1;
      renderStep();
      persistSnapshot();
    });
  }

  if (snapshotBack) {
    snapshotBack.addEventListener("click", () => {
      if (stepIndex <= 0) {
        stepIndex = -1;
        renderStep();
        return;
      }
      stepIndex -= 1;
      renderStep();
    });
  }

  if (snapshotForm) {
    snapshotForm.addEventListener("change", () => {
      if (stepIndex < 0 || stepIndex >= QUESTIONS.length) return;
      const q = QUESTIONS[stepIndex];
      const val = getSelectionForCurrent();
      if (val === null) return;
      answers[q.id] = val;
      snapshotNext.disabled = false;
      persistSnapshot();
    });
  }

  // Build result
  function buildResult() {
    const lensScores = computeLensScores();
    const lensLabels = computeLensLabels(lensScores);
    const narrative = buildNarrative(lensScores, lensLabels);

    // Bars
    if (signalGrid) {
      signalGrid.innerHTML = "";
      LENSES.forEach(l => {
        const pct = lensScores[l.id].pct;
        const card = document.createElement("div");
        card.className = "signal";
        card.innerHTML = `
          <div class="signal-top">
            <p class="signal-title">${escapeHtml(l.name)}</p>
            <span class="signal-label">${escapeHtml(lensLabels[l.id])}</span>
          </div>
          <div class="bar" aria-hidden="true"><span style="width:${pct}%;"></span></div>
        `;
        signalGrid.appendChild(card);
      });
    }

    // Narrative
    if (resultCopy) {
      resultCopy.innerHTML = `
        <p><strong>${escapeHtml(narrative.headline)}</strong></p>
        <p>${escapeHtml(narrative.summary)}</p>
        <ul>
          ${narrative.nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
        </ul>
        <p class="small">${escapeHtml(narrative.reassurance)}</p>
      `;
    }

    persistSnapshot({ lensScores, lensLabels, narrative });

    // Enable attach snapshot for request form
    if (attachSnapshotBtn) attachSnapshotBtn.disabled = false;
  }

  function computeLensScores() {
    const sums = Object.fromEntries(LENSES.map(l => [l.id, { total: 0, max: 0 }]));

    QUESTIONS.forEach(q => {
      const v = answers[q.id];
      sums[q.lens].max += 3;
      if (v !== undefined) sums[q.lens].total += v;
    });

    const out = {};
    Object.keys(sums).forEach(lensId => {
      const { total, max } = sums[lensId];
      const pct = max ? Math.round((total / max) * 100) : 0;
      out[lensId] = { total, max, pct };
    });
    return out;
  }

  function computeLensLabels(lensScores) {
    // Not a "score". We label as signal strength: Fragile / Developing / Stable / Strong
    const labelForPct = (pct) => {
      if (pct >= 80) return "Strong";
      if (pct >= 60) return "Stable";
      if (pct >= 40) return "Developing";
      return "Fragile";
    };
    const out = {};
    Object.keys(lensScores).forEach(k => out[k] = labelForPct(lensScores[k].pct));
    return out;
  }

  function buildNarrative(lensScores, lensLabels) {
    // Identify top strengths + most fragile lenses
    const ordered = [...LENSES].map(l => ({
      id: l.id,
      name: l.name,
      pct: lensScores[l.id].pct,
      label: lensLabels[l.id]
    })).sort((a,b) => a.pct - b.pct);

    const weakest = ordered.slice(0, 2);
    const strongest = ordered.slice(-2).reverse();

    const headline = "A clear starting picture — with gentle next steps.";
    const summary =
      `Right now your household signal shows strengths in ${strongest.map(x => x.name).join(" and ")}, ` +
      `and the biggest opportunities for calm improvement are in ${weakest.map(x => x.name).join(" and ")}.`;

    const nextSteps = [
      `Pick one “seed” for this week in ${weakest[0].name}: choose a single change you can complete in 15–30 minutes.`,
      `Create one shared household rule that reduces pressure decisions (e.g., “pause and verify” for urgent messages).`,
      `Choose a monthly “maintenance rhythm”: updates + backups + quick privacy check — done together, calmly.`,
      `If you want a professional plan shaped around real life, request the full £75 audit (human-led, five-lens).`
    ];

    const reassurance =
      "If any of these answers felt uncomfortable: that’s normal. The point isn’t blame — it’s visibility. " +
      "You’re already improving by looking clearly.";

    return { headline, summary, nextSteps, reassurance, weakest, strongest };
  }

  // Export / Print
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const saved = loadSnapshot();
      if (!saved?.lensScores || !saved?.lensLabels || !saved?.narrative) return;

      const html = buildPrintableSnapshot(saved);
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) return;

      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    });
  }

  function buildPrintableSnapshot(saved) {
    const { lensScores, lensLabels, narrative } = saved;
    const date = new Date().toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit" });

    const rows = LENSES.map(l => {
      const pct = lensScores[l.id].pct;
      const label = lensLabels[l.id];
      return `
        <div class="row">
          <div class="left">
            <div class="name">${escapeHtml(l.name)}</div>
            <div class="label">${escapeHtml(label)}</div>
          </div>
          <div class="bar"><span style="width:${pct}%;"></span></div>
        </div>
      `;
    }).join("");

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cyber Seeds — Household Snapshot</title>
  <style>
    :root{ --ink:#0e1512; --muted:#42534b; --line:rgba(14,21,18,.14); --seed:#2a7a57; --sprout:#1f6f86; }
    body{ font-family: Arial, sans-serif; margin: 28px; color: var(--ink); }
    .top{ display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .brand{ font-weight: 800; }
    .sub{ color: var(--muted); font-size: 12px; margin-top: 4px; }
    h1{ font-size: 20px; margin: 14px 0 6px; }
    .note{ color: var(--muted); font-size: 12.5px; margin: 0 0 14px; }
    .panel{ border:1px solid var(--line); border-radius: 14px; padding: 14px; }
    .row{ display:flex; gap: 12px; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,.06); }
    .row:last-child{ border-bottom:none; }
    .left{ width: 240px; }
    .name{ font-weight: 800; font-size: 13px; }
    .label{ color: var(--muted); font-size: 12px; margin-top: 2px; }
    .bar{ flex:1; height: 10px; border-radius: 999px; background: rgba(0,0,0,.08); overflow:hidden; }
    .bar span{ display:block; height:100%; background: linear-gradient(90deg, var(--seed), var(--sprout)); width:0; }
    .box{ margin-top: 12px; border:1px solid var(--line); border-radius: 14px; padding: 12px; }
    ul{ margin: 8px 0 0; padding-left: 18px; color: var(--muted); font-size: 12.5px; }
    .foot{ margin-top: 14px; color: var(--muted); font-size: 11.5px; }
    @media print{ body{ margin: 14mm; } }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">Cyber Seeds</div>
      <div class="sub">Domestic Cyber Ecology — Household Snapshot</div>
    </div>
    <div class="sub">${escapeHtml(date)}</div>
  </div>

  <h1>Household signal (snapshot)</h1>
  <p class="note">A starting picture across the five lenses. Not surveillance. Not judgement.</p>

  <div class="panel">
    ${rows}
  </div>

  <div class="box">
    <div style="font-weight:800; font-size:13px;">Meaning</div>
    <div class="sub" style="margin-top:6px;">${escapeHtml(narrative.summary)}</div>
    <ul>${narrative.nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
  </div>

  <div class="foot">
    This snapshot is informational and supportive. If you need a professional plan shaped around real life, request the full audit.
  </div>
</body>
</html>
    `;
  }

  // Audit request email draft
  let snapshotAttached = false;

  if (attachSnapshotBtn) {
    attachSnapshotBtn.addEventListener("click", () => {
      snapshotAttached = !snapshotAttached;
      attachSnapshotBtn.textContent = snapshotAttached ? "Snapshot summary attached ✓" : "Attach my snapshot summary";
      attachSnapshotBtn.classList.toggle("primary", snapshotAttached);
    });
  }

  if (auditRequestForm) {
    auditRequestForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = new FormData(auditRequestForm);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const postcode = String(data.get("postcode") || "").trim();
      const role = String(data.get("role") || "").trim();
      const notes = String(data.get("notes") || "").trim();

      const saved = loadSnapshot();

      const subject = encodeURIComponent("Cyber Seeds — Audit request");
      let body = "";
      body += `Name: ${name}\n`;
      body += `Email: ${email}\n`;
      if (postcode) body += `Postcode: ${postcode}\n`;
      body += `Role: ${role}\n\n`;
      if (notes) {
        body += `What I’d like help with:\n${notes}\n\n`;
      }

      body += `Preferred method: (Remote / In-home / Unsure)\n`;
      body += `Availability: (days/times)\n\n`;

      if (snapshotAttached && saved?.lensLabels && saved?.narrative) {
        body += `--- Household Snapshot Summary (optional) ---\n`;
        LENSES.forEach(l => {
          body += `${l.name}: ${saved.lensLabels[l.id] || "—"}\n`;
        });
        body += `\nMeaning:\n${saved.narrative.summary}\n\n`;
      }

      body += `Notes:\n- Please do not request passwords or sensitive info by email.\n- I understand the snapshot is a starting picture, not a diagnosis.\n`;

      const mailto = `mailto:hello@cyberseeds.co.uk?subject=${subject}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    });
  }

  // Local persistence
  function persistSnapshot(extra = {}) {
    try {
      const payload = {
        version: "v1",
        updatedAt: Date.now(),
        answers,
        ...extra
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  // Practitioner mode (secret)
  const practitionerOverlay = $("#practitionerOverlay");
  const closePractitioner = $("#closePractitioner");
  const copySnapshotJson = $("#copySnapshotJson");
  const toggleDebug = $("#toggleDebug");
  const debugPanel = $("#debugPanel");

  let keyBuffer = "";
  const secret = "seed"; // type s-e-e-d anywhere

  function openPractitioner() {
    if (!practitionerOverlay) return;
    practitionerOverlay.hidden = false;
    refreshDebug();
  }
  function closePract() {
    if (!practitionerOverlay) return;
    practitionerOverlay.hidden = true;
  }

  if (closePractitioner) closePractitioner.addEventListener("click", closePract);

  if (copySnapshotJson) {
    copySnapshotJson.addEventListener("click", async () => {
      const saved = loadSnapshot() || {};
      const text = JSON.stringify(saved, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        copySnapshotJson.textContent = "Copied ✓";
        setTimeout(() => copySnapshotJson.textContent = "Copy snapshot JSON", 900);
      } catch (_) {
        // fallback
        copySnapshotJson.textContent = "Copy failed";
        setTimeout(() => copySnapshotJson.textContent = "Copy snapshot JSON", 900);
      }
    });
  }

  function refreshDebug() {
    if (!debugPanel) return;
    const saved = loadSnapshot() || {};
    const pracId = $("#practitionerId")?.value || "";
    const visitType = $("#visitType")?.value || "";
    const pracNotes = $("#practitionerNotes")?.value || "";

    const merged = {
      ...saved,
      practitioner: {
        practitionerId: pracId || undefined,
        visitType: visitType || undefined,
        notes: pracNotes || undefined
      }
    };
    debugPanel.textContent = JSON.stringify(merged, null, 2);
  }

  ["practitionerId","visitType","practitionerNotes"].forEach(id => {
    const el = $("#"+id);
    if (el) el.addEventListener("input", refreshDebug);
  });

  if (toggleDebug) {
    toggleDebug.addEventListener("click", () => {
      if (!debugPanel) return;
      debugPanel.hidden = !debugPanel.hidden;
      refreshDebug();
    });
  }

  window.addEventListener("keydown", (e) => {
    // ignore when typing in inputs
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-10);
    if (keyBuffer.includes(secret)) {
      openPractitioner();
      keyBuffer = "";
    }
  });

  // Escape HTML
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
