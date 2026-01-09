(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const modal = $("#snapshotModal");
  const openBtns = [
    "#openSnapshot",
    "#openSnapshotTop",
    "#openSnapshotMobile",
    "#openSnapshotCard",
    "#openSnapshotLenses",
    "#openSnapshotResources"
  ].map(id => $(id)).filter(Boolean);

  const closeBtns = $$("[data-close]");
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

  let step = -1;
  const answers = {};

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
    privacy: "What the outside world can see, learn, or infer.",
    scams: "How pressure and urgency are handled in real moments.",
    children: "Sleep, boundaries, safety, and emotional wellbeing."
  };

  const LENS_INSIGHT = {
    network: {
      meaning: "Your network quietly affects every device in the home.",
      actions: [
        "Change the Wi-Fi password and remove unused access.",
        "Enable a guest network for visitors.",
        "Check the router for pending updates."
      ],
      audit: "We review router configuration, segmentation, and household-specific risks."
    },
    devices: {
      meaning: "Devices become risky when they’re forgotten, not misused.",
      actions: [
        "Turn on automatic updates on phones and tablets.",
        "Check which old devices are still logged into accounts.",
        "Confirm backups actually restore."
      ],
      audit: "We map every device and identify hidden weak points."
    },
    privacy: {
      meaning: "Privacy is about reducing exposure, not disappearing.",
      actions: [
        "Review social media privacy settings.",
        "Remove posts that reveal routines or locations.",
        "Check app permissions for location and contacts."
      ],
      audit: "We assess real exposure across apps, profiles, and habits."
    },
    scams: {
      meaning: "Strong scam resistance comes from habits, not intelligence.",
      actions: [
        "Agree a household pause-before-click rule.",
        "Enable two-step verification on key accounts.",
        "Talk through how pressure messages work."
      ],
      audit: "We pressure-test the household against real scam scenarios."
    },
    children: {
      meaning: "Wellbeing grows from boundaries, repair, and calm consistency.",
      actions: [
        "Create a shared charging spot at night.",
        "Agree what to do if something feels wrong online.",
        "Check privacy settings on favourite apps."
      ],
      audit: "We review wellbeing and safeguarding signals in context."
    }
  };

  const QUESTIONS = [
    {
      id: "wifi_access",
      lens: "network",
      title: "Who can realistically access your home Wi-Fi?",
      options: [
        ["Only household members", 3],
        ["Household + guests", 2],
        ["Quite a few people", 1],
        ["Not sure", 0]
      ]
    },
    {
      id: "device_updates",
      lens: "devices",
      title: "Do devices usually update themselves?",
      options: [
        ["Yes, mostly automatic", 3],
        ["Some do", 2],
        ["Rarely", 1],
        ["Never / not sure", 0]
      ]
    },
    {
      id: "online_visibility",
      lens: "privacy",
      title: "How visible is your family’s daily life online?",
      options: [
        ["Very limited", 3],
        ["Some clues", 2],
        ["Haven’t checked", 1],
        ["Quite visible", 0]
      ]
    },
    {
      id: "urgent_messages",
      lens: "scams",
      title: "What happens when a message feels urgent?",
      options: [
        ["We pause and check", 3],
        ["Sometimes pause", 2],
        ["Often click", 1],
        ["Act immediately", 0]
      ]
    },
    {
      id: "night_devices",
      lens: "children",
      title: "Where do children’s devices go at night?",
      options: [
        ["Outside bedrooms", 3],
        ["Depends", 2],
        ["Usually in bedrooms", 1],
        ["Always in bedrooms", 0]
      ]
    }
  ];

  function openModal() {
    modal.setAttribute("aria-hidden", "false");
    step = -1;
    Object.keys(answers).forEach(k => delete answers[k]);
    render();
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
  }

  openBtns.forEach(b => b.addEventListener("click", openModal));
  closeBtns.forEach(b => b.addEventListener("click", closeModal));

  function render() {
    form.innerHTML = "";
    lensContextBox.hidden = true;
    nextBtn.disabled = true;
    backBtn.disabled = step <= 0;

    if (step < 0) {
      intro.hidden = false;
      result.hidden = true;
      nextBtn.textContent = "Start";
      return;
    }

    if (step >= QUESTIONS.length) {
      intro.hidden = true;
      showResults();
      return;
    }

    intro.hidden = true;
    const q = QUESTIONS[step];

    lensContextBox.hidden = false;
    lensContextTitle.textContent = LENSES.find(l => l.id === q.lens).name;
    lensContextCopy.textContent = LENS_CONTEXT[q.lens];

    const wrap = document.createElement("div");
    wrap.className = "q";

    const title = document.createElement("div");
    title.className = "q-title";
    title.textContent = q.title;
    wrap.appendChild(title);

    q.options.forEach(([label, val]) => {
      const l = document.createElement("label");
      l.innerHTML = `<input type="radio" name="${q.id}" value="${val}"> ${label}`;
      l.querySelector("input").addEventListener("change", () => {
        answers[q.id] = val;
        nextBtn.disabled = false;
      });
      wrap.appendChild(l);
    });

    form.appendChild(wrap);
    nextBtn.textContent = step === QUESTIONS.length - 1 ? "Finish" : "Next";
  }

  function showResults() {
    result.hidden = false;
    grid.innerHTML = "";

    const lensScores = {};
    LENSES.forEach(l => lensScores[l.id] = []);

    QUESTIONS.forEach(q => {
      if (answers[q.id] != null) {
        lensScores[q.lens].push(answers[q.id]);
      }
    });

    LENSES.forEach(l => {
      const vals = lensScores[l.id];
      const pct = vals.length ? (vals.reduce((a,b)=>a+b,0) / (vals.length * 3)) * 100 : 0;

      const card = document.createElement("div");
      card.className = "signal";
      card.innerHTML = `
        <div class="signal-top">
          <p>${l.name}</p>
          <span class="signal-label">${pct > 70 ? "Strong" : pct > 40 ? "Developing" : "Fragile"}</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      `;
      card.addEventListener("click", () => openLensDetail(l.id));
      grid.appendChild(card);
    });

    resultCopy.innerHTML = `
      <p>
        Right now your household signal shows a mix of strengths and growth areas.
        This isn’t about fixing everything — it’s about choosing one calm next step.
      </p>
    `;
  }

  function openLensDetail(id) {
    $("#lensDetail").hidden = false;
    $("#lensDetailTitle").textContent = LENSES.find(l => l.id === id).name;
    $("#lensDetailMeaning").textContent = LENS_INSIGHT[id].meaning;
    $("#lensDetailActions").innerHTML =
      LENS_INSIGHT[id].actions.map(a => `<li>${a}</li>`).join("");
    $("#lensDetailAudit").textContent = LENS_INSIGHT[id].audit;
  }

  nextBtn.addEventListener("click", () => {
    step++;
    render();
  });

  backBtn.addEventListener("click", () => {
    step = Math.max(-1, step - 1);
    render();
  });

})();
