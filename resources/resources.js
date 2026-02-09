/* Dev checklist: snapshot fallback + empty-section handling + seed progress tracking + baseline clarity copy. */
/* Manual QA steps:
   - Snapshot run -> retake -> results show.
   - Resources load: no snapshot state, then snapshot state, then progress persists on reload.
   - Baseline set/clear and compare hint reads clearly. */
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
  const SEED_PROGRESS_KEY = "cyberseeds_seed_progress_v1";

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

  function hideIfEmpty(section){
    if (!section) return;
    const text = section.textContent.replace(/\s+/g, " ").trim();
    if (text) return;
    const meaningfulItems = section.querySelectorAll("li, p, span, strong, em, input, button, select, textarea");
    if (meaningfulItems.length) return;
    section.hidden = true;
  }

  // B-3: disable baseline controls until a snapshot exists.
  function setBaselineControlsEnabled(enabled){
    const saveBtn = $("#saveBaselineBtn");
    const clearBtn = $("#clearBaselineBtn");
    [saveBtn, clearBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = !enabled;
      btn.setAttribute("aria-disabled", String(!enabled));
    });
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

    const historyEntry = history[0];
    if (historyEntry){
      const migrated = coerceSnapshot(historyEntry, history);
      if (migrated){
        safeSetStorageItem(SNAPSHOT_KEY, JSON.stringify(migrated));
        safeSetStorageItem(SNAPSHOT_LAST_KEY, migrated.id);
        return migrated;
      }
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

  function getSeedProgress(snapshot){
    const store = safeParse(safeGetStorageItem(SEED_PROGRESS_KEY), {}) || {};
    const key = snapshot?.id || snapshot?.timestamp || "latest";
    const existing = store[key] || {};
    return {
      key,
      store,
      progress: {
        today: Boolean(existing.today),
        week: Boolean(existing.week),
        month: Boolean(existing.month)
      }
    };
  }

  function saveSeedProgress(progressState){
    if (!progressState) return;
    progressState.store[progressState.key] = progressState.progress;
    safeSetStorageItem(SEED_PROGRESS_KEY, JSON.stringify(progressState.store));
  }

  // Local-only progress UI, keyed per snapshot so new snapshots start fresh.
  function renderSeedProgress(snapshot, seed){
    const container = $("#seedProgress");
    if (!container) return;
    const today = seed?.today?.trim();
    const week = seed?.this_week?.trim();
    const month = seed?.this_month?.trim();
    if (!today && !week && !month){
      container.innerHTML = "";
      const card = container.closest(".card");
      if (card) card.hidden = true;
      return;
    }
    const card = container.closest(".card");
    if (card) card.hidden = false;

    const state = getSeedProgress(snapshot);
    const items = [
      { key: "today", label: today, fallback: "Today task" },
      { key: "week", label: week, fallback: "This week task" },
      { key: "month", label: month, fallback: "This month task" }
    ];
    const completed = items.filter(item => state.progress[item.key]).length;
    const percent = Math.round((completed / items.length) * 100);

    container.innerHTML = `
      <div class="progress-card">
        <p class="progress-title">Progress</p>
        <div class="progress-list">
          ${items.map(item => `
            <label class="progress-item">
              <input type="checkbox" data-progress-key="${item.key}" ${state.progress[item.key] ? "checked" : ""} />
              <span>${item.label || item.fallback}</span>
            </label>
          `).join("")}
        </div>
        <div class="progress-meta">
          <span>${percent}% complete</span>
          <span class="muted">Small steps count. No pressure if today feels full.</span>
        </div>
        <div class="progress-actions">
          <button type="button" class="btn ghost" data-progress-action="all">Mark all complete</button>
          <button type="button" class="btn" data-progress-action="reset">Reset progress</button>
        </div>
      </div>
    `;

    const update = (next) => {
      state.progress = { ...state.progress, ...next };
      saveSeedProgress(state);
      renderSeedProgress(snapshot, seed);
    };

    container.querySelectorAll("[data-progress-key]").forEach(input => {
      input.addEventListener("change", () => {
        update({ [input.getAttribute("data-progress-key")]: input.checked });
      });
    });
    container.querySelectorAll("[data-progress-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.getAttribute("data-progress-action");
        if (action === "all"){
          update({ today: true, week: true, month: true });
        } else if (action === "reset"){
          update({ today: false, week: false, month: false });
        }
      });
    });
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
    setBaselineControlsEnabled(true);

    const ringContainer = document.querySelector("[data-cs-ring]");
    if (ringContainer) ringContainer.classList.remove("is-empty");
    const ringNote = $("#ringEmptyNote");
    if (ringNote) ringNote.textContent = "";
    $$(".cs-donut-legend button[data-lens]").forEach(btn => {
      btn.disabled = false;
      btn.removeAttribute("aria-disabled");
    });

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

    const hasText = (...els) => els.some(el => el && el.textContent.trim().length);
    const signalTitle = document.querySelector("[data-cs-signal-title]");
    const signalMessage = document.querySelector("[data-cs-signal-message]");
    if (signalTitle) signalTitle.textContent = `${signal.overall} signal (${signal.score}/100)`;
    if (signalMessage) signalMessage.textContent = signal.summary;
    const signalCard = signalTitle?.closest(".card");
    if (signalCard && !hasText(signalTitle, signalMessage)) signalCard.hidden = true;

    const focusCardTitle = document.querySelector("[data-cs-focus-title]");
    const focusWhy = document.querySelector("[data-cs-focus-why]");
    const focusNow = document.querySelector("[data-cs-focus-now]");
    if (focusCardTitle) focusCardTitle.textContent = `${LENS_LABELS[focusLens] || "Focus"} focus lens`;
    if (focusWhy) focusWhy.textContent = snapshot.signal?.summary || "A clear focus keeps the next step calm and doable.";
    if (focusNow) focusNow.textContent = `Trajectory: ${trajectory.label}. Risk pressure: ${signal.riskPressure}.`;
    const focusCard = focusCardTitle?.closest(".card");
    if (focusCard && !hasText(focusCardTitle, focusWhy, focusNow)) focusCard.hidden = true;

    const ringLegend = document.querySelector("[data-cs-ring-legend]");
    if (ringLegend){
      ringLegend.innerHTML = LENS_ORDER.map(lens => {
        const status = lensStatus(lenses[lens]);
        return `<div class="legend-row"><span>${LENS_LABELS[lens]}</span><strong>${status.label} • ${Math.round(lenses[lens] ?? 0)}%</strong></div>`;
      }).join("");
      const ringCard = ringLegend.closest(".card");
      if (ringCard && !hasText(ringLegend)) ringCard.hidden = true;
    }


      /* =========================================================
     DONUT RING ENGINE (Resources Hub)
     - Five equal segments
     - Visual fill based on lens %
     - Focus highlight
     - Legend + segment click updates insight
     ========================================================= */

  const DONUT_IDS = {
    network:   "donut-network",
    devices:   "donut-devices",
    privacy:   "donut-privacy",
    scams:     "donut-scams",
    wellbeing: "donut-wellbeing"
  };

  function clamp(n, min=0, max=100){
    n = Number(n);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function setDonutText(signal){
    const scoreEl = $("#donutScore");
    const stageEl = $("#donutStage");
    if (scoreEl) scoreEl.textContent = `${Math.round(signal.score ?? 0)}%`;
    if (stageEl) stageEl.textContent = String(signal.overall ?? "—");
  }

  function setDonutSegments(lensPercents, focusLens){
    // Geometry: equal 5 segments with a small gap
    const r = 90;
    const C = 2 * Math.PI * r;        // circumference
    const N = LENS_ORDER.length;      // 5
    const segLen = C / N;             // per segment length
    const gap = 8;                    // visual gap (stroke length)
    const visibleLen = Math.max(0, segLen - gap);

    LENS_ORDER.forEach((lens, i) => {
      const el = document.getElementById(DONUT_IDS[lens]);
      if (!el) return;

      const pct = clamp(lensPercents[lens] ?? 0);      // 0..100
      const fillLen = (visibleLen * pct) / 100;        // partial fill
      const emptyLen = C - fillLen;

      // Base segment position around ring:
      // We place the segment "window" by offsetting so each lens occupies a slice.
      // Then we "fill" within that slice by limiting dasharray.
      const baseOffset = -(i * segLen);

      el.style.strokeDasharray = `${fillLen} ${emptyLen}`;
      el.style.strokeDashoffset = String(baseOffset);
      el.classList.toggle("is-focus", lens === focusLens);

      // A11y: let screen readers know the value
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `${LENS_LABELS[lens]} ${Math.round(pct)} percent`);
    });
  }

  function bindDonutInteractivity(lenses){
    // Click on legend buttons (your donut legend)
    $$(".cs-donut-legend button[data-lens]").forEach(btn => {
      btn.addEventListener("click", () => {
        const lens = btn.getAttribute("data-lens");
        if (!lens) return;
        updateLensInsight(lens, lenses);

        // also set focus glow class on donut
        setDonutSegments(lenses, lens);
      });
    });
  }

  // Donut legend values (resources page only)
  const mapId = {
    network: "donutValNetwork",
    devices: "donutValDevices",
    privacy: "donutValPrivacy",
    scams: "donutValScams",
    wellbeing: "donutValWellbeing"
  };

  LENS_ORDER.forEach(lens => {
    const el = document.getElementById(mapId[lens]);
    if (el) el.textContent = `${Math.round(lenses[lens] ?? 0)}%`;
  });

  // Donut ring (new)
  setDonutText(signal);
  setDonutSegments(lenses, focusLens);

  LENS_ORDER.forEach(lens => {
    const valEl = $("#val" + lens.charAt(0).toUpperCase() + lens.slice(1));
    if (valEl) valEl.textContent = `${Math.round(lenses[lens] ?? 0)}%`;
  });

  updateLensInsight(focusLens, lenses);

  // Donut legend + segment clicks
  bindDonutInteractivity(lenses);

  const emptyCard = $("#emptyStateCard");
  if (emptyCard) emptyCard.style.display = "none";

  const seedTitle = document.querySelector("[data-cs-seed-title]");
  const seedToday = document.querySelector("[data-cs-seed-today]");
  const seedWeek = document.querySelector("[data-cs-seed-week]");
  const seedMonth = document.querySelector("[data-cs-seed-month]");
  if (seedTitle) seedTitle.textContent = snapshot.seed?.title || "Your next Digital Seed";
  if (seedToday) seedToday.textContent = snapshot.seed?.today || "";
  if (seedWeek) seedWeek.textContent = snapshot.seed?.this_week || "";
  if (seedMonth) seedMonth.textContent = snapshot.seed?.this_month || "";
  const seedCard = seedTitle?.closest(".card");
  if (seedCard && !hasText(seedTitle, seedToday, seedWeek, seedMonth)) seedCard.hidden = true;

  renderSeedProgress(snapshot, snapshot.seed);

  document.querySelectorAll(".card").forEach(card => hideIfEmpty(card));
  document.querySelectorAll("section[data-cs-lens-cards]").forEach(section => hideIfEmpty(section));
  }

  function showEmptyState(){
    const emptyCard = $("#emptyStateCard");
    if (emptyCard) emptyCard.style.display = "block";
    const personalisedBanner = $("#personalisedBanner");
    if (personalisedBanner) personalisedBanner.hidden = true;
    const stageTitle = $("#stageTitle");
    const stageDesc = $("#stageDesc");
    if (stageTitle) stageTitle.textContent = "No snapshot yet";
    if (stageDesc) stageDesc.textContent = "Take a snapshot to see a calm signal here.";

    const focusTitle = $("#focusTitle");
    const focusDesc = $("#focusDesc");
    const focusChips = $("#focusChips");
    if (focusTitle) focusTitle.textContent = "Take a snapshot to reveal your focus lens.";
    if (focusDesc) focusDesc.textContent = "Your personalised guidance appears here once you complete the 2-minute snapshot.";
    if (focusChips) focusChips.innerHTML = "<span class=\"hub-chip\">Local-only results</span>";

    const lensKicker = $("#lensKicker");
    const lensTitle = $("#lensInsightTitle");
    const lensBody = $("#lensInsightBody");
    const lensWhy = $("#lensWhy");
    const lensGood = $("#lensGood");
    const lensTraps = $("#lensTraps");
    if (lensKicker) lensKicker.textContent = "Focus lens";
    if (lensTitle) lensTitle.textContent = "Awaiting snapshot";
    if (lensBody) lensBody.textContent = "Complete a snapshot to see tailored lens guidance.";
    if (lensWhy) lensWhy.textContent = "";
    if (lensGood) lensGood.textContent = "";
    if (lensTraps) lensTraps.textContent = "";

    const ringContainer = document.querySelector("[data-cs-ring]");
    if (ringContainer) ringContainer.classList.add("is-empty");
    const ringNote = $("#ringEmptyNote");
    if (ringNote) ringNote.textContent = "Your five-lens ring appears after a snapshot.";
    const scoreEl = $("#donutScore");
    const stageEl = $("#donutStage");
    if (scoreEl) scoreEl.textContent = "—";
    if (stageEl) stageEl.textContent = "Awaiting snapshot";

    const r = 90;
    const C = 2 * Math.PI * r;
    LENS_ORDER.forEach(lens => {
      const el = document.getElementById(`donut-${lens}`);
      if (!el) return;
      el.style.strokeDasharray = `0 ${C}`;
      el.style.strokeDashoffset = "0";
      el.setAttribute("aria-label", `${LENS_LABELS[lens]} awaiting snapshot`);
    });
    const legendMap = {
      network: "donutValNetwork",
      devices: "donutValDevices",
      privacy: "donutValPrivacy",
      scams: "donutValScams",
      wellbeing: "donutValWellbeing"
    };
    LENS_ORDER.forEach(lens => {
      const el = document.getElementById(legendMap[lens]);
      if (el) el.textContent = "—";
    });
    $$(".cs-donut-legend button[data-lens]").forEach(btn => {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    });

    const progressGrid = $("#progressGrid");
    if (progressGrid){
      progressGrid.innerHTML = "<p class=\"muted\">Complete a snapshot to enable baseline comparisons.</p>";
    }
    setBaselineControlsEnabled(false);

    const seedCard = document.querySelector("[data-cs-seed-title]")?.closest(".card");
    if (seedCard) seedCard.hidden = true;
    const seedProgress = $("#seedProgress");
    if (seedProgress) seedProgress.innerHTML = "";

    // B-2: swap loading placeholders for a calm, instructive empty state.
  }

  function applyBaseline(snapshot){
    const grid = $("#progressGrid");
    if (!grid) return;
    const baseline = safeParse(safeGetStorageItem(BASELINE_KEY), null);
    if (!baseline){
      grid.innerHTML = "<p class=\"muted\">Set a baseline to lock today as your reference point.</p>";
      return;
    }
    const current = sanitizeLensPercents(snapshot.lenses || {});
    const baselineLens = sanitizeLensPercents(baseline.lenses || {});
    const baselineTotal = Math.round(baseline.total ?? baseline.hdss ?? 0);
    const currentTotal = Math.round(snapshot.total ?? snapshot.hdss ?? 0);
    const totalDiff = currentTotal - baselineTotal;
    const totalDiffLabel = totalDiff === 0 ? "no change" : totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
    const baselineDate = baseline.saved_at ? formatDate(baseline.saved_at) : "Unknown date";
    const rows = LENS_ORDER.map(lens => {
      const delta = Math.round((current[lens] ?? 0) - (baselineLens[lens] ?? 0));
      const deltaLabel = delta === 0 ? "no change" : delta > 0 ? `+${delta}` : `${delta}`;
      return `<div class=\"progress-row\"><strong>${LENS_LABELS[lens]}</strong><span>${deltaLabel} points</span></div>`;
    }).join("");
    grid.innerHTML = `
      <div class="progress-baseline">
        <p><strong>Baseline set on ${baselineDate} at ${baselineTotal}%</strong></p>
        <p class="muted">Change since baseline: ${totalDiffLabel}</p>
      </div>
      ${rows}
    `;
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

  const currentSnapshot = loadSnapshot();
  if (!currentSnapshot){
    showEmptyState();
    return;
  }

  applySnapshot(currentSnapshot);
  applyBaseline(currentSnapshot);
  bindBaselineActions(currentSnapshot);
})();
