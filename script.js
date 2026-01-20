/* =========================================
   Cyber Seeds — Site + Snapshot + Resources
   ========================================= */
console.log("✅ Cyber Seeds loaded");

window.addEventListener("error", e =>
  console.error("SCRIPT ERROR:", e.error || e.message)
);
window.addEventListener("unhandledrejection", e =>
  console.error("UNHANDLED PROMISE:", e.reason)
);

document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel) || []);

  /* =============================
     YEAR
  ============================= */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* =============================
     MOBILE NAV (toggle menu)
  ============================= */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  if (navToggle && navMenu) {
    const closeNav = () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    $$("a", navMenu).forEach(a => a.addEventListener("click", closeNav));
    document.addEventListener("click", e => {
      if (!navMenu.classList.contains("is-open")) return;
      if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* =============================
     SNAPSHOT ELEMENTS
  ============================= */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const resultSection = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMeta = $("#stepMeta");
  const controls = $("#snapshotControls");
  const closeBtn = $("#closeSnapshot");
  const chipsWrap = $("#snapshotChips");
  const exportBtn = $("#exportSnapshot");
  const retakeBtn = $("#retakeSnapshot");
  const scrollEl = $("#snapshotScroll");
  const resourcesEl = $("#resourcesHub");

  if (!modal || !form || !nextBtn || !backBtn) return;  // exit if snapshot modal not present on this page

  /* =============================
     QUESTIONS (Lens-specific)
  ============================= */
  const QUESTIONS = [
    {
      lens: "Network",
      q: "How protected is your home Wi-Fi beyond just the Wi-Fi password?",
      a: [
        { t: "Locked down", sub: "Router admin password changed • WPS off • guest Wi-Fi used", s: 4 },
        { t: "Mostly protected", sub: "Strong Wi-Fi password but unsure about router settings", s: 3 },
        { t: "Basic / default", sub: "Old/shared password • router never checked", s: 2 },
        { t: "No idea", sub: "I wouldn’t know where to look", s: 1 }
      ]
    },
    {
      lens: "Devices",
      q: "How safe are the devices people actually use day-to-day?",
      a: [
        { t: "Hardened", sub: "Auto-updates • screen locks • backups working", s: 4 },
        { t: "Mostly OK", sub: "Updates usually happen, some lag behind", s: 3 },
        { t: "Patchy", sub: "Old devices or missing locks/backups", s: 2 },
        { t: "Unsure", sub: "We just use them — no setup", s: 1 }
      ]
    },
    {
      lens: "Privacy",
      q: "How protected are your most important accounts (email, Apple/Google, banking)?",
      a: [
        { t: "Strongly protected", sub: "Unique passwords • password manager • 2-step on email", s: 4 },
        { t: "Some protection", sub: "Some 2-step but passwords reused", s: 3 },
        { t: "Weak protection", sub: "Reused passwords or recovery not reviewed", s: 2 },
        { t: "Overwhelmed", sub: "I avoid account settings", s: 1 }
      ]
    },
    {
      lens: "Scams",
      q: "If a message creates urgency (bank, parcel, ‘pay now’), what happens?",
      a: [
        { t: "Pause + verify", sub: "We check via official app or saved number", s: 4 },
        { t: "Cautious", sub: "We hesitate but sometimes click first", s: 3 },
        { t: "Pressured", sub: "Urgency sometimes wins", s: 2 },
        { t: "Already affected", sub: "We’ve lost money/data before", s: 1 }
      ]
    },
    {
      lens: "Wellbeing",
      q: "How is digital life affecting sleep, focus, and calm at home?",
      a: [
        { t: "Balanced", sub: "Boundaries feel calm • sleep mostly protected", s: 4 },
        { t: "A bit noisy", sub: "Some disruption, but manageable", s: 3 },
        { t: "Strained", sub: "Arguments, exhaustion, stress", s: 2 },
        { t: "Overwhelming", sub: "It regularly feels out of control", s: 1 }
      ]
    }
  ];

  const CHIPS = [
    "Runs locally on this device",
    "No accounts • no tracking",
    "2 minutes • 5 questions",
    "Clear next steps"
  ];

  /* =============================
     STATE VARIABLES
  ============================= */
  let step = -1;
  let answers = new Array(QUESTIONS.length).fill(null);

  /* =============================
     iOS BODY LOCK HELPERS
  ============================= */
  let scrollY = 0;
  const lockBody = () => {
    scrollY = window.scrollY || 0;
    document.documentElement.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  };
  const unlockBody = () => {
    document.documentElement.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  };

  /* =============================
     CALCULATION (Score + Stage)
  ============================= */
  function calcSnapshot() {
    const scores = {};
    QUESTIONS.forEach(q => { scores[q.lens] = 0; });
    QUESTIONS.forEach((q, i) => {
      if (answers[i] != null) scores[q.lens] += answers[i];
    });
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((sum, [, val]) => sum + val, 0);
    let stage;
    if (total >= 18) {
      stage = { name: "Clear", desc: "Your system feels stable — keep it steady." };
    } else if (total >= 13) {
      stage = { name: "Emerging", desc: "A few risk flows need tightening." };
    } else {
      stage = { name: "Vulnerable", desc: "Small, calm changes will reduce stress and risk quickly." };
    }
    return {
      stage,
      strongest: ranked[0][0],
      weakest: ranked[ranked.length - 1][0],
      scores,
      total
    };
  }

  /* =============================
     RENDER FUNCTIONS (Intro/Q/Result)
  ============================= */
  function renderIntro() {
    stepMeta.textContent = "";
    form.innerHTML = `<p class="muted">This is a calm signal — not a test. Answer as you are.</p>`;
    resultSection.hidden = true;
    controls.style.display = "flex";
    backBtn.disabled = true;
    nextBtn.textContent = "Start";
    nextBtn.disabled = false;
  }

  function renderQuestion() {
    const q = QUESTIONS[step];
    const current = answers[step];
    stepMeta.textContent = `${step + 1} / ${QUESTIONS.length}`;
    form.innerHTML = `
      <h3 class="q-title">${q.q.replace(/</g, "&lt;")}</h3>
      <div class="choices">
        ${q.a.map(opt => `
          <label class="choice">
            <input type="radio" name="q${step}" value="${opt.s}" ${current === opt.s ? "checked" : ""}>
            <div><b>${opt.t}</b><span>${opt.sub}</span></div>
          </label>
        `).join("")}
      </div>
    `;
    // Ensure Back button enabled (not for first question) and Next button state
    backBtn.disabled = false;
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = current == null;
    // Reset scroll position for long content
    if (scrollEl) scrollEl.scrollTop = 0;
    // Make each choice label clickable (so entire label area selects the radio)
    $$(".choice", form).forEach(label => {
      label.addEventListener("click", () => {
        const input = $("input", label);
        if (!input) return;
        input.checked = true;
        answers[step] = Number(input.value);
        nextBtn.disabled = false;
      });
    });
  }

  function renderResult() {
    const snapshot = calcSnapshot();
    form.innerHTML = "";  // clear out any remaining question UI
    // Headline showing stage name and description
    resultHeadline.textContent = `${snapshot.stage.name} signal — ${snapshot.stage.desc}`;
    // Strongest/Weakest lens text (handle ties: if all scores equal, indicate none stands out)
    if (snapshot.scores[snapshot.strongest] === snapshot.scores[snapshot.weakest]) {
      strongestLensEl.textContent = "None (all equal)";
      weakestLensEl.textContent = "None (all equal)";
    } else {
      strongestLensEl.textContent = snapshot.strongest;
      weakestLensEl.textContent = snapshot.weakest;
    }
    // Save snapshot results to localStorage for use on Resources page
    localStorage.setItem("seed_snapshot_v1", JSON.stringify(snapshot));
    // If on the Resources page, update the hub content immediately with new tips
    if (resourcesEl) populateResourcesHub(snapshot);
    // Show result section and hide controls
    resultSection.hidden = false;
    controls.style.display = "none";
    // Reset scroll to top in case result content is tall
    if (scrollEl) scrollEl.scrollTop = 0;
  }

  function render() {
    if (step < 0) {
      renderIntro();
    } else if (step >= QUESTIONS.length) {
      renderResult();
    } else {
      renderQuestion();
    }
  }

  /* =============================
     MODAL OPEN/CLOSE CONTROLS
  ============================= */
  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    // Inject context chips (static info) each time modal opens
    if (chipsWrap) {
      chipsWrap.innerHTML = CHIPS.map(c => `<div class="chip">${c}</div>`).join("");
    }
    lockBody();
    step = -1;
    answers.fill(null);
    render();
    nextBtn.focus();
    // Push a history state so that device Back button will close the modal instead of leaving page
    history.pushState({ snapshotOpen: true }, "", window.location.href);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockBody();
    // If a snapshot state was pushed, go back in history to remove it
    if (window.history.state && window.history.state.snapshotOpen) {
      window.history.back();
    }
  }

  // Open modal when any [data-open-snapshot] element is clicked
  $$("[data-open-snapshot]").forEach(btn => btn.addEventListener("click", openModal));
  // Close modal on close button or backdrop clicks
  closeBtn?.addEventListener("click", closeModal);
  $("[data-close]", modal)?.addEventListener("click", closeModal);

  // Next button logic
  nextBtn.addEventListener("click", () => {
    if (nextBtn.disabled) return;
    if (step < 0) {
      step = 0;
    } else if (answers[step] != null) {
      step++;
    }
    render();
  });
  // Back button logic
  backBtn.addEventListener("click", () => {
    step = step <= 0 ? -1 : step - 1;
    render();
  });

  // Export snapshot (download text file of results)
  exportBtn?.addEventListener("click", () => {
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) return;
    const data = JSON.parse(raw);
    const textContent =
`CYBER SEEDS — HOUSEHOLD SNAPSHOT

Overall Signal:
${data.stage.name}
${data.stage.desc}

Strongest Lens:
${data.scores[data.strongest] === data.scores[data.weakest] ? "None (all equal)" : data.strongest}

Weakest Lens:
${data.scores[data.strongest] === data.scores[data.weakest] ? "None (all equal)" : data.weakest}

Lens Breakdown:
- Network:   ${data.scores.Network}/4
- Devices:   ${data.scores.Devices}/4
- Privacy:   ${data.scores.Privacy}/4
- Scams:     ${data.scores.Scams}/4
- Wellbeing: ${data.scores.Wellbeing}/4

Nothing was sent anywhere.
This snapshot exists only on this device.
`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Cyber-Seeds-Household-Snapshot.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Retake (restart snapshot in the same modal session)
  retakeBtn?.addEventListener("click", () => {
    step = -1;
    answers.fill(null);
    render();
    // Show controls again for a fresh start
    controls.style.display = "flex";
  });

  /* =============================
     RESOURCES HUB POPULATION
  ============================= */
  const RESOURCES_CONTENT = {
    "Network": [
      "<b>Change default admin password:</b> Make sure the password to access your Wi-Fi router’s settings is not the factory default.",
      "<b>Use Guest Wi-Fi:</b> Keep new or untrusted devices on a separate guest network to isolate potential risks.",
      "<b>Disable WPS:</b> Turn off the one-touch WPS feature on your router if it’s enabled; it can be an easy way for attackers to connect."
    ],
    "Devices": [
      "<b>Enable auto-updates:</b> Turn on automatic software updates on phones, tablets, and computers to keep security fixes up to date without effort.",
      "<b>Use device locks:</b> Ensure every device has a PIN, passcode, or biometric lock so a lost device doesn’t become an open door.",
      "<b>Back up important data:</b> Use cloud backups (like iCloud or Google Drive) or an external drive so you won’t lose data if a device breaks or is compromised."
    ],
    "Privacy": [
      "<b>Unique, strong passwords:</b> Use different passwords for each important account — a password manager helps make this easy.",
      "<b>Add 2-step verification:</b> Enable two-factor authentication on key accounts (especially your email) to block most unauthorized access.",
      "<b>Review recovery options:</b> Make sure your account recovery email and phone number are up-to-date so only you can reset your passwords."
    ],
    "Scams": [
      "<b>Pause and verify:</b> If any message or call urges quick action, pause and verify the details via an official channel (e.g. your bank’s app or website).",
      "<b>Be cautious with links:</b> Don’t click links in unexpected texts or emails. Instead, navigate to the official site or app yourself to log in securely.",
      "<b>Share scam stories:</b> Talk with your family about suspicious messages or calls you’ve seen — sharing experiences helps everyone recognize and resist scams."
    ],
    "Wellbeing": [
      "<b>Set digital boundaries:</b> Choose device-free times (like during meals or after 9 PM) to protect family time and sleep routines.",
      "<b>Use built-in tools:</b> Try screen-time or wellbeing features on your devices to understand usage patterns and set gentle limits if needed.",
      "<b>Keep conversations open:</b> Regularly discuss online activities and feelings as a family. A supportive dialogue can reduce stress and overuse."
    ]
  };

  function populateResourcesHub(data = null) {
    if (!resourcesEl) return;
    // If no data passed in, try to load from localStorage
    let snapshotData = data;
    if (!snapshotData) {
      const stored = localStorage.getItem("seed_snapshot_v1");
      if (!stored) {
        resourcesEl.innerHTML = `<div class="card"><p class="muted">Take a snapshot to see personalised resources here.</p></div>`;
        return;
      }
      snapshotData = JSON.parse(stored);
    }
    const weakestLens = snapshotData.weakest;
    const strongestLens = snapshotData.strongest;
    const isAllEqual = snapshotData.scores[strongestLens] === snapshotData.scores[weakestLens];
    // If all lenses are tied:
    if (isAllEqual) {
      if (snapshotData.stage.name === "Clear") {
        // All lenses strong
        resourcesEl.innerHTML = `
          <div class="card">
            <p>All lenses in your snapshot are equally strong. Your household’s digital safety is well balanced! Keep up the good habits across all areas.</p>
          </div>
        `;
      } else {
        // All lenses equally moderate or weak
        resourcesEl.innerHTML = `
          <div class="card">
            <p>Your snapshot shows no single weakest lens — all areas are at a similar level. Choose any one lens to start improving; even small steps in any area will help reduce overall risk.</p>
          </div>
        `;
      }
      return;
    }
    // Normal case: one weakest lens identified
    const tips = RESOURCES_CONTENT[weakestLens] || [];
    resourcesEl.innerHTML = `
      <h2>Focus: ${weakestLens} Lens</h2>
      <div class="card">
        <ul class="ticks">
          ${tips.map(tip => `<li>${tip}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  // On initial load of Resources page, populate hub content if applicable
  if (resourcesEl) {
    populateResourcesHub();
  }

  // Handle browser back button: if modal is open, close it instead of leaving page
  window.addEventListener("popstate", e => {
    if (modal.classList.contains("is-open")) {
      // Prevent navigating away; just close the snapshot modal
      closeModal();
    }
  });
});
