/* =========================================================
   Cyber Seeds — Resources Hub
   Calm, local-first rendering for household resources
   ========================================================= */

(function () {
  "use strict";

  const SNAP_KEY = "cyberseeds_snapshot_latest_v3";

  function safeParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getSnapshot() {
    return safeParse(localStorage.getItem(SNAP_KEY), null);
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;

    const now = Date.now();
    const lensPercents = snapshot.lensPercents || snapshot.lenses || {};
    const stageValue = snapshot.stage;

    const stage =
      typeof stageValue === "string"
        ? { label: stageValue, message: snapshot.signal?.summary || "" }
        : {
            label: stageValue?.label || "Your household signal",
            message: stageValue?.message || snapshot.signal?.summary || ""
          };

    return {
      ...snapshot,
      schema: snapshot.schema || "cs.snapshot.v3",
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : now,
      id: snapshot.id || snapshot.snapshotId || String(now),
      hdss: Number.isFinite(snapshot.hdss) ? snapshot.hdss : 0,
      total: Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0),
      lensPercents,
      lenses: snapshot.lenses || lensPercents,
      focus: snapshot.focus || "privacy",
      strongest: snapshot.strongest || null,
      weakest: snapshot.weakest || null,
      stage
    };
  }

  function lensLabels() {
    return {
      network: "Home Wi-Fi",
      devices: "Devices",
      privacy: "Privacy & Accounts",
      scams: "Scams & Messages",
      wellbeing: "Children & Wellbeing"
    };
  }

  function formatLensName(value) {
    if (!value) return "";
    return lensLabels()[value] || (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
  }

  function getLensBand(value) {
    if (value >= 75) return "More settled";
    if (value >= 50) return "Building";
    return "Needs attention";
  }

  function getLensSummary(lens, value) {
    const band = getLensBand(value);

    const labels = {
      network: {
        "More settled": "Your home connection looks more settled right now.",
        Building: "Your home connection is working, with room for a few small improvements.",
        "Needs attention": "Your home connection may benefit from attention first."
      },
      devices: {
        "More settled": "Everyday device habits look more settled right now.",
        Building: "Device routines are partly in place and can become easier with consistency.",
        "Needs attention": "Device routines may need attention first."
      },
      privacy: {
        "More settled": "Privacy and account habits look more settled right now.",
        Building: "Some privacy habits are in place, with room for clearer defaults.",
        "Needs attention": "Privacy and account settings may need attention first."
      },
      scams: {
        "More settled": "Scam awareness looks more settled right now.",
        Building: "There is some awareness here, with room for calmer pause habits.",
        "Needs attention": "Scam messages and urgent requests may need attention first."
      },
      wellbeing: {
        "More settled": "Children’s digital wellbeing support looks more settled right now.",
        Building: "Some boundaries are in place, with room for clearer support.",
        "Needs attention": "Children’s online routines may need attention first."
      }
    };

    return labels[lens]?.[band] || "This area can improve through small, steady steps.";
  }

  function getLensDetails(lens) {
    const copy = {
      network: {
        interpretation:
          "A calmer home connection supports everyday trust. Small checks, such as reviewing router settings and recognising which devices belong in the home, can help things feel more settled.",
        next:
          "Choose one regular time each month to check your router and remove any device you do not recognise."
      },
      devices: {
        interpretation:
          "Simple device routines often reduce stress. When updates, charging, and shared use feel predictable, digital life usually becomes easier for everyone in the household.",
        next:
          "Pick one weekly moment for a quick device check, such as updates before the weekend."
      },
      privacy: {
        interpretation:
          "Privacy works best when it feels understandable and repeatable. Clear sign-in habits and recovery details can help the household feel more in control.",
        next:
          "Choose one important account and review its password, sign-in method, and recovery options."
      },
      scams: {
        interpretation:
          "Scam resistance often grows through shared pause habits. A calm plan for what to do before clicking, replying, or paying can lower pressure and protect decision-making.",
        next:
          "Agree one household pause phrase to use before opening links, sharing codes, or sending money."
      },
      wellbeing: {
        interpretation:
          "Digital wellbeing is usually strongest when expectations are clear and support feels safe. Children often benefit from calm boundaries and regular check-ins rather than one-off rules.",
        next:
          "Set one short weekly check-in about online life, what is going well, and what support is needed."
      }
    };

    return copy[lens] || {
      interpretation:
        "Small and repeated actions are often easier to keep than big one-off changes.",
      next:
        "Choose one manageable next step and return to it in a week."
    };
  }

  async function getFocusSeed(focus) {
    if (!focus) return null;

    try {
      if (!window.CSSeedForge) {
        await import("/engine/seedforge.js");
      }

      const api = await window.CSSeedForge.load();
      const seeds = api?.seedsForLens ? api.seedsForLens(focus) : [];
      return Array.isArray(seeds) && seeds.length ? seeds[0] : null;
    } catch {
      return null;
    }
  }

  function downloadPassport(snapshot) {
    const readable = {
      schema: snapshot.schema || "cs.snapshot.v3",
      id: snapshot.id || null,
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : null,
      total: Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0),
      stage: snapshot.stage || { label: "Your household signal", message: "" },
      focus: snapshot.focus || null,
      lenses: snapshot.lenses || snapshot.lensPercents || {},
      lensPercents: snapshot.lensPercents || snapshot.lenses || {},
      answers: snapshot.answers || {}
    };

    const payload = JSON.stringify(readable, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "cyber-seeds-household-passport.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async function render() {
    const root = document.getElementById("resourcesRoot");
    if (!root) return;

    const rawSnapshot = getSnapshot();

    if (!rawSnapshot) {
      root.innerHTML = `
        <section class="resource-panel" data-cs-resources-hub>
          <p class="kicker">Resources</p>
          <h1>Start with your Household Snapshot</h1>
          <p>
            This page becomes more useful after a short snapshot. Once you complete it, you will see
            your household signal, what each area means, and a calm next step.
          </p>
          <p>
            Nothing is uploaded unless you choose to share it.
          </p>
          <p>
            <a href="/snapshot/" class="btn-primary">Open the Household Snapshot</a>
          </p>
        </section>
      `;
      return;
    }

    const snapshot = normalizeSnapshot(rawSnapshot);
    if (!snapshot) return;

    if (!rawSnapshot.schema) {
      localStorage.setItem(SNAP_KEY, JSON.stringify(snapshot));
    }

    const lensValues = snapshot.lensPercents || snapshot.lenses || {};
    const stageLabel =
      typeof snapshot.stage === "string"
        ? snapshot.stage
        : snapshot.stage?.label || "Your household signal";

    const stageMessage =
      snapshot.signal?.summary ||
      snapshot.stage?.message ||
      "This is a calm reading of how things look right now. It can help you choose one useful next step.";

    const focusLensKey = snapshot.focus || "privacy";
    const focusLens = formatLensName(focusLensKey);
    const signalValue = Number.isFinite(snapshot.total)
      ? snapshot.total
      : Math.round(snapshot.hdss || 0);

    const seed = await getFocusSeed(focusLensKey);
    const weekText = seed?.this_week || seed?.thisWeek || seed?.week || "";
    const monthText = seed?.this_month || seed?.thisMonth || seed?.month || "";

    const seedHtml = seed
      ? `
        <section class="resultCard" style="margin-top:16px">
          <h2>${seed.title || "Your next calm step"}</h2>
          <p><strong>Today:</strong> ${seed.today || "Take one small step that feels manageable."}</p>
          ${weekText ? `<p><strong>This week:</strong> ${weekText}</p>` : ""}
          ${monthText ? `<p><strong>This month:</strong> ${monthText}</p>` : ""}
        </section>
      `
      : `
        <section class="resultCard" style="margin-top:16px">
          <h2>Your next calm step</h2>
          <p>A next step will appear here when your snapshot details are ready.</p>
        </section>
      `;

    root.innerHTML = `
      <section class="resource-panel" data-cs-resources-hub>
        <section class="signal-header">
          <p class="signal-kicker">Your household signal</p>
          <h1 class="signal-pattern" data-stage-label>${stageLabel}</h1>
          <p class="signal-description">${stageMessage}</p>
        </section>

        <section class="signal-score-block">
          <div class="score-circle">
            <span class="score-number">${signalValue}</span>
            <span class="score-label">Household signal</span>
          </div>
          <p class="certification-level">Area to focus on first: <span data-focus-lens>${focusLens}</span></p>
        </section>

        ${seedHtml}

        <section class="lens-breakdown">
         <h2>What each area is showing</h2>
         <p class="lens-breakdown-hint">
            Tap any area to open a plain-language explanation, why it matters, and a next calm step.
          </p>
          ${Object.entries(lensValues).map(([lens, value]) => `
            <article class="cs-lensRow ${lens === focusLensKey ? "cs-lensRow--focus" : ""}" data-lens="${lens}">
              <button class="cs-lensToggle" type="button" aria-expanded="${lens === focusLensKey ? "true" : "false"}">
                 <div class="cs-lensLeft">
                   <div class="cs-lensName">${formatLensName(lens)}</div>
                   <div class="cs-lensScore">${Math.round(value)}</div>
                 </div>
               
                 <div class="cs-lensRight">
                   <div class="cs-lensTopline">
                     <div class="cs-lensBand">${getLensBand(value)}</div>
                     <div class="cs-lensCue">
                       <span class="cs-lensCueText">${lens === focusLensKey ? "Open now" : "Tap to open"}</span>
                       <span class="cs-lensChevron" aria-hidden="true">${lens === focusLensKey ? "−" : "+"}</span>
                     </div>
                   </div>
                   <div class="cs-lensSummary">${getLensSummary(lens, value)}</div>
                 </div>
               </button>
              <div class="cs-lensDetails" ${lens === focusLensKey ? "" : "hidden"}>
                <p class="cs-lensInterpretation">${getLensDetails(lens).interpretation}</p>
                <p class="cs-lensDirection"><strong>Next calm step:</strong> ${getLensDetails(lens).next}</p>
              </div>
              <div class="lens-bar" style="padding:0 14px 14px;">
                <div class="lens-fill" style="width:${Math.round(value)}%"></div>
              </div>
            </article>
          `).join("")}
        </section>

        <section class="renewal-actions" aria-label="Next steps">
          <a class="btn-secondary" href="/snapshot/">Take the snapshot again</a>
          <button class="btn-secondary" type="button" id="downloadPassport">Save household passport</button>
          <a class="btn-primary" href="/book/">Book a full audit</a>
        </section>
      </section>
    `;

    document.getElementById("downloadPassport")?.addEventListener("click", () => {
      downloadPassport(snapshot);
    });

    root.querySelectorAll(".cs-lensToggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const details = toggle.parentElement?.querySelector(".cs-lensDetails");
        const cueText = toggle.querySelector(".cs-lensCueText");
        const cueIcon = toggle.querySelector(".cs-lensChevron");
        if (!details) return;
   
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !expanded;
   
        toggle.setAttribute("aria-expanded", String(nextExpanded));
        details.hidden = !nextExpanded;
   
        if (cueText) cueText.textContent = nextExpanded ? "Close" : "Tap to open";
        if (cueIcon) cueIcon.textContent = nextExpanded ? "−" : "+";
      });
    });
  }

  function init() {
    render();
    window.addEventListener("cs:snapshot-updated", () => {
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
