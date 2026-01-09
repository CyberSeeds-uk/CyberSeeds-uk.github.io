(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- Helpers ---------- */
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escapeHtml = (str) =>
    (str || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    t.style.opacity = "1";
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => (t.hidden = true), 150);
    }, 1600);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("Copied.");
        return true;
      } catch {
        toast("Copy failed.");
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function encodeMailto(str) {
    return encodeURIComponent(str).replace(/%0A/g, "%0D%0A");
  }

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }

  function getStoredSnapshot() {
    const raw = localStorage.getItem("cs_snapshot_v1");
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed || !parsed.lensResultsByWeakness) return null;
    return parsed;
  }

  /* ---------- Core model ---------- */
  const LENSES = [
    { id: "network", name: "Network & Wi-Fi" },
    { id: "devices", name: "Device hygiene" },
    { id: "privacy", name: "Privacy & exposure" },
    { id: "scams", name: "Scam & behavioural risk" },
    { id: "children", name: "Children’s wellbeing" }
  ];

  const LENS_CONTEXT = {
    network: "How your home connects — the foundation everything else rests on.",
    devices: "Phones, tablets, laptops, TVs — quietly maintained or quietly drifting.",
    privacy: "What the outside world can see, learn, or infer about your household.",
    scams: "How pressure, urgency, and persuasion are handled in real moments.",
    children: "Sleep, boundaries, safety, and emotional wellbeing in a connected home."
  };

  function labelForPct(pct) {
    if (pct >= 75) return "Stable";
    if (pct >= 45) return "Developing";
    return "Fragile";
  }

  const LENS_LIBRARY = {
    network: {
      purpose: "Secure the digital front door. Your network decides who can ‘touch’ what inside the home.",
      practices: [
        "Use modern Wi-Fi security (WPA2/WPA3) and a strong Wi-Fi password.",
        "Change the router admin password (not the Wi-Fi password) if it’s default/unknown.",
        "Enable a guest network for visitors and one-off devices.",
        "Keep router firmware updated (patches for the home’s core).",
        "Remove unused devices from the router’s connected list."
      ],
      outcomes: [
        "Fewer unknown devices and less surprise behaviour.",
        "Reduced risk of compromise spreading across the home.",
        "Calmer baseline: everything else becomes easier."
      ],
      seeds: {
        Fragile: [
          "Create a guest network and move non-essential devices to it (TVs, speakers, smart plugs).",
          "Change router admin password + confirm WPA2/WPA3 is enabled.",
          "Restart the router after updates so changes apply cleanly."
        ],
        Developing: [
          "Audit the connected device list and remove anything unknown.",
          "Turn off WPS (if enabled) and confirm encryption is WPA2/WPA3.",
          "Consider separating children/IoT if your router supports it."
        ],
        Stable: [
          "Review port-forwarding rules and remove any you don’t recognise.",
          "Add a simple “new device” rule: new devices get named and approved.",
          "Consider family-safe DNS to reduce risky lookups."
        ]
      },
      audit: "In the full audit, we verify router configuration, segmentation options, and household-specific network risks in plain English."
    },

    devices: {
      purpose: "Keep devices predictable and healthy. Most household risk comes from drift, not wrongdoing.",
      practices: [
        "Enable automatic updates on phones, tablets, laptops, and TVs.",
        "Confirm backups (and do one test restore yearly).",
        "Remove old devices still signed into accounts.",
        "Use unique passwords for email/banking (a password manager helps).",
        "Review app permissions — especially location, contacts, camera, microphone."
      ],
      outcomes: [
        "Less compromise, fewer glitches and ‘weird behaviour’.",
        "Faster recovery if something goes wrong.",
        "Reduced stress: devices become tools again, not mysteries."
      ],
      seeds: {
        Fragile: [
          "Turn on automatic updates on the 2 most-used devices in the home.",
          "Check ‘Devices signed in’ for your main email and remove anything old.",
          "Enable backups tonight (photos + accounts)."
        ],
        Developing: [
          "Pick a monthly device check day (updates + backups + sign-ins).",
          "Uninstall unused apps and revoke permissions you don’t need.",
          "Enable 2-step verification for email + banking."
        ],
        Stable: [
          "Run an ‘old device sweep’ and retire/secure anything unused.",
          "Set up passkeys where available (Apple/Google/email).",
          "Create a calm recovery plan: what to lock down first if something happens."
        ]
      },
      audit: "In the full audit, we map devices/accounts, highlight silent weak points, and build a staged plan you can actually maintain."
    },

    privacy: {
      purpose: "Reduce exposure without disappearing. Privacy is about controlling what strangers can infer.",
      practices: [
        "Lock down social profiles (visibility, tagging, follower checks).",
        "Remove routine clues: school logos, location tags, predictable schedules.",
        "Disable ‘always’ location unless needed; review app permissions.",
        "Turn off ad personalisation / unnecessary data sharing in apps.",
        "Use separate emails for banking vs shopping/newsletters."
      ],
      outcomes: [
        "Fewer targeted scams and less harassment risk.",
        "More control over what the household ‘broadcasts’ by accident.",
        "Improved offline safety when online clues reduce."
      ],
      seeds: {
        Fragile: [
          "Set key social accounts to private (or review followers) today.",
          "Turn off location tagging in camera + socials.",
          "Remove 3 posts that reveal routines or locations."
        ],
        Developing: [
          "Do a 10-minute permissions sweep on the top 5 apps used in the home.",
          "Separate emails: one for sensitive accounts, one for shopping.",
          "Turn off ad personalisation where possible."
        ],
        Stable: [
          "Create a “what we don’t post” household line (schools, routines, addresses).",
          "Review children’s app privacy defaults and tighten them.",
          "Set up breach alerts for key emails and rotate passwords if needed."
        ]
      },
      audit: "In the full audit, we assess real-world exposure across profiles, apps, and household habits — then reduce it without shame."
    },

    scams: {
      purpose: "Build an ‘immune system’ against manipulation. Scams win through urgency, not intelligence.",
      practices: [
        "Use one household rule: pause → verify → then act.",
        "Never log in via links in messages; type the site or use the official app.",
        "Enable 2-step verification for email and banking.",
        "Teach children: ‘pressure = stop’ (scams rush you).",
        "Have a calm response plan: if someone clicked, you lock down accounts together."
      ],
      outcomes: [
        "Fewer loss events and fewer compromised accounts.",
        "Less fear. The household knows what to do.",
        "Children learn safety without panic."
      ],
      seeds: {
        Fragile: [
          "Create the pause rule today and put it somewhere visible.",
          "Turn on 2-step verification for your primary email.",
          "Agree: nobody sends money/gift cards based on messages."
        ],
        Developing: [
          "Set verification routes: bank app, official numbers, typed URLs.",
          "Talk through 2 common scams you’ve seen recently (delivery / bank / QR).",
          "Create a ‘second eyes’ habit for urgent messages."
        ],
        Stable: [
          "Add a household ‘safe word’ for money requests (especially teens).",
          "Review password reuse and upgrade key accounts.",
          "Pressure-test calmly: “what would we do if…?” scenarios."
        ]
      },
      audit: "In the full audit, we pressure-test the household against real scam patterns and build habits that survive stress."
    },

    children: {
      purpose: "Support growth without fear. Safety increases when rules are calm, consistent, and repair-focused.",
      practices: [
        "Night-time device docking (charging station outside bedrooms).",
        "Agree what children do if something feels wrong: tell, screenshot, block, come to you.",
        "Use app privacy defaults that minimise contact from strangers.",
        "Co-use sometimes: sit together for 10 minutes and let them show you their world.",
        "Make rules about wellbeing and sleep, not moral judgement."
      ],
      outcomes: [
        "Better sleep and less late-night exposure.",
        "Fewer conflicts; more trust and predictability.",
        "Improved safeguarding posture without surveillance."
      ],
      seeds: {
        Fragile: [
          "Create a charging station tonight and trial it for 7 days.",
          "Agree the ‘if it feels wrong’ plan and practise saying it out loud once.",
          "Turn off unknown contact options where possible in the child’s top apps."
        ],
        Developing: [
          "Add a weekly 10-minute check-in: ‘anything odd this week?’ (no interrogation).",
          "Set clear boundaries for live chats/DMs depending on age.",
          "Make one ‘repair rule’: if something happens, you fix it together."
        ],
        Stable: [
          "Review the highest-risk app together and tighten privacy settings.",
          "Create a calm escalation route: parent → school → safeguarding if needed.",
          "Teach: “private info stays private” using simple examples."
        ]
      },
      audit: "In the full audit, we review wellbeing and safeguarding signals in context, with calm language and practical steps."
    }
  };

  const COPY_TEXTS = {
    pause_script:
      `Household Pause Rule\n\nOur rule:\n“Pause — verify — then act.”\n\nHow we verify:\n• No logins via links\n• Official app or typed website\n• Second eyes for money/passwords\n\nNo shame clause:\nIf someone clicks, we fix it together.\n`,
    night_script:
      `Night Charging Station\n\nReason:\n“We charge devices here so we sleep better and stay safer.”\n\nRoutine:\n• Devices dock at: _______\n• Exceptions discussed calmly\n\nIf something feels wrong:\n• Tell an adult\n• Screenshot if safe\n• Block/report\n• We handle it together\n`,
    update_script:
      `Monthly Update Rhythm\n\nChecklist:\n1) Phones/tablets: OS + apps\n2) Laptops: OS + browser\n3) TVs/Consoles: updates\n4) Router: firmware check\n5) Backups: confirm one device\n6) Privacy sweep: top 5 apps\n7) Sign-in sweep: remove old devices\n\nFinish line:\n“Our home is healthier now.”\n`
  };

  /* ---------- DOM refs ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const intro = $("#snapshotIntro");
  const result = $("#snapshotResult");
  const grid = $("#signalGrid");
  const resultCopy = $("#resultCopy");

  const lensContextBox = $("#snapshotLensContext");
  const lensContextTitle = $("#lensContextTitle");
  const lensContextCopy = $("#lensContextCopy");

  const lensDetail = $("#lensDetail");
  const lensDetailTitle = $("#lensDetailTitle");
  const lensDetailMeta = $("#lensDetailMeta");
  const lensDetailMeaning = $("#lensDetailMeaning");
  const lensDetailPurpose = $("#lensDetailPurpose");
  const lensDetailPractices = $("#lensDetailPractices");
  const lensDetailOutcomes = $("#lensDetailOutcomes");
  const lensDetailActions = $("#lensDetailActions");
  const lensDetailAudit = $("#lensDetailAudit");
  const closeLensDetail = $("#closeLensDetail");
  const backToSignal = $("#backToSignal");
  const copyLensChecklist = $("#copyLensChecklist");

  const attachSnapshotBtn = $("#attachSnapshotBtn");
  const auditRequestForm = $("#auditRequestForm");
  const goToHubBtn = $("#goToHub");

  const hubContent = $("#hubContent");

  const openBtns = [
    "#openSnapshot",
    "#openSnapshotTop",
    "#openSnapshotMobile",
    "#openSnapshotCard",
    "#openSnapshotLenses",
    "#openSnapshotResources"
  ].map(id => $(id)).filter(Boolean);

  const closeBtns = $$("[data-close]");

  /* ---------- Questions ---------- */
  const QUESTIONS = [
    {
      id: "wifi_access",
      lens: "network",
      title: "Who can realistically access your home Wi-Fi?",
      help: "This is about control. The smaller the access circle, the easier it is to keep the home stable.",
      options: [
        ["Only household members", "Access is tightly controlled.", 3],
        ["Household + occasional guests", "Mostly controlled, some spillover.", 2],
        ["Quite a few people have it", "Access is wider than intended.", 1],
        ["Not sure", "Uncertainty usually means it’s time to tidy up.", 0]
      ]
    },
    {
      id: "router_admin",
      lens: "network",
      title: "Do you know (or control) your router admin login?",
      help: "This is different from the Wi-Fi password. Admin access controls security settings and updates.",
      options: [
        ["Yes, and it’s not the default", "You can actually secure the front door.", 3],
        ["Yes, but not sure if default", "Worth checking.", 2],
        ["No / someone else set it up", "Common risk: you can’t change core settings.", 1],
        ["Not sure what this means", "Normal — most homes haven’t been shown this.", 0]
      ]
    },

    {
      id: "device_updates",
      lens: "devices",
      title: "Do devices usually update themselves?",
      help: "Updates close known holes. Most compromises start with old software.",
      options: [
        ["Yes, mostly automatic", "Strong baseline.", 3],
        ["Some do, some don’t", "Mixed baseline.", 2],
        ["Rarely", "Drift risk increases over time.", 1],
        ["Never / not sure", "A good place to start this week.", 0]
      ]
    },
    {
      id: "old_devices",
      lens: "devices",
      title: "Are there old or unused devices still logged into accounts?",
      help: "Forgotten tablets, old phones, or TVs still signed in can silently become the weak point.",
      options: [
        ["No, we clear old devices", "Good hygiene.", 3],
        ["Maybe 1–2 devices", "Worth a sweep.", 2],
        ["Yes, several", "Often creates surprise risk.", 1],
        ["Not sure", "Common — we’ll guide you.", 0]
      ]
    },

    {
      id: "online_visibility",
      lens: "privacy",
      title: "How visible is your household’s daily life online?",
      help: "This is about what strangers can infer: routines, locations, school clues, contact routes.",
      options: [
        ["Very limited", "Lower exposure.", 3],
        ["Some clues", "Manageable with small changes.", 2],
        ["Haven’t checked", "Often more visible than expected.", 1],
        ["Quite visible", "Higher targeting risk.", 0]
      ]
    },
    {
      id: "app_permissions",
      lens: "privacy",
      title: "Have you reviewed app permissions recently?",
      help: "Most exposure is accidental: permissions kept ‘on’ by default.",
      options: [
        ["Yes, within 3 months", "Good control.", 3],
        ["Yes, but not recently", "Worth a refresh.", 2],
        ["No", "Common — easy win.", 1],
        ["Not sure", "Normal — we’ll point to the simplest route.", 0]
      ]
    },

    {
      id: "urgent_messages",
      lens: "scams",
      title: "What happens when a message feels urgent?",
      help: "Scams manufacture urgency. Your habit under pressure is the real shield.",
      options: [
        ["We pause and verify", "Strong immunity.", 3],
        ["Sometimes we pause", "Developing habit.", 2],
        ["We often click/respond", "Higher risk moments.", 1],
        ["We act immediately", "A pause rule will help quickly.", 0]
      ]
    },
    {
      id: "two_factor",
      lens: "scams",
      title: "Do your key accounts use 2-step verification?",
      help: "This blocks most account takeovers even when passwords leak.",
      options: [
        ["Yes, on most key accounts", "Strong protection.", 3],
        ["On some accounts", "Good start.", 2],
        ["No", "High-impact improvement available.", 1],
        ["Not sure", "Common — we’ll guide it.", 0]
      ]
    },

    {
      id: "night_devices",
      lens: "children",
      title: "Where do children’s devices go at night?",
      help: "Night-time is where risks cluster: tiredness, secrecy, contact, mood impacts.",
      options: [
        ["Outside bedrooms", "Strong boundary.", 3],
        ["Depends", "Mixed pattern.", 2],
        ["Usually in bedrooms", "Higher late-night risk.", 1],
        ["Always in bedrooms", "A charging station seed helps fast.", 0]
      ]
    },
    {
      id: "what_if_wrong",
      lens: "children",
      title: "If something feels wrong online, does your child know what to do?",
      help: "Goal: calm script — tell, screenshot if safe, block, come to you.",
      options: [
        ["Yes, we’ve talked it through", "Good clarity.", 3],
        ["Somewhat", "A quick script would help.", 2],
        ["Not really", "Common — easy win.", 1],
        ["Not sure", "Normal — we’ll give you the words.", 0]
      ]
    }
  ];

  /* ---------- Snapshot state ---------- */
  let step = -1;
  const answers = {};
  let lastSnapshot = null;
  let includeSnapshotInEmail = false;

  /* ---------- Modal open/close + focus ---------- */
  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    step = -1;
    Object.keys(answers).forEach(k => delete answers[k]);
    lastSnapshot = null;
    includeSnapshotInEmail = false;
    if (attachSnapshotBtn) attachSnapshotBtn.textContent = "Attach my snapshot summary";

    if (lensDetail) lensDetail.hidden = true;

    render();
    setTimeout(() => nextBtn?.focus(), 50);
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  openBtns.forEach(b => b.addEventListener("click", openModal));
  closeBtns.forEach(b => b.addEventListener("click", closeModal));

  document.addEventListener("keydown", (e) => {
    if (modal.getAttribute("aria-hidden") === "false" && e.key === "Escape") closeModal();
  });

  /* ---------- Render flow ---------- */
  function render() {
    if (!form) return;

    form.innerHTML = "";
    if (lensContextBox) lensContextBox.hidden = true;

    nextBtn.disabled = true;
    backBtn.disabled = step <= 0;

    if (step < 0) {
      if (intro) intro.hidden = false;
      if (result) result.hidden = true;
      nextBtn.textContent = "Start";
      return;
    }

    if (step >= QUESTIONS.length) {
      if (intro) intro.hidden = true;
      showResults();
      return;
    }

    if (intro) intro.hidden = true;
    if (result) result.hidden = true;

    const q = QUESTIONS[step];

    if (lensContextBox) lensContextBox.hidden = false;
    const lensName = LENSES.find(l => l.id === q.lens)?.name || "Lens";
    if (lensContextTitle) lensContextTitle.textContent = lensName;
    if (lensContextCopy) lensContextCopy.textContent = LENS_CONTEXT[q.lens] || "";

    const wrap = document.createElement("div");
    wrap.className = "q";

    const title = document.createElement("div");
    title.className = "q-title";
    title.textContent = q.title;

    const help = document.createElement("p");
    help.className = "q-help";
    help.textContent = q.help;

    wrap.appendChild(title);
    wrap.appendChild(help);

    q.options.forEach(([label, expl, val]) => {
      const row = document.createElement("label");
      row.className = "choice";
      row.innerHTML = `
        <input type="radio" name="${q.id}" value="${val}">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(expl)}</span>
        </div>
      `;
      const input = row.querySelector("input");
      input.addEventListener("change", () => {
        answers[q.id] = Number(val);
        nextBtn.disabled = false;
      });
      wrap.appendChild(row);
    });

    form.appendChild(wrap);
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";

    if (answers[q.id] != null) nextBtn.disabled = false;
  }

  /* ---------- Score + results ---------- */
  function computeSnapshot() {
    const lensScores = {};
    LENSES.forEach(l => (lensScores[l.id] = []));

    QUESTIONS.forEach(q => {
      if (answers[q.id] != null) lensScores[q.lens].push(answers[q.id]);
    });

    const lensResults = LENSES.map(l => {
      const vals = lensScores[l.id];
      const pct = vals.length ? (vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100 : 0;
      const pctClamped = clamp(Math.round(pct), 0, 100);
      const label = labelForPct(pctClamped);
      return { id: l.id, name: l.name, pct: pctClamped, label };
    });

    lensResults.sort((a, b) => a.pct - b.pct);
    const weakest = lensResults.slice(0, 2).map(x => x.id);
    const strongest = lensResults.slice(-2).map(x => x.id);

    return {
      version: "cs_snapshot_v1",
      createdAt: new Date().toISOString(),
      lensResultsByWeakness: lensResults,
      weakest,
      strongest,
      answers: { ...answers }
    };
  }

  function showResults() {
    if (!result || !grid || !resultCopy) return;

    lastSnapshot = computeSnapshot();
    localStorage.setItem("cs_snapshot_v1", JSON.stringify(lastSnapshot));
    enableAttachSnapshotIfAvailable();
    renderResourcesHub(); // ✅ update hub immediately

    result.hidden = false;
    grid.innerHTML = "";

    const byId = Object.fromEntries(lastSnapshot.lensResultsByWeakness.map(x => [x.id, x]));
    const ordered = LENSES.map(l => byId[l.id]);

    ordered.forEach(lr => {
      const card = document.createElement("div");
      card.className = "signal";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `${lr.name}: ${lr.label}, ${lr.pct}%`);
      card.innerHTML = `
        <div class="signal-top">
          <p>${escapeHtml(lr.name)}</p>
          <span class="signal-label">${escapeHtml(lr.label)}</span>
        </div>
        <div class="bar"><span style="width:${lr.pct}%"></span></div>
      `;
      card.addEventListener("click", () => openLensDetail(lr.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLensDetail(lr.id);
        }
      });
      grid.appendChild(card);
    });

    const weakest = lastSnapshot.weakest;
    const weakestNames = weakest.map(id => LENSES.find(l => l.id === id)?.name || id);

    const strongest = lastSnapshot.strongest;
    const strongestNames = strongest.map(id => LENSES.find(l => l.id === id)?.name || id);

    const headline = "A clear starting picture — with gentle next steps.";
    const paragraph = `Right now your household signal shows strengths in <strong>${escapeHtml(strongestNames.join(" and "))}</strong>, and the biggest opportunities for calm improvement are in <strong>${escapeHtml(weakestNames.join(" and "))}</strong>.`;

    const bullets = `
      <ul class="action-bullets">
        <li>Pick <strong>one seed</strong> this week in your weakest lens (15–30 minutes).</li>
        <li>Create <strong>one household rule</strong> that reduces pressure decisions (“pause and verify”).</li>
        <li>Choose a monthly <strong>maintenance rhythm</strong>: updates + backups + quick privacy sweep.</li>
        <li>Your <strong>Resources Hub</strong> below is now personalised to your snapshot.</li>
      </ul>
    `;

    const packs = `
      <div class="packs" aria-label="Personalised resource packs">
        ${weakest.map(id => buildPackHtml(id, byId[id]?.label || "Developing", byId[id]?.pct || 0)).join("")}
      </div>
      <p class="small" style="margin-top:10px;">
        Tip: click any lens bar above to open the full lens guide — or use the Resources Hub for a clean “work plan”.
      </p>
    `;

    resultCopy.innerHTML = `
      <h4>${headline}</h4>
      <p>${paragraph}</p>
      ${bullets}
      ${packs}
      <p class="small" style="margin-top:10px;">
        If any of these answers felt uncomfortable: that’s normal. The point isn’t blame — it’s visibility.
        You’re already improving by looking clearly.
      </p>
    `;

    if (lensDetail) lensDetail.hidden = true;

    setTimeout(() => {
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function buildPackHtml(lensId, label, pct) {
    const lib = LENS_LIBRARY[lensId];
    if (!lib) return "";

    const seedList = lib.seeds[label] || lib.seeds.Developing || [];
    const seedPrimary = seedList[0] || "Choose one small change you can complete calmly.";

    return `
      <div class="pack">
        <div class="pack-head">
          <h5>${escapeHtml(LENSES.find(l => l.id === lensId)?.name || lensId)} resource pack</h5>
          <span class="pack-badge">${escapeHtml(label)} • ${pct}%</span>
        </div>

        <div class="pack-grid">
          <div class="pack-box">
            <h6>Purpose</h6>
            <p>${escapeHtml(lib.purpose)}</p>
          </div>

          <div class="pack-box">
            <h6>Practices</h6>
            <ul>
              ${lib.practices.slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>

          <div class="pack-box">
            <h6>This week’s seed</h6>
            <p><strong>${escapeHtml(seedPrimary)}</strong></p>
            <p class="small" style="margin-top:6px;">(The full pack is in your Resources Hub.)</p>
          </div>
        </div>

        <div class="pack-actions">
          <button class="btn ghost" type="button" data-open-lens="${escapeHtml(lensId)}">Open full guide</button>
          <button class="btn primary" type="button" data-copy-pack="${escapeHtml(lensId)}">Copy this pack</button>
        </div>
      </div>
    `;
  }

  /* ---------- Lens detail guide ---------- */
  function openLensDetail(lensId) {
    const snap = lastSnapshot || getStoredSnapshot();
    if (!snap) return;

    const byId = Object.fromEntries(snap.lensResultsByWeakness.map(x => [x.id, x]));
    const lr = byId[lensId];
    if (!lr) return;

    const lib = LENS_LIBRARY[lensId];
    if (!lib) return;

    const label = lr.label;
    const seeds = lib.seeds[label] || lib.seeds.Developing || [];

    lensDetailMeta.textContent = `${label} • ${lr.pct}% • tailored guide`;
    lensDetailTitle.textContent = lr.name;
    lensDetailMeaning.textContent = LENS_CONTEXT[lensId] || "";
    lensDetailPurpose.textContent = lib.purpose;

    lensDetailPractices.innerHTML = lib.practices.map(p => `<li>${escapeHtml(p)}</li>`).join("");
    lensDetailOutcomes.innerHTML = lib.outcomes.map(o => `<li>${escapeHtml(o)}</li>`).join("");
    lensDetailActions.innerHTML = seeds.map(s => `<li>${escapeHtml(s)}</li>`).join("");

    lensDetailAudit.innerHTML = `
      <strong>What the audit adds:</strong> ${escapeHtml(lib.audit)}
      <div class="small" style="margin-top:6px;">
        If you want this built into a staged plan for your household (not generic advice), request the full audit.
      </div>
    `;

    lensDetail.hidden = false;
    setTimeout(() => lensDetail.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  closeLensDetail?.addEventListener("click", () => {
    lensDetail.hidden = true;
    grid?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  backToSignal?.addEventListener("click", () => {
    lensDetail.hidden = true;
    grid?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  copyLensChecklist?.addEventListener("click", async () => {
    if (lensDetail.hidden) return;

    const title = lensDetailTitle.textContent || "Lens";
    const meta = lensDetailMeta.textContent || "";
    const purpose = lensDetailPurpose.textContent || "";

    const practices = Array.from(lensDetailPractices.querySelectorAll("li")).map(li => `- ${li.textContent}`);
    const outcomes = Array.from(lensDetailOutcomes.querySelectorAll("li")).map(li => `- ${li.textContent}`);
    const actions = Array.from(lensDetailActions.querySelectorAll("li")).map(li => `- ${li.textContent}`);

    const txt =
      `Cyber Seeds — Lens Guide\n\n` +
      `${title}\n${meta}\n\n` +
      `Purpose:\n${purpose}\n\n` +
      `Practices:\n${practices.join("\n")}\n\n` +
      `Outcomes:\n${outcomes.join("\n")}\n\n` +
      `This week’s seed:\n${actions.join("\n")}\n`;

    await copyToClipboard(txt);
  });

  /* ---------- Hub rendering (NEW) ---------- */
  function lensMapFromSnapshot(snap) {
    const byId = Object.fromEntries(snap.lensResultsByWeakness.map(x => [x.id, x]));
    return byId;
  }

  function getHubFilterMode() {
    return localStorage.getItem("cs_hub_filter") || "focus"; // focus | all
  }

  function setHubFilterMode(mode) {
    localStorage.setItem("cs_hub_filter", mode);
  }

  function buildHubPack(lr) {
    const lib = LENS_LIBRARY[lr.id];
    const seeds = lib.seeds[lr.label] || lib.seeds.Developing || [];

    const summary = lr.label === "Stable"
      ? "Maintenance-ready. Keep the rhythm."
      : "This lens is where small changes will help most right now.";

    const openByDefault = lr.label !== "Stable";

    return `
      <details class="hub-pack" ${openByDefault ? "open" : ""}>
        <summary>
          <div>
            <p class="hub-pack-title">${escapeHtml(lr.name)}</p>
            <p class="hub-pack-sub">${escapeHtml(summary)}</p>
          </div>
          <span class="hub-badge">${escapeHtml(lr.label)} • ${lr.pct}%</span>
        </summary>

        <div class="hub-pack-body">
          <div class="hub-pack-grid">
            <div class="hub-box">
              <h4>Purpose</h4>
              <p>${escapeHtml(lib.purpose)}</p>
            </div>
            <div class="hub-box">
              <h4>Practices</h4>
              <ul>${lib.practices.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
            </div>
            <div class="hub-box">
              <h4>Outcomes</h4>
              <ul>${lib.outcomes.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
            </div>
            <div class="hub-box">
              <h4>This week’s seed</h4>
              <ul>${seeds.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
            </div>
          </div>

          <div class="hub-actions">
            <button class="btn ghost" type="button" data-hub-open-lens="${escapeHtml(lr.id)}">Open this lens in snapshot</button>
            <button class="btn primary" type="button" data-hub-copy="${escapeHtml(lr.id)}">Copy this pack</button>
          </div>
        </div>
      </details>
    `;
  }

  function renderResourcesHub() {
    if (!hubContent) return;

    const snap = getStoredSnapshot();
    if (!snap) {
      hubContent.innerHTML = `
        <div class="hub-empty">
          <h3>No snapshot found on this device</h3>
          <p>Run the household snapshot to generate your personalised hub. Nothing is uploaded — it stays local.</p>
          <div class="mini-cta" style="margin-top:12px;">
            <button class="btn primary" type="button" id="hubStartSnapshot">Start snapshot</button>
          </div>
        </div>
      `;
      $("#hubStartSnapshot")?.addEventListener("click", openModal);
      return;
    }

    const mode = getHubFilterMode();
    const byId = lensMapFromSnapshot(snap);

    const ordered = LENSES.map(l => byId[l.id]).filter(Boolean);

    // Relevant lenses = anything not Stable (default); if all Stable, show all but message changes
    const focus = ordered.filter(lr => lr.label !== "Stable");
    const show = (mode === "all")
      ? ordered
      : (focus.length ? focus : ordered);

    const createdAt = new Date(snap.createdAt).toLocaleString();
    const weakestNames = snap.weakest.map(id => LENSES.find(l => l.id === id)?.name || id).join(" and ");

    hubContent.innerHTML = `
      <div class="hub-header">
        <div class="hub-header-top">
          <div>
            <p class="hub-title">Your household resources hub</p>
            <p class="hub-meta">
              Snapshot saved locally • Created: ${escapeHtml(createdAt)} • Focus: <strong>${escapeHtml(weakestNames)}</strong>
            </p>
          </div>

          <div class="hub-controls">
            <button class="btn ghost" type="button" id="hubUpdateSnapshot">Update snapshot</button>
            <button class="btn ghost" type="button" id="hubClearSnapshot">Clear saved snapshot</button>
          </div>
        </div>

        <div class="hub-filters" aria-label="Hub filter">
          <button class="pill" type="button" id="hubFilterFocus" aria-pressed="${mode === "focus" ? "true" : "false"}">
            Show relevant lenses
          </button>
          <button class="pill" type="button" id="hubFilterAll" aria-pressed="${mode === "all" ? "true" : "false"}">
            Show all lenses
          </button>
        </div>
      </div>

      <div class="hub-packs">
        ${show.map(buildHubPack).join("")}
      </div>
    `;

    $("#hubUpdateSnapshot")?.addEventListener("click", openModal);
    $("#hubClearSnapshot")?.addEventListener("click", () => {
      localStorage.removeItem("cs_snapshot_v1");
      toast("Snapshot cleared.");
      enableAttachSnapshotIfAvailable();
      renderResourcesHub();
    });

    $("#hubFilterFocus")?.addEventListener("click", () => {
      setHubFilterMode("focus");
      renderResourcesHub();
    });
    $("#hubFilterAll")?.addEventListener("click", () => {
      setHubFilterMode("all");
      renderResourcesHub();
    });
  }

  /* ---------- Delegated clicks ---------- */
  document.addEventListener("click", async (e) => {
    const openLensBtn = e.target.closest("[data-open-lens]");
    if (openLensBtn) {
      const id = openLensBtn.getAttribute("data-open-lens");
      openLensDetail(id);
      return;
    }

    const copyPackBtn = e.target.closest("[data-copy-pack]");
    if (copyPackBtn) {
      const id = copyPackBtn.getAttribute("data-copy-pack");
      const snap = lastSnapshot || getStoredSnapshot();
      if (!snap) return;

      const byId = lensMapFromSnapshot(snap);
      const lr = byId[id];
      const lib = LENS_LIBRARY[id];
      if (!lr || !lib) return;

      const seeds = lib.seeds[lr.label] || lib.seeds.Developing || [];
      const txt =
        `Cyber Seeds — Resource Pack\n\n` +
        `${lr.name} (${lr.label} • ${lr.pct}%)\n\n` +
        `Purpose:\n${lib.purpose}\n\n` +
        `Practices:\n${lib.practices.map(x => `- ${x}`).join("\n")}\n\n` +
        `Outcomes:\n${lib.outcomes.map(x => `- ${x}`).join("\n")}\n\n` +
        `This week’s seed:\n${seeds.map(x => `- ${x}`).join("\n")}\n`;

      await copyToClipboard(txt);
      return;
    }

    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const key = copyBtn.getAttribute("data-copy");
      const txt = COPY_TEXTS[key];
      if (txt) await copyToClipboard(txt);
      return;
    }

    const openSnap = e.target.closest("[data-open-snapshot]");
    if (openSnap) {
      openModal();
      return;
    }

    const hubOpenLens = e.target.closest("[data-hub-open-lens]");
    if (hubOpenLens) {
      const id = hubOpenLens.getAttribute("data-hub-open-lens");
      openModal();
      // wait for modal to open then jump to results by forcing a minimal “view mode”:
      // easiest: open modal, user can click through; but we’ll also allow opening lens guide if snapshot exists
      setTimeout(() => {
        // if a stored snapshot exists, we can directly open lens guide within modal result view by simulating lastSnapshot
        const snap = getStoredSnapshot();
        if (snap) {
          lastSnapshot = snap;
          // show results view in modal without re-taking quiz:
          step = QUESTIONS.length;
          render();
          openLensDetail(id);
        }
      }, 120);
      return;
    }

    const hubCopy = e.target.closest("[data-hub-copy]");
    if (hubCopy) {
      const id = hubCopy.getAttribute("data-hub-copy");
      const snap = getStoredSnapshot();
      if (!snap) return;

      const byId = lensMapFromSnapshot(snap);
      const lr = byId[id];
      const lib = LENS_LIBRARY[id];
      if (!lr || !lib) return;

      const seeds = lib.seeds[lr.label] || lib.seeds.Developing || [];
      const txt =
        `Cyber Seeds — Hub Pack\n\n` +
        `${lr.name} (${lr.label} • ${lr.pct}%)\n\n` +
        `Purpose:\n${lib.purpose}\n\n` +
        `Practices:\n${lib.practices.map(x => `- ${x}`).join("\n")}\n\n` +
        `Outcomes:\n${lib.outcomes.map(x => `- ${x}`).join("\n")}\n\n` +
        `This week’s seed:\n${seeds.map(x => `- ${x}`).join("\n")}\n`;

      await copyToClipboard(txt);
      return;
    }
  });

  /* ---------- Navigation ---------- */
  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    if (mobileNav) mobileNav.hidden = isOpen;
  });

  $$("[data-scroll]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      const target = $(href);
      if (!target) return;

      if (mobileNav && !mobileNav.hidden) {
        mobileNav.hidden = true;
        navToggle?.setAttribute("aria-expanded", "false");
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Snapshot buttons ---------- */
  nextBtn?.addEventListener("click", () => {
    step++;
    render();
  });

  backBtn?.addEventListener("click", () => {
    step = Math.max(-1, step - 1);
    render();
  });

  /* ---------- Export/Print ---------- */
  $("#exportSnapshot")?.addEventListener("click", () => {
    const snap = getStoredSnapshot();
    if (!snap) {
      toast("No snapshot found to export.");
      return;
    }

    const byId = lensMapFromSnapshot(snap);

    const lensRows = LENSES.map(l => {
      const lr = byId[l.id];
      const lib = LENS_LIBRARY[l.id];
      const seeds = lib?.seeds?.[lr.label] || [];
      return `
        <div style="border:1px solid rgba(14,21,18,.12); border-radius:16px; padding:12px; margin:10px 0;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div style="font-weight:800;">${escapeHtml(l.name)}</div>
            <div style="font-weight:900; font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid rgba(14,21,18,.12); background:rgba(42,122,87,.08);">
              ${escapeHtml(lr.label)} • ${lr.pct}%
            </div>
          </div>
          <div style="height:10px; background:#e8ecea; border-radius:999px; overflow:hidden; margin-top:8px;">
            <div style="height:100%; width:${lr.pct}%; background:linear-gradient(90deg,#2a7a57,#1f6f86); border-radius:999px;"></div>
          </div>
          <div style="margin-top:10px; font-size:13px; color:#42534b;">
            <strong>Purpose:</strong> ${escapeHtml(lib.purpose)}
          </div>
          <div style="margin-top:8px; font-size:13px;">
            <strong>This week’s seed:</strong>
            <ul style="margin:6px 0 0; padding-left:18px;">
              ${seeds.slice(0,3).map(s => `<li>${escapeHtml(s)}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }).join("");

    const weakestNames = snap.weakest.map(id => LENSES.find(l => l.id === id)?.name || id).join(" and ");

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Cyber Seeds — Household Snapshot</title>
        <style>
          body{ font-family: Arial, sans-serif; padding:18px; color:#0e1512; }
          h1{ margin:0; font-size:22px; }
          .muted{ color:#42534b; }
          .box{ border:1px solid rgba(14,21,18,.12); border-radius:18px; padding:12px; margin-top:12px; background:rgba(42,122,87,.05); }
          @media print{ body{ padding:0; } }
        </style>
      </head>
      <body>
        <h1>Cyber Seeds — Household Snapshot</h1>
        <div class="muted" style="margin-top:6px;">Created: ${escapeHtml(new Date(snap.createdAt).toLocaleString())}</div>

        <div class="box">
          <strong>Starting picture:</strong>
          Biggest opportunities for calm improvement are in <strong>${escapeHtml(weakestNames)}</strong>.
          This is a direction, not a diagnosis.
        </div>

        ${lensRows}

        <div class="muted" style="margin-top:14px; font-size:12px;">
          Cyber Seeds is a prevention and resilience framework, not an emergency service.
        </div>

        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) { toast("Popup blocked — allow popups to print/export."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  });

  /* ---------- Attach snapshot to email ---------- */
  function enableAttachSnapshotIfAvailable() {
    const saved = !!getStoredSnapshot();
    if (!attachSnapshotBtn) return;
    attachSnapshotBtn.disabled = !saved;
  }
  enableAttachSnapshotIfAvailable();

  attachSnapshotBtn?.addEventListener("click", () => {
    const snap = getStoredSnapshot();
    if (!snap) return;

    includeSnapshotInEmail = !includeSnapshotInEmail;
    attachSnapshotBtn.textContent = includeSnapshotInEmail ? "Snapshot summary attached ✓" : "Attach my snapshot summary";
    toast(includeSnapshotInEmail ? "Snapshot will be included." : "Snapshot removed.");
  });

  auditRequestForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const to = "hello@cyberseeds.co.uk"; // change inbox if needed
    const fd = new FormData(auditRequestForm);

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const postcode = String(fd.get("postcode") || "").trim();
    const role = String(fd.get("role") || "").trim();
    const notes = String(fd.get("notes") || "").trim();

    const subject = `Cyber Seeds audit request — ${name || "Household"} (${role || "Enquiry"})`;

    let body =
      `Hello Cyber Seeds,\n\n` +
      `I’d like to request a household digital safety audit.\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (postcode ? `Postcode: ${postcode}\n` : "") +
      `Contacting as: ${role}\n\n` +
      (notes ? `What I'd like help with:\n${notes}\n\n` : "") +
      `Thank you.\n`;

    if (includeSnapshotInEmail) {
      const snap = getStoredSnapshot();
      if (snap) {
        const byId = lensMapFromSnapshot(snap);
        body += `\n---\nHousehold snapshot summary (optional)\nCreated: ${new Date(snap.createdAt).toLocaleString()}\n\n`;
        LENSES.forEach(l => {
          const lr = byId[l.id];
          body += `- ${l.name}: ${lr.label} (${lr.pct}%)\n`;
        });
        body += `---\n`;
      }
    }

    const mailto = `mailto:${to}?subject=${encodeMailto(subject)}&body=${encodeMailto(body)}`;
    window.location.href = mailto;
  });

  /* ---------- Result “Open Hub” button ---------- */
  goToHubBtn?.addEventListener("click", () => {
    closeModal();
    const target = $("#hub");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Set year ---------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Practitioner mode (secret activation) ---------- */
  const practitionerOverlay = $("#practitionerOverlay");
  const closePractitioner = $("#closePractitioner");
  const toggleDebug = $("#toggleDebug");
  const debugPanel = $("#debugPanel");
  const copySnapshotJson = $("#copySnapshotJson");

  let keyBuffer = "";
  let debugOn = false;

  function openPractitioner() {
    if (!practitionerOverlay) return;
    practitionerOverlay.hidden = false;
    toast("Practitioner mode enabled.");
  }

  function closePractitionerMode() {
    if (!practitionerOverlay) return;
    practitionerOverlay.hidden = true;
  }

  closePractitioner?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closePractitionerMode();
  });

  // Secret: type "seedmode" (but NOT inside inputs), OR press Ctrl+Alt+P
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && (e.key.toLowerCase() === "p")) {
      openPractitioner();
      return;
    }

    // ✅ avoid accidental trigger while typing in inputs/forms
    const t = e.target;
    const tag = (t && t.tagName ? t.tagName.toLowerCase() : "");
    const inEditable = t && (t.isContentEditable || tag === "input" || tag === "textarea" || tag === "select");
    if (inEditable) return;

    if (e.key.length === 1) {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > 24) keyBuffer = keyBuffer.slice(-24);
      if (keyBuffer.endsWith("seedmode")) {
        openPractitioner();
        keyBuffer = "";
      }
    }
  });

  // Clicking the dark backdrop closes practitioner mode (nice on mobile)
  practitionerOverlay?.addEventListener("click", (e) => {
    if (e.target === practitionerOverlay) closePractitionerMode();
  });

  toggleDebug?.addEventListener("click", () => {
    debugOn = !debugOn;
    if (!debugPanel) return;
    debugPanel.hidden = !debugOn;

    if (debugOn) {
      const snap = getStoredSnapshot();
      debugPanel.textContent = snap ? JSON.stringify(snap, null, 2) : "No snapshot saved yet.";
    }
  });

  copySnapshotJson?.addEventListener("click", async () => {
    const snap = getStoredSnapshot();
    if (!snap) { toast("No snapshot found."); return; }
    await copyToClipboard(JSON.stringify(snap));
  });

  /* ---------- Init hub on load ---------- */
  renderResourcesHub();

})();
