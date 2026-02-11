/* =========================================================
   Cyber Seeds — Presentation Layer Only
   Clean Web Component Architecture
   ========================================================= */

"use strict";

/* =========================================================
   Snapshot Update Listener
   ---------------------------------------------------------
   The Web Component handles scoring + storage.
   This file only reacts if needed.
   ========================================================= */

window.addEventListener("cs:snapshot-updated", () => {
  console.log("Snapshot updated — refresh resources if needed.");
});


/* =========================================================
   Systems Map Insight Panel
   ========================================================= */

(() => {

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
    status: {
      network: "Steady",
      devices: "Steady",
      privacy: "Steady",
      scams: "Steady",
      wellbeing: "Steady"
    }
  };

  const insights = {
    network: {
      kicker: "Network lens",
      title: "Your Wi-Fi is the home’s circulation system",
      body: "Stable router settings quietly support everything else.",
      impact: [
        "Connectivity affects every device and shared routine.",
        "Router settings shape who can enter the household system.",
        "Small adjustments can reduce daily friction."
      ],
      status: {
        network: "In focus",
        devices: "Connected",
        privacy: "Connected",
        scams: "Connected",
        wellbeing: "Connected"
      }
    },
    devices: {
      kicker: "Devices lens",
      title: "Devices are the working organs",
      body: "Simple upkeep keeps daily life running smoothly.",
      impact: [
        "Updates and backups prevent sudden disruption.",
        "Healthy devices keep school, work, and play more stable.",
        "Maintenance reduces stress during busy weeks."
      ],
      status: {
        network: "Connected",
        devices: "In focus",
        privacy: "Connected",
        scams: "Connected",
        wellbeing: "Connected"
      }
    },
    privacy: {
      kicker: "Privacy lens",
      title: "Accounts form the immune system",
      body: "Strong boundaries prevent sudden loss or stress.",
      impact: [
        "Secure accounts protect everyone’s access and memories.",
        "Recovery routes keep the household resilient when things go wrong.",
        "Clear boundaries reduce confusion and urgency."
      ],
      status: {
        network: "Connected",
        devices: "Connected",
        privacy: "In focus",
        scams: "Connected",
        wellbeing: "Connected"
      }
    },
    scams: {
      kicker: "Scams lens",
      title: "Scams test the perimeter",
      body: "Calm verification routines prevent urgency from becoming damage.",
      impact: [
        "Pausing before action lowers pressure for everyone.",
        "Shared scripts make it easier to check suspicious messages.",
        "A calm response reduces ripple effects."
      ],
      status: {
        network: "Connected",
        devices: "Connected",
        privacy: "Connected",
        scams: "In focus",
        wellbeing: "Connected"
      }
    },
    wellbeing: {
      kicker: "Wellbeing lens",
      title: "Wellbeing keeps the system calm",
      body: "Small routines around screens and rest reduce friction at home.",
      impact: [
        "Screen rhythms shape mood, sleep, and attention.",
        "Shared expectations help everyone feel safer and calmer.",
        "Gentle limits keep the system sustainable."
      ],
      status: {
        network: "Connected",
        devices: "Connected",
        privacy: "Connected",
        scams: "Connected",
        wellbeing: "In focus"
      }
    }
  };

  function renderStatus(statuses){
    Object.entries(statusItems).forEach(([key, element]) => {
      if (!element) return;
      const value = statuses?.[key] || defaults.status[key] || "—";
      element.innerHTML =
        `<span class="status-label">${statusLabels[key]}</span>
         <span class="status-value">${value}</span>`;
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
    if (title)  title.textContent  = defaults.title;
    if (body)   body.textContent   = defaults.body;
    if (meta)   meta.hidden = true;
    renderStatus(defaults.status);
    renderImpact(defaults.impact);
  }

  function setInsight(key){
    const data = insights[key];
    if (!data) return;

    nodes.forEach(n =>
      n.classList.toggle("is-active", n.dataset.node === key)
    );

    if (kicker) kicker.textContent = data.kicker;
    if (title)  title.textContent  = data.title;
    if (body)   body.textContent   = data.body;
    if (meta)   meta.hidden = false;

    renderStatus(data.status);
    renderImpact(data.impact);
  }

  nodes.forEach(node => {
    node.addEventListener("click", () => {
      setInsight(node.dataset.node);
    });

    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setInsight(node.dataset.node);
      }
    });
  });

  reset?.addEventListener("click", resetView);

  resetView();

})();


/* =========================================================
   Lens Guidance Toggles
   ========================================================= */

(() => {

  const toggles = Array.from(document.querySelectorAll("[data-lens-toggle]"));

  function closeAll(exceptBtn = null){
    toggles.forEach(btn => {
      if (btn === exceptBtn) return;
      const id = btn.getAttribute("aria-controls");
      const panel = id && document.getElementById(id);
      btn.setAttribute("aria-expanded","false");
      if (panel) panel.hidden = true;
    });
  }

  toggles.forEach(btn => {
    const id = btn.getAttribute("aria-controls");
    const panel = id && document.getElementById(id);

    btn.setAttribute("aria-expanded","false");
    if (panel) panel.hidden = true;

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      closeAll(btn);
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (panel) panel.hidden = isOpen;
    });
  });

})();
