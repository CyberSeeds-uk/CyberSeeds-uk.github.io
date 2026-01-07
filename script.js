/* Cyber Seeds — Household Snapshot (local-only)
   - Calm signal, not judgement
   - Progressive steps
   - Tailored narrative + 3 digital seeds
   - Hidden practitioner overlay
*/

(function () {
  // ====== Configure these once for your site ======
  // Put your real payment and booking links here.
  // Examples:
  // PAYMENT_URL: "https://buy.stripe.com/xxxxxx"
  // BOOKING_URL: "https://calendly.com/yourlink/household-audit"
  const CONFIG = {
    PAYMENT_URL: "#",
    BOOKING_URL: "#",
    CONTACT_EMAIL: "hello@cyberseeds.co.uk"
  };

  // ====== DOM ======
  const form = document.getElementById("snapshotForm");
  const resultSection = document.getElementById("result");
  const resultTitle = document.getElementById("resultTitle");
  const resultSub = document.getElementById("resultSub");
  const lensGrid = document.getElementById("lensGrid");
  const seedList = document.getElementById("seedList");
  const seedBox = document.getElementById("seedBox");

  const progressFill = document.getElementById("progressFill");
  const progressMeta = document.getElementById("progressMeta");
  const progressBar = document.querySelector(".progress-bar");

  const startSnapshotBtn = document.getElementById("startSnapshot");
  const learnHowBtn = document.getElementById("learnHow");

  const childrenStep = document.getElementById("childrenStep");
  const finalSubmitFallback = document.getElementById("finalSubmitFallback");

  const note = document.getElementById("householdNote");
  const noteCount = document.getElementById("noteCount");

  const downloadBtn = document.getElementById("downloadSnapshot");
  const copyBtn = document.getElementById("copySnapshot");
  const resetBtn = document.getElementById("resetAll");

  // Booking modal
  const bookModal = document.getElementById("bookModal");
  const payLink = document.getElementById("payLink");
  const bookLink = document.getElementById("bookLink");
  const emailOptional = document.getElementById("emailOptional");
  const messageTemplate = document.getElementById("messageTemplate");
  const mailtoLink = document.getElementById("mailtoLink");
  const copyMessageBtn = document.getElementById("copyMessage");

  // Buttons that open booking
  const openBookTop = document.getElementById("openBookTop");
  const openBookAudit = document.getElementById("openBookAudit");
  const openBookResult = document.getElementById("openBookResult");

  // Nav / scroll helpers
  const clearLocal = document.getElementById("clearLocal");

  // Practitioner overlay (secret)
  const practitionerOverlay = document.getElementById("practitionerOverlay");
  const practitionerBody = document.getElementById("practitionerBody");
  const closePractitioner = document.getElementById("closePractitioner");
  const copyPractitioner = document.getElementById("copyPractitioner");
  const exportJson = document.getElementById("exportJson");
  const practitionerHint = document.getElementById("practitionerHint");

  // ====== Steps ======
  const steps = Array.from(document.querySelectorAll(".fieldset[data-step]"));
  let stepIndex = 0;

  // ====== Question model ======
  // Scoring: 0-2 per question. Higher = more resilient signal.
  const lenses = [
    {
      key: "network",
      name: "Home connection",
      desc: "Wi-Fi, router boundaries, and quiet protections.",
      items: ["net_router", "net_wifi", "net_guest"]
    },
    {
      key: "devices",
      name: "Device care",
      desc: "Updates, locks, and readiness for loss/theft.",
      items: ["dev_updates", "dev_locks", "dev_lost"]
    },
    {
      key: "privacy",
      name: "Exposure & privacy",
      desc: "Account hygiene, 2-step protection, old account control.",
      items: ["priv_pw", "priv_2fa", "priv_old"]
    },
    {
      key: "scams",
      name: "Scam pressure",
      desc: "Pause habits, verification, and emotional resilience.",
      items: ["scam_recent", "scam_pause", "scam_verify"],
      invert: ["scam_recent"]
    },
    {
      key: "children",
      name: "Children’s wellbeing",
      desc: "Tellable household, calm boundaries, app confidence.",
      items: ["kid_tell", "kid_bounds", "kid_apps"],
      conditional: true
    }
  ];

  const STORAGE_KEY = "cyberseeds_snapshot_v1";

  // ====== Helpers ======
  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function smoothScrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function safeText(s) {
    return (s || "").toString().replace(/[<>]/g, "");
  }

  function setProgress(pct) {
    const v = clamp(Math.round(pct), 0, 100);
    if (progressFill) progressFill.style.width = `${v}%`;
    if (progressMeta) progressMeta.textContent = `${v}%`;
    if (progressBar) progressBar.setAttribute("aria-valuenow", String(v));
  }

  function getVisibleSteps() {
    return steps.filter(fs => !fs.classList.contains("hidden"));
  }

  function countAnsweredVisibleRadios() {
    const visibleSteps = getVisibleSteps();
    const visibleRadios = visibleSteps.flatMap(fs => $all('input[type="radio"]', fs));
    const groups = new Set(visibleRadios.map(r => r.name));
    let answered = 0;

    groups.forEach(name => {
      const checked = visibleRadios.some(r => r.name === name && r.checked);
      if (checked) answered++;
    });

    return { answered, total: groups.size };
  }

  function updateProgress() {
    const { answered, total } = countAnsweredVisibleRadios();
    const base = total ? (answered / total) * 100 : 0;
    setProgress(base);
  }

  function showStep(index) {
    const visibleSteps = getVisibleSteps();
    const clampedIndex = clamp(index, 0, visibleSteps.length - 1);

    visibleSteps.forEach(fs => fs.classList.add("hidden"));
    visibleSteps[clampedIndex].classList.remove("hidden");

    stepIndex = clampedIndex;
    updateProgress();
  }

  function validateStep(index) {
    const visibleSteps = getVisibleSteps();
    const fs = visibleSteps[index];
    if (!fs) return true;

    const requiredRadios = $all('input[type="radio"][required]', fs);
    const requiredGroups = new Set(requiredRadios.map(r => r.name));

    for (const name of requiredGroups) {
      const checked = requiredRadios.some(r => r.name === name && r.checked);
      if (!checked) {
        const first = requiredRadios.find(r => r.name === name);
        if (first) first.focus();
        return false;
      }
    }
    return true;
  }

  function serializeForm() {
    const data = {};
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) data[k] = v;
    data._ts = new Date().toISOString();
    return data;
  }

  function saveLocal() {
    try {
      const data = serializeForm();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function restoreLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      Object.keys(data).forEach((k) => {
        const val = data[k];
        const el = form.elements[k];
        if (!el) return;

        if (el instanceof RadioNodeList) {
          const radios = $all(`input[type="radio"][name="${CSS.escape(k)}"]`, form);
          radios.forEach(r => { if (r.value === String(val)) r.checked = true; });
        } else if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
          el.value = val;
        }
      });
    } catch (_) {}
  }

  function clearLocalProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function getIntValue(name) {
    const el = form.elements[name];
    if (!el) return 0;
    if (el instanceof RadioNodeList) {
      const v = el.value;
      if (!v) return 0;
      if (String(v).includes("+")) return parseInt(v, 10) || 4;
      return parseInt(v, 10) || 0;
    }
    return parseInt(el.value, 10) || 0;
  }

  function determineChildrenVisibility() {
    const kids = getIntValue("children");
    const hasKids = kids > 0;

    if (!childrenStep || !finalSubmitFallback) return;

    if (hasKids) {
      childrenStep.classList.remove("hidden");
      finalSubmitFallback.classList.add("hidden");
    } else {
      childrenStep.classList.add("hidden");
      finalSubmitFallback.classList.remove("hidden");
    }
  }

  // ====== Scoring ======
  function lensScore(lens) {
    let total = 0;
    let max = 0;
    for (const key of lens.items) {
      const v = getIntValue(key);
      total += v;
      max += 2;
    }
    const pct = max ? (total / max) : 0;
    return { total, max, pct };
  }

  function overallSignal(scores) {
    let sum = 0;
    let max = 0;
    for (const s of scores) {
      sum += s.total;
      max += s.max;
    }
    const pct = max ? (sum / max) : 0;

    if (pct >= 0.78) return { key: "steady", label: "Steady signal", pct };
    if (pct >= 0.56) return { key: "growing", label: "Growing signal", pct };
    return { key: "needs_support", label: "Support signal", pct };
  }

  function lensLabel(pct) {
    if (pct >= 0.78) return "steady";
    if (pct >= 0.56) return "growing";
    return "support";
  }

  function lensExplain(key, label, hasKids) {
    const map = {
      network: {
        steady: "Your home connection has helpful boundaries. It’s doing quiet protective work in the background.",
        growing: "Some protections are in place, but the household would benefit from clearer Wi-Fi boundaries and router confidence.",
        support: "Boundaries may not be clear yet. That’s common — and fixable with a few gentle defaults."
      },
      devices: {
        steady: "Device care looks stable — updates and locks are doing protective work without needing constant attention.",
        growing: "Device care is partly stable. A few defaults could reduce stress and prevent avoidable account takeovers.",
        support: "Devices may be relying on memory and effort. We can move that burden onto simple settings that protect you automatically."
      },
      privacy: {
        steady: "Exposure looks controlled. Key accounts have protective barriers and fewer ‘loose ends’.",
        growing: "Some exposure may come from old accounts or inconsistent protection. This is normal and can be reduced gently.",
        support: "Exposure may feel ‘leaky’. That’s a system issue, not a personal failure — and it’s repairable."
      },
      scams: {
        steady: "Your household has strong pause habits, which reduces the power of urgency and manipulation.",
        growing: "You have protective instincts, but a clearer pause rule would reduce emotional pressure in risky moments.",
        support: "Scam pressure may land hard because there isn’t yet a simple ‘pause and verify’ routine. We can build one quickly."
      },
      children: {
        steady: "Children’s digital life looks supported: they can talk, boundaries feel calmer, and adults feel more oriented.",
        growing: "There’s stability, but boundaries or confidence may fluctuate — especially during busy or stressful periods.",
        support: "This area may need extra support: clearer boundaries and a stronger ‘tellable’ culture can reduce harm and anxiety."
      }
    };

    const pack = map[key];
    if (!pack) return "";
    if (key === "children" && !hasKids) return "";
    return pack[label] || pack.support;
  }

  // ====== Narrative + Seeds ======
  function tailoredSubtitle(signalKey, adults, kids, noteText, scores) {
    const note = (noteText || "").trim();
    const hasKids = kids > 0;

    const householdLine = hasKids
      ? `This snapshot reflects a household with ${adults || "adult(s)"} and ${kids} child(ren).`
      : `This snapshot reflects a household with ${adults || "adult(s)"} and no children in the home.`;

    const noteLine = note ? `You also noted: “${safeText(note)}”.` : "";

    const anchor =
      signalKey === "steady"
        ? "Your system already contains quiet protections. The focus is keeping it effortless, so it holds during stressful weeks."
        : signalKey === "growing"
          ? "Your system has foundations. A few small defaults would reduce cognitive load and increase stability."
          : "Your system may be carrying too much on memory and effort. That’s not a failure — it’s a design mismatch. We can move the burden onto simple protections.";

    const weakest = scores.slice().sort((a, b) => a.pct - b.pct)[0];
    const weakestLine = weakest ? `Your strongest gains will likely come from: ${weakest.name.toLowerCase()}.` : "";

    return [householdLine, noteLine, anchor, weakestLine].filter(Boolean).join(" ");
  }

  function buildSeeds(scores, kids) {
    const hasKids = kids > 0;
    const sorted = scores.slice().sort((a, b) => a.pct - b.pct);

    const low1 = sorted[0]?.key;
    const low2 = sorted[1]?.key;

    const bank = {
      network: [
        "Change the Wi-Fi password to something unique, and keep it somewhere safe (password manager or a simple household admin card).",
        "If your router supports it, create a guest network for visitors and smart devices. Think: separate rooms, not one shared space.",
        "Take a photo of your router model and write one sentence: “How do I log in?” Naming it is the first calm step."
      ],
      devices: [
        "Turn on automatic updates on the main devices. This removes risk without adding effort.",
        "Set one simple lock standard: phones use FaceID/PIN that isn’t shared widely. Shared devices can have their own household PIN.",
        "Do a 3-minute ‘lost phone plan’: confirm you can locate/lock a phone from Apple/Google settings."
      ],
      privacy: [
        "Enable 2-step verification on your main email account today. It’s one of the highest-impact seeds.",
        "Replace one reused password with a unique one. One account at a time is how systems become stable.",
        "Make a small list of old accounts you remember. You’re not failing — you’re mapping. Control begins with naming."
      ],
      scams: [
        "Create a household pause rule: ‘We don’t act on money, passwords, or links within 10 minutes.’ Put it in writing somewhere visible.",
        "Save one official phone number (bank/school/delivery) so verification is easy under pressure.",
        "Practise one sentence for urgent messages: ‘I’m going to verify this independently.’ That sentence is a safety feature."
      ],
      children: [
        "Create a ‘tellable’ phrase: ‘You won’t be in trouble for telling me.’ Repeat it calmly, even when you feel worried.",
        "Choose one predictable boundary (e.g., no phones in bedrooms at night, or one tech-free meal). Predictability beats punishment.",
        "Ask one weekly curiosity question: ‘What’s the best and worst part of being online this week?’ It maps their ecology without interrogation."
      ]
    };

    const chosen = [];
    chosen.push("Pick one change only. A stable household system grows through small repeats, not big overhauls.");

    if (low1 && bank[low1]) chosen.push(bank[low1][0]);
    if (low2 && bank[low2]) chosen.push(bank[low2][1] || bank[low2][0]);

    if (hasKids && low1 !== "children" && low2 !== "children") {
      chosen.push(bank.children[0]);
    } else if (!hasKids) {
      if (low1 !== "scams" && low2 !== "scams") chosen.push(bank.scams[0]);
    }

    return chosen.slice(0, 3);
  }

  function buildLensCards(scores, kids) {
    const hasKids = kids > 0;
    if (!lensGrid) return;
    lensGrid.innerHTML = "";

    scores.forEach(s => {
      if (s.key === "children" && !hasKids) return;

      const label = lensLabel(s.pct);
      const pct = Math.round(s.pct * 100);

      const card = document.createElement("div");
      card.className = "lens";

      const title = document.createElement("h4");
      title.textContent = s.name;

      const meter = document.createElement("div");
      meter.className = "meter";

      const meterBar = document.createElement("div");
      meterBar.className = "meter-bar";

      const meterFill = document.createElement("div");
      meterFill.className = "meter-fill";
      meterFill.style.width = `${clamp(pct, 8, 100)}%`;

      meterBar.appendChild(meterFill);

      const meterLabel = document.createElement("div");
      meterLabel.className = "meter-label";
      const signalWord = label === "steady" ? "steady" : (label === "growing" ? "growing" : "support");
      meterLabel.textContent = `signal: ${signalWord}`;

      const expl = document.createElement("div");
      expl.className = "micro";
      expl.textContent = lensExplain(s.key, label, hasKids);

      const small = document.createElement("div");
      small.className = "micro";
      small.style.marginTop = "8px";
      small.textContent = s.desc;

      meter.appendChild(meterBar);
      meter.appendChild(meterLabel);

      card.appendChild(title);
      card.appendChild(meter);
      card.appendChild(expl);
      card.appendChild(small);

      lensGrid.appendChild(card);
    });
  }

  function renderSeeds(seeds) {
    if (!seedList) return;
    seedList.innerHTML = "";
    seeds.forEach((txt, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${txt}`;
      seedList.appendChild(li);
    });
    if (seedBox) seedBox.classList.remove("hidden");
  }

  // ====== Snapshot export package ======
  function snapshotTextPackage(payload) {
    const lines = [];
    lines.push("CYBER SEEDS — HOUSEHOLD DIGITAL SNAPSHOT");
    lines.push("A calm signal of resilience — not judgement.");
    lines.push("Runs locally. Nothing is sent from your browser.");
    lines.push("");

    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push(`Adults: ${payload.adults || "—"}   Children: ${payload.kids || "—"}`);
    if (payload.note) lines.push(`Household note: ${payload.note}`);
    lines.push("");

    lines.push(`Overall signal: ${payload.signalLabel}`);
    lines.push(payload.subtitle);
    lines.push("");

    lines.push("LENS SIGNALS");
    payload.scores.forEach(s => {
      if (s.key === "children" && !payload.hasKids) return;
      const label = lensLabel(s.pct);
      const word = label === "steady" ? "steady" : (label === "growing" ? "growing" : "support");
      lines.push(`- ${s.name}: ${word}`);
    });
    lines.push("");

    lines.push("YOUR NEXT 3 DIGITAL SEEDS");
    payload.seeds.forEach((seed, i) => {
      lines.push(`${i + 1}. ${seed}`);
    });

    lines.push("");
    lines.push("NEXT STEP (OPTIONAL)");
    lines.push("If you’d like the full £75 household audit, Cyber Seeds will map your home across the five lenses and give you a calm action plan.");
    lines.push(`Payment: ${CONFIG.PAYMENT_URL}`);
    lines.push(`Booking: ${CONFIG.BOOKING_URL}`);
    lines.push(`Contact: ${CONFIG.CONTACT_EMAIL}`);

    return lines.join("\n");
  }

  // ====== Modal / booking ======
  function openBookingModal(snapshotText) {
    if (!bookModal) return;

    if (payLink) payLink.href = CONFIG.PAYMENT_URL || "#";
    if (bookLink) bookLink.href = CONFIG.BOOKING_URL || "#";

    const email = (emailOptional && emailOptional.value || "").trim();
    const subject = "Cyber Seeds — £75 Household Audit Request";
    const body = buildEmailTemplate(snapshotText, email);

    if (messageTemplate) messageTemplate.value = body;

    if (mailtoLink) {
      const mailto = `mailto:${encodeURIComponent(CONFIG.CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      mailtoLink.href = mailto;
    }

    bookModal.classList.add("open");
    bookModal.setAttribute("aria-hidden", "false");
  }

  function closeBookingModal() {
    if (!bookModal) return;
    bookModal.classList.remove("open");
    bookModal.setAttribute("aria-hidden", "true");
  }

  function buildEmailTemplate(snapshotText, email) {
    const intro = [
      "Hello Cyber Seeds,",
      "",
      "I’d like to book the £75 Household Audit.",
      email ? `Preferred contact email: ${email}` : "Preferred contact email: (add if you’d like)",
      "",
      "Here is my local snapshot summary (copied from the site):",
      "",
      snapshotText,
      "",
      "Thank you,",
      "(Your name)"
    ];
    return intro.join("\n");
  }

  // ====== Practitioner overlay ======
  function practitionerText(payload) {
    const lines = [];
    lines.push("CYBER SEEDS — PRACTITIONER OVERLAY (LOCAL)");
    lines.push("Do not show client. Internal notes for practitioner orientation.");
    lines.push("");

    lines.push(`Signal: ${payload.signalKey} (${Math.round(payload.signalPct * 100)}%)`);
    lines.push(`Adults: ${payload.adults} | Children: ${payload.kids} | HasKids: ${payload.hasKids}`);
    if (payload.note) lines.push(`Household note: ${payload.note}`);
    lines.push("");

    lines.push("Lens breakdown (pct):");
    payload.scores.forEach(s => {
      if (s.key === "children" && !payload.hasKids) return;
      lines.push(`- ${s.key}: ${(s.pct * 100).toFixed(0)}%`);
    });

    lines.push("");
    lines.push("Suggested practitioner entry angle:");
    if (payload.signalKey === "steady") {
      lines.push("- Reinforce existing strengths; focus on sustainability under stress and preventing drift.");
    } else if (payload.signalKey === "growing") {
      lines.push("- Identify 1–2 defaults; reduce cognitive load; normalise gaps as system design mismatch.");
    } else {
      lines.push("- Start with emotional safety and ‘tellable’ household; then quick wins (router/email/2FA/pause rule).");
    }

    lines.push("");
    lines.push("Seed recommendations chosen:");
    payload.seeds.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

    return lines.join("\n");
  }

  function openPractitioner(payload) {
    if (!practitionerOverlay) return;
    practitionerOverlay.classList.add("open");
    practitionerOverlay.setAttribute("aria-hidden", "false");
    if (practitionerBody) practitionerBody.textContent = practitionerText(payload);
  }

  function closePractitionerOverlay() {
    if (!practitionerOverlay) return;
    practitionerOverlay.classList.remove("open");
    practitionerOverlay.setAttribute("aria-hidden", "true");
  }

  function copyTextToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return;
    }
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ====== Core compute & render ======
  let lastPayload = null;
  let lastSnapshotText = "";

  function computePayload() {
    const data = serializeForm();

    const adults = data.adults || data.adult || data.household_adults || data.adults_in_household || data.adultsCount || data.adults_count || data.adults || data.adultCount;
    const kids = getIntValue("children");
    const hasKids = kids > 0;

    // Build scores, excluding children lens if no kids
    const scores = lenses
      .filter(l => !(l.key === "children" && !hasKids))
      .map(l => {
        const score = lensScore(l);
        return { ...score, key: l.key, name: l.name, desc: l.desc };
      });

    const signal = overallSignal(scores);

    const noteText = (note && note.value) ? note.value.trim() : "";
    const subtitle = tailoredSubtitle(signal.key, adults, kids, noteText, scores);
    const seeds = buildSeeds(scores, kids);

    return {
      data,
      adults: adults || "—",
      kids,
      hasKids,
      note: noteText,
      scores,
      signalKey: signal.key,
      signalLabel: signal.label,
      signalPct: signal.pct,
      subtitle,
      seeds
    };
  }

  function renderResult(payload) {
    if (!payload) return;

    if (resultTitle) resultTitle.textContent = payload.signalLabel;
    if (resultSub) resultSub.textContent = payload.subtitle;

    buildLensCards(payload.scores, payload.kids);
    renderSeeds(payload.seeds);

    if (resultSection) resultSection.classList.remove("hidden");
    smoothScrollTo("result");
  }

  // ====== Event wiring ======
  function bindStepButtons() {
    // In each step, assume there are .next-step and .prev-step buttons if present
    steps.forEach(() => { /* no-op; buttons are global */ });

    $all("[data-next]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const visible = getVisibleSteps();
        const idx = visible.findIndex(fs => !fs.classList.contains("hidden"));
        if (!validateStep(idx)) return;
        showStep(idx + 1);
      });
    });

    $all("[data-prev]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const visible = getVisibleSteps();
        const idx = visible.findIndex(fs => !fs.classList.contains("hidden"));
        showStep(idx - 1);
      });
    });
  }

  function bindRadiosAutosave() {
    $all('input[type="radio"]', form).forEach(r => {
      r.addEventListener("change", () => {
        determineChildrenVisibility();
        updateProgress();
        saveLocal();
      });
    });
  }

  function bindNoteCounter() {
    if (!note || !noteCount) return;
    const max = parseInt(note.getAttribute("maxlength") || "240", 10);

    const update = () => {
      const n = (note.value || "").length;
      noteCount.textContent = `${n}/${max}`;
      saveLocal();
    };

    note.addEventListener("input", update);
    update();
  }

  function bindCTAs() {
    if (startSnapshotBtn) {
      startSnapshotBtn.addEventListener("click", () => smoothScrollTo("snapshot"));
    }
    if (learnHowBtn) {
      learnHowBtn.addEventListener("click", () => smoothScrollTo("howItWorks"));
    }

    function openBookFromCTA() {
      if (!lastPayload) {
        // if no payload yet, encourage them to do snapshot
        smoothScrollTo("snapshot");
        return;
      }
      openBookingModal(lastSnapshotText);
    }

    if (openBookTop) openBookTop.addEventListener("click", openBookFromCTA);
    if (openBookAudit) openBookAudit.addEventListener("click", openBookFromCTA);
    if (openBookResult) openBookResult.addEventListener("click", openBookFromCTA);

    // Close modal when clicking backdrop or X
    if (bookModal) {
      bookModal.addEventListener("click", (e) => {
        if (e.target === bookModal) closeBookingModal();
      });
      const closeBtn = $("#closeBookModal");
      if (closeBtn) closeBtn.addEventListener("click", closeBookingModal);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && bookModal.classList.contains("open")) closeBookingModal();
      });
    }

    if (copyMessageBtn) {
      copyMessageBtn.addEventListener("click", () => {
        if (!messageTemplate) return;
        copyTextToClipboard(messageTemplate.value);
        copyMessageBtn.textContent = "Copied";
        setTimeout(() => (copyMessageBtn.textContent = "Copy message"), 1200);
      });
    }
  }

  function bindResultTools() {
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        if (!lastSnapshotText) return;
        copyTextToClipboard(lastSnapshotText);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy snapshot"), 1200);
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        if (!lastSnapshotText) return;
        downloadTextFile("cyberseeds_snapshot.txt", lastSnapshotText);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
        if (note) note.value = "";
        clearLocalProgress();
        determineChildrenVisibility();
        setProgress(0);
        if (resultSection) resultSection.classList.add("hidden");
        showStep(0);
        lastPayload = null;
        lastSnapshotText = "";
      });
    }

    if (clearLocal) {
      clearLocal.addEventListener("click", (e) => {
        e.preventDefault();
        clearLocalProgress();
        clearLocal.textContent = "Cleared";
        setTimeout(() => (clearLocal.textContent = "Clear saved progress"), 1200);
      });
    }
  }

  function bindFormSubmit() {
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // validate all visible steps
      const visible = getVisibleSteps();
      for (let i = 0; i < visible.length; i++) {
        // temporarily show each step for focus? no — just validate current visible & then overall
      }

      // Soft validation: ensure required groups across visible steps are answered
      const requiredRadios = $all('input[type="radio"][required]', form);
      const groups = new Set(requiredRadios.map(r => r.name));
      for (const name of groups) {
        const checked = requiredRadios.some(r => r.name === name && r.checked);
        if (!checked) {
          smoothScrollTo("snapshot");
          return;
        }
      }

      lastPayload = computePayload();
      lastSnapshotText = snapshotTextPackage(lastPayload);
      renderResult(lastPayload);
      saveLocal();
    });
  }

  // ====== Practitioner secret triggers ======
  function bindPractitioner() {
    if (!practitionerOverlay) return;

    // Secret: type SEEDS anywhere
    let buffer = "";
    document.addEventListener("keydown", (e) => {
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        buffer = (buffer + e.key).slice(-5);
        if (buffer.toUpperCase() === "SEEDS") {
          if (lastPayload) openPractitioner(lastPayload);
          buffer = "";
        }
      }

      // Alternative: Ctrl+Shift+P
      if (e.ctrlKey && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        if (lastPayload) openPractitioner(lastPayload);
      }
    });

    if (practitionerHint) {
      practitionerHint.addEventListener("click", () => {
        if (lastPayload) openPractitioner(lastPayload);
      });
    }

    if (closePractitioner) {
      closePractitioner.addEventListener("click", closePractitionerOverlay);
    }

    if (copyPractitioner) {
      copyPractitioner.addEventListener("click", () => {
        if (!practitionerBody) return;
        copyTextToClipboard(practitionerBody.textContent);
        copyPractitioner.textContent = "Copied";
        setTimeout(() => (copyPractitioner.textContent = "Copy"), 1200);
      });
    }

    if (exportJson) {
      exportJson.addEventListener("click", () => {
        if (!lastPayload) return;
        const json = JSON.stringify(lastPayload, null, 2);
        downloadTextFile("cyberseeds_snapshot.json", json);
      });
    }
  }

  // ====== Init ======
  function initConfig() {
    if (payLink) payLink.href = CONFIG.PAYMENT_URL || "#";
    if (bookLink) bookLink.href = CONFIG.BOOKING_URL || "#";
  }

  function init() {
    if (!form) return;

    initConfig();

    restoreLocal();
    determineChildrenVisibility();

    bindStepButtons();
    bindRadiosAutosave();
    bindNoteCounter();
    bindCTAs();
    bindResultTools();
    bindFormSubmit();
    bindPractitioner();

    // Show first step
    showStep(0);

    // If restored data is complete enough, compute preview when user submits — not automatically.
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", init);

})();
