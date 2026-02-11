/* =========================================================
   Cyber Seeds — Homepage Script
   (No snapshot engine here)
   ========================================================= */
(function(){
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);

  // Year
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Mobile nav (if present)
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  if (navToggle && navMenu){
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Lens guidance toggles (your existing canon behaviour)
  const toggles = Array.from(document.querySelectorAll("[data-lens-toggle]"));
  function closeAll(exceptBtn = null){
    toggles.forEach(btn => {
      if (btn === exceptBtn) return;
      const id = btn.getAttribute("aria-controls");
      const panel = id && document.getElementById(id);
      btn.setAttribute("aria-expanded", "false");
      if (panel) panel.hidden = true;
    });
  }
  toggles.forEach(btn => {
    const id = btn.getAttribute("aria-controls");
    const panel = id && document.getElementById(id);
    btn.setAttribute("aria-expanded", "false");
    if (panel) panel.hidden = true;
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      closeAll(btn);
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (panel) panel.hidden = isOpen;
    });
  });

  // Systems Map Insight Panel (if present)
  (function systemsMap(){
    const nodes = Array.from(document.querySelectorAll(".cs-node"));
    if (!nodes.length) return;

    const kicker = document.getElementById("csInsightKicker");
    const title  = document.getElementById("csInsightTitle");
    const body   = document.getElementById("csInsightBody");
    const meta   = document.getElementById("csInsightMeta");
    const impactList = document.getElementById("impactList");
    const reset  = document.getElementById("csResetSystems");

    const statusItems = {
      network: document.getElementById("statusNetworkMini"),
      devices: document.getElementById("statusDevicesMini"),
      privacy: document.getElementById("statusPrivacyMini"),
      scams: document.getElementById("statusScamsMini"),
      wellbeing: document.getElementById("statusWellbeingMini")
    };

    const statusLabels = {
      network: "Network",
      devices: "Devices",
      privacy: "Privacy",
      scams: "Scams",
      wellbeing: "Wellbeing"
    };

    const defaults = {
      kicker: "Household view",
      title: "The invisible becomes visible",
      body: "Tap any system in the map to see what it means in daily life — calmly and proportionately.",
      impact: [
        "Every system shapes the others, so small shifts ripple gently across the home.",
        "The map keeps attention on connection rather than blame.",
        "You can start anywhere and still make progress."
      ],
      status: { network:"Steady", devices:"Steady", privacy:"Steady", scams:"Steady", wellbeing:"Steady" }
    };

    const insights = {
      network: {
        kicker:"Network lens",
        title:"Your Wi-Fi is the home’s circulation system",
        body:"Stable router settings quietly support everything else.",
        impact:[
          "Connectivity affects every device and shared routine.",
          "Router settings shape who can enter the household system.",
          "Small adjustments can reduce daily friction."
        ],
        status:{ network:"In focus", devices:"Connected", privacy:"Connected", scams:"Connected", wellbeing:"Connected" }
      },
      devices: {
        kicker:"Devices lens",
        title:"Devices are the working organs",
        body:"Simple upkeep keeps daily life running smoothly.",
        impact:[
          "Updates and backups prevent sudden disruption.",
          "Healthy devices keep school, work, and play more stable.",
          "Maintenance reduces stress during busy weeks."
        ],
        status:{ network:"Connected", devices:"In focus", privacy:"Connected", scams:"Connected", wellbeing:"Connected" }
      },
      privacy: {
        kicker:"Privacy lens",
        title:"Accounts form the immune system",
        body:"Strong boundaries prevent sudden loss or stress.",
        impact:[
          "Secure accounts protect everyone’s access and memories.",
          "Recovery routes keep the household resilient when things go wrong.",
          "Clear boundaries reduce confusion and urgency."
        ],
        status:{ network:"Connected", devices:"Connected", privacy:"In focus", scams:"Connected", wellbeing:"Connected" }
      },
      scams: {
        kicker:"Scams lens",
        title:"Scams test the perimeter",
        body:"Calm verification routines prevent urgency from becoming damage.",
        impact:[
          "Pausing before action lowers pressure for everyone.",
          "Shared scripts make it easier to check suspicious messages.",
          "A calm response reduces ripple effects."
        ],
        status:{ network:"Connected", devices:"Connected", privacy:"Connected", scams:"In focus", wellbeing:"Connected" }
      },
      wellbeing: {
        kicker:"Wellbeing lens",
        title:"Wellbeing keeps the system calm",
        body:"Small routines around screens and rest reduce friction at home.",
        impact:[
          "Screen rhythms shape mood, sleep, and attention.",
          "Shared expectations help everyone feel safer and calmer.",
          "Gentle limits keep the system sustainable."
        ],
        status:{ network:"Connected", devices:"Connected", privacy:"Connected", scams:"Connected", wellbeing:"In focus" }
      }
    };

    function renderStatus(statuses){
      Object.entries(statusItems).forEach(([key, el]) => {
        if (!el) return;
        const val = statuses?.[key] || defaults.status[key] || "—";
        el.innerHTML = `<span class="status-label">${statusLabels[key]}</span><span class="status-value">${val}</span>`;
      });
    }

    function renderImpact(items){
      if (!impactList) return;
      impactList.innerHTML = "";
      (items || []).forEach(text => {
        const li = document.createElement("li");
        li.textContent = text;
        impactList.appendChild(li);
      });
    }

    function resetView(){
      nodes.forEach(n => n.classList.remove("is-active"));
      if (kicker) kicker.textContent = defaults.kicker;
      if (title) title.textContent = defaults.title;
      if (body) body.textContent = defaults.body;
      if (meta) meta.hidden = true;
      renderStatus(defaults.status);
      renderImpact(defaults.impact);
    }

    function setInsight(key){
      const data = insights[key];
      if (!data) return;

      nodes.forEach(n => n.classList.toggle("is-active", n.dataset.node === key));
      if (kicker) kicker.textContent = data.kicker;
      if (title) title.textContent = data.title;
      if (body) body.textContent = data.body;
      if (meta) meta.hidden = false;
      renderStatus(data.status);
      renderImpact(data.impact);
    }

    nodes.forEach(node => {
      node.addEventListener("click", () => setInsight(node.dataset.node));
      node.addEventListener("focus", () => setInsight(node.dataset.node));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " "){
          e.preventDefault();
          setInsight(node.dataset.node);
        }
      });
    });

    reset?.addEventListener("click", resetView);
    resetView();
  })();

  // =========================================================
  // Canon Event Bridge: Snapshot → Homepage results
  // =========================================================
  const LENS_LABELS = {
    network: "Network",
    devices: "Devices",
    privacy: "Accounts & Privacy",
    scams: "Scams & Messages",
    wellbeing: "Children & Wellbeing"
  };

  function ensureResultsMarkup(section){
    // We do NOT change index.html source. If placeholders aren’t present,
    // we render a canon-grade block at runtime.
    if (!section) return null;

    const existing = section.querySelector("[data-cs-home-results]");
    if (existing) return existing;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-cs-home-results", "true");
    wrap.innerHTML = `
      <div class="container">
        <h2>Snapshot results</h2>
        <p class="muted" id="csHomeSignalSummary"></p>
        <div class="card" style="margin-top:14px;">
          <h3 style="margin:0;">Your household signal</h3>
          <p class="muted" id="csHomeSignalLine" style="margin-top:8px;"></p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <span class="meta-chip" id="csHomeFocus"></span>
            <span class="meta-chip" id="csHomeStrongest"></span>
            <span class="meta-chip" id="csHomeRisk"></span>
          </div>
        </div>

        <div class="card" style="margin-top:14px;">
          <h3 style="margin:0;">Your Digital Seeds</h3>
          <p class="muted" id="csHomeSeedTitle" style="margin-top:8px;"></p>
          <ul style="margin:10px 0 0 18px;">
            <li id="csHomeSeedToday"></li>
            <li id="csHomeSeedWeek"></li>
            <li id="csHomeSeedMonth"></li>
          </ul>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
            <a class="btn primary" href="/resources/">Open personalised guidance</a>
            <button class="btn ghost" type="button" id="csHomeRetake">Retake snapshot</button>
          </div>
        </div>
      </div>
    `;

    section.appendChild(wrap);
    return wrap;
  }

  function renderHomepageSnapshot(snapshot){
    const section = document.getElementById("snapshotResults");
    if (!section) return;

    const wrap = ensureResultsMarkup(section);
    if (!wrap) return;

    section.hidden = false;

    const score = Math.round(snapshot?.total ?? snapshot?.hdss ?? 0);
    const overall = snapshot?.signal?.overall || "STABLE";
    const summary = snapshot?.signal?.summary || "Your snapshot has been saved locally.";
    const focus = snapshot?.focus || "privacy";
    const strongest = snapshot?.strongest || "privacy";
    const risk = snapshot?.signal?.riskPressure || "—";
    const seed = snapshot?.seed || {};

    const signalSummary = wrap.querySelector("#csHomeSignalSummary");
    const signalLine = wrap.querySelector("#csHomeSignalLine");
    const focusEl = wrap.querySelector("#csHomeFocus");
    const strongEl = wrap.querySelector("#csHomeStrongest");
    const riskEl = wrap.querySelector("#csHomeRisk");

    const seedTitle = wrap.querySelector("#csHomeSeedTitle");
    const seedToday = wrap.querySelector("#csHomeSeedToday");
    const seedWeek = wrap.querySelector("#csHomeSeedWeek");
    const seedMonth = wrap.querySelector("#csHomeSeedMonth");

    if (signalSummary) signalSummary.textContent = summary;
    if (signalLine) signalLine.textContent = `${overall} signal (${score}/100). Saved locally on this device.`;
    if (focusEl) focusEl.textContent = `Focus: ${LENS_LABELS[focus] || focus}`;
    if (strongEl) strongEl.textContent = `Strongest: ${LENS_LABELS[strongest] || strongest}`;
    if (riskEl) riskEl.textContent = `Risk pressure: ${risk}`;

    if (seedTitle) seedTitle.textContent = seed.title || "Your next Digital Seed";
    if (seedToday) seedToday.textContent = `Today: ${seed.today || "Choose one small calm step in your focus lens."}`;
    if (seedWeek) seedWeek.textContent = `This week: ${seed.this_week || "Build one routine you can repeat."}`;
    if (seedMonth) seedMonth.textContent = `This month: ${seed.this_month || "Make it stick with a simple household agreement."}`;

    // Retake button should trigger the component if present
    wrap.querySelector("#csHomeRetake")?.addEventListener("click", () => {
      document.querySelector("cyber-seeds-snapshot")?.open?.();
    });
  }

  window.addEventListener("cs:snapshot-updated", (e) => {
    console.log("Snapshot updated — refresh resources if needed.");
    const snapshot = e?.detail?.snapshot || null;
    if (!snapshot) return;
    renderHomepageSnapshot(snapshot);
  });

  // If a snapshot already exists, render it immediately on load.
  (function renderExistingIfPresent(){
    try {
      const raw = localStorage.getItem("cyberseeds_snapshot_v3");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.id) return;
      renderHomepageSnapshot(parsed);
    } catch {}
  })();
})();
