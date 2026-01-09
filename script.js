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

  function setStoredSnapshot(snap) {
    localStorage.setItem("cs_snapshot_v1", JSON.stringify(snap));
  }

  function getHubFilterMode() {
    return localStorage.getItem("cs_hub_filter") || "focus"; // focus | all
  }
  function setHubFilterMode(mode) {
    localStorage.setItem("cs_hub_filter", mode);
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

  // Keep the labels simple and public-friendly
  function labelForPct(pct) {
    if (pct >= 75) return "Strong";
    if (pct >= 45) return "Stable";
    return "Needs attention";
  }

  const LENS_LIBRARY = {
    network: {
      purpose: "Secure the digital front door. Your network decides who can ‘touch’ what inside the home.",
      practices: [
        "Use WPA2/WPA3 and a strong Wi-Fi password.",
        "Change the router admin password (not the Wi-Fi password).",
        "Enable a guest network for visitors and one-off devices.",
        "Keep router firmware updated.",
        "Remove unknown devices from the router list."
      ],
      outcomes: [
        "Fewer unknown devices and less surprise behaviour.",
        "Reduced risk of compromise spreading across the home.",
        "A calmer baseline for everything else."
      ],
      seeds: {
        "Needs attention": [
          "Create a guest network and move non-essential devices to it.",
          "Change router admin password + confirm WPA2/WPA3.",
          "Update firmware, then reboot."
        ],
        Stable: [
          "Audit connected devices and remove anything unknown.",
          "Turn off WPS if enabled.",
          "Consider separating children/IoT if supported."
        ],
        Strong: [
          "Review port forwarding and remove anything you don’t recognise.",
          "Add a ‘new device approval’ household rule.",
          "Consider family-safe DNS."
        ]
      }
    },

    devices: {
      purpose: "Keep devices predictable and healthy. Most household risk comes from drift, not wrongdoing.",
      practices: [
        "Enable automatic updates on key devices.",
        "Confirm backups are working.",
        "Remove old devices still signed into accounts.",
        "Use unique passwords for email/banking.",
        "Review app permissions (location, camera, mic)."
      ],
      outcomes: [
        "Less compromise and fewer ‘weird behaviour’ moments.",
        "Faster recovery if something goes wrong.",
        "More confidence and less tech stress."
      ],
      seeds: {
        "Needs attention": [
          "Turn on auto-updates on the 2 most-used devices.",
          "Check signed-in devices for your main email and remove old ones.",
          "Enable backups tonight."
        ],
        Stable: [
          "Pick a monthly device check day (updates + backups + sign-ins).",
          "Uninstall unused apps and revoke permissions.",
          "Enable 2-step verification for email + banking."
        ],
        Strong: [
          "Do an ‘old device sweep’ and retire anything unused.",
          "Set up passkeys where available.",
          "Write a calm recovery plan: what you lock down first."
        ]
      }
    },

    privacy: {
      purpose: "Reduce exposure without disappearing. Privacy is controlling what strangers can infer.",
      practices: [
        "Lock down social profiles and review followers.",
        "Remove routine clues: school logos, location tags, schedules.",
        "Turn off ‘always’ location unless needed.",
        "Disable unnecessary data sharing / ad personalisation.",
        "Use separate emails for banking vs shopping."
      ],
      outcomes: [
        "Fewer targeted scams and harassment risks.",
        "More control over household visibility.",
        "Better offline safety when routine clues reduce."
      ],
      seeds: {
        "Needs attention": [
          "Set key social accounts to private or review followers today.",
          "Turn off location tagging in camera + socials.",
          "Remove 3 posts that reveal routines/locations."
        ],
        Stable: [
          "Do a 10-minute permissions sweep on top 5 apps.",
          "Separate emails: sensitive vs shopping.",
          "Turn off ad personalisation where possible."
        ],
        Strong: [
          "Create a ‘what we don’t post’ household line (schools, routines, addresses).",
          "Tighten children’s privacy defaults together.",
          "Set breach alerts and rotate passwords if needed."
        ]
      }
    },

    scams: {
      purpose: "Build an ‘immune system’ against manipulation. Scams win through urgency, not intelligence.",
      practices: [
        "Use a pause → verify → act habit.",
        "Never log in via links in messages.",
        "Enable 2-step verification for email/banking.",
        "Teach children: ‘pressure = stop’.",
        "Have a no-shame response plan if someone clicks."
      ],
      outcomes: [
        "Fewer fraud losses and compromised accounts.",
        "Less fear — you know what to do.",
        "Children learn safety without panic."
      ],
      seeds: {
        "Needs attention": [
          "Create a visible household pause rule today.",
          "Enable 2-step verification on your primary email.",
          "Agree: nobody sends money based on messages."
        ],
        Stable: [
          "Set verification routes: bank app, typed URLs, official numbers.",
          "Talk through 2 common scams you’ve seen recently.",
          "Create a ‘second eyes’ habit for urgent messages."
        ],
        Strong: [
          "Add a household ‘safe word’ for money requests (teens).",
          "Review password reuse and upgrade key accounts.",
          "Do calm ‘what if…?’ drills once a month."
        ]
      }
    },

    children: {
      purpose: "Support growth without fear. Safety increases when rules are calm, consistent, and repair-focused.",
      practices: [
        "Night-time device docking (charging station outside bedrooms).",
        "Agree what to do if something feels wrong: tell, screenshot, block, come to you.",
        "Minimise unknown contacts in apps.",
        "Co-use sometimes: let them show you their world for 10 minutes.",
        "Make rules about wellbeing and sleep, not blame."
      ],
      outcomes: [
        "Better sleep and less late-night exposure.",
        "Less conflict, more trust and predictability.",
        "Stronger safeguarding posture without surveillance."
      ],
      seeds: {
        "Needs attention": [
          "Create a charging station tonight and trial for 7 days.",
          "Practise the ‘if it feels wrong’ script once.",
          "Turn off unknown contact options in key apps."
        ],
        Stable: [
          "Add a weekly 10-minute check-in: ‘anything odd this week?’",
          "Set boundaries for DMs/chats depending on age.",
          "Make one repair rule: if something happens, you fix it together."
        ],
        Strong: [
          "Review the highest-risk app together and tighten settings.",
          "Set a calm escalation route (parent → school if needed).",
          "Teach private info using simple examples."
        ]
      }
    }
  };

  function lensMapFromSnapshot(snap) {
    return Object.fromEntries(snap.lensResultsByWeakness.map(x => [x.id, x]));
  }

  /* ---------- Resources Hub renderer (shared) ---------- */
  function renderResourcesHub(targetEl) {
    if (!targetEl) return;

    const snap = getStoredSnapshot();
    if (!snap) {
      targetEl.innerHTML = `
        <div class="hub hub-empty">
          <h3>No snapshot found on this device</h3>
          <p>Run the Household Snapshot to generate your personalised resources hub. Nothing is uploaded — it stays local.</p>
          <div class="mini-cta" style="margin-top:12px;">
            <a class="btn primary" href="index.html?snapshot=1">Start snapshot</a>
            <a class="btn ghost" href="index.html">Back to home</a>
          </div>
        </div>
      `;
      return;
    }

    const mode = getHubFilterMode();
    const byId = lensMapFromSnapshot(snap);
    const ordered = LENSES.map(l => byId[l.id]).filter(Boolean);

    const focus = ordered.filter(lr => lr.label !== "Strong"); // show only non-Strong by default
    const show = (mode === "all") ? ordered : (focus.length ? focus : ordered);

    const createdAt = new Date(snap.createdAt).toLocaleString();
    const weakestNames = (snap.weakest || []).map(id => LENSES.find(l => l.id === id)?.name || id).join(" and ");

    const packHtml = (lr) => {
      const lib = LENS_LIBRARY[lr.id];
      const seeds = lib.seeds[lr.label] || lib.seeds.Stable || [];
      const openByDefault = lr.label !== "Strong";
      const summary =
        lr.label === "Strong"
          ? "Maintenance-ready. Keep the rhythm."
          : "This lens is where small changes will help most right now.";

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
              <a class="btn ghost" href="index.html?snapshot=1">Update snapshot</a>
              <button class="btn primary" type="button" data-copy-pack="${escapeHtml(lr.id)}">Copy this pack</button>
            </div>
          </div>
        </details>
      `;
    };

    targetEl.innerHTML = `
      <div class="hub">
        <div class="hub-header">
          <div class="hub-header-top">
            <div>
              <p class="hub-title">Your personalised resources</p>
              <p class="hub-meta">
                Snapshot saved locally • Created: ${escapeHtml(createdAt)}
                ${weakestNames ? ` • Focus: <strong>${escapeHtml(weakestNames)}</strong>` : ""}
              </p>
            </div>

            <div class="hub-controls">
              <a class="btn ghost" href="index.html?snapshot=1">Update snapshot</a>
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
          ${show.map(packHtml).join("")}
        </div>
      </div>
    `;

    $("#hubClearSnapshot")?.addEventListener("click", () => {
      localStorage.removeItem("cs_snapshot_v1");
      toast("Snapshot cleared.");
      renderResourcesHub(targetEl);
    });

    $("#hubFilterFocus")?.addEventListener("click", () => {
      setHubFilterMode("focus");
      renderResourcesHub(targetEl);
    });
    $("#hubFilterAll")?.addEventListener("click", () => {
      setHubFilterMode("all");
      renderResourcesHub(targetEl);
    });
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
    } catch {
      toast("Copy failed.");
    }
  }

  /* ---------- Snapshot modal (only on index.html) ---------- */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const result = $("#snapshotResult");
  const grid = $("#signalGrid");
  const resultCopy = $("#resultCopy");

  const lensContextBox = $("#snapshotLensContext");
  const lensContextTitle = $("#lensContextTitle");
  const lensContextCopy = $("#lensContextCopy");

  const openBtns = ["#openSnapshot","#openSnapshotTop","#openSnapshotMobile","#openSnapshotCard","#openSnapshotLenses"]
    .map(id => $(id)).filter(Boolean);
  const closeBtns = $$("[data-close]");

  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");

  // If we're on resources.html, render hub and exit early from snapshot logic
  const resourcesHubEl = $("#resourcesHub");
  if (resourcesHubEl) {
    renderResourcesHub(resourcesHubEl);

    navToggle?.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      if (mobileNav) mobileNav.hidden = isOpen;
    });

    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    // Copy button for packs on resources page
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy-pack]");
      if (!btn) return;

      const id = btn.getAttribute("data-copy-pack");
      const snap = getStoredSnapshot();
      if (!snap) return;

      const byId = lensMapFromSnapshot(snap);
      const lr = byId[id];
      const lib = LENS_LIBRARY[id];
      if (!lr || !lib) return;

      const seeds = lib.seeds[lr.label] || [];
      const txt =
        `Cyber Seeds — Resource Pack\n\n` +
        `${lr.name} (${lr.label} • ${lr.pct}%)\n\n` +
        `Purpose:\n${lib.purpose}\n\n` +
        `Practices:\n${lib.practices.map(x => `- ${x}`).join("\n")}\n\n` +
        `Outcomes:\n${lib.outcomes.map(x => `- ${x}`).join("\n")}\n\n` +
        `This week’s seed:\n${seeds.map(x => `- ${x}`).join("\n")}\n`;

      copyToClipboard(txt);
    });

    return;
  }

  /* ---------- Index page continues ---------- */
  let step = -1;
  const answers = {};
  let lastFocus = null;

  const QUESTIONS = [
    { id:"wifi_access", lens:"network", title:"Who can realistically access your home Wi-Fi?",
      help:"This is about control. The smaller the access circle, the easier it is to keep the home stable.",
      options:[["Only household members","Access is tightly controlled.",3],["Household + occasional guests","Mostly controlled.",2],["Quite a few people have it","Wider access than intended.",1],["Not sure","Uncertainty = time to tidy up.",0]]},
    { id:"router_admin", lens:"network", title:"Do you know (or control) your router admin login?",
      help:"This is different from the Wi-Fi password. Admin access controls security settings and updates.",
      options:[["Yes, and it’s not default","You can secure the front door.",3],["Yes, but unsure if default","Worth checking.",2],["No / someone else set it up","Common risk.",1],["Not sure what this means","Normal — most homes haven’t been shown this.",0]]},

    { id:"device_updates", lens:"devices", title:"Do devices usually update themselves?",
      help:"Updates close known holes. Most compromises start with old software.",
      options:[["Yes, mostly automatic","Strong baseline.",3],["Some do, some don’t","Mixed baseline.",2],["Rarely","Drift risk increases.",1],["Never / not sure","Good place to start.",0]]},
    { id:"old_devices", lens:"devices", title:"Are there old or unused devices still logged into accounts?",
      help:"Forgotten devices still signed in can silently become the weak point.",
      options:[["No, we clear old devices","Good hygiene.",3],["Maybe 1–2 devices","Worth a sweep.",2],["Yes, several","Often creates surprise risk.",1],["Not sure","Common — we’ll guide you.",0]]},

    { id:"online_visibility", lens:"privacy", title:"How visible is your household’s daily life online?",
      help:"This is about what strangers can infer: routines, locations, school clues, contact routes.",
      options:[["Very limited","Lower exposure.",3],["Some clues","Manageable.",2],["Haven’t checked","Often more visible than expected.",1],["Quite visible","Higher targeting risk.",0]]},
    { id:"app_permissions", lens:"privacy", title:"Have you reviewed app permissions recently?",
      help:"Most exposure is accidental: permissions kept ‘on’ by default.",
      options:[["Yes, within 3 months","Good control.",3],["Yes, but not recently","Worth a refresh.",2],["No","Common — easy win.",1],["Not sure","Normal — we’ll point to simplest route.",0]]},

    { id:"urgent_messages", lens:"scams", title:"What happens when a message feels urgent?",
      help:"Scams manufacture urgency. Your habit under pressure is the real shield.",
      options:[["We pause and verify","Strong immunity.",3],["Sometimes we pause","Developing habit.",2],["We often click/respond","Higher risk moments.",1],["We act immediately","A pause rule will help quickly.",0]]},
    { id:"two_factor", lens:"scams", title:"Do your key accounts use 2-step verification?",
      help:"This blocks most account takeovers even when passwords leak.",
      options:[["Yes, on most key accounts","Strong protection.",3],["On some accounts","Good start.",2],["No","High-impact improvement available.",1],["Not sure","Common — we’ll guide it.",0]]},

    { id:"night_devices", lens:"children", title:"Where do children’s devices go at night?",
      help:"Night-time is where risks cluster: tiredness, secrecy, contact, mood impacts.",
      options:[["Outside bedrooms","Strong boundary.",3],["Depends","Mixed pattern.",2],["Usually in bedrooms","Higher late-night risk.",1],["Always in bedrooms","Charging station seed helps fast.",0]]},
    { id:"what_if_wrong", lens:"children", title:"If something feels wrong online, does your child know what to do?",
      help:"Goal: calm script — tell, screenshot if safe, block, come to you.",
      options:[["Yes, we’ve talked it through","Good clarity.",3],["Somewhat","A quick script would help.",2],["Not really","Common — easy win.",1],["Not sure","Normal — we’ll give you the words.",0]]}
  ];

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";

    step = -1;
    Object.keys(answers).forEach(k => delete answers[k]);

    render();
    setTimeout(() => nextBtn?.focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  openBtns.forEach(b => b.addEventListener("click", openModal));
  closeBtns.forEach(b => b.addEventListener("click", closeModal));
  document.addEventListener("keydown",(e)=> {
    if (modal?.getAttribute("aria-hidden")==="false" && e.key==="Escape") closeModal();
  });

  function computeSnapshot() {
    const lensScores = {};
    LENSES.forEach(l => (lensScores[l.id] = []));

    QUESTIONS.forEach(q => {
      if (answers[q.id] != null) lensScores[q.lens].push(answers[q.id]);
    });

    const lensResults = LENSES.map(l => {
      const vals = lensScores[l.id];
      const pct = vals.length ? (vals.reduce((a,b)=>a+b,0) / (vals.length * 3)) * 100 : 0;
      const pctClamped = clamp(Math.round(pct), 0, 100);
      const label = labelForPct(pctClamped);
      return { id:l.id, name:l.name, pct:pctClamped, label };
    });

    // weakest/strongest for messaging (based on pct)
    const sorted = [...lensResults].sort((a,b)=>a.pct-b.pct);
    const weakest = sorted.slice(0,2).map(x=>x.id);
    const strongest = sorted.slice(-2).map(x=>x.id);

    return {
      version:"cs_snapshot_v1",
      createdAt: new Date().toISOString(),
      lensResultsByWeakness: sorted,
      weakest,
      strongest,
      answers: { ...answers }
    };
  }

  function render() {
    if (!form || !nextBtn || !backBtn) return;

    form.innerHTML = "";
    if (lensContextBox) lensContextBox.hidden = true;

    backBtn.disabled = step <= 0;
    nextBtn.disabled = true;

    if (step < 0) {
      nextBtn.textContent = "Start";
      result && (result.hidden = true);
      return;
    }

    if (step >= QUESTIONS.length) {
      showResults();
      return;
    }

    result && (result.hidden = true);

    const q = QUESTIONS[step];
    if (lensContextBox) lensContextBox.hidden = false;
    if (lensContextTitle) lensContextTitle.textContent = LENSES.find(l=>l.id===q.lens)?.name || "Lens";
    if (lensContextCopy) lensContextCopy.textContent = LENS_CONTEXT[q.lens] || "";

    const wrap = document.createElement("div");
    wrap.className = "q";

    wrap.innerHTML = `
      <div class="q-title">${escapeHtml(q.title)}</div>
      <p class="q-help">${escapeHtml(q.help)}</p>
    `;

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
    nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
    if (answers[q.id] != null) nextBtn.disabled = false;
  }

  function showResults() {
    if (!result || !grid || !resultCopy) return;

    const snap = computeSnapshot();
    setStoredSnapshot(snap);

    result.hidden = false;
    grid.innerHTML = "";

    const byId = Object.fromEntries(snap.lensResultsByWeakness.map(x => [x.id, x]));
    const ordered = LENSES.map(l => byId[l.id]);

    ordered.forEach(lr => {
      const card = document.createElement("div");
      card.className = "signal";
      card.innerHTML = `
        <div class="signal-top">
          <p>${escapeHtml(lr.name)}</p>
          <span class="signal-label">${escapeHtml(lr.label)}</span>
        </div>
        <div class="bar"><span style="width:${lr.pct}%"></span></div>
      `;
      grid.appendChild(card);
    });

    const strongestNames = snap.strongest.map(id => LENSES.find(l=>l.id===id)?.name || id).join(" and ");
    const weakestNames = snap.weakest.map(id => LENSES.find(l=>l.id===id)?.name || id).join(" and ");

    resultCopy.innerHTML = `
      <h4>A clear starting picture — with gentle next steps.</h4>
      <p>
        Right now your household signal shows strengths in <strong>${escapeHtml(strongestNames)}</strong>,
        and the biggest opportunities for calm improvement are in <strong>${escapeHtml(weakestNames)}</strong>.
      </p>
      <ul style="margin:12px 0 0; padding-left:18px;">
        <li>Pick one “seed” this week in your weakest lens (15–30 minutes).</li>
        <li>Create one shared household rule that reduces pressure decisions (pause → verify).</li>
        <li>Choose a monthly maintenance rhythm: updates + backups + quick privacy check.</li>
        <li>Your Resources Hub is now ready on the Resources page.</li>
      </ul>
      <p class="small" style="margin-top:10px;">
        You can open your personalised resources now — nothing is uploaded.
      </p>
    `;

    // Enable "attach snapshot" button if present
    const attach = $("#attachSnapshotBtn");
    if (attach) attach.disabled = false;

    // After finishing, ensure the "Open resources" link works immediately
    const go = $("#goToResources");
    if (go) go.href = "resources.html";

    setTimeout(() => {
      result.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 60);
  }

  nextBtn?.addEventListener("click", () => { step++; render(); });
  backBtn?.addEventListener("click", () => { step = Math.max(-1, step - 1); render(); });

  /* ---------- Nav ---------- */
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
        navToggle?.setAttribute("aria-expanded","false");
      }
      target.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });

  /* ---------- Audit email (kept simple) ---------- */
  $("#auditRequestForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const to = "hello@cyberseeds.co.uk";
    const fd = new FormData(e.target);

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

    const attachBtn = $("#attachSnapshotBtn");
    const include = attachBtn && attachBtn.textContent.includes("attached");
    if (include) {
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

    window.location.href =
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  $("#attachSnapshotBtn")?.addEventListener("click", () => {
    const snap = getStoredSnapshot();
    if (!snap) return;
    const btn = $("#attachSnapshotBtn");
    const on = btn.textContent.includes("attached");
    btn.textContent = on ? "Attach my snapshot summary" : "Snapshot summary attached ✓";
    toast(on ? "Snapshot removed." : "Snapshot will be included.");
  });

  /* ---------- Practitioner mode hidden fix stays (close works on mobile) ---------- */
  const practitionerOverlay = $("#practitionerOverlay");
  $("#closePractitioner")?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (practitionerOverlay) practitionerOverlay.hidden = true;
  });
  practitionerOverlay?.addEventListener("click", (e) => {
    if (e.target === practitionerOverlay) practitionerOverlay.hidden = true;
  });

  // Secret open: Ctrl+Alt+P or typing "seedmode" outside inputs
  let keyBuffer = "";
  function openPractitioner() {
    if (!practitionerOverlay) return;
    practitionerOverlay.hidden = false;
    toast("Practitioner mode enabled.");
  }
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "p") {
      openPractitioner(); return;
    }
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

  $("#toggleDebug")?.addEventListener("click", () => {
    const panel = $("#debugPanel");
    if (!panel) return;
    const showing = !panel.hidden;
    panel.hidden = showing;
    if (!showing) {
      const snap = getStoredSnapshot();
      panel.textContent = snap ? JSON.stringify(snap, null, 2) : "No snapshot saved yet.";
    }
  });

  $("#copySnapshotJson")?.addEventListener("click", () => {
    const snap = getStoredSnapshot();
    if (!snap) return toast("No snapshot found.");
    copyToClipboard(JSON.stringify(snap));
  });

  /* ---------- Auto-open modal if ?snapshot=1 ---------- */
  const params = new URLSearchParams(window.location.search);
  if (params.get("snapshot") === "1") {
    setTimeout(openModal, 80);
  }

  /* ---------- Set year ---------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // initial render
  if (form) render();

  /* ---------- Copy pack on index if you later add buttons (safe) ---------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy-pack]");
    if (!btn) return;
    const id = btn.getAttribute("data-copy-pack");
    const snap = getStoredSnapshot();
    if (!snap) return;

    const byId = lensMapFromSnapshot(snap);
    const lr = byId[id];
    const lib = LENS_LIBRARY[id];
    if (!lr || !lib) return;

    const seeds = lib.seeds[lr.label] || [];
    const txt =
      `Cyber Seeds — Resource Pack\n\n` +
      `${lr.name} (${lr.label} • ${lr.pct}%)\n\n` +
      `Purpose:\n${lib.purpose}\n\n` +
      `Practices:\n${lib.practices.map(x => `- ${x}`).join("\n")}\n\n` +
      `Outcomes:\n${lib.outcomes.map(x => `- ${x}`).join("\n")}\n\n` +
      `This week’s seed:\n${seeds.map(x => `- ${x}`).join("\n")}\n`;

    copyToClipboard(txt);
  });

})();
