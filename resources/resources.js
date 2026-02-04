/* =========================================================
   Cyber Seeds — Resources Hub Integration
   - Loads latest snapshot and personalises the hub
   - Safe on missing/corrupt local storage
   ========================================================= */

(function(){
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const YEAR = $("#year");
  if (YEAR) YEAR.textContent = String(new Date().getFullYear());

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (navToggle && nav){
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const SNAPSHOT_KEY = "cyberseeds_snapshot_v3";
  const HISTORY_KEY = "cyberseeds_snapshots_v1";
  const BASELINE_KEY = "cyberseeds_snapshot_baseline_v2";
  const SNAPSHOT_LAST_KEY = "cyberseeds_snapshot_last";

  const LEGACY_KEYS = [
    "cyberseeds_snapshot_v2",
    "cyberseeds_snapshot_v1",
    "seed_snapshot_v2",
    "cyberseeds_snapshot_last",
    "cyberSeeds_snapshot_last",
    "cs_snapshot_last",
    "snapshot_last",
    "cyberseeds_snapshot",
    "cyberSeedsSnapshot",
    "cyberSeeds.snapshot",
    "cs.snapshot.last",
    "cs:lastSnapshot"
  ];

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];
  const LENS_LABELS = {
    network: "Network",
    devices: "Devices",
    privacy: "Accounts & Privacy",
    scams: "Scams & Messages",
    wellbeing: "Children & Wellbeing"
  };

  function safeParse(value, fallback=null){
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function safeGetStorageItem(key){
    try { return localStorage.getItem(key); } catch {}
    try { return sessionStorage.getItem(key); } catch {}
    return null;
  }

  function safeSetStorageItem(key, value){
    try { localStorage.setItem(key, value); } catch {}
  }

  function formatDate(ts){
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
  }

  function sanitizeLensPercents(input){
    const data = input && typeof input === "object" ? input : {};
    return Object.fromEntries(LENS_ORDER.map(l => [l, Math.round(Number(data[l] ?? 0))]));
  }

  function buildTrajectory(currentScore, previousScore){
    if (previousScore == null) return { label: "Stable", diff: 0, change: "No earlier snapshot yet." };
    const diff = Math.round(currentScore - previousScore);
    if (diff >= 4) return { label: "Improving", diff, change: `Up ${diff} points since the last snapshot.` };
    if (diff <= -4) return { label: "Declining", diff, change: `Down ${Math.abs(diff)} points since the last snapshot.` };
    return { label: "Stable", diff, change: "Holding steady since the last snapshot." };
  }

  function buildSignal(totalScore, trajectoryLabel, lensPercents){
    const total = Math.round(totalScore ?? 0);
    let overall = "STABLE";
    if (total >= 80) overall = "STRONG";
    else if (total >= 60) overall = "STABLE";
    else if (total >= 40) overall = "FRAGILE";
    else overall = "STRAINED";

    const lowest = Math.min(...LENS_ORDER.map(l => lensPercents[l] ?? 0));
    const riskPressure = lowest < 45 || total < 45 ? "High" : lowest < 65 || total < 60 ? "Medium" : "Low";
    const resilienceIndex = total >= 75 ? "Growing" : total >= 55 ? "Flat" : "Weak";
    const summary = {
      STRONG: "Strong foundations are visible. Keep routines steady and build gently.",
      STABLE: "A steady base with clear opportunities to strengthen.",
      FRAGILE: "Some protections are in place, but a few gaps may feel heavy.",
      STRAINED: "The household is carrying a lot right now. Small, calm steps will help."
    }[overall];

    return { overall, score: total, trajectory: trajectoryLabel, riskPressure, resilienceIndex, summary };
  }

  // Convert legacy snapshot shapes into the v3 canonical structure for safe use.
  function coerceSnapshot(raw, history){
    if (!raw || typeof raw !== "object") return null;
    const timestamp = raw.timestamp ?? raw.ts ?? Date.now();
    const lenses = sanitizeLensPercents(raw.lenses || raw.lensPercents || raw.perLens);
    const total = Math.round(raw.total ?? raw.hdss ?? raw.score ?? 0);
    const previous = history?.[1]?.totalScore ?? history?.[1]?.hdss ?? null;
    const trajectory = raw.trajectory || buildTrajectory(total, previous);
    const signal = raw.signal || buildSignal(total, trajectory.label, lenses);

    return {
      id: raw.id || `${raw.snapshotId || raw.snapshot_id || timestamp}-${timestamp}`,
      timestamp,
      total,
      lenses,
      patterns: Array.isArray(raw.patterns) ? raw.patterns : [],
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      phasePlan: Array.isArray(raw.phasePlan) ? raw.phasePlan : [],
      signal,
      trajectory,
      focus: raw.focus,
      strongest: raw.strongest,
      weakest: raw.weakest,
      seed: raw.seed
    };
  }

  function loadHistory(){
    const raw = safeGetStorageItem(HISTORY_KEY);
    const parsed = safeParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function loadSnapshot(){
    const history = loadHistory();
    const currentRaw = safeParse(safeGetStorageItem(SNAPSHOT_KEY), null);
    if (currentRaw && currentRaw.id && typeof currentRaw.total === "number" && currentRaw.lenses){
      return currentRaw;
    }

    const legacy = [currentRaw, ...LEGACY_KEYS.map(key => safeParse(safeGetStorageItem(key), null))]
      .find(item => item && typeof item === "object");
    if (!legacy) return null;

    const migrated = coerceSnapshot(legacy, history);
    if (migrated){
      safeSetStorageItem(SNAPSHOT_KEY, JSON.stringify(migrated));
      safeSetStorageItem(SNAPSHOT_LAST_KEY, migrated.id);
    }
    return migrated;
  }

  function lensStatus(pct){
    const score = Math.round(pct ?? 0);
    if (score >= 75) return { icon: "🟢", label: "Steady" };
    if (score >= 50) return { icon: "🟠", label: "Forming" };
    return { icon: "🔴", label: "Fragile" };
  }

  function setRingSegments(lensPercents){
    const segments = [
      { id: "segNetwork", lens: "network" },
      { id: "segDevices", lens: "devices" },
      { id: "segPrivacy", lens: "privacy" },
      { id: "segScams", lens: "scams" },
      { id: "segWellbeing", lens: "wellbeing" }
    ];

    const startAngle = -90;
    const gap = 6;
    const size = (360 - gap * segments.length) / segments.length;
    const radius = 70;
    const center = 100;

    const describeArc = (start, end) => {
      const polar = (angle) => {
        const rad = (angle * Math.PI) / 180;
        return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
      };
      const startPt = polar(start);
      const endPt = polar(end);
      const largeArc = end - start <= 180 ? 0 : 1;
      return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
    };

    segments.forEach((segment, index) => {
      const start = startAngle + index * (size + gap);
      const end = start + size;
      const path = document.getElementById(segment.id);
      if (!path) return;
      const status = lensStatus(lensPercents[segment.lens]);
      path.setAttribute("d", describeArc(start, end));
      path.style.stroke = status.icon === "🟢" ? "#2b8a78" : status.icon === "🟠" ? "#d9922b" : "#c85050";
      path.style.strokeWidth = "10";
      path.style.fill = "none";
    });
  }

  function updateLensInsight(lensKey, lensPercents){
    const lensCopy = {
      network: {
        kicker: "Network lens",
        title: "The network is the home’s circulation system",
        body: "A steady router keeps everything else calmer and easier to manage.",
        why: "Stable Wi-Fi reduces surprises and keeps updates flowing.",
        good: "Logins are stored safely, guest access is separated, and updates are regular.",
        traps: "Forgotten router passwords or shared access can cause hidden strain."
      },
      devices: {
        kicker: "Devices lens",
        title: "Devices are the household’s working tools",
        body: "Simple care keeps devices reliable and reduces disruption.",
        why: "Updates and backups prevent avoidable stress.",
        good: "Automatic updates and screen locks are on for key devices.",
        traps: "Old or unused devices can quietly create extra work."
      },
      privacy: {
        kicker: "Accounts & privacy lens",
        title: "Accounts are the immune system",
        body: "Boundaries keep access predictable and recovery calm.",
        why: "Strong recovery paths reduce pressure in urgent moments.",
        good: "Main accounts use two-step verification and recovery checks.",
        traps: "Shared passwords or outdated recovery options weaken confidence."
      },
      scams: {
        kicker: "Scams & messages lens",
        title: "Scams test the household perimeter",
        body: "A short pause helps everyone spot pressure tactics.",
        why: "Verification routines prevent sudden losses and worry.",
        good: "The household checks unexpected requests before acting.",
        traps: "Urgent messages can bypass routines unless they’re shared."
      },
      wellbeing: {
        kicker: "Wellbeing lens",
        title: "Wellbeing protects rest and focus",
        body: "Digital routines help children and adults feel steadier.",
        why: "Predictable boundaries protect learning and sleep.",
        good: "Shared routines keep devices in their place.",
        traps: "Without a routine, screens can creep into recovery time."
      }
    };

    const copy = lensCopy[lensKey] || lensCopy.network;
    const score = Math.round(lensPercents[lensKey] ?? 0);

    const kicker = $("#lensKicker");
    const title = $("#lensInsightTitle");
    const body = $("#lensInsightBody");
    const why = $("#lensWhy");
    const good = $("#lensGood");
    const traps = $("#lensTraps");

    if (kicker) kicker.textContent = copy.kicker;
    if (title) title.textContent = `${copy.title} (${score}%)`;
    if (body) body.textContent = copy.body;
    if (why) why.textContent = copy.why;
    if (good) good.textContent = copy.good;
    if (traps) traps.textContent = copy.traps;
  }

  function applySnapshot(snapshot){
    const personalisedBanner = $("#personalisedBanner");
    if (personalisedBanner) personalisedBanner.hidden = false;

    const lenses = sanitizeLensPercents(snapshot.lenses || snapshot.lensPercents || {});
    const total = Math.round(snapshot.total ?? 0);
    const history = loadHistory();
    const trajectory = snapshot.trajectory || buildTrajectory(total, history[1]?.totalScore ?? history[1]?.hdss);
    const signal = snapshot.signal || buildSignal(total, trajectory.label, lenses);

    const stageTitle = $("#stageTitle");
    const stageDesc = $("#stageDesc");
    if (stageTitle) stageTitle.textContent = `${signal.overall} signal (${signal.score}/100)`;
    if (stageDesc) stageDesc.textContent = signal.summary;

    const fingerprintLine = $("#fingerprintLine");
    const lastTakenLine = $("#lastTakenLine");
    if (fingerprintLine) fingerprintLine.textContent = `Snapshot ID: ${String(snapshot.id).slice(0, 8)}`;
    if (lastTakenLine) lastTakenLine.textContent = `Last taken: ${formatDate(snapshot.timestamp)}`;

    const focusTitle = $("#focusTitle");
    const focusDesc = $("#focusDesc");
    const focusChips = $("#focusChips");
    const focusLens = snapshot.focus || snapshot.weakest || "network";
    if (focusTitle) focusTitle.textContent = `${LENS_LABELS[focusLens] || "Focus"} is your fastest path to calm gains.`;
    if (focusDesc) focusDesc.textContent = "Start small, build confidence, and let the strongest habits lift the rest.";
    if (focusChips){
      const chips = [
        `Trajectory: ${trajectory.label}`,
        `Risk pressure: ${signal.riskPressure}`,
        `Resilience: ${signal.resilienceIndex}`
      ];
      focusChips.innerHTML = chips.map(chip => `<span class="hub-chip">${chip}</span>`).join("");
    }

    setRingSegments(lenses);
    const ringStage = $("#ringStage");
    const ringScore = $("#ringScore");
    if (ringStage) ringStage.textContent = signal.overall;
    if (ringScore) ringScore.textContent = `${signal.score}%`;

    LENS_ORDER.forEach(lens => {
      const valEl = $("#val" + lens.charAt(0).toUpperCase() + lens.slice(1));
      if (valEl) valEl.textContent = `${Math.round(lenses[lens] ?? 0)}%`;
    });

    updateLensInsight(focusLens, lenses);

    $$('[data-lens]').forEach(button => {
      button.addEventListener("click", () => {
        const lens = button.getAttribute("data-lens");
        if (lens) updateLensInsight(lens, lenses);
      });
    });

    [
      { id: "segNetwork", lens: "network" },
      { id: "segDevices", lens: "devices" },
      { id: "segPrivacy", lens: "privacy" },
      { id: "segScams", lens: "scams" },
      { id: "segWellbeing", lens: "wellbeing" }
    ].forEach(seg => {
      const node = document.getElementById(seg.id);
      if (!node) return;
      node.addEventListener("click", () => updateLensInsight(seg.lens, lenses));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " "){
          event.preventDefault();
          updateLensInsight(seg.lens, lenses);
        }
      });
    });

    const actionsToday = $("#actionsToday");
    const actionsWeek = $("#actionsWeek");
    const actionsMonth = $("#actionsMonth");
    const seedText = $("#seedText");
    const phasePlan = Array.isArray(snapshot.phasePlan) ? snapshot.phasePlan : [];
    const fillList = (node, items) => {
      if (!node) return;
      node.innerHTML = items.length ? items.map(item => `<li>${item}</li>`).join("") : "<li>Pick one small step that feels manageable.</li>";
    };
    fillList(actionsToday, phasePlan[0]?.actions || []);
    fillList(actionsWeek, phasePlan[1]?.actions || []);
    fillList(actionsMonth, phasePlan[2]?.actions || []);
    if (seedText) seedText.textContent = snapshot.seed?.today || "Choose one calm action that makes today feel easier.";

    const emptyCard = $("#emptyStateCard");
    if (emptyCard) emptyCard.style.display = "none";
  }

  function showEmptyState(){
    const emptyCard = $("#emptyStateCard");
    if (emptyCard) emptyCard.style.display = "block";
    const stageTitle = $("#stageTitle");
    const stageDesc = $("#stageDesc");
    if (stageTitle) stageTitle.textContent = "No snapshot yet";
    if (stageDesc) stageDesc.textContent = "Take a snapshot to see a calm signal here.";
  }

  function applyBaseline(snapshot){
    const grid = $("#progressGrid");
    if (!grid) return;
    const baseline = safeParse(safeGetStorageItem(BASELINE_KEY), null);
    if (!baseline){
      grid.innerHTML = "<p class=\"muted\">Save a baseline to track progress over time.</p>";
      return;
    }
    const current = sanitizeLensPercents(snapshot.lenses || {});
    const baselineLens = sanitizeLensPercents(baseline.lenses || {});
    const rows = LENS_ORDER.map(lens => {
      const delta = Math.round((current[lens] ?? 0) - (baselineLens[lens] ?? 0));
      const deltaLabel = delta === 0 ? "no change" : delta > 0 ? `+${delta}` : `${delta}`;
      return `<div class=\"progress-row\"><strong>${LENS_LABELS[lens]}</strong><span>${deltaLabel} points</span></div>`;
    }).join("");
    grid.innerHTML = rows;
  }

  function bindBaselineActions(snapshot){
    const saveBtn = $("#saveBaselineBtn");
    const clearBtn = $("#clearBaselineBtn");
    if (saveBtn){
      saveBtn.addEventListener("click", () => {
        const payload = {
          saved_at: new Date().toISOString(),
          lenses: snapshot.lenses,
          total: snapshot.total
        };
        safeSetStorageItem(BASELINE_KEY, JSON.stringify(payload));
        applyBaseline(snapshot);
      });
    }
    if (clearBtn){
      clearBtn.addEventListener("click", () => {
        safeSetStorageItem(BASELINE_KEY, "");
        try { localStorage.removeItem(BASELINE_KEY); } catch {}
        applyBaseline(snapshot);
      });
    }
  }

  const snapshot = loadSnapshot();
  if (!snapshot){
    showEmptyState();
    return;
  }

  applySnapshot(snapshot);
  applyBaseline(snapshot);
  bindBaselineActions(snapshot);
})();
