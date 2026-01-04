/* Cyber Seeds Snapshot — local-only, trauma-aware, clarity-first
   - Progressive 3-step builder
   - Participatory device map
   - Five lens signal (provisional)
   - 3 strengths + 3 gentle actions
   - No tracking, no network access, no external libs
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Theme toggle (persisted)
  const themeKey = "cs_theme";
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  $("#toggleTheme")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(themeKey, next);
  });

  // Modal
  const modal = $("#modal");
  const openModal = () => {
    modal?.classList.add("show");
    modal?.setAttribute("aria-hidden", "false");
  };
  const closeModal = () => {
    modal?.classList.remove("show");
    modal?.setAttribute("aria-hidden", "true");
  };
  $("#viewExample")?.addEventListener("click", openModal);
  $("[data-close]")?.addEventListener("click", closeModal);
  $$("[data-close]", modal || document).forEach((el) => el.addEventListener("click", closeModal));
  $(".modalOverlay", modal || document)?.addEventListener("click", closeModal);

  // Scroll helpers
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#startSnapshot")?.addEventListener("click", () => scrollToId("snapshot"));
  $("#startSnapshot2")?.addEventListener("click", () => scrollToId("snapshot"));
  $("#backToSnap1")?.addEventListener("click", () => scrollToId("snapshot"));
  $("#goPlans")?.addEventListener("click", () => scrollToId("plans"));

  // Fake purchase actions (wire to Stripe / Gumroad later)
  $("#buyPack")?.addEventListener("click", () => {
    alert("Wire this button to your checkout (Stripe / Gumroad / Shopify). The snapshot already delivered value.");
  });
  $("#buyReview")?.addEventListener("click", () => {
    alert("Wire this button to a simple intake + payment + scheduling form (or email capture).");
  });

  // Snapshot state
  const form = $("#snapForm");
  const progressLabel = $("#progressLabel");
  const progressFill = $("#progressFill");
  const stateBadge = $("#stateBadge");
  const focusLine = $("#focusLine");
  const lensGrid = $("#lensGrid");
  const strengthsList = $("#strengthsList");
  const actionsList = $("#actionsList");
  const mapPre = $("#mapPre");

  const deviceList = $("#deviceList");
  const addDeviceBtn = $("#addDeviceBtn");

  const storageKey = "cs_snapshot_v1";

  let devices = []; // {type, owner}

  // Stepper
  let currentStep = 1;
  const maxStep = 3;

  function setStep(n) {
    currentStep = Math.min(Math.max(n, 1), maxStep);
    $$(".step").forEach((s) => s.classList.remove("active"));
    $(`.step[data-step="${currentStep}"]`)?.classList.add("active");

    if (progressLabel) progressLabel.textContent = `Step ${currentStep} of ${maxStep}`;
    if (progressFill) progressFill.style.width = `${Math.round((currentStep / maxStep) * 100)}%`;
  }

  $$("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // validate step fields before moving forward
      if (!validateStep(currentStep)) return;
      setStep(currentStep + 1);
    });
  });

  $$("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => setStep(currentStep - 1));
  });

  function validateStep(step) {
    // only validate inputs inside active step
    const active = $(`.step[data-step="${step}"]`);
    if (!active) return true;

    const requiredInputs = $$("select[required], input[required]", active);

    // Special case: if step 1, ensure at least 1 device row added (participatory mapping)
    if (step === 1) {
      const hasBasics = requiredInputs.every((i) => {
        if (i.tagName === "SELECT") return !!i.value;
        if (i.type === "radio") return true; // handled by group requirement in browser
        return true;
      });

      if (!hasBasics) {
        active.scrollIntoView({ behavior: "smooth", block: "start" });
        return false;
      }

      if (devices.length === 0) {
        // calm nudge, not shame
        alert("Add at least one device you recognise. It helps the snapshot fit your household.");
        return false;
      }
      return true;
    }

    // For radio groups, browser required isn't always enough in custom flows:
    const radios = $$('input[type="radio"][required]', active);
    const radioNames = [...new Set(radios.map((r) => r.name))];
    for (const name of radioNames) {
      const checked = $(`input[name="${name}"]:checked`, active);
      if (!checked) {
        alert("Please choose an option — “unsure” is fine if it’s offered.");
        return false;
      }
    }

    // Required selects/checkboxes
    for (const el of requiredInputs) {
      if (el.type === "checkbox" && !el.checked) {
        alert("Please confirm the local-only snapshot acknowledgement.");
        return false;
      }
      if (el.tagName === "SELECT" && !el.value) {
        alert("Please select an option to continue.");
        return false;
      }
    }

    return true;
  }

  // Device builder
  function addDeviceRow(prefill = null) {
    const row = document.createElement("div");
    row.className = "deviceRow";

    const deviceType = document.createElement("select");
    deviceType.innerHTML = `
      <option value="" disabled ${prefill?.type ? "" : "selected"}>Device type…</option>
      <option value="phone" ${prefill?.type === "phone" ? "selected" : ""}>Phone</option>
      <option value="laptop" ${prefill?.type === "laptop" ? "selected" : ""}>Laptop</option>
      <option value="tablet" ${prefill?.type === "tablet" ? "selected" : ""}>Tablet</option>
      <option value="tv" ${prefill?.type === "tv" ? "selected" : ""}>Smart TV</option>
      <option value="console" ${prefill?.type === "console" ? "selected" : ""}>Console</option>
      <option value="iot" ${prefill?.type === "iot" ? "selected" : ""}>Smart device (IoT)</option>
      <option value="camera" ${prefill?.type === "camera" ? "selected" : ""}>Camera / doorbell</option>
      <option value="speaker" ${prefill?.type === "speaker" ? "selected" : ""}>Smart speaker</option>
      <option value="other" ${prefill?.type === "other" ? "selected" : ""}>Other</option>
    `;

    const owner = document.createElement("input");
    owner.type = "text";
    owner.placeholder = "Label (e.g., adult, child, shared)";
    owner.value = prefill?.owner || "";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "removeBtn";
    remove.textContent = "Remove";

    row.appendChild(deviceType);
    row.appendChild(owner);
    row.appendChild(remove);

    deviceList.appendChild(row);

    function syncDevicesFromUI() {
      devices = $$(".deviceRow", deviceList).map((r) => {
        const [t, o] = r.querySelectorAll("select, input");
        return {
          type: (t.value || "").trim(),
          owner: (o.value || "").trim()
        };
      }).filter(d => d.type);
      renderMap();
      saveLocalDraft();
    }

    deviceType.addEventListener("change", syncDevicesFromUI);
    owner.addEventListener("input", syncDevicesFromUI);
    remove.addEventListener("click", () => {
      row.remove();
      syncDevicesFromUI();
    });

    // initial sync
    syncDevicesFromUI();
  }

  addDeviceBtn?.addEventListener("click", () => addDeviceRow());

  function renderMap() {
    if (!mapPre) return;

    if (!devices.length) {
      mapPre.textContent = "[ Add devices to build your map ]";
      return;
    }

    const groups = {
      phone: "Phone",
      laptop: "Laptop",
      tablet: "Tablet",
      tv: "Smart TV",
      console: "Console",
      iot: "Smart device",
      camera: "Camera",
      speaker: "Speaker",
      other: "Other"
    };

    const lines = [];
    lines.push("[Router]");
    const list = devices.map((d) => {
      const label = groups[d.type] || "Device";
      const owner = d.owner ? ` (${d.owner})` : "";
      return `  ├─ ${label}${owner}`;
    });

    // make last branch pretty
    if (list.length > 0) {
      const last = list[list.length - 1].replace("  ├─", "  └─");
      list[list.length - 1] = last;
    }

    lines.push(...list);
    mapPre.textContent = lines.join("\n");
  }

  // Signal computation (provisional)
  function computeSignal(data) {
    // Base lens scores
    let network = 50;
    let devicesScore = 50;
    let privacy = 50;
    let scam = 50;
    let wellbeing = 50;

    // Household shape modifiers (kept gentle — avoid punishment for size)
    const deviceCount = data.deviceCount; // low/mid/high/veryhigh
    if (deviceCount === "high") { network -= 4; devicesScore -= 4; privacy -= 3; }
    if (deviceCount === "veryhigh") { network -= 7; devicesScore -= 6; privacy -= 5; }

    const iotCount = devices.filter(d => d.type === "iot" || d.type === "camera" || d.type === "speaker").length;
    if (iotCount >= 3) { network -= 4; privacy -= 3; }
    if (iotCount >= 6) { network -= 6; privacy -= 5; }

    // Step 2 questions
    // routerPass yes/no
    if (data.routerPass === "yes") network += 14;
    else network -= 10;

    if (data.guestWifi === "yes") network += 10;
    else network -= 6;

    if (data.updates === "yes") devicesScore += 14;
    else if (data.updates === "some") devicesScore += 6;
    else devicesScore -= 10;

    if (data.pwManager === "yes") { devicesScore += 8; privacy += 6; }
    else { devicesScore -= 6; privacy -= 5; }

    if (data.mfa === "yes") { privacy += 14; scam += 6; }
    else if (data.mfa === "some") { privacy += 8; scam += 3; }
    else { privacy -= 10; scam -= 4; }

    if (data.rhythm === "yes") wellbeing += 14;
    else if (data.rhythm === "some") wellbeing += 6;
    else wellbeing -= 8;

    if (data.scamPause === "yes") scam += 14;
    else if (data.scamPause === "some") scam += 6;
    else scam -= 10;

    // Priority (Step 3) shapes what we emphasise in wording
    const priority = data.priority;

    // Clamp
    const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
    network = clamp(network);
    devicesScore = clamp(devicesScore);
    privacy = clamp(privacy);
    scam = clamp(scam);
    wellbeing = clamp(wellbeing);

    // Determine overall state (calm language)
    const avg = Math.round((network + devicesScore + privacy + scam + wellbeing) / 5);
    let state;
    if (avg >= 76) state = "STEADY";
    else if (avg >= 56) state = "GROWING";
    else state = "FRAGILE (UNVERIFIED)";

    // Focus = lowest lens or chosen priority if tied
    const lens = [
      { key: "network", name: "Wi-Fi & Network", icon: "📶", value: network },
      { key: "devices", name: "Device Hygiene", icon: "📱", value: devicesScore },
      { key: "privacy", name: "Privacy & Exposure", icon: "🕵️", value: privacy },
      { key: "scam", name: "Scams & Behaviour", icon: "🎭", value: scam },
      { key: "wellbeing", name: "Child Wellbeing", icon: "🌙", value: wellbeing },
    ];

    lens.sort((a, b) => a.value - b.value);
    const weakest = lens[0];

    // Priority-driven focus phrasing
    let focusText = `Focus: ${weakest.name} — this is a visibility gap, not a verdict.`;
    if (priority === "clarity") focusText = `Focus: Clarity — we’ll translate your household into a simple map and three actions.`;
    if (priority === "privacy") focusText = `Focus: Privacy edges — reduce exposure without going extreme.`;
    if (priority === "kids") focusText = `Focus: Children’s rhythm — protective boundaries without conflict.`;

    // Strengths (top 3 lenses) with behaviour-aware praise (no judgement)
    const top = [...lens].sort((a, b) => b.value - a.value).slice(0, 3);
    const strengths = top.map((l) => {
      if (l.key === "network") return "Your network foundation is forming — the home’s ‘heart’ is becoming easier to protect.";
      if (l.key === "devices") return "Device hygiene is building: updates and maintenance reduce surprise problems.";
      if (l.key === "privacy") return "Your privacy edges are stronger than most — less leakage, more control.";
      if (l.key === "scam") return "Your scam instincts are present: pausing breaks the attacker’s timeline.";
      return "Your household rhythm is emerging — steadier boundaries reduce stress and risk together.";
    });

    // Actions: 3 gentle seeds (based on weakest + key missing controls)
    const actions = [];

    // Action generator: only recommend what fits their answers
    if (data.routerPass !== "yes") actions.push("Change the router admin password (10 minutes). This protects the household ‘heart’.");
    if (data.guestWifi !== "yes") actions.push("Create a guest Wi-Fi for visitors / smart devices. Separating reduces blast-radius.");
    if (data.mfa === "no") actions.push("Turn on two-step verification for key accounts (email, banking, app stores).");
    if (data.pwManager !== "yes") actions.push("Start a password manager (or unique passwords) — one change that reduces long-term stress.");
    if (data.updates === "no") actions.push("Enable automatic updates on the devices you rely on most.");
    if (data.scamPause === "no") actions.push("Adopt the ‘Pause → Verify’ rule for urgent messages (bank, delivery, prizes).");
    if (data.rhythm === "no") actions.push("Choose one small household boundary: a bedtime charge-point or a ‘screens down’ routine.");

    // Always keep to 3 and ensure they’re gentle + doable
    const picked = unique(actions).slice(0, 3);

    // If still not enough (rare), fill with calm defaults
    while (picked.length < 3) {
      picked.push("Do a 10-minute ‘edge tidy’: check social profile visibility + app permissions on one device.");
      if (picked.length >= 3) break;
      picked.push("Name your Wi-Fi clearly and write down your router model for future clarity.");
    }

    // Compose lens back to display order
    const lensDisplay = [
      { key: "network", name: "Wi-Fi & Network", icon: "📶", value: network },
      { key: "devices", name: "Device Hygiene", icon: "📱", value: devicesScore },
      { key: "privacy", name: "Privacy & Exposure", icon: "🕵️", value: privacy },
      { key: "scam", name: "Scams & Behaviour", icon: "🎭", value: scam },
      { key: "wellbeing", name: "Child Wellbeing", icon: "🌙", value: wellbeing },
    ];

    return { state, avg, focusText, lens: lensDisplay, strengths, actions: picked };
  }

  function unique(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const k = (x || "").trim();
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  function renderSignal(sig) {
    if (!sig) return;

    if (stateBadge) stateBadge.textContent = sig.state;
    if (focusLine) focusLine.textContent = sig.focusText;

    if (lensGrid) {
      lensGrid.innerHTML = "";
      sig.lens.forEach((l) => {
        const row = document.createElement("div");
        row.className = "lensRow";
        row.innerHTML = `
          <div class="lensName">${l.icon} ${l.name}</div>
          <div class="lensValue">${labelFromValue(l.value)}</div>
          <div class="lensMeter"><span class="lensFill" style="width:${l.value}%"></span></div>
        `;
        lensGrid.appendChild(row);
      });
    }

    if (strengthsList) {
      strengthsList.innerHTML = "";
      sig.strengths.slice(0, 3).forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        strengthsList.appendChild(li);
      });
    }

    if (actionsList) {
      actionsList.innerHTML = "";
      sig.actions.slice(0, 3).forEach((a) => {
        const li = document.createElement("li");
        li.textContent = a;
        actionsList.appendChild(li);
      });
    }
  }

  function labelFromValue(v) {
    if (v >= 80) return "Strong";
    if (v >= 65) return "Steady";
    if (v >= 50) return "Developing";
    return "Needs clarity";
  }

  function readFormData() {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    return obj;
  }

  // Persist and restore draft
  function saveLocalDraft() {
    if (!form) return;
    const data = readFormData();
    const payload = {
      data,
      devices,
      ts: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function restoreLocalDraft() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      if (!payload?.data) return;

      // restore selects & radios
      for (const [k, v] of Object.entries(payload.data)) {
        const el = form.elements[k];
        if (!el) continue;

        if (el instanceof RadioNodeList) {
          // Radio group
          const target = form.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]`);
          if (target) target.checked = true;
        } else if (el.tagName === "SELECT") {
          el.value = v;
        } else if (el.type === "checkbox") {
          el.checked = (v === true || v === "true");
        } else {
          el.value = v;
        }
      }

      // restore devices
      devices = Array.isArray(payload.devices) ? payload.devices : [];
      if (deviceList) deviceList.innerHTML = "";
      devices.forEach((d) => addDeviceRow(d));
      if (!devices.length) {
        // start with one row to invite participation
        addDeviceRow();
      }

      renderMap();

      // If form is complete enough, render signal
      const data = readFormData();
      if (data.priority) {
        const sig = computeSignal(data);
        renderSignal(sig);
      }
    } catch {
      // ignore
    }
  }

  // Save on changes
  if (form) {
    form.addEventListener("change", saveLocalDraft);
    form.addEventListener("input", saveLocalDraft);
  }

  // Submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate step 3 (and by extension 1-2 as user progressed)
    if (!validateStep(3)) return;

    const data = readFormData();
    const sig = computeSignal(data);
    renderSignal(sig);

    // Calm feedback
    scrollToId("snapshot");
    setTimeout(() => {
      // gently draw attention to results without alarm
      stateBadge?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);

    saveLocalDraft();
  });

  // Reset + Export
  $("#resetAll")?.addEventListener("click", () => {
    const ok = confirm("Reset local snapshot data on this device?");
    if (!ok) return;

    localStorage.removeItem(storageKey);
    if (deviceList) deviceList.innerHTML = "";
    devices = [];
    addDeviceRow();
    form?.reset();

    // reset UI
    setStep(1);
    if (stateBadge) stateBadge.textContent = "Waiting";
    if (focusLine) focusLine.textContent = "Complete the builder to see what your home is leaning towards.";
    if (lensGrid) lensGrid.innerHTML = "";
    if (strengthsList) strengthsList.innerHTML = "<li>We’ll surface what your household is already doing well.</li>";
    if (actionsList) actionsList.innerHTML = "<li>Finish the snapshot builder to generate your actions.</li>";
    renderMap();
  });

  $("#exportJson")?.addEventListener("click", () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      alert("No local snapshot found yet. Complete the builder first.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cyberseeds_snapshot_local.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Boot
  setStep(1);
  restoreLocalDraft();

  // If no devices in draft, start with one row for the IKEA effect
  if (!devices.length) addDeviceRow();

})();
