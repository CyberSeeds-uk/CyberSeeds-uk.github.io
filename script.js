/* =========================================================
   Cyber Seeds — One-page Household Signal (Local Only)
   Calm • Non-judgemental • No storage • Accessible
   Includes hidden Practitioner Mode (keyboard unlock)
========================================================= */

(() => {
  const $ = (sel) => document.querySelector(sel);

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 10 questions (2 per lens) for a more “real” signal than 5 quick taps.
  // Scoring: 0..3 per question. Converted into 0..100 lens signal.
  const questions = [
    // Network
    {
      lens: "Network",
      label: "Network & Wi-Fi",
      q: "Do you know how to log into your router (the Wi-Fi box) if you needed to?",
      options: [
        { t: "Yes, I can access it", s: 3, sub: "You have access and some confidence." },
        { t: "I think so", s: 2, sub: "You likely could, but it’s not familiar." },
        { t: "Not really", s: 1, sub: "It’s unclear or feels risky to touch." },
        { t: "No / never tried", s: 0, sub: "Very common. Most homes start here." }
      ]
    },
    {
      lens: "Network",
      label: "Network & Wi-Fi",
      q: "Does your Wi-Fi password feel strong and private (not shared widely, not obvious)?",
      options: [
        { t: "Yes", s: 3, sub: "Good boundary control." },
        { t: "Mostly", s: 2, sub: "Some risk of sharing creep." },
        { t: "Not sure", s: 1, sub: "Uncertainty usually means it’s worth refreshing." },
        { t: "No", s: 0, sub: "A fast, high-impact fix." }
      ]
    },

    // Devices
    {
      lens: "Devices",
      label: "Devices",
      q: "When your phone/laptop asks to update, what usually happens?",
      options: [
        { t: "I update quickly", s: 3, sub: "Strong hygiene habit." },
        { t: "Within a week", s: 2, sub: "Decent, but gaps appear." },
        { t: "Sometimes I delay a lot", s: 1, sub: "Understandable—life is busy." },
        { t: "I usually ignore updates", s: 0, sub: "Very common; this drives many household issues." }
      ]
    },
    {
      lens: "Devices",
      label: "Devices",
      q: "If a device was lost today, would you be able to lock/locate it and protect accounts?",
      options: [
        { t: "Yes, I’m ready", s: 3, sub: "Excellent resilience." },
        { t: "Mostly", s: 2, sub: "Some steps are in place." },
        { t: "Not sure", s: 1, sub: "A calm checklist can fix this." },
        { t: "No", s: 0, sub: "You’re not alone—most homes aren’t set up for this." }
      ]
    },

    // Privacy
    {
      lens: "Privacy",
      label: "Privacy & Exposure",
      q: "Do you regularly review app permissions (location, microphone, contacts) on phones?",
      options: [
        { t: "Yes", s: 3, sub: "Rare and strong practice." },
        { t: "Sometimes", s: 2, sub: "Good start; consistency matters." },
        { t: "Not really", s: 1, sub: "Most people never do—no shame." },
        { t: "Never", s: 0, sub: "A simple clean-up brings immediate wins." }
      ]
    },
    {
      lens: "Privacy",
      label: "Privacy & Exposure",
      q: "Do family social profiles reveal identifiable details (school cues, address clues, routine locations)?",
      options: [
        { t: "No / carefully managed", s: 3, sub: "Good boundary design." },
        { t: "A little", s: 2, sub: "Small changes reduce exposure." },
        { t: "Not sure", s: 1, sub: "Uncertainty often means hidden leakage." },
        { t: "Yes, likely", s: 0, sub: "This is fixable without deleting everything." }
      ]
    },

    // Scams
    {
      lens: "Scams",
      label: "Scams & Manipulation",
      q: "If a message creates urgency (“act now”, “final warning”), what do you do first?",
      options: [
        { t: "Pause and verify via official route", s: 3, sub: "That pause is the superpower." },
        { t: "I’m cautious but sometimes react", s: 2, sub: "Normal human behaviour." },
        { t: "I often feel pressured", s: 1, sub: "Pressure tactics are designed to work." },
        { t: "I usually act quickly", s: 0, sub: "A household rule can stop this immediately." }
      ]
    },
    {
      lens: "Scams",
      label: "Scams & Manipulation",
      q: "Does your household have a shared rule for money / codes (bank calls, one-time passcodes, deliveries)?",
      options: [
        { t: "Yes, clear rule", s: 3, sub: "This prevents high-impact losses." },
        { t: "Some rule, not consistent", s: 2, sub: "A small tweak makes it reliable." },
        { t: "Not really", s: 1, sub: "Most homes don’t — until something happens." },
        { t: "No", s: 0, sub: "A fast, protective change." }
      ]
    },

    // Children
    {
      lens: "Children",
      label: "Children’s Digital Wellbeing",
      q: "Do children in the home have age-appropriate boundaries that feel calm (not constant battles)?",
      options: [
        { t: "Yes, calm and clear", s: 3, sub: "Strong household ecology." },
        { t: "Mostly", s: 2, sub: "Some friction is normal." },
        { t: "Unclear / inconsistent", s: 1, sub: "This is a design problem, not a moral one." },
        { t: "Not in place", s: 0, sub: "A reset can be gentle and effective." }
      ]
    },
    {
      lens: "Children",
      label: "Children’s Digital Wellbeing",
      q: "If a child had a digital problem (bullying, strange contact, content shock), would they tell an adult?",
      options: [
        { t: "Yes, I’m confident", s: 3, sub: "That trust is protective." },
        { t: "Probably", s: 2, sub: "Good foundation; strengthen the pathway." },
        { t: "Not sure", s: 1, sub: "Common — we can build a safer reporting habit." },
        { t: "Unlikely", s: 0, sub: "This can be repaired without blame." }
      ]
    }
  ];

  // UI refs
  const progressBar = $("#progressBar");
  const qaStep = $("#qaStep");
  const qaLens = $("#qaLens");
  const qaQuestion = $("#qaQuestion");
  const qaOptions = $("#qaOptions");
  const btnBack = $("#btnBack");
  const btnNext = $("#btnNext");

  const resultsEmpty = $("#resultsEmpty");
  const resultsBody = $("#resultsBody");
  const bandValue = $("#bandValue");
  const bandScore = $("#bandScore");
  const barsEl = $("#bars");
  const nextActionsEl = $("#nextActions");

  const btnDownload = $("#btnDownload");
  const btnPrint = $("#btnPrint");
  const btnReset = $("#btnReset");

  const practitionerPanel = $("#practitionerPanel");
  const prBody = $("#prBody");
  const btnClosePractitioner = $("#btnClosePractitioner");

  // Guard: if page section removed, do nothing
  if (!qaQuestion || !qaOptions || !btnNext) return;

  // State (session only)
  let step = 0;
  const answers = new Array(questions.length).fill(null); // store {s, t}
  const lensOrder = ["Network", "Devices", "Privacy", "Scams", "Children"];

  function lensPretty(lens) {
    const map = {
      Network: "Network & Wi-Fi",
      Devices: "Devices",
      Privacy: "Privacy & Exposure",
      Scams: "Scams & Manipulation",
      Children: "Children’s Digital Wellbeing"
    };
    return map[lens] || lens;
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function render(){
    const q = questions[step];
    const total = questions.length;
    const pct = Math.round((step / (total - 1)) * 100);

    qaStep.textContent = `Question ${step + 1} of ${total}`;
    qaLens.textContent = `Lens: ${lensPretty(q.lens)}`;
    qaQuestion.textContent = q.q;

    progressBar.style.width = `${clamp(pct, 0, 100)}%`;

    qaOptions.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.setAttribute("aria-pressed", "false");

      b.innerHTML = `
        <div class="opt-title">${opt.t}</div>
        <div class="opt-sub">${opt.sub}</div>
      `;

      b.addEventListener("click", () => {
        answers[step] = { s: opt.s, t: opt.t };
        // visual selection
        [...qaOptions.querySelectorAll(".opt")].forEach(x => {
          x.classList.remove("selected");
          x.setAttribute("aria-pressed", "false");
        });
        b.classList.add("selected");
        b.setAttribute("aria-pressed", "true");
        // immediately update if user already finished
        maybeUpdateLiveResults();
      });

      // restore selection
      if (answers[step] && answers[step].s === opt.s && answers[step].t === opt.t) {
        b.classList.add("selected");
        b.setAttribute("aria-pressed", "true");
      }

      qaOptions.appendChild(b);
    });

    btnBack.disabled = step === 0;
    btnNext.textContent = (step === total - 1) ? "Generate signal" : "Next";
  }

  function allAnswered(){
    return answers.every(a => a && typeof a.s === "number");
  }

  function compute(){
    // aggregate by lens
    const lensTotals = {};
    const lensMax = {};
    lensOrder.forEach(l => { lensTotals[l] = 0; lensMax[l] = 0; });

    questions.forEach((q, i) => {
      const a = answers[i];
      const s = a ? a.s : 0;
      lensTotals[q.lens] += s;
      lensMax[q.lens] += 3;
    });

    // convert to 0..100 per lens
    const lensSignals = {};
    lensOrder.forEach(l => {
      const raw = lensTotals[l];
      const max = lensMax[l] || 1;
      lensSignals[l] = Math.round((raw / max) * 100);
    });

    // overall “signal index” (0..100), but we call it a band, not a score
    const overall = Math.round(lensOrder.reduce((sum, l) => sum + lensSignals[l], 0) / lensOrder.length);

    const band = (n) => {
      if (n >= 80) return { name: "Stable", note: "Strong foundations. Maintain and gently refine." };
      if (n >= 60) return { name: "Steady", note: "Mostly sound. A few upgrades will raise resilience." };
      if (n >= 40) return { name: "Growing", note: "Normal household gaps. Choose the 1–2 highest-impact fixes first." };
      if (n >= 20) return { name: "Fragile", note: "Some risks likely exist. Calm, step-based improvements help quickly." };
      return { name: "Exposed", note: "High likelihood of preventable harm. Start with simple protections." };
    };

    return {
      overall,
      band: band(overall),
      lensSignals,
      lensTotals,
      generatedAt: new Date().toISOString()
    };
  }

  function levelLabel(n){
    if (n >= 80) return "Strong";
    if (n >= 60) return "Good";
    if (n >= 40) return "Developing";
    if (n >= 20) return "Vulnerable";
    return "At risk";
  }

  function nextActionsFrom(data){
    // choose the two lowest lenses to prioritise
    const pairs = Object.entries(data.lensSignals).sort((a,b) => a[1]-b[1]);
    const focus = pairs.slice(0, 2).map(([lens]) => lens);

    const actions = [];

    focus.forEach(lens => {
      if (lens === "Network") {
        actions.push("Change the router admin password and confirm the Wi-Fi password is strong and private.");
        actions.push("Create a guest network (or separate IoT network) for smart TVs/speakers if possible.");
      }
      if (lens === "Devices") {
        actions.push("Turn on automatic updates where possible and do a 10-minute household update sweep.");
        actions.push("Check “Find My Device / Find My iPhone” and confirm a lock screen + backup is enabled.");
      }
      if (lens === "Privacy") {
        actions.push("Review location sharing and app permissions on the main household phones (start with the children’s devices).");
        actions.push("Search your family names/usernames and remove old public info where practical.");
      }
      if (lens === "Scams") {
        actions.push("Create one household rule: never share one-time passcodes; verify bank/delivery calls via official apps or numbers.");
        actions.push("Agree a “pause phrase” for urgent messages: ‘We verify before we act.’");
      }
      if (lens === "Children") {
        actions.push("Set one calm boundary that reduces conflict (e.g., devices charge outside bedrooms at night).");
        actions.push("Build a safe reporting habit: ‘If something feels weird online, you won’t be in trouble for telling us.’");
      }
    });

    // Keep it short and usable
    const unique = [...new Set(actions)];
    return unique.slice(0, 6);
  }

  function renderResults(){
    if (!allAnswered()) return;

    const data = compute();

    // show results panel
    resultsEmpty.hidden = true;
    resultsBody.hidden = false;

    bandValue.textContent = data.band.name;
    bandScore.textContent = `${data.overall}/100`;

    // Update band styling subtly
    const band = $("#signalBand");
    if (band) {
      band.style.background = "rgba(43,182,115,.08)";
      band.style.borderColor = "rgba(43,182,115,.18)";
      if (data.overall < 40) {
        band.style.background = "rgba(0,108,142,.08)";
        band.style.borderColor = "rgba(0,108,142,.18)";
      }
      if (data.overall < 20) {
        band.style.background = "rgba(11,37,64,.05)";
        band.style.borderColor = "rgba(11,37,64,.14)";
      }
    }

    // Lens bars
    barsEl.innerHTML = "";
    Object.entries(data.lensSignals).forEach(([lens, val]) => {
      const row = document.createElement("div");
      row.className = "bar";
      row.innerHTML = `
        <div class="bar-head">
          <div class="bar-title">${lensPretty(lens)}</div>
          <div class="bar-level">${levelLabel(val)} · ${val}/100</div>
        </div>
        <div class="meter" aria-label="${lensPretty(lens)} signal">
          <div style="width:${val}%"></div>
        </div>
      `;
      barsEl.appendChild(row);
    });

    // Next actions
    const actions = nextActionsFrom(data);
    nextActionsEl.innerHTML = `
      <h4>What matters next (calm priorities)</h4>
      <ol class="actions-list">
        ${actions.map(a => `<li>${a}</li>`).join("")}
      </ol>
      <p class="muted" style="margin:.75rem 0 0;">${data.band.note}</p>
    `;

    // Download payload
    const snapshot = {
      product: "Cyber Seeds — Household Signal",
      version: "1.0",
      localOnly: true,
      generatedAt: data.generatedAt,
      overall: { band: data.band.name, index: data.overall },
      lenses: data.lensSignals,
      answers: questions.map((q, i) => ({
        lens: q.lens,
        question: q.q,
        answer: answers[i] ? answers[i].t : null,
        score: answers[i] ? answers[i].s : null
      })),
      nextActions: actions
    };

    btnDownload.onclick = () => {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cyber-seeds-household-signal-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    btnPrint.onclick = () => window.print();

    btnReset.onclick = () => {
      step = 0;
      for (let i=0;i<answers.length;i++) answers[i] = null;
      resultsEmpty.hidden = false;
      resultsBody.hidden = true;
      render();
      window.location.hash = "#signal";
    };

    // Practitioner notes (hidden)
    buildPractitionerNotes(snapshot);
  }

  function maybeUpdateLiveResults(){
    // If results already visible, keep them live as answers change
    if (!resultsBody.hidden && allAnswered()) renderResults();
  }

  // Navigation logic
  btnNext.addEventListener("click", () => {
    // require an answer before moving on
    if (!answers[step]) {
      // subtle guidance without shame
      qaQuestion.scrollIntoView({ behavior: "smooth", block: "center" });
      qaQuestion.animate([{opacity:.55},{opacity:1}], {duration: 260});
      return;
    }

    if (step < questions.length - 1) {
      step++;
      render();
      return;
    }

    // last step -> generate
    renderResults();
  });

  btnBack.addEventListener("click", () => {
    if (step > 0) {
      step--;
      render();
    }
  });

  // Practitioner Mode (hidden)
  // Unlock: press Ctrl+Shift+P (or Cmd+Shift+P on Mac), then enter access phrase: "DCS-UK"
  // This is intentionally obscured so families never see it.
  let keyBuffer = [];
  const unlockPhrase = "DCS-UK";

  function buildPractitionerNotes(snapshot){
    if (!prBody) return;

    // Find the two lowest lenses for practitioner emphasis
    const sorted = Object.entries(snapshot.lenses).sort((a,b)=>a[1]-b[1]);
    const lowest = sorted.slice(0,2).map(([k,v]) => `${lensPretty(k)} (${v}/100)`);

    // Simple triage line for audit follow-up
    const triage =
      snapshot.overall.index >= 60 ? "Low-to-moderate urgency: focus on resilience and routines." :
      snapshot.overall.index >= 40 ? "Moderate urgency: address the two lowest lenses first." :
      "Higher urgency: likely preventable harm risk; prioritise router, accounts, and scam rules.";

    prBody.innerHTML = `
      <div><strong>Snapshot triage:</strong> ${triage}</div>
      <div><strong>Lowest lenses:</strong> ${lowest.join(" · ")}</div>
      <div><strong>Recommended audit stance:</strong> calm, non-judgemental, “small steps”, avoid technical dumping.</div>
      <div><strong>First 20 minutes in-home:</strong> confirm router access + updates + device lock/backup + scam rule.</div>
      <div><strong>Safeguarding sensitivity cue:</strong> if child reporting confidence is low, prioritise trust pathway over controls.</div>
    `;
  }

  function openPractitioner(){
    practitionerPanel.hidden = false;
    practitionerPanel.scrollIntoView({behavior:"smooth", block:"start"});
  }
  function closePractitioner(){
    practitionerPanel.hidden = true;
  }
  if (btnClosePractitioner) btnClosePractitioner.addEventListener("click", closePractitioner);

  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const combo = (isMac && e.metaKey && e.shiftKey && e.key.toLowerCase() === "p")
      || (!isMac && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p");

    if (combo) {
      const entered = prompt("Practitioner access phrase:");
      if (entered && entered.trim().toUpperCase() === unlockPhrase.toUpperCase()) {
        // Only show if there is data; otherwise show a gentle hint
        if (allAnswered()) {
          openPractitioner();
        } else {
          alert("Practitioner mode is available after the Household Signal is generated.");
        }
      }
    }
  });

  // Init
  render();
})();
