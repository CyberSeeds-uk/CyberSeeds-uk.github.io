/* ==========================================================================
   Cyber Seeds — Household Snapshot Engine
   Calm signal, not judgement. Local-only. Trauma-aware by design.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     CONFIG — set these once
     ------------------------------------------------------------------------ */
  const CONFIG = {
    PAYMENT_URL: "#", // e.g. https://buy.stripe.com/xxxx
    BOOKING_URL: "#", // e.g. https://calendly.com/xxx/household-audit
    CONTACT_EMAIL: "hello@cyberseeds.co.uk",
    STORAGE_KEY: "cyberseeds_snapshot_v1"
  };

  /* ------------------------------------------------------------------------
     DOM HELPERS
     ------------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ------------------------------------------------------------------------
     CORE ELEMENTS
     ------------------------------------------------------------------------ */
  const form = $("#snapshotForm");
  const steps = $$(".fieldset[data-step]");
  const result = $("#result");
  const resultTitle = $("#resultTitle");
  const resultSub = $("#resultSub");
  const lensGrid = $("#lensGrid");
  const seedList = $("#seedList");

  const progressFill = $("#progressFill");
  const progressMeta = $("#progressMeta");

  const startSnapshot = $("#startSnapshot");
  const learnHow = $("#learnHow");

  const childrenStep = $("#childrenStep");
  const finalSubmitFallback = $("#finalSubmitFallback");

  const note = $("#householdNote");
  const noteCount = $("#noteCount");

  const downloadBtn = $("#downloadSnapshot");
  const copyBtn = $("#copySnapshot");
  const resetBtn = $("#resetAll");

  /* Booking modal */
  const bookModal = $("#bookModal");
  const payLink = $("#payLink");
  const bookLink = $("#bookLink");
  const emailOptional = $("#emailOptional");
  const messageTemplate = $("#messageTemplate");
  const mailtoLink = $("#mailtoLink");

  /* Open booking buttons */
  const openBookTop = $("#openBookTop");
  const openBookAudit = $("#openBookAudit");
  const openBookResult = $("#openBookResult");

  /* Practitioner overlay (hidden) */
  const practitionerOverlay = $("#practitionerOverlay");
  const practitionerBody = $("#practitionerBody");
  const closePractitioner = $("#closePractitioner");
  const practitionerHint = $("#practitionerHint");

  /* ------------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------------ */
  let currentStep = 0;

  /* ------------------------------------------------------------------------
     LENSES & QUESTION MODEL
     Each question is scored 0–2 internally.
     Higher = more resilient signal (never shown numerically to users).
     ------------------------------------------------------------------------ */
  const LENSES = [
    {
      key: "network",
      name: "Home connection",
      desc: "Wi-Fi boundaries and router confidence",
      items: ["net_router", "net_wifi", "net_guest"]
    },
    {
      key: "devices",
      name: "Device care",
      desc: "Updates, locks, loss readiness",
      items: ["dev_updates", "dev_locks", "dev_lost"]
    },
    {
      key: "privacy",
      name: "Exposure & privacy",
      desc: "Passwords, 2-step protection, old accounts",
      items: ["priv_pw", "priv_2fa", "priv_old"]
    },
    {
      key: "scams",
      name: "Scam pressure",
      desc: "Pause habits and emotional resilience",
      items: ["scam_recent", "scam_pause", "scam_verify"]
    },
    {
      key: "children",
      name: "Children’s wellbeing",
      desc: "Tellable household and calm boundaries",
      items: ["kid_tell", "kid_bounds", "kid_apps"],
      conditional: true
    }
  ];

  /* ------------------------------------------------------------------------
     INITIALISATION
     ------------------------------------------------------------------------ */
  function init() {
    restoreProgress();
    determineChildrenVisibility();
    showStep(0);
    wireEvents();
    updateProgress();
  }

  /* ------------------------------------------------------------------------
     STEP NAVIGATION
     ------------------------------------------------------------------------ */
  function showStep(index) {
    const visibleSteps = getVisibleSteps();
    currentStep = Math.max(0, Math.min(index, visibleSteps.length - 1));

    visibleSteps.forEach(s => s.classList.add("hidden"));
    visibleSteps[currentStep].classList.remove("hidden");

    updateProgress();
  }

  function getVisibleSteps() {
    return steps.filter(s => !s.classList.contains("hidden"));
  }

  function validateStep(step) {
    const fs = getVisibleSteps()[step];
    if (!fs) return true;

    const required = $$('input[required][type="radio"]', fs);
    const groups = [...new Set(required.map(r => r.name))];

    for (const g of groups) {
      if (!required.some(r => r.name === g && r.checked)) {
        required.find(r => r.name === g)?.focus();
        return false;
      }
    }
    return true;
  }

  /* ------------------------------------------------------------------------
     PROGRESS BAR
     ------------------------------------------------------------------------ */
  function updateProgress() {
    const visible = getVisibleSteps();
    const radios = visible.flatMap(s => $$('input[type="radio"]', s));
    const groups = [...new Set(radios.map(r => r.name))];

    let answered = 0;
    groups.forEach(g => {
      if (radios.some(r => r.name === g && r.checked)) answered++;
    });

    const pct = groups.length ? Math.round((answered / groups.length) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressMeta.textContent = pct + "%";
  }

  /* ------------------------------------------------------------------------
     DATA ACCESS
     ------------------------------------------------------------------------ */
  function valueOf(name) {
    const el = form.elements[name];
    if (!el) return 0;
    const v = el.value;
    if (!v) return 0;
    return parseInt(v, 10) || 0;
  }

  function snapshotData() {
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => (data[k] = v));
    data._timestamp = new Date().toISOString();
    return data;
  }

  /* ------------------------------------------------------------------------
     SCORING (internal only)
     ------------------------------------------------------------------------ */
  function lensScore(lens) {
    let total = 0;
    let max = 0;
    lens.items.forEach(k => {
      total += valueOf(k);
      max += 2;
    });
    return { key: lens.key, name: lens.name, desc: lens.desc, total, max, pct: max ? total / max : 0 };
  }

  function overallSignal(scores) {
    const sum = scores.reduce((a, s) => a + s.total, 0);
    const max = scores.reduce((a, s) => a + s.max, 0);
    const pct = max ? sum / max : 0;

    if (pct >= 0.78) return { key: "steady", label: "Steady signal", pct };
    if (pct >= 0.56) return { key: "growing", label: "Growing signal", pct };
    return { key: "support", label: "Support signal", pct };
  }

  /* ------------------------------------------------------------------------
     NARRATIVE GENERATION (behavioural, not technical)
     ------------------------------------------------------------------------ */
  function buildNarrative(signal, adults, kids, noteText, weakestLens) {
    const context =
      kids > 0
        ? `This reflects a household with ${adults} adult(s) and ${kids} child(ren).`
        : `This reflects a household with ${adults} adult(s).`;

    const noteLine = noteText
      ? `You noted: “${noteText.trim().slice(0, 140)}”.`
      : "";

    let anchor;
    if (signal.key === "steady") {
      anchor =
        "Your digital environment already contains quiet protections. The priority now is keeping things simple so they hold during stressful weeks.";
    } else if (signal.key === "growing") {
      anchor =
        "Your household has good foundations. A few small default changes would noticeably reduce cognitive load and background risk.";
    } else {
      anchor =
        "Your household may be carrying too much on memory and effort. This isn’t a failure — it’s a system design mismatch. Support can move that burden off you.";
    }

    const focus = weakestLens
      ? `The biggest gains will likely come from improving ${weakestLens.name.toLowerCase()}.`
      : "";

    return [context, noteLine, anchor, focus].filter(Boolean).join(" ");
  }

  /* ------------------------------------------------------------------------
     DIGITAL SEEDS (3 max, always doable)
     ------------------------------------------------------------------------ */
  function buildSeeds(scores, kids) {
    const ordered = [...scores].sort((a, b) => a.pct - b.pct);
    const seeds = [];

    seeds.push(
      "Choose one change only this week. Stability grows from repetition, not overhauls."
    );

    const seedBank = {
      network: "Change your Wi-Fi password to something unique and store it safely.",
      devices: "Turn on automatic updates on the main devices in the home.",
      privacy: "Enable 2-step verification on your primary email account.",
      scams: "Create a household pause rule: no acting on urgent messages for 10 minutes.",
      children:
        "Say this sentence aloud: ‘You won’t be in trouble for telling me about anything online.’"
    };

    ordered.forEach(s => {
      if (seeds.length >= 3) return;
      if (s.key === "children" && kids === 0) return;
      if (seedBank[s.key]) seeds.push(seedBank[s.key]);
    });

    return seeds.slice(0, 3);
  }

  /* ------------------------------------------------------------------------
     RENDER RESULTS
     ------------------------------------------------------------------------ */
  function renderResults() {
    const adults = valueOf("adults") || "multiple";
    const kids = valueOf("children") || 0;
    const noteText = note.value || "";

    const scores = LENSES
      .filter(l => !(l.conditional && kids === 0))
      .map(lensScore);

    const signal = overallSignal(scores);
    const weakest = [...scores].sort((a, b) => a.pct - b.pct)[0];

    resultTitle.textContent = signal.label;
    resultSub.textContent = buildNarrative(signal, adults, kids, noteText, weakest);

    /* Lens cards */
    lensGrid.innerHTML = "";
    scores.forEach(s => {
      const card = document.createElement("div");
      card.className = "lens";
      card.innerHTML = `
        <h4>${s.name}</h4>
        <div class="meter">
          <div class="meter-bar"><div class="meter-fill" style="width:${Math.max(
            12,
            Math.round(s.pct * 100)
          )}%"></div></div>
          <div class="meter-label">${
            s.pct >= 0.78 ? "steady" : s.pct >= 0.56 ? "growing" : "support"
          }</div>
        </div>
        <div class="micro">${s.desc}</div>
      `;
      lensGrid.appendChild(card);
    });

    /* Seeds */
    seedList.innerHTML = "";
    buildSeeds(scores, kids).forEach(seed => {
      const li = document.createElement("li");
      li.textContent = seed;
      seedList.appendChild(li);
    });

    /* Practitioner overlay (structured notes) */
    practitionerBody.textContent = JSON.stringify(
      { signal, scores, raw: snapshotData() },
      null,
      2
    );

    result.classList.remove("hidden");
    result.scrollIntoView({ behavior: "smooth" });
  }

  /* ------------------------------------------------------------------------
     STORAGE
     ------------------------------------------------------------------------ */
  function saveProgress() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(snapshotData()));
  }

  function restoreProgress() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.keys(data).forEach(k => {
        const el = form.elements[k];
        if (!el) return;
        if (el instanceof RadioNodeList) {
          $$(`input[name="${k}"]`).forEach(r => (r.checked = r.value === data[k]));
        } else {
          el.value = data[k];
        }
      });
    } catch (_) {}
  }

  /* ------------------------------------------------------------------------
     VISIBILITY LOGIC
     ------------------------------------------------------------------------ */
  function determineChildrenVisibility() {
    const kids = valueOf("children");
    if (kids > 0) {
      childrenStep.classList.remove("hidden");
      finalSubmitFallback.classList.add("hidden");
    } else {
      childrenStep.classList.add("hidden");
      finalSubmitFallback.classList.remove("hidden");
    }
  }

  /* ------------------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------------------ */
  function wireEvents() {
    /* Start */
    startSnapshot?.addEventListener("click", () =>
      document.getElementById("snapshot").scrollIntoView({ behavior: "smooth" })
    );

    /* Learn */
    learnHow?.addEventListener("click", () =>
      document.getElementById("seed").scrollIntoView({ behavior: "smooth" })
    );

    /* Next / Back */
    $$("[data-next]").forEach(btn =>
      btn.addEventListener("click", () => {
        if (!validateStep(currentStep)) return;
        showStep(currentStep + 1);
        saveProgress();
      })
    );
    $$("[data-back]").forEach(btn =>
      btn.addEventListener("click", () => showStep(currentStep - 1))
    );

    /* Form submit */
    form.addEventListener("submit", e => {
      e.preventDefault();
      renderResults();
      saveProgress();
    });

    /* Note counter */
    note?.addEventListener("input", () => {
      noteCount.textContent = `${note.value.length} / 160`;
    });

    /* Booking modal */
    [openBookTop, openBookAudit, openBookResult].forEach(b =>
      b?.addEventListener("click", () => openBooking())
    );

    $$("[data-close]").forEach(b =>
      b.addEventListener("click", () => closeBooking())
    );

    /* Download / copy */
    downloadBtn?.addEventListener("click", () => downloadText());
    copyBtn?.addEventListener("click", () =>
      navigator.clipboard.writeText(result.innerText)
    );
    resetBtn?.addEventListener("click", () => {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      location.reload();
    });

    /* Practitioner access (intentional friction) */
    practitionerHint?.addEventListener("click", () =>
      practitionerOverlay.classList.remove("hidden")
    );
    closePractitioner?.addEventListener("click", () =>
      practitionerOverlay.classList.add("hidden")
    );
  }

  /* ------------------------------------------------------------------------
     BOOKING
     ------------------------------------------------------------------------ */
  function openBooking() {
    payLink.href = CONFIG.PAYMENT_URL;
    bookLink.href = CONFIG.BOOKING_URL;

    const email = emailOptional?.value || "";
    const msg =
      "Hello Cyber Seeds,\n\nI’ve completed the household snapshot and would like to book the £75 audit.\n\nHousehold context:\n– Adults: " +
      (valueOf("adults") || "") +
      "\n– Children: " +
      (valueOf("children") || "") +
      "\n\nThank you.";

    messageTemplate.value = msg;
    mailtoLink.href = `mailto:${CONFIG.CONTACT_EMAIL}?subject=Cyber%20Seeds%20Audit&body=${encodeURIComponent(
      msg
    )}`;

    bookModal.classList.remove("hidden");
  }

  function closeBooking() {
    bookModal.classList.add("hidden");
  }

  /* ------------------------------------------------------------------------
     DOWNLOAD
     ------------------------------------------------------------------------ */
  function downloadText() {
    const blob = new Blob([result.innerText], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cyber-seeds-household-snapshot.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ------------------------------------------------------------------------
     GO
     ------------------------------------------------------------------------ */
  init();
})();
