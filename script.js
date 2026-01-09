(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // Basic HTML escaping for print doc / injected strings
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav toggle
  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");
  navToggle?.addEventListener("click", () => {
    const isOpen = mobileNav && !mobileNav.hasAttribute("hidden");
    if (mobileNav) {
      if (isOpen) mobileNav.setAttribute("hidden", "true");
      else mobileNav.removeAttribute("hidden");
    }
    navToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  // Close mobile nav on link click
  $$("#mobileNav a").forEach(a => {
    a.addEventListener("click", () => {
      mobileNav?.setAttribute("hidden", "true");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  // Smooth scroll for in-page anchors
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Constants: Lenses + Questions ---------- */
  const LENSES = [
    { id: "network", name: "Network & Wi-Fi" },
    { id: "device", name: "Device Hygiene" },
    { id: "privacy", name: "Privacy & Exposure" },
    { id: "scams", name: "Scams & Behaviour" },
    { id: "child", name: "Child Digital Wellbeing" },
  ];

  // 10 questions (2 per lens)
  const QUESTIONS = [
    // Network
    {
      id: "net_password",
      lens: "network",
      title: "Wi-Fi password health",
      options: [
        { v: 0, label: "Strong & unique", help: "Not shared widely, not reused elsewhere." },
        { v: 1, label: "Okay, but shared", help: "Shared with visitors / extended family over time." },
        { v: 2, label: "Weak / default / unknown", help: "Might be printed on router or easily guessable." },
      ],
    },
    {
      id: "net_guest",
      lens: "network",
      title: "Guest network use",
      options: [
        { v: 0, label: "Yes", help: "Visitors / smart devices use a guest network." },
        { v: 1, label: "Sometimes", help: "Only for certain guests or times." },
        { v: 2, label: "No", help: "Everything joins the main Wi-Fi." },
      ],
    },

    // Device
    {
      id: "dev_updates",
      lens: "device",
      title: "Updates and patching",
      options: [
        { v: 0, label: "Automatic updates on", help: "Phones, laptops, tablets update regularly." },
        { v: 1, label: "Mixed", help: "Some update; others drift behind." },
        { v: 2, label: "Often delayed", help: "Updates avoided or rarely installed." },
      ],
    },
    {
      id: "dev_lock",
      lens: "device",
      title: "Screen locks & access",
      options: [
        { v: 0, label: "Consistent locks", help: "PIN/biometric on main devices." },
        { v: 1, label: "Some gaps", help: "One or two devices are less protected." },
        { v: 2, label: "Mostly unlocked", help: "Easy access, shared passcodes, or none." },
      ],
    },

    // Privacy
    {
      id: "priv_accounts",
      lens: "privacy",
      title: "Password habits",
      options: [
        { v: 0, label: "Manager / unique passwords", help: "Unique logins; reuse is rare." },
        { v: 1, label: "Some reuse", help: "A few reused passwords across services." },
        { v: 2, label: "A lot of reuse / unknown", help: "Many accounts share the same password." },
      ],
    },
    {
      id: "priv_sharing",
      lens: "privacy",
      title: "Data sharing & public profiles",
      options: [
        { v: 0, label: "Mostly private", help: "Profiles locked down; permissions reviewed." },
        { v: 1, label: "Mixed", help: "Some settings strong, others not checked." },
        { v: 2, label: "Open / unsure", help: "Not sure what’s public or shared." },
      ],
    },

    // Scams
    {
      id: "scam_exposure",
      lens: "scams",
      title: "Scam exposure in last 6 months",
      options: [
        { v: 0, label: "None / handled safely", help: "Rarely clicked; verified first." },
        { v: 1, label: "A few near misses", help: "Dodgy texts/emails; sometimes uncertain." },
        { v: 2, label: "Several incidents", help: "Links clicked, money lost, or compromised accounts." },
      ],
    },
    {
      id: "scam_verification",
      lens: "scams",
      title: "Verification habit (links, calls, payments)",
      options: [
        { v: 0, label: "Verify first", help: "Pause → check → then act." },
        { v: 1, label: "Sometimes", help: "Depends on stress/time." },
        { v: 2, label: "Usually act fast", help: "Often respond immediately to urgency." },
      ],
    },

    // Child
    {
      id: "child_boundaries",
      lens: "child",
      title: "Child boundaries (if relevant)",
      options: [
        { v: 0, label: "Clear boundaries", help: "Age-appropriate rules; regular check-ins." },
        { v: 1, label: "Some boundaries", help: "Rules exist but are inconsistent." },
        { v: 2, label: "Unclear / overwhelmed", help: "Hard to keep up; rules aren’t established." },
      ],
    },
    {
      id: "child_social",
      lens: "child",
      title: "Social apps & contact risk",
      options: [
        { v: 0, label: "Strong safety setup", help: "Private profiles; friend lists known; reporting understood." },
        { v: 1, label: "Mixed", help: "Some safety features, but not consistent." },
        { v: 2, label: "High uncertainty", help: "Not sure who can message/contact." },
      ],
    },
  ];

  const LENS_CONTEXT = {
    network: {
      title: "Network & Wi-Fi",
      copy: "This lens is about the router: access, separation (guest Wi-Fi), and keeping the network tidy. Small changes here reduce risk across the whole home.",
    },
    device: {
      title: "Device Hygiene",
      copy: "This lens is about keeping devices maintained: updates, locks, backups, and reducing weak points that attackers and scams exploit.",
    },
    privacy: {
      title: "Privacy & Exposure",
      copy: "This lens covers how ‘findable’ and reusable your digital identity is: passwords, public profiles, data sharing, and account sprawl.",
    },
    scams: {
      title: "Scams & Behaviour",
      copy: "This lens is about realistic risk: urgency messages, dodgy links, fake support calls, and habits that protect you under stress.",
    },
    child: {
      title: "Child Digital Wellbeing",
      copy: "This lens is about children’s safety and calm boundaries: contact risk, content exposure, and household agreements that reduce conflict.",
    },
  };

  /* ---------- Storage ---------- */
  const SNAPSHOT_KEY = "cs_snapshot_v1";

  function saveSnapshot(snapshot) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      return true;
    } catch (e) {
      console.warn("Snapshot save failed", e);
      return false;
    }
  }

  function getStoredSnapshot() {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /* ---------- Resources Page Logic ---------- */
  const resourcesHubEl = $("#resourcesHub");
  if (resourcesHubEl) {
    const snap = getStoredSnapshot();
    renderResourcesHub(resourcesHubEl, snap);

    $("#copyResourcesPack")?.addEventListener("click", async () => {
      const s = getStoredSnapshot();
      if (!s) return toast("Run a snapshot first.");
      const pack = buildResourcesPack(s);
      try {
        await navigator.clipboard.writeText(pack);
        toast("Copied.");
      } catch {
        toast("Copy blocked. Select and copy manually.");
        // fallback: show in an alert
        window.prompt("Copy your pack:", pack);
      }
    });

    // From Resources page, jump back into the Snapshot.
    $("#openSnapshotTop")?.addEventListener("click", () => {
      window.location.href = "index.html?snapshot=1";
    });

    return;
  }

  /* ---------- Snapshot modal logic ---------- */
  let scrollLockY = 0;
  function lockBodyScroll() {
    scrollLockY = window.scrollY || 0;
    document.body.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  function unlockBodyScroll() {
    document.body.classList.remove("modal-open");
    const top = document.body.style.top;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    const y = top ? Math.abs(parseInt(top, 10)) : scrollLockY;
    window.scrollTo(0, y || 0);
  }

  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const lensContextBox = $("#lensContext");
  const backBtn = $("#snapshotBack");
  const nextBtn = $("#snapshotNext");
  const stepEl = $("#snapshotStep");
  const result = $("#quizResult");
  const resultGrid = $("#resultGrid");

  // If modal not on page, nothing else to do
  if (!modal || !form || !backBtn || !nextBtn || !stepEl) {
    return;
  }

  let step = -1; // -1 is intro screen; 0..9 are questions
  const answers = {}; // { [questionId]: value }

  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.setAttribute("aria-hidden", "false");
    lockBodyScroll();

    // reset state
    step = -1;
    Object.keys(answers).forEach(k => delete answers[k]);
    if (result) result.hidden = true;
    if (resultGrid) resultGrid.innerHTML = "";
    render();
    nextBtn.focus();
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    unlockBodyScroll();
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  // Open buttons
  $("#openSnapshot")?.addEventListener("click", () => openModal());
  $("#openSnapshotCard")?.addEventListener("click", () => openModal());
  $("#openSnapshotTop")?.addEventListener("click", () => openModal());
  $("#openSnapshotMobile")?.addEventListener("click", () => {
    mobileNav?.setAttribute("hidden", "true");
    navToggle?.setAttribute("aria-expanded", "false");
    openModal();
  });

  // Allow linking directly to the snapshot: index.html?snapshot=1
  const params = new URLSearchParams(window.location.search);
  if (params.get("snapshot") === "1") {
    setTimeout(openModal, 40);
    history.replaceState({}, document.title, window.location.pathname);
  }

  // Close handlers
  $$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));
  window.addEventListener("keydown", (e) => {
    if (modal.getAttribute("aria-hidden") === "false" && e.key === "Escape") closeModal();
  });

  backBtn.addEventListener("click", () => {
    if (step <= -1) return;
    step--;
    render();
  });

  nextBtn.addEventListener("click", () => {
    // Intro -> first question
    if (step < 0) {
      step = 0;
      render();
      return;
    }

    // On a question: require answer to proceed
    const q = QUESTIONS[step];
    if (!q) return;

    if (typeof answers[q.id] !== "number") {
      toast("Pick an option to continue.");
      return;
    }

    if (step < QUESTIONS.length - 1) {
      step++;
      render();
    } else {
      showResults();
    }
  });

  function render() {
    // Controls baseline
    backBtn.disabled = step <= -1;
    nextBtn.disabled = true;

    // Step indicator
    if (step < 0) {
      stepEl.textContent = "Intro";
    } else {
      stepEl.textContent = `Question ${step + 1} / ${QUESTIONS.length}`;
    }

    // Intro
    if (step < 0) {
      nextBtn.textContent = "Start";
      nextBtn.disabled = false;
      if (result) result.hidden = true;

      form.innerHTML = `
        <div class="intro">
          <h3 class="intro-title">What this snapshot does</h3>
          <p class="intro-copy">Answer 10 short questions across the five lenses. You’ll get a calm household signal — then a personalised Resources Hub (generated locally on this device).</p>
          <ul class="intro-list">
            <li><strong>No surveillance:</strong> this is not monitoring — it’s a structured self-check.</li>
            <li><strong>Nothing uploaded:</strong> your snapshot stays in your browser storage.</li>
            <li><strong>No judgement:</strong> the goal is clarity and small, realistic next steps.</li>
          </ul>
          <div class="intro-note"><strong>Tip:</strong> On phones, the <em>Next</em> button stays visible at the bottom.</div>
        </div>
      `;
      if (lensContextBox) lensContextBox.hidden = true;
      return;
    }

    const q = QUESTIONS[step];
    if (!q) return;

    // Lens context
    const ctx = LENS_CONTEXT[q.lens];
    if (lensContextBox && ctx) {
      lensContextBox.hidden = false;
      lensContextBox.innerHTML = `
        <h4>${escapeHtml(ctx.title)}</h4>
        <p>${escapeHtml(ctx.copy)}</p>
      `;
    }

    // Build question
    form.innerHTML = `
      <h3 class="q-title">${escapeHtml(q.title)}</h3>
      <div class="options" role="radiogroup" aria-label="${escapeHtml(q.title)}">
        ${q.options.map((o, idx) => {
          const checked = answers[q.id] === o.v ? "checked" : "";
          return `
            <label class="opt">
              <input type="radio" name="${escapeHtml(q.id)}" value="${o.v}" ${checked} />
              <span class="opt-main">
                <span class="opt-label">${escapeHtml(o.label)}</span>
                <span class="opt-help">${escapeHtml(o.help)}</span>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    `;

    // Enable next if already answered
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = typeof answers[q.id] !== "number";

    // Listen for changes
    $$(".opt input", form).forEach(input => {
      input.addEventListener("change", () => {
        answers[q.id] = Number(input.value);
        nextBtn.disabled = false;
      });
    });
  }

  function computeLensScores() {
    const byLens = {};
    LENSES.forEach(l => { byLens[l.id] = { sum: 0, max: 0, count: 0 }; });

    QUESTIONS.forEach(q => {
      const v = answers[q.id];
      // Lower is better (0 best, 2 worst). Convert to strength percent (100 best).
      const maxV = 2;
      const strength = (typeof v === "number") ? (maxV - v) / maxV : 0;
      byLens[q.lens].sum += strength;
      byLens[q.lens].max += 1;
      byLens[q.lens].count += 1;
    });

    const lensResults = LENSES.map(l => {
      const d = byLens[l.id];
      const avg = d.max ? (d.sum / d.max) : 0;
      const pct = Math.round(avg * 100);
      const label =
        pct >= 80 ? "Strong" :
        pct >= 55 ? "Growing" :
        "Fragile";

      return { id: l.id, name: l.name, pct, label };
    });

    lensResults.sort((a, b) => a.pct - b.pct);
    const weakest = lensResults.slice(0, 2).map(x => x.id);
    const strongest = lensResults.slice(-2).map(x => x.id);

    return { lensResults, weakest, strongest };
  }

  function showResults() {
    const { lensResults, weakest, strongest } = computeLensScores();

    // Save snapshot
    const snapshot = {
      createdAt: new Date().toISOString(),
      answers: { ...answers },
      lensResults,
      weakest,
      strongest
    };

    const ok = saveSnapshot(snapshot);
    if (!ok) toast("Could not save snapshot (storage blocked).");

    // Render
    if (resultGrid) {
      resultGrid.innerHTML = lensResults
        .sort((a, b) => b.pct - a.pct)
        .map(l => `
          <div class="result-card">
            <h4>${escapeHtml(l.name)}</h4>
            <span class="badge">${escapeHtml(l.label)} • ${l.pct}%</span>
            <p class="muted small" style="margin:10px 0 0;">
              ${lensNudge(l.id, l.pct)}
            </p>
          </div>
        `).join("");
    }

    if (result) result.hidden = false;

    // Move view to result
    result?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Reset controls
    stepEl.textContent = "Complete";
    backBtn.disabled = true;
    nextBtn.disabled = true;
    nextBtn.textContent = "Done";
  }

  function lensNudge(lensId, pct) {
    if (pct >= 80) {
      switch (lensId) {
        case "network": return "Your network foundations look strong. Keep router updates and guest Wi-Fi consistent.";
        case "device": return "Devices look well maintained. Keep updates and backups steady.";
        case "privacy": return "Privacy posture is solid. Keep passwords unique and review sharing settings occasionally.";
        case "scams": return "Good scam-resilience habits. Keep the pause-and-verify reflex.";
        case "child": return "Child wellbeing boundaries look steady. Keep calm check-ins and age-appropriate settings.";
      }
    }
    if (pct >= 55) {
      switch (lensId) {
        case "network": return "A few small network upgrades could harden the whole home (guest Wi-Fi, password refresh).";
        case "device": return "Tighten device basics (updates + locks) so weak points don’t accumulate.";
        case "privacy": return "Reduce exposure by trimming reuse and checking what’s public.";
        case "scams": return "Build a consistent verification habit for urgent messages and payments.";
        case "child": return "Make boundaries easier to uphold: one or two clear rules, consistently applied.";
      }
    }
    // Fragile
    switch (lensId) {
      case "network": return "Start with the router: change Wi-Fi/admin passwords and consider a guest network.";
      case "device": return "Start with updates and screen locks—these prevent a large chunk of common compromise.";
      case "privacy": return "Start with password reuse: pick the most important accounts and make them unique first.";
      case "scams": return "Start with a simple rule: never act on urgency—pause, verify, then proceed.";
      case "child": return "Start with one calm agreement and one safety setting (private profile / messaging limits).";
      default: return "";
    }
  }

  /* ---------- Print / Export snapshot ---------- */
  $("#exportSnapshot")?.addEventListener("click", () => {
    const snap = getStoredSnapshot();
    if (!snap) return toast("No snapshot found.");
    const byId = lensMapFromSnapshot(snap);
    const createdAt = new Date(snap.createdAt).toLocaleString();

    const weakestNames = (snap.weakest || []).map(id => LENSES.find(l => l.id === id)?.name || id).join(" and ");
    const strongestNames = (snap.strongest || []).map(id => LENSES.find(l => l.id === id)?.name || id).join(" and ");

    const rows = LENSES.map(l => {
      const lr = byId[l.id];
      return `<tr><td>${escapeHtml(l.name)}</td><td>${escapeHtml(lr.label)}</td><td>${lr.pct}%</td></tr>`;
    }).join("");

    const htmlDoc = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cyber Seeds — Household Snapshot</title>
<style>
  body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:24px; color:#0e1512;}
  h1{font-family:Georgia,serif; margin:0 0 6px;}
  .meta{color:#42534b; margin:0 0 18px;}
  table{width:100%; border-collapse:collapse; margin-top:12px;}
  th,td{border:1px solid rgba(0,0,0,.15); padding:10px; text-align:left;}
  th{background:rgba(0,0,0,.04);}
  .box{border:1px solid rgba(0,0,0,.15); padding:12px; border-radius:12px; margin-top:14px;}
  .small{color:#42534b;}
</style>
</head><body>
  <h1>Cyber Seeds — Household Snapshot</h1>
  <p class="meta">Created: ${escapeHtml(createdAt)} • Saved locally (not uploaded)</p>

  <div class="box">
    <p><strong>Strongest lenses:</strong> ${escapeHtml(strongestNames || "—")}</p>
    <p><strong>Focus opportunities:</strong> ${escapeHtml(weakestNames || "—")}</p>
    <p class="small">This is a household signal (directional), not a diagnosis.</p>
  </div>

  <table>
    <thead><tr><th>Lens</th><th>Signal</th><th>Strength</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p class="small" style="margin-top:18px;">Cyber Seeds: calm clarity for domestic digital safety.</p>
  <script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
    if (!w) return toast("Popup blocked. Use browser print instead.");
    w.document.open();
    w.document.write(htmlDoc);
    w.document.close();
  });

  /* ---------- Helpers for resources ---------- */
  function lensMapFromSnapshot(snapshot) {
    const map = {};
    (snapshot.lensResults || []).forEach(l => { map[l.id] = l; });
    // Ensure all exist
    LENSES.forEach(l => {
      if (!map[l.id]) map[l.id] = { id: l.id, name: l.name, pct: 0, label: "Unknown" };
    });
    return map;
  }

  function renderResourcesHub(root, snapshot) {
    if (!snapshot) {
      root.innerHTML = `
        <div class="hub-block">
          <h3>No snapshot found (on this device)</h3>
          <p>Run a snapshot on this device/browser to generate your personalised hub.</p>
          <a class="btn primary" href="index.html?snapshot=1">Run snapshot</a>
        </div>
      `;
      return;
    }

    const byId = lensMapFromSnapshot(snapshot);
    const weakest = snapshot.weakest || [];
    const strongest = snapshot.strongest || [];

    const createdAt = new Date(snapshot.createdAt).toLocaleString();

    const summary = `
      <div class="hub-block">
        <h3>Your latest snapshot</h3>
        <p class="muted">Created: ${escapeHtml(createdAt)} • Saved locally in this browser</p>
        <ul class="hub-list">
          <li><strong>Strongest:</strong> ${escapeHtml(strongest.map(id => byId[id]?.name || id).join(" and ") || "—")}</li>
          <li><strong>Focus:</strong> ${escapeHtml(weakest.map(id => byId[id]?.name || id).join(" and ") || "—")}</li>
        </ul>
      </div>
    `;

    const focusBlocks = weakest.map(id => buildLensResourceBlock(id, byId[id])).join("");
    const strengthBlocks = strongest.map(id => buildLensStrengthBlock(id, byId[id])).join("");

    root.innerHTML = summary + focusBlocks + `
      <div class="hub-block">
        <h3>Keep what’s working</h3>
        <p class="muted">These lenses look strongest — maintain them so they don’t drift.</p>
        ${strengthBlocks || "<p class='muted'>No strongest lenses recorded.</p>"}
      </div>
    `;
  }

  function buildLensResourceBlock(lensId, lensResult) {
    const title = lensResult?.name || lensId;
    const pct = lensResult?.pct ?? 0;
    const label = lensResult?.label || "Focus";

    const items = resourcesForLens(lensId);
    return `
      <div class="hub-block">
        <h3>Focus lens: ${escapeHtml(title)}</h3>
        <p class="muted">Signal: <strong>${escapeHtml(label)}</strong> (${pct}%). Start with the first 2 actions — they’re designed to be doable.</p>
        <ul class="hub-list">
          ${items.map(i => `<li><strong>${escapeHtml(i.title)}:</strong> ${escapeHtml(i.copy)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function buildLensStrengthBlock(lensId, lensResult) {
    const title = lensResult?.name || lensId;
    const pct = lensResult?.pct ?? 0;
    const keep = maintenanceForLens(lensId);
    return `
      <div style="margin-top:10px;">
        <p><strong>${escapeHtml(title)}</strong> (${pct}%)</p>
        <ul class="hub-list">
          ${keep.map(i => `<li>${escapeHtml(i)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  function resourcesForLens(lensId) {
    switch (lensId) {
      case "network":
        return [
          { title: "Change Wi-Fi password", copy: "Make it long, unique, and not a household name/number pattern." },
          { title: "Enable guest Wi-Fi", copy: "Put visitors and (optionally) smart devices on a separate network." },
          { title: "Router admin basics", copy: "Update router firmware and ensure admin login isn’t default." },
        ];
      case "device":
        return [
          { title: "Turn on automatic updates", copy: "Phones/laptops: enable auto updates for OS and core apps." },
          { title: "Add screen locks", copy: "Use PIN/biometric. Remove shared passcodes where possible." },
          { title: "Backups", copy: "Confirm one simple backup route (cloud or external) for key devices." },
        ];
      case "privacy":
        return [
          { title: "Fix password reuse", copy: "Start with email + banking + Apple/Google accounts. Make them unique." },
          { title: "Use 2-step verification", copy: "Add 2FA for your most important accounts first." },
          { title: "Review what’s public", copy: "Check social profiles and data sharing toggles in settings." },
        ];
      case "scams":
        return [
          { title: "Pause on urgency", copy: "New household rule: never act on urgent messages without verifying." },
          { title: "Verify independently", copy: "Use official apps/sites — don’t click links in texts/emails." },
          { title: "Talk about near-misses", copy: "A 2-minute family check-in reduces repeat incidents." },
        ];
      case "child":
        return [
          { title: "One clear agreement", copy: "Pick one rule that reduces conflict: e.g., no devices in bedrooms after a time." },
          { title: "Private-by-default", copy: "Lock down contact settings and keep profiles private." },
          { title: "Calm reporting pathway", copy: "Make sure your child knows: tell you → block → report → done." },
        ];
      default:
        return [
          { title: "Start small", copy: "Pick one change you can do today and repeat it weekly." },
        ];
    }
  }

  function maintenanceForLens(lensId) {
    switch (lensId) {
      case "network": return ["Review router updates quarterly.", "Keep guest Wi-Fi consistent for visitors."];
      case "device": return ["Leave auto-updates enabled.", "Do a quick monthly storage/backup check."];
      case "privacy": return ["Keep passwords unique for key accounts.", "Review privacy settings every few months."];
      case "scams": return ["Keep the ‘pause + verify’ habit alive.", "Use official apps for deliveries and banking."];
      case "child": return ["Keep check-ins calm and short.", "Update settings as apps change."];
      default: return ["Maintain what’s working."];
    }
  }

  function buildResourcesPack(snapshot) {
    const byId = lensMapFromSnapshot(snapshot);
    const createdAt = new Date(snapshot.createdAt).toLocaleString();
    const weakest = snapshot.weakest || [];
    const strongest = snapshot.strongest || [];

    const focusLines = weakest.flatMap(id => {
      const title = byId[id]?.name || id;
      const items = resourcesForLens(id).slice(0, 2);
      return [
        `• Focus lens: ${title}`,
        ...items.map(i => `  - ${i.title}: ${i.copy}`)
      ];
    });

    const keepLines = strongest.map(id => {
      const title = byId[id]?.name || id;
      return `• Maintain: ${title} (${byId[id]?.pct ?? 0}%)`;
    });

    return [
      "CYBER SEEDS — HOUSEHOLD NEXT STEPS PACK",
      `Created: ${createdAt}`,
      "",
      "Focus first (doable steps):",
      ...focusLines,
      "",
      "Keep what’s working:",
      ...keepLines,
      "",
      "Note: This is a household signal (directional), not a diagnosis.",
    ].join("\n");
  }

  // Initial render (intro)
  render();

})();
