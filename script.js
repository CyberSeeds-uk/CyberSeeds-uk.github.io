/* =========================================
   Cyber Seeds — Site + Snapshot + Resources
   iPhone/Safari hardened (body lock + menu)
   ========================================= */

console.log("✅ Cyber Seeds loaded");

window.addEventListener("error", e => console.error("SCRIPT ERROR:", e.error || e.message));
window.addEventListener("unhandledrejection", e => console.error("UNHANDLED PROMISE:", e.reason));

document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel, root = document) => root?.querySelector?.(sel) || null;
  const $$ = (sel, root = document) => Array.from(root?.querySelectorAll?.(sel) || []);

  /* -----------------------------
     YEAR
  ----------------------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* -----------------------------
     MOBILE NAV (reliable on iOS)
  ----------------------------- */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  if (navToggle && navMenu) {
    const closeNav = () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$("a", navMenu).forEach(a => a.addEventListener("click", closeNav));

    document.addEventListener("click", (e) => {
      if (!navMenu.classList.contains("is-open")) return;
      if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* -----------------------------
     SMOOTH SCROLL (optional)
  ----------------------------- */
  $$("[data-scroll]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.includes("#")) return;
      const hash = href.split("#")[1];
      const target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* -----------------------------
     ACCORDION BEHAVIOUR (one open per group)
  ----------------------------- */
  $$("[data-accordion]").forEach(group => {
    $$("details", group).forEach(d => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        $$("details", group).forEach(other => {
          if (other !== d) other.open = false;
        });
      });
    });
  });

  /* ==========================================================
     SNAPSHOT ENGINE
  ========================================================== */
  const modal = $("#snapshotModal");
  const form = $("#snapshotForm");
  const result = $("#snapshotResult");
  const resultHeadline = $("#resultHeadline");
  const strongestLensEl = $("#strongestLens");
  const weakestLensEl = $("#weakestLens");
  const nextBtn = $("#snapshotNext");
  const backBtn = $("#snapshotBack");
  const stepMeta = $("#stepMeta");
  const controls = $("#snapshotControls");
  const closeBtn = $("#closeSnapshot");
  const chipsWrap = $("#snapshotChips");

  if (modal && form && result && nextBtn && backBtn && stepMeta && controls) {

    const QUESTIONS = [
      {
        lens: "Network",
        q: "How protected is your home Wi-Fi (beyond just the Wi-Fi password)?",
        a: [
          { t: "Locked down", sub: "Router admin password changed • WPS off • guest Wi-Fi used", s: 4 },
          { t: "Mostly protected", sub: "Strong Wi-Fi password, but unsure about admin/WPS/updates", s: 3 },
          { t: "Basic / default", sub: "Password is old, shared widely, or router settings untouched", s: 2 },
          { t: "No idea", sub: "I wouldn’t know where to check", s: 1 }
        ]
      },
      {
        lens: "Devices",
        q: "How safe are the devices people actually use day-to-day?",
        a: [
          { t: "Hardened", sub: "Auto-updates on • screen lock on all devices • backups in place", s: 4 },
          { t: "Mostly OK", sub: "Updates usually happen, but some devices lag behind", s: 3 },
          { t: "Patchy", sub: "Old devices, no backups, or locks not consistent", s: 2 },
          { t: "Unsure", sub: "We just use them — I don’t manage security", s: 1 }
        ]
      },
      {
        lens: "Privacy",
        q: "How protected are your key accounts (email, Apple/Google, banking)?",
        a: [
          { t: "Strongly protected", sub: "Unique passwords • password manager • 2-step on email", s: 4 },
          { t: "Some protection", sub: "Some 2-step, but passwords are reused in places", s: 3 },
          { t: "Weak protection", sub: "Reused passwords or recovery settings not reviewed", s: 2 },
          { t: "Overwhelmed", sub: "I avoid it — too many settings and accounts", s: 1 }
        ]
      },
      {
        lens: "Scams",
        q: "If a message creates urgency (parcel, bank, ‘pay now’), what happens in your home?",
        a: [
          { t: "We pause + verify", sub: "We check via official app/website (not the link) before acting", s: 4 },
          { t: "We’re cautious", sub: "We hesitate, but sometimes still click to check quickly", s: 3 },
          { t: "We get pressured", sub: "Urgency wins sometimes — we’ve nearly fallen for it", s: 2 },
          { t: "We’ve been caught", sub: "We’ve lost money/data before or it’s a frequent fear", s: 1 }
        ]
      },
      {
        lens: "Wellbeing",
        q: "How is digital life affecting sleep, attention, and calm in your home?",
        a: [
          { t: "Balanced", sub: "Boundaries feel calm • sleep mostly protected", s: 4 },
          { t: "A bit noisy", sub: "Some disruption, but we can regain control", s: 3 },
          { t: "Strained", sub: "Arguments, exhaustion, stress, doom-scrolling", s: 2 },
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

    let step = -1;
    let answers = new Array(QUESTIONS.length).fill(null);

    // iOS/Safari body lock (prevents background scroll)
    let scrollY = 0;
    const lockBody = () => {
      if (document.documentElement.classList.contains("modal-open")) return;
      scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add("modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };
    const unlockBody = () => {
      document.documentElement.classList.remove("modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };

    const setChips = () => {
      if (!chipsWrap) return;
      chipsWrap.innerHTML = CHIPS.map(t => `<div class="chip">${escapeHtml(t)}</div>`).join("");
    };

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
    }

    function calc() {
      const scores = {};
      QUESTIONS.forEach(q => (scores[q.lens] = 0));
      QUESTIONS.forEach((q, i) => { if (answers[i] != null) scores[q.lens] += answers[i]; });

      const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const total = ranked.reduce((s, [, v]) => s + v, 0);

      let stage;
      if (total >= 18) stage = { name: "Clear", desc: "Your system feels stable — keep it steady with small rituals." };
      else if (total >= 13) stage = { name: "Emerging", desc: "A few risk flows need tightening — one lens first." };
      else stage = { name: "Vulnerable", desc: "Small, calm changes will reduce stress and risk quickly." };

      return { stage, strongest: ranked[0][0], weakest: ranked[ranked.length - 1][0], scores, total };
    }

    function renderIntro() {
      stepMeta.textContent = "";
      form.innerHTML = `<p class="muted">This is a calm signal — not a test. Answer as you are, not as you “should be”.</p>`;
      result.hidden = true;
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
        <h3 class="q-title">${escapeHtml(q.q)}</h3>
        <div class="choices">
          ${q.a.map(opt => `
            <label class="choice">
              <input type="radio" name="q" value="${opt.s}" ${current === opt.s ? "checked" : ""}>
              <div><b>${escapeHtml(opt.t)}</b><span>${escapeHtml(opt.sub)}</span></div>
            </label>
          `).join("")}
        </div>
      `;

      result.hidden = true;
      controls.style.display = "flex";

      // Back works on mobile (including returning to intro)
      backBtn.disabled = false;
      nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
      nextBtn.disabled = current == null;

      // Change handling (iOS-safe)
      $$(".choice", form).forEach(label => {
        label.addEventListener("click", () => {
          const input = $("input", label);
          if (!input) return;
          input.checked = true;
          answers[step] = Number(input.value);
          nextBtn.disabled = false;
        });
      });

      $$("input[type=radio]", form).forEach(r => {
        r.addEventListener("change", () => {
          answers[step] = Number(r.value);
          nextBtn.disabled = false;
        });
      });
    }

    function renderResult() {
      const out = calc();

      // Clear the question UI so Safari doesn't show question + result together
      form.innerHTML = "";

      if (resultHeadline) resultHeadline.textContent = `${out.stage.name} signal — ${out.stage.desc}`;
      if (strongestLensEl) strongestLensEl.textContent = out.strongest;
      if (weakestLensEl) weakestLensEl.textContent = out.weakest;

      localStorage.setItem("seed_snapshot_v1", JSON.stringify(out));

      result.hidden = false;
      controls.style.display = "none";
      stepMeta.textContent = "";
    }

    function render() {
      if (step < 0) return renderIntro();
      if (step >= QUESTIONS.length) return renderResult();
      return renderQuestion();
    }

    function openModal() {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      setChips();
      lockBody();

      step = -1;
      answers = new Array(QUESTIONS.length).fill(null);
      render();

      nextBtn.focus?.();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      unlockBody();
    }

    // open buttons (home + resources)
    const openBtns = $$("[data-open-snapshot]").filter(Boolean);
    openBtns.forEach(btn => btn.addEventListener("click", openModal));

    // close actions
    closeBtn?.addEventListener("click", closeModal);
    const backdrop = $("[data-close]", modal);
    backdrop?.addEventListener("click", closeModal);
    backdrop?.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });

    // controls
    nextBtn.addEventListener("click", () => {
      if (step < 0) step = 0;
      else if (answers[step] != null) step++;
      render();
    });

    backBtn.addEventListener("click", () => {
      if (step <= 0) {
        step = -1; // back to intro
      } else {
        step--;
      }
      render();
    });

    // export + retake
    const exportBtn = $("#exportSnapshot");
    exportBtn?.addEventListener("click", () => {
      try {
        const raw = localStorage.getItem("seed_snapshot_v1");
        if (!raw) return;
        downloadText("cyber-seeds-snapshot.json", raw);
      } catch (e) {
        console.error("Export failed:", e);
      }
    });

    const retakeBtn = $("#retakeSnapshot");
    retakeBtn?.addEventListener("click", () => {
      step = -1;
      answers = new Array(QUESTIONS.length).fill(null);
      render();
      nextBtn.focus?.();
    });

    function downloadText(filename, text) {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  /* ==========================================================
     RESOURCES HUB PERSONALISATION
  ========================================================== */
  const resourcesHub = $("#resourcesHub");
  if (resourcesHub) {
    renderResourcesHub(resourcesHub, $, $$);
  }

  function renderResourcesHub(root, $, $$) {
    const raw = localStorage.getItem("seed_snapshot_v1");
    if (!raw) {
      root.innerHTML = `
        <div class="resource-pack">
          <h3>No snapshot found (yet)</h3>
          <p>Your resources hub becomes personalised after the 2-minute snapshot. Run it once on this device.</p>
          <div class="resource-actions">
            <button class="btn primary" data-open-snapshot type="button">Take snapshot</button>
            <a class="btn ghost" href="/">Back to home</a>
          </div>
        </div>
      `;

      // bind the new button we just injected
      $$("[data-open-snapshot]", root).forEach(btn => btn.addEventListener("click", () => {
        // trigger the global handler if it exists
        document.querySelector("[data-open-snapshot]")?.click?.();
      }));
      return;
    }

    let out;
    try { out = JSON.parse(raw); }
    catch { out = null; }

    if (!out || !out.stage || !out.weakest) {
      root.innerHTML = `
        <div class="resource-pack">
          <h3>Snapshot data looks incomplete</h3>
          <p>Please retake the snapshot so we can build the hub correctly.</p>
          <div class="resource-actions">
            <button class="btn primary" data-open-snapshot type="button">Retake snapshot</button>
          </div>
        </div>
      `;
      return;
    }

    const weakest = out.weakest;
    const strongest = out.strongest;
    const stageName = out.stage.name;

    const LIB = getResourceLibrary();

    const primary = LIB[weakest] || LIB["Wellbeing"];
    const secondary = LIB[getSecondLens(out, weakest)] || LIB["Network"];

    root.innerHTML = `
      <div class="resource-pack">
        <h3>Your priority plan</h3>
        <p><b>${escapeHtml(stageName)} signal.</b> Start with your weakest lens: <b>${escapeHtml(weakest)}</b>. Keep your strongest lens steady: <b>${escapeHtml(strongest)}</b>.</p>
        <div class="resource-actions">
          <button class="btn ghost" type="button" id="downloadPlan">Download my plan</button>
          <button class="btn subtle" type="button" id="clearSnapshot">Clear this device snapshot</button>
        </div>
      </div>

      ${renderPack("Start here: your weakest lens", primary)}
      ${renderPack("Next best move (optional)", secondary)}

      <div class="resource-pack">
        <h3>One household rule that reduces risk fast</h3>
        <p><b>The Two-Channel Rule:</b> if a message asks for money, codes, logins, or urgent action — verify via a second channel (official app, saved phone number, or typing the website yourself). Never verify inside the message.</p>
      </div>
    `;

    $("#downloadPlan")?.addEventListener("click", () => {
      const text = buildPlanText(out, primary, secondary);
      downloadText("cyber-seeds-plan.txt", text);
    });

    $("#clearSnapshot")?.addEventListener("click", () => {
      localStorage.removeItem("seed_snapshot_v1");
      location.reload();
    });

    function renderPack(title, pack) {
      return `
        <div class="resource-pack">
          <h3>${escapeHtml(title)} — ${escapeHtml(pack.title)}</h3>
          <p>${escapeHtml(pack.why)}</p>
          <div class="resource-items">
            ${pack.items.map(i => `
              <div class="resource-item">
                <h4>${escapeHtml(i.h)}</h4>
                <p>${escapeHtml(i.p)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    function getSecondLens(out, weakest) {
      const entries = Object.entries(out.scores || {}).sort((a,b) => b[1] - a[1]).map(x => x[0]);
      const filtered = entries.filter(l => l !== weakest);
      return filtered[filtered.length - 1] || "Network";
    }

    function getResourceLibrary() {
      return {
        Network: {
          title: "Network & Wi-Fi safety",
          why: "This lens reduces “whole-home” risk because every device and account travels through the network.",
          items: [
            { h: "Change router admin password", p: "Not the Wi-Fi password — the router control-panel password. Use a long passphrase." },
            { h: "Turn off WPS", p: "WPS is a convenience feature that attackers love. Disable it in router settings." },
            { h: "Enable guest Wi-Fi", p: "Put visitors + smart devices on guest Wi-Fi so your main devices stay isolated." },
            { h: "Update router firmware", p: "Routers rarely auto-update. Check monthly or enable auto-update if available." }
          ]
        },
        Devices: {
          title: "Device hygiene & app safety",
          why: "A single old device often becomes the weak link via saved logins, notifications, and outdated security patches.",
          items: [
            { h: "Auto-updates ON", p: "Enable automatic updates on phones/tablets/laptops. This stops known exploits." },
            { h: "Lock screen everywhere", p: "6-digit (or longer) passcode + biometrics. No shared PINs." },
            { h: "Backups you can restore", p: "Backups only matter if restore works. Do one test restore per month." },
            { h: "Permission sweep", p: "Once a month: review camera/mic/location permissions for top-used apps." }
          ]
        },
        Privacy: {
          title: "Privacy & account protection",
          why: "Most household account compromises happen through email recovery, reused passwords, or weak 2-step settings.",
          items: [
            { h: "Protect email first", p: "Email is the master key. Turn on 2-step and review recovery options." },
            { h: "Use a password manager", p: "One strong vault password → unique passwords everywhere." },
            { h: "Remove public recovery data", p: "Phone number + email on public profiles helps attackers reset accounts." },
            { h: "Turn off ad tracking where possible", p: "Reduce data exposure by disabling ad personalisation in device settings." }
          ]
        },
        Scams: {
          title: "Scam prevention & calm response",
          why: "Scams succeed when urgency bypasses thinking. A simple household protocol beats ‘being clever’.",
          items: [
            { h: "Two-channel verification", p: "Verify requests using official apps, saved numbers, or typing the website yourself." },
            { h: "Family payment safe phrase", p: "One phrase known only to the household before money is sent." },
            { h: "Bank alerts ON", p: "Turn on transaction notifications so fraud is spotted fast." },
            { h: "No codes shared, ever", p: "One rule: never share one-time codes — not even with ‘support’." }
          ]
        },
        Wellbeing: {
          title: "Children’s digital wellbeing & household calm",
          why: "When sleep and calm collapse, every other lens weakens: mistakes rise, scams land, arguments escalate.",
          items: [
            { h: "Dock phones outside bedrooms", p: "One charging place at night. Protect sleep and reduce late scrolling." },
            { h: "Mute the argument apps", p: "Turn off notifications for the apps that trigger conflict or doom loops." },
            { h: "Agree a ‘pause’ phrase", p: "A calm phrase that stops escalation and resets the moment." },
            { h: "Co-use, not just rules", p: "Sit with children during key apps/games. Guidance beats surveillance." }
          ]
        }
      };
    }

    function buildPlanText(out, primary, secondary) {
      const lines = [];
      lines.push("CYBER SEEDS — YOUR HOUSEHOLD PLAN");
      lines.push("");
      lines.push(`Signal: ${out.stage?.name || ""}`);
      lines.push(`Strongest lens: ${out.strongest || ""}`);
      lines.push(`Weakest lens: ${out.weakest || ""}`);
      lines.push("");
      lines.push(`START HERE — ${primary.title}`);
      primary.items.forEach((i, idx) => lines.push(`${idx+1}. ${i.h} — ${i.p}`));
      lines.push("");
      lines.push(`NEXT (OPTIONAL) — ${secondary.title}`);
      secondary.items.forEach((i, idx) => lines.push(`${idx+1}. ${i.h} — ${i.p}`));
      lines.push("");
      lines.push("Household rule: Two-Channel Verification for money/codes/logins.");
      return lines.join("\n");
    }

    function downloadText(filename, text) {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
    }
  }
});
