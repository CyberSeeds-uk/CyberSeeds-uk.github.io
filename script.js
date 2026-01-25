/* =========================================================
   Cyber Seeds — script.js (mobile-safe, no optional chaining)
   Snapshot modal + Resources personalisation
   ========================================================= */

(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  console.log("🌱 Cyber Seeds script.js loaded (v20260125a)");

  window.addEventListener("error", function (e) {
    console.error("SCRIPT ERROR:", (e && e.message) ? e.message : e);
  });
  window.addEventListener("unhandledrejection", function (e) {
    console.error("UNHANDLED PROMISE:", e && e.reason ? e.reason : e);
  });

  document.addEventListener("DOMContentLoaded", function () {

    // Year
    var yearEl = $("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Smooth scroll for in-page anchors
    $all("[data-scroll]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href") || "";
        if (href.indexOf("#") !== 0) return;
        var target = $(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // Mobile nav
    var navToggle = $("#navToggle");
    var navMenu = $("#navMenu");
    if (navToggle && navMenu) {
      function closeNav() {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
      navToggle.addEventListener("click", function () {
        var open = !navMenu.classList.contains("is-open");
        if (open) {
          navMenu.classList.add("is-open");
          navToggle.setAttribute("aria-expanded", "true");
        } else {
          closeNav();
        }
      });
      document.addEventListener("click", function (e) {
        if (!navMenu.classList.contains("is-open")) return;
        if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
        closeNav();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeNav();
      });
    }

    /* ==========================
       SNAPSHOT ENGINE
       ========================== */

    var modal = $("#snapshotModal");
    if (!modal) {
      // Page can still work without snapshot modal (e.g., future pages)
      return;
    }

    var form = $("#snapshotForm");
    var resultSection = $("#snapshotResult");
    var resultHeadline = $("#resultHeadline");
    var strongestLensEl = $("#strongestLens");
    var weakestLensEl = $("#weakestLens");
    var nextBtn = $("#snapshotNext");
    var backBtn = $("#snapshotBack");
    var stepMeta = $("#stepMeta");
    var controls = $("#snapshotControls");
    var closeBtn = $("#closeSnapshot");
    var chipsWrap = $("#snapshotChips");
    var exportBtn = $("#exportSnapshot");
    var retakeBtn = $("#retakeSnapshot");
    var scrollEl = $("#snapshotScroll");
    var resourcesHub = $("#resourcesHub");

    // If any of the critical controls are missing, do not hard-fail the whole script.
    var essentialsOk = !!(form && resultSection && resultHeadline && strongestLensEl && weakestLensEl && nextBtn && backBtn && stepMeta && controls);
    if (!essentialsOk) {
      console.warn("Snapshot modal exists but expected elements are missing. Check IDs in HTML.");
    }

    var QUESTIONS = [
      {
        lens: "Network",
        q: "How protected is your home Wi-Fi beyond just the Wi-Fi password?",
        a: [
          { t: "Locked down", sub: "Router admin password changed • WPS off • guest Wi-Fi used", s: 4 },
          { t: "Mostly protected", sub: "Strong Wi-Fi password, unsure on router settings", s: 3 },
          { t: "Basic / default", sub: "Old/shared password • router never checked", s: 2 },
          { t: "Not sure", sub: "I wouldn’t know where to look", s: 1 }
        ]
      },
      {
        lens: "Devices",
        q: "How safe are the devices people use day-to-day?",
        a: [
          { t: "Hardened", sub: "Auto-updates • screen locks • backups working", s: 4 },
          { t: "Mostly OK", sub: "Updates usually happen, some lag behind", s: 3 },
          { t: "Patchy", sub: "Old devices or missing locks/backups", s: 2 },
          { t: "Not sure", sub: "We just use them — no setup", s: 1 }
        ]
      },
      {
        lens: "Privacy",
        q: "How protected are your key accounts (email, Apple/Google, banking)?",
        a: [
          { t: "Strongly protected", sub: "Unique passwords • 2-step on email • recovery reviewed", s: 4 },
          { t: "Some protection", sub: "Some 2-step but passwords reused", s: 3 },
          { t: "Weak protection", sub: "Reused passwords or recovery not reviewed", s: 2 },
          { t: "Overwhelmed", sub: "I avoid account settings", s: 1 }
        ]
      },
      {
        lens: "Scam Defence",
        q: "If a message creates urgency (bank, parcel, “pay now”), what happens?",
        a: [
          { t: "Pause + verify", sub: "We check via official app or a saved number", s: 4 },
          { t: "Cautious", sub: "We hesitate but sometimes click first", s: 3 },
          { t: "Pressured", sub: "Urgency sometimes wins", s: 2 },
          { t: "Already affected", sub: "We’ve lost money/data before", s: 1 }
        ]
      },
      {
        lens: "Child Wellbeing",
        q: "How is digital life affecting sleep, focus, and calm at home?",
        a: [
          { t: "Balanced", sub: "Boundaries feel calm • sleep mostly protected", s: 4 },
          { t: "A bit noisy", sub: "Some disruption, but manageable", s: 3 },
          { t: "Strained", sub: "Arguments, exhaustion, stress", s: 2 },
          { t: "Overwhelming", sub: "It often feels out of control", s: 1 }
        ]
      }
    ];

    var CHIPS = [
      "Runs locally on this device",
      "No tracking • no accounts",
      "2 minutes • 5 questions",
      "Returns calm next steps"
    ];

    var STORAGE_KEY = "cyberseeds_snapshot_v2";

    var step = -1;
    var answers = new Array(QUESTIONS.length);
    var picked = new Array(QUESTIONS.length);

    // iOS body lock
    var scrollY = 0;
    function lockBody() {
      scrollY = window.scrollY || 0;
      document.documentElement.classList.add("modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = "-" + scrollY + "px";
      document.body.style.width = "100%";
    }
    function unlockBody() {
      document.documentElement.classList.remove("modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    }

    function stageFromTotal(total) {
      // total range = 5..20
      if (total >= 18) return { name: "Clear", desc: "Your system feels stable. Keep it steady with light routines." };
      if (total >= 14) return { name: "Growing", desc: "A few risk flows need tightening — small changes will help quickly." };
      if (total >= 10) return { name: "Strained", desc: "Your household is carrying extra digital load. We’ll reduce pressure first." };
      return { name: "Overloaded", desc: "Start with one calm stabiliser today. We’ll rebuild safety step-by-step." };
    }

    function calcSnapshot() {
      var scores = {};
      QUESTIONS.forEach(function (q) { scores[q.lens] = 0; });

      var total = 0;
      for (var i = 0; i < QUESTIONS.length; i++) {
        var q = QUESTIONS[i];
        var s = answers[i] || 0;
        scores[q.lens] += s;
        total += s;
      }

      var ranked = Object.keys(scores).map(function (k) { return [k, scores[k]]; })
        .sort(function (a, b) { return b[1] - a[1]; });

      var strongest = ranked[0][0];
      var weakest = ranked[ranked.length - 1][0];

      var isAllEqual = (scores[strongest] === scores[weakest]);

      var detail = [];
      for (var j = 0; j < QUESTIONS.length; j++) {
        detail.push({
          lens: QUESTIONS[j].lens,
          score: answers[j],
          choice: picked[j] ? picked[j].t : ""
        });
      }

      return {
        v: 2,
        total: total,
        stage: stageFromTotal(total),
        scores: scores,
        strongest: strongest,
        weakest: weakest,
        isAllEqual: isAllEqual,
        detail: detail,
        createdAt: new Date().toISOString()
      };
    }

    function renderIntro() {
      if (!essentialsOk) return;
      stepMeta.textContent = "";
      form.innerHTML = '<p class="muted">This is a calm signal — not a test. Answer as you are.</p>';
      resultSection.hidden = true;
      controls.style.display = "flex";
      backBtn.disabled = true;
      nextBtn.textContent = "Start";
      nextBtn.disabled = false;
    }

    function renderQuestion() {
      if (!essentialsOk) return;

      var q = QUESTIONS[step];
      var current = answers[step];

      stepMeta.textContent = (step + 1) + " / " + QUESTIONS.length;

      var html = '';
      html += '<h3 class="q-title">' + escapeHtml(q.q) + '</h3>';
      html += '<div class="choices">';
      for (var i = 0; i < q.a.length; i++) {
        var opt = q.a[i];
        var checked = (current === opt.s) ? ' checked' : '';
        html += ''
          + '<label class="choice" data-score="' + opt.s + '" data-idx="' + i + '">'
          + '  <input type="radio" name="q' + step + '" value="' + opt.s + '"' + checked + '>'
          + '  <div><b>' + escapeHtml(opt.t) + '</b><span>' + escapeHtml(opt.sub) + '</span></div>'
          + '</label>';
      }
      html += '</div>';

      form.innerHTML = html;

      backBtn.disabled = false;
      nextBtn.textContent = (step === QUESTIONS.length - 1) ? "Finish" : "Next";
      nextBtn.disabled = (current == null);

      if (scrollEl) scrollEl.scrollTop = 0;

      $all(".choice", form).forEach(function (label) {
        label.addEventListener("click", function () {
          var score = Number(label.getAttribute("data-score"));
          var idx = Number(label.getAttribute("data-idx"));
          answers[step] = score;
          picked[step] = QUESTIONS[step].a[idx];
          nextBtn.disabled = false;

          var input = $("input", label);
          if (input) input.checked = true;
        });
      });
    }

    function renderResult() {
      if (!essentialsOk) return;

      var snapshot = calcSnapshot();
      form.innerHTML = "";

      resultHeadline.textContent = snapshot.stage.name + " signal — " + snapshot.stage.desc;

      if (snapshot.isAllEqual) {
        strongestLensEl.textContent = "No single lens stands out";
        weakestLensEl.textContent = "No single lens stands out";
      } else {
        strongestLensEl.textContent = snapshot.strongest;
        weakestLensEl.textContent = snapshot.weakest;
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (e) {
        console.warn("Could not save snapshot to localStorage:", e);
      }

      if (resourcesHub) populateResourcesHub(snapshot);

      resultSection.hidden = false;
      controls.style.display = "none";

      if (scrollEl) scrollEl.scrollTop = 0;
    }

    function render() {
      if (!essentialsOk) return;
      if (step < 0) renderIntro();
      else if (step >= QUESTIONS.length) renderResult();
      else renderQuestion();
    }

    function openModal() {
      if (!essentialsOk) {
        alert("Snapshot is updating. Please refresh the page (Ctrl+Shift+R) and try again.");
        return;
      }

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");

      if (chipsWrap) {
        chipsWrap.innerHTML = CHIPS.map(function (c) {
          return '<div class="chip">' + escapeHtml(c) + '</div>';
        }).join("");
      }

      lockBody();

      step = -1;
      for (var i = 0; i < answers.length; i++) { answers[i] = null; picked[i] = null; }

      render();
      nextBtn.focus();

      trapFocus(modal);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      unlockBody();
      releaseFocusTrap();
    }

    // Event delegation: catches buttons even if nested spans, icons, etc.
    document.addEventListener("click", function (e) {
      var opener = e.target.closest ? e.target.closest("[data-open-snapshot]") : null;
      if (opener) {
        e.preventDefault();
        openModal();
        return;
      }

      // Close on backdrop clicks
      var closer = e.target.closest ? e.target.closest("[data-close]") : null;
      if (closer && modal.classList.contains("is-open")) {
        e.preventDefault();
        closeModal();
        return;
      }
    });

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") closeModal();
    });

    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (nextBtn.disabled) return;
      if (step < 0) step = 0;
      else if (answers[step] != null) step++;
      render();
    });

    if (backBtn) backBtn.addEventListener("click", function () {
      step = (step <= 0) ? -1 : (step - 1);
      render();
    });

    if (exportBtn) exportBtn.addEventListener("click", function () {
      var raw = null;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
      if (!raw) return;

      var data = JSON.parse(raw);
      var lines = [];
      lines.push("CYBER SEEDS — HOUSEHOLD SNAPSHOT");
      lines.push("");
      lines.push("Overall Signal:");
      lines.push(data.stage.name);
      lines.push(data.stage.desc);
      lines.push("");
      lines.push("Strongest Lens: " + (data.isAllEqual ? "No single lens stands out" : data.strongest));
      lines.push("Weakest Lens: " + (data.isAllEqual ? "No single lens stands out" : data.weakest));
      lines.push("");
      lines.push("Lens Breakdown:");
      Object.keys(data.scores).forEach(function (k) {
        lines.push("- " + k + ": " + data.scores[k] + "/4");
      });
      lines.push("");
      lines.push("Nothing was sent anywhere. This snapshot exists only on this device.");

      downloadText(lines.join("\n"), "Cyber-Seeds-Household-Snapshot.txt");
    });

    if (retakeBtn) retakeBtn.addEventListener("click", function () {
      step = -1;
      for (var i = 0; i < answers.length; i++) { answers[i] = null; picked[i] = null; }
      controls.style.display = "flex";
      resultSection.hidden = true;
      render();
    });

    /* ==========================
       RESOURCES PERSONALISATION
       ========================== */

    var RESOURCES = {
      "Network": {
        today: [
          "Change your router admin password (not the Wi-Fi password).",
          "Turn off WPS (the push-button pairing feature).",
          "Create a Guest Wi-Fi for visitors / new devices."
        ],
        week: [
          "Update router firmware (or check for automatic updates).",
          "Rename networks clearly (e.g., Home / Guest) so children don’t guess.",
          "Write down where the router login details are stored (safe place)."
        ]
      },
      "Devices": {
        today: [
          "Turn on automatic updates on phones, tablets, and laptops.",
          "Check every device has a screen lock (PIN/biometric).",
          "Confirm backups: iCloud/Google Drive/OneDrive is actually running."
        ],
        week: [
          "Remove unused apps (especially on shared tablets).",
          "Create one ‘household device rule’: updates + lock + backup.",
          "Check storage is not full (full devices stop updating/backing up)."
        ]
      },
      "Privacy": {
        today: [
          "Enable 2-step verification on your email first (it protects everything else).",
          "Stop password reuse on your top 3 accounts (email, Apple/Google, banking).",
          "Check account recovery options are yours (phone/email)."
        ],
        week: [
          "Adopt a password manager (even just for the adults’ key accounts).",
          "Review privacy settings on social apps used most at home.",
          "Turn on login alerts where available."
        ]
      },
      "Scam Defence": {
        today: [
          "Agree a family rule: ‘Urgency = pause’. No payments from links in messages.",
          "Save your bank’s real number (from the card/app) — use that to verify.",
          "Enable transaction notifications in banking apps."
        ],
        week: [
          "Do one 10-minute ‘scam story’ talk: what you’ve seen, how you verified.",
          "Report suspicious emails to the NCSC Suspicious Email Reporting Service.",
          "Check your main email inbox rules/filters for anything unusual."
        ]
      },
      "Child Wellbeing": {
        today: [
          "Protect sleep first: pick a device-down time (even 30 minutes helps).",
          "Use built-in Screen Time / Digital Wellbeing to *observe* patterns, not punish.",
          "Create one ‘calm check-in’ question: “How did online feel today?”"
        ],
        week: [
          "Set content boundaries together (not secretly). Agree what ‘too much’ looks like.",
          "Move chargers out of bedrooms (or use a shared charging spot).",
          "Pick one offline anchor routine: meal, walk, or story time."
        ]
      }
    };

    function populateResourcesHub(snapshot) {
      if (!resourcesHub) return;

      var s = snapshot || loadSnapshot();
      if (!s) {
        resourcesHub.innerHTML =
          '<div class="card"><p class="muted">Take a snapshot to see personalised guidance here.</p></div>';
        return;
      }

      var focusLens = s.isAllEqual ? "Network" : s.weakest; // if tied, choose a safe default
      var pack = RESOURCES[focusLens] || RESOURCES["Network"];

      var headline = '<div class="card">'
        + '<h2>Today’s Focus: ' + escapeHtml(focusLens) + '</h2>'
        + '<p class="muted"><b>' + escapeHtml(s.stage.name) + ' signal</b> — ' + escapeHtml(s.stage.desc) + '</p>'
        + '</div>';

      var plan = '<div class="card">'
        + '<h3>A calm plan</h3>'
        + '<div class="plan-grid">'
        +   '<div><h4>Today (10 minutes)</h4><ul class="ticks">' + pack.today.map(liTick).join("") + '</ul></div>'
        +   '<div><h4>This week (30 minutes)</h4><ul class="ticks">' + pack.week.map(liTick).join("") + '</ul></div>'
        + '</div>'
        + '</div>';

      var lensBreakdown = '<div class="card">'
        + '<h3>Your lens map (simple)</h3>'
        + '<p class="muted">This is not a judgement — it’s a navigation aid.</p>'
        + '<div class="lens-map">'
        +   Object.keys(s.scores).map(function (k) {
              var score = s.scores[k];
              var tag = (k === focusLens && !s.isAllEqual) ? "Start here" : "";
              return '<div class="lens-pill"><b>' + escapeHtml(k) + '</b><span>' + score + '/4</span>' + (tag ? '<em>' + tag + '</em>' : '') + '</div>';
            }).join("")
        + '</div>'
        + '</div>';

      resourcesHub.innerHTML = headline + plan + lensBreakdown;
    }

    function liTick(txt) { return "<li>" + escapeHtml(txt) + "</li>"; }

    function loadSnapshot() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    // If we are on /resources/ page, render immediately
    if (resourcesHub) populateResourcesHub();

    /* ==========================
       UTILITIES
       ========================== */

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function downloadText(text, filename) {
      var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // Basic focus trap (accessibility)
    var trapActive = false;
    var lastFocus = null;
    function trapFocus(root) {
      if (!root) return;
      trapActive = true;
      lastFocus = document.activeElement;

      root.addEventListener("keydown", onTrapKeydown);
    }
    function releaseFocusTrap() {
      if (!trapActive) return;
      trapActive = false;
      modal.removeEventListener("keydown", onTrapKeydown);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
    }
    function onTrapKeydown(e) {
      if (!trapActive) return;
      if (e.key !== "Tab") return;

      var focusables = $all("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])", modal)
        .filter(function (el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); });

      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

  });
})();
