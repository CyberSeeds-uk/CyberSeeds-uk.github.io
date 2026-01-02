(function () {
  const form = document.getElementById("snapshotForm");
  const results = document.getElementById("results");

  const scoreOut = document.getElementById("scoreOut");
  const barFill = document.getElementById("barFill");

  const lensNetwork = document.getElementById("lensNetwork");
  const lensDevices = document.getElementById("lensDevices");
  const lensPrivacy = document.getElementById("lensPrivacy");
  const lensScams = document.getElementById("lensScams");
  const lensWellbeing = document.getElementById("lensWellbeing");

  const lensNetworkText = document.getElementById("lensNetworkText");
  const lensDevicesText = document.getElementById("lensDevicesText");
  const lensPrivacyText = document.getElementById("lensPrivacyText");
  const lensScamsText = document.getElementById("lensScamsText");
  const lensWellbeingText = document.getElementById("lensWellbeingText");

  const snapshotNarrative = document.getElementById("snapshotNarrative");
  const nextSteps = document.getElementById("nextSteps");

  const resetBtn = document.getElementById("resetBtn");
  const copyBtn = document.getElementById("copyBtn");
  const printBtn = document.getElementById("printBtn");

  // ---- Scoring maps (0..1)
  // 1 = strong signal, 0 = weak signal. "unsure" sits in the middle by design.
  const mapYesNoUnsure = { yes: 1, no: 0, unsure: 0.5 };
  const mapSome = { yes: 1, some: 0.6, no: 0, unsure: 0.5 };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function getVal(id) {
    const el = document.getElementById(id);
    return (el && el.value) ? el.value : "";
  }

  function lensToPct(x01) {
    return Math.round(clamp(x01, 0, 1) * 100);
  }

  function band(score) {
    if (score >= 80) return { name: "STRONG", desc: "Your household is resilient. Focus on maintaining habits and tightening one or two small areas." };
    if (score >= 55) return { name: "GROWING", desc: "You have a workable base. A few targeted changes will noticeably reduce stress and risk." };
    return { name: "FRAGILE", desc: "You’re not failing — you’re overloaded. Start with one stabilising action and build from there." };
  }

  function pickLensFocus(lenses) {
    // lenses = {network: pct, devices: pct, privacy: pct, scams: pct, wellbeing: pct}
    let minKey = "network";
    let minVal = lenses.network;
    for (const k of Object.keys(lenses)) {
      if (lenses[k] < minVal) {
        minVal = lenses[k];
        minKey = k;
      }
    }
    return minKey;
  }

  function lensText(key, pct, context) {
    // context: { kids, scamsFreq, overshare, boundaries, etc. }
    if (pct >= 80) {
      switch (key) {
        case "network": return "Your network foundation looks stable. This is the ‘root system’ of your home ecosystem — keep it maintained.";
        case "devices": return "Your devices are broadly in a strong posture. This tends to prevent most “sudden” incidents.";
        case "privacy": return "Your privacy signals look healthy. That usually reduces identity-based stress and account takeovers.";
        case "scams": return "Your scam resilience looks strong. That’s a quiet superpower for households.";
        case "wellbeing": return "Your wellbeing signals are stable. That often means less conflict and fewer late-night emergencies.";
      }
    }

    if (pct >= 55) {
      switch (key) {
        case "network": return "The network foundation is workable, but a few small changes could reduce risk sharply (guest Wi-Fi + router admin hygiene).";
        case "devices": return "Device hygiene is decent. Improving updates + locks + backups usually delivers the biggest return.";
        case "privacy": return "Privacy is partially protected. A password manager + 2-step on key accounts is usually the fastest upgrade.";
        case "scams": return "Scam pressure is present. A simple household rule for links/payments can drop risk quickly.";
        case "wellbeing": return "Wellbeing is mixed. Small boundary shifts (especially bedtime/charging locations) can calm the whole ecosystem.";
      }
    }

    // fragile
    switch (key) {
      case "network": return "The network layer looks vulnerable. Start with router admin + Wi-Fi changes — it’s the fastest stabiliser.";
      case "devices": return "Device hygiene needs a stabilising pass. Updates + locks + backups will reduce the ‘sudden disaster’ factor.";
      case "privacy": return "Privacy is under-protected. Password reuse + missing 2-step is a common household stress multiplier.";
      case "scams": return "Scam pressure looks high. You don’t need fear — you need one household rule you can trust.";
      case "wellbeing": return "Wellbeing signals suggest friction. It’s not about control — it’s about calm structure that reduces arguments.";
    }
  }

  function buildNextSteps(lenses, raw) {
    // raw includes answer values for targeted steps
    // Always output 3 steps, ordered by highest leverage and lowest friction.
    const steps = [];

    // Step candidates (scoped)
    const needsGuest = raw.guest_wifi !== "yes";
    const needsRouterAdmin = raw.router_admin !== "yes";
    const needsWifiPw = raw.wifi_pw !== "yes";
    const needsPwManager = raw.pw_manager !== "yes";
    const needs2FA = raw.twofa !== "yes";
    const scamsHigh = raw.scams === "yes";
    const moneyRuleWeak = (raw.money_rules === "no" || raw.money_rules === "some");
    const boundariesWeak = (raw.boundaries === "no" || raw.boundaries === "some");
    const updatesWeak = (raw.updates_devices === "no" || raw.updates_devices === "some");
    const backupsWeak = (raw.backups === "no" || raw.backups === "some");

    // High-leverage network stabiliser
    if (needsRouterAdmin || needsWifiPw) {
      steps.push("Secure the router layer: change the router admin password and ensure the Wi-Fi password is unique. This is a foundation move — it stabilises everything above it.");
    }

    if (needsGuest) {
      steps.push("Create a guest Wi-Fi and put visitors + smart devices on it. This separates ‘external’ devices from the core household network with minimal effort.");
    }

    // Account safety
    if (needsPwManager || needs2FA) {
      steps.push("Strengthen account access: use a password manager and turn on 2-step for email, banking, and any ‘recovery’ accounts. This reduces takeover risk dramatically.");
    }

    // Scam rule
    if (scamsHigh || moneyRuleWeak) {
      steps.push("Adopt one household money rule: never pay or enter details from a link. If it’s about money, open the official app/site yourself.");
    }

    // Devices
    if (updatesWeak || backupsWeak) {
      steps.push("Tighten device hygiene: turn on automatic updates and make sure photos/files are backed up. This prevents avoidable losses when something breaks.");
    }

    // Wellbeing
    if (raw.kids !== "none" && boundariesWeak) {
      steps.push("Reduce conflict with a calm boundary: devices charge outside bedrooms, and bedtime is ‘screen-quiet’ by default. It’s structure, not punishment.");
    }

    // Ensure exactly 3 (pick best based on lowest lens + relevance)
    const focus = pickLensFocus(lenses);

    // Prioritise by focus
    const ordered = [];
    const addIf = (s) => { if (s && !ordered.includes(s)) ordered.push(s); };

    if (focus === "network") {
      steps.forEach(addIf);
    } else if (focus === "privacy") {
      // Bring account step earlier if present
      steps.filter(s => s.includes("password manager") || s.includes("2-step")).forEach(addIf);
      steps.forEach(addIf);
    } else if (focus === "scams") {
      steps.filter(s => s.includes("money rule")).forEach(addIf);
      steps.forEach(addIf);
    } else if (focus === "devices") {
      steps.filter(s => s.includes("device hygiene")).forEach(addIf);
      steps.forEach(addIf);
    } else if (focus === "wellbeing") {
      steps.filter(s => s.includes("charge outside bedrooms")).forEach(addIf);
      steps.forEach(addIf);
    }

    // Fallback if fewer than 3
    while (ordered.length < 3) {
      ordered.push("Pick one small action you can complete today. The goal is stability first — perfection later.");
      break;
    }

    return ordered.slice(0, 3);
  }

  function narrative(score, lenses, raw) {
    const b = band(score);
    const focus = pickLensFocus(lenses);

    const focusName = ({
      network: "Network foundation",
      devices: "Device hygiene",
      privacy: "Privacy & accounts",
      scams: "Scam resilience",
      wellbeing: "Digital wellbeing",
    })[focus];

    const kidsLine = raw.kids === "none"
      ? "Because there are no children using devices at home, your wellbeing focus is mostly about stress reduction and simplicity."
      : "Because children use devices at home, small boundary choices tend to have an outsized impact on the whole household climate.";

    return `${b.desc} Your current “first focus” is **${focusName}** — not because everything else is bad, but because improving it will lift the whole system. ${kidsLine}`;
  }

  function compute() {
    const raw = {
      hh_size: getVal("hh_size"),
      kids: getVal("kids"),
      router_admin: getVal("router_admin"),
      wifi_pw: getVal("wifi_pw"),
      guest_wifi: getVal("guest_wifi"),
      updates_router: getVal("updates_router"),
      updates_devices: getVal("updates_devices"),
      screenlock: getVal("screenlock"),
      backups: getVal("backups"),
      pw_manager: getVal("pw_manager"),
      twofa: getVal("twofa"),
      sharing: getVal("sharing"),
      scams: getVal("scams"),
      money_rules: getVal("money_rules"),
      boundaries: getVal("boundaries"),
      supervision: getVal("supervision"),
    };

    // LENS: Network
    const network01 =
      (mapYesNoUnsure[raw.router_admin] +
        mapYesNoUnsure[raw.wifi_pw] +
        mapYesNoUnsure[raw.guest_wifi] +
        mapYesNoUnsure[raw.updates_router]) / 4;

    // LENS: Devices
    const devices01 =
      (mapSome[raw.updates_devices] +
        mapSome[raw.screenlock] +
        mapSome[raw.backups]) / 3;

    // LENS: Privacy
    // Oversharing is inverse: "yes" is weaker signal
    const sharing01 = raw.sharing === "no" ? 1 : raw.sharing === "some" ? 0.6 : raw.sharing === "yes" ? 0.25 : 0.5;
    const privacy01 =
      (mapYesNoUnsure[raw.pw_manager] +
        mapSome[raw.twofa] +
        sharing01) / 3;

    // LENS: Scams
    const scamsPressure01 = raw.scams === "no" ? 1 : raw.scams === "some" ? 0.6 : raw.scams === "yes" ? 0.25 : 0.5;
    const moneyRule01 = raw.money_rules === "yes" ? 1 : raw.money_rules === "some" ? 0.6 : raw.money_rules === "no" ? 0.2 : 0.5;
    const scams01 = (scamsPressure01 + moneyRule01) / 2;

    // LENS: Wellbeing (kids weighted if present)
    const boundaries01 = raw.boundaries === "yes" ? 1 : raw.boundaries === "some" ? 0.6 : raw.boundaries === "no" ? 0.25 : 0.5;
    const supervision01 = raw.supervision === "yes" ? 1 : raw.supervision === "some" ? 0.6 : raw.supervision === "no" ? 0.25 : 0.5;

    const kidsWeight = (raw.kids === "none") ? 0.6 : 1.0; // if no kids, wellbeing still matters but less weight
    const wellbeing01 = clamp(((boundaries01 + supervision01) / 2) * kidsWeight + (1 - kidsWeight) * 0.75, 0, 1);

    // Lenses to pct
    const lenses = {
      network: lensToPct(network01),
      devices: lensToPct(devices01),
      privacy: lensToPct(privacy01),
      scams: lensToPct(scams01),
      wellbeing: lensToPct(wellbeing01),
    };

    // Total score — weighted for household reality:
    // Network and Privacy are often the biggest “silent risk multipliers”
    const total01 =
      network01 * 0.25 +
      devices01 * 0.20 +
      privacy01 * 0.25 +
      scams01 * 0.15 +
      wellbeing01 * 0.15;

    const score = Math.round(total01 * 100);

    return { score, lenses, raw };
  }

  function render({ score, lenses, raw }) {
    results.classList.remove("hidden");

    scoreOut.textContent = score.toString();
    barFill.style.width = `${clamp(score, 0, 100)}%`;

    lensNetwork.textContent = `${lenses.network}`;
    lensDevices.textContent = `${lenses.devices}`;
    lensPrivacy.textContent = `${lenses.privacy}`;
    lensScams.textContent = `${lenses.scams}`;
    lensWellbeing.textContent = `${lenses.wellbeing}`;

    lensNetworkText.textContent = lensText("network", lenses.network, raw);
    lensDevicesText.textContent = lensText("devices", lenses.devices, raw);
    lensPrivacyText.textContent = lensText("privacy", lenses.privacy, raw);
    lensScamsText.textContent = lensText("scams", lenses.scams, raw);
    lensWellbeingText.textContent = lensText("wellbeing", lenses.wellbeing, raw);

    snapshotNarrative.innerHTML = narrative(score, lenses, raw)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const steps = buildNextSteps(lenses, raw);
    nextSteps.innerHTML = "";
    steps.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      nextSteps.appendChild(li);
    });

    // Store last snapshot locally for convenience
    const payload = { score, lenses, raw, ts: Date.now() };
    localStorage.setItem("cyberseeds_snapshot", JSON.stringify(payload));

    // Scroll to results
    document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function snapshotText({ score, lenses }) {
    const focus = pickLensFocus(lenses);
    const focusName = ({
      network: "Network foundation",
      devices: "Device hygiene",
      privacy: "Privacy & accounts",
      scams: "Scam resilience",
      wellbeing: "Digital wellbeing",
    })[focus];

    return [
      `Cyber Seeds — Household Snapshot`,
      `Score: ${score}/100`,
      `Lens scores: Network ${lenses.network}, Devices ${lenses.devices}, Privacy ${lenses.privacy}, Scams ${lenses.scams}, Wellbeing ${lenses.wellbeing}`,
      `First focus: ${focusName}`,
      `Note: This is a calm indicator, not a judgement.`,
    ].join("\n");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { score, lenses, raw } = compute();

    // Defensive: ensure required answered
    if (!raw.hh_size || !raw.kids) return;

    render({ score, lenses, raw });
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    results.classList.add("hidden");
    barFill.style.width = "0%";
    scoreOut.textContent = "—";
  });

  copyBtn.addEventListener("click", () => {
    const stored = localStorage.getItem("cyberseeds_snapshot");
    if (!stored) return;

    const data = JSON.parse(stored);
    const text = snapshotText(data);

    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy snapshot summary"), 1200);
    }).catch(() => {
      alert("Could not copy. You can still print/save as PDF.");
    });
  });

  printBtn.addEventListener("click", () => {
    window.print();
  });

  // Optional: auto-load last snapshot (nice UX)
  try {
    const stored = localStorage.getItem("cyberseeds_snapshot");
    if (stored) {
      const data = JSON.parse(stored);
      // Only auto-render if it’s recent-ish (7 days)
      if (Date.now() - data.ts < 7 * 24 * 60 * 60 * 1000) {
        render(data);
      }
    }
  } catch (_) {}
})();
