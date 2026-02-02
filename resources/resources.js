/* =========================================================
   Cyber Seeds — Resources Hub (Local-only)
   - Reads last snapshot from storage
   - Renders premium 5-lens ring with focus highlight
   - Clickable ring + clickable legend -> updates insight + actions
   - Populates Today / Week / Month from snapshot.seed
   - Baseline tracking for progress
   ========================================================= */

(function(){
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);

  // Year
  const YEAR = $("#year");
  if (YEAR) YEAR.textContent = String(new Date().getFullYear());

  // Mobile nav toggle (safe even if you remove header)
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (navToggle && nav){
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // ---------- Storage keys ----------
  const SNAPSHOT_KEYS = [
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

  const BASELINE_KEY = "cyberseeds_snapshot_baseline_v2";

  function safeJSONParse(str){
    try { return JSON.parse(str); } catch { return null; }
  }

  function safeGetStorageItem(k){
    try { return localStorage.getItem(k); } catch {}
    try { return sessionStorage.getItem(k); } catch {}
    return null;
  }

  function safeSetStorageItem(k, v){
    try { localStorage.setItem(k, v); return true; } catch {}
    try { sessionStorage.setItem(k, v); return true; } catch {}
    return false;
  }

  function safeRemoveStorageItem(k){
    try { localStorage.removeItem(k); } catch {}
    try { sessionStorage.removeItem(k); } catch {}
  }

  function getLastSnapshot(){
    for (const k of SNAPSHOT_KEYS){
      const raw = safeGetStorageItem(k);
      if (!raw) continue;
      const parsed = safeJSONParse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
    return null;
  }

  // Expose for console debugging without breaking encapsulation
  window.__CS = window.__CS || {};
  window.__CS.getLastSnapshot = getLastSnapshot;

  // ---------- Normalisation ----------
  function isFiniteNumber(n){ return typeof n === "number" && Number.isFinite(n); }

  function formatDate(ts){
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year:"numeric", month:"short", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  }

  function extractStage(snap){
    const fallback =
      "A few risk flows need tightening. Small changes will reduce stress and risk quickly.";
    const raw = snap.stage ?? snap.stage_label ?? snap.stageLabel ?? snap.band ?? snap.tier ?? "Emerging";
    if (raw && typeof raw === "object"){
      return {
        stage: String(raw.label ?? raw.name ?? raw.stage ?? "Emerging"),
        desc: String(raw.desc ?? raw.description ?? snap.stage_desc ?? snap.summary ?? fallback)
      };
    }
    return {
      stage: String(raw || "Emerging"),
      desc: String(snap.stage_desc || snap.stageDescription || snap.summary || fallback)
    };
  }

  // Your v2 sample shows lensScores sum to hdss (e.g., 10+10+8+18+9 = 55).
  // We treat lens scores as "points per lens" and infer max scale.
  function inferLensMax(scores){
    const nums = Object.values(scores).filter(isFiniteNumber);
    if (!nums.length) return 20;
    const m = Math.max(...nums);
    // if it looks like 0–4 scoring
    if (m <= 4) return 4;
    // common for your build: 0–20 per lens (sum -> HDSS)
    if (m <= 20) return 20;
    // fallback
    return 20;
  }

  function extractLensScores(snap){
    if (snap.lensScores && typeof snap.lensScores === "object"){
      return {
        network:   snap.lensScores.network,
        devices:   snap.lensScores.devices,
        privacy:   snap.lensScores.privacy,
        scams:     snap.lensScores.scams,
        wellbeing: snap.lensScores.wellbeing
      };
    }
    const lens = snap.lenses || snap.scores || snap.subscores || {};
    return {
      network:   lens.network,
      devices:   lens.devices,
      privacy:   lens.privacy,
      scams:     lens.scams,
      wellbeing: lens.wellbeing
    };
  }

  function lensDisplay(val, lensMax){
    if (!isFiniteNumber(val)) return "—";
    return `${val}/${lensMax}`;
  }

  function weakestLens(scores){
    const entries = Object.entries(scores)
      .map(([k,v]) => [k, isFiniteNumber(v) ? v : null])
      .filter(([,v]) => v !== null);
    if (!entries.length) return "privacy";
    entries.sort((a,b) => a[1]-b[1]);
    return entries[0][0];
  }

  // ---------- Ring rendering ----------
  function polarToCartesian(cx, cy, r, angleDeg){
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) };
  }

  function arcPath(cx, cy, r, startAngle, endAngle){
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = (endAngle - startAngle) <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  function opacityForScore(score, lensMax){
    if (!isFiniteNumber(score)) return 0.22;
    const t = Math.max(0, Math.min(lensMax, score)) / lensMax;
    return 0.20 + (0.78 * t);
  }

  function setPath(id, d, op){
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("d", d);
    if (typeof op === "number") el.setAttribute("opacity", String(op));
  }

  function highlightLegend(focusKey){
    const rows = document.querySelectorAll(".legend-row");
    rows.forEach(r => r.classList.remove("is-focus"));
    const el = document.getElementById(`legend${cap(focusKey)}`);
    if (el) el.classList.add("is-focus");
  }

  function cap(s){
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  function renderRing(scores, lensMax, stageLabel, focusKey){
    const step = 72;
    const gap = 6; // degrees
    const start = 0;

    const order = [
      ["network","segNetwork"],
      ["devices","segDevices"],
      ["privacy","segPrivacy"],
      ["scams","segScams"],
      ["wellbeing","segWellbeing"],
    ];

    order.forEach(([key, id], idx) => {
      const a0 = start + (idx * step);
      const a1 = a0 + step - gap;
      const path = arcPath(100,100,70,a0,a1);
      setPath(id, path, opacityForScore(scores[key], lensMax));
    });

    // Focus glow
    const focusIdx = order.findIndex(([k]) => k === focusKey);
    const glow = document.getElementById("segFocusGlow");
    if (glow && focusIdx >= 0){
      const a0 = start + (focusIdx * step);
      const a1 = a0 + step - gap;
      glow.setAttribute("d", arcPath(100,100,70,a0,a1));
      glow.setAttribute("opacity", "0.92");
    } else if (glow){
      glow.setAttribute("opacity", "0");
    }

    const stageEl = document.getElementById("ringStage");
    const scoreEl = document.getElementById("ringScore");
    if (stageEl) stageEl.textContent = String(stageLabel || "Emerging").toUpperCase();

    // ringScore uses HDSS if available; otherwise sum lens points
    const sum = ["network","devices","privacy","scams","wellbeing"]
      .map(k => scores[k]).filter(isFiniteNumber)
      .reduce((a,b)=>a+b,0);

    if (scoreEl) scoreEl.textContent = isFiniteNumber(sum) ? String(sum) : "—";
  }

  // ---------- Lens insight content ----------
  const LENS_CONTENT = {
    network: {
      title: "Network — the household boundary",
      body: "Your Wi-Fi is the front door to the home’s digital life. A few small settings protect every device inside.",
      why: "Most incidents spread because the boundary is weak or shared too broadly (default router settings, reused passwords, guest access not separated).",
      good: "A strong Wi-Fi password, router admin protected, guest network for visitors/smart devices, and updates turned on.",
      traps: "Leaving router admin as default, sharing the Wi-Fi password widely, and using WPS quick-connect."
    },
    devices: {
      title: "Devices — the household’s organs",
      body: "Devices carry your accounts, messages, photos, and money access. Hygiene here reduces both risk and stress.",
      why: "Out-of-date phones/laptops become the weakest link — attackers don’t need ‘you’, they need one unpatched device.",
      good: "Automatic updates on, lock screens enabled, unnecessary apps removed, backups in place.",
      traps: "Ignoring updates, sharing devices without separate profiles, and installing random apps from links."
    },
    privacy: {
      title: "Accounts & Privacy — protect the root accounts",
      body: "Email + Apple/Google can reset access to everything else. If they’re protected, the whole household becomes easier to keep safe.",
      why: "When root accounts are compromised, attackers can reset passwords to banking, school portals, shopping, and social accounts.",
      good: "2-step verification on root accounts, recovery options reviewed, password manager for top accounts.",
      traps: "Old recovery phone numbers, reused passwords, and leaving important accounts without 2SV."
    },
    scams: {
      title: "Scams — defend the pressure points",
      body: "Scams win in moments of urgency, emotion, or confusion. Calm rules stop damage early.",
      why: "Most scam losses are behavioural timing problems — not technical failures.",
      good: "A household pause rule, verify through official apps, transaction alerts enabled.",
      traps: "Clicking links in messages, acting under urgency, and ‘fixing’ issues through unknown callers."
    },
    wellbeing: {
      title: "Children & Wellbeing — calm routines reduce harm",
      body: "Stable routines reduce conflict, exposure, and impulsive risk moments. This lens protects attention and sleep — which protects decisions.",
      why: "Late-night scrolling, notification overload, and weak boundaries raise risk across every other lens.",
      good: "Device cut-off times, reduced notifications, shared charging place, guidance not punishment.",
      traps: "Overly strict rules that collapse, or no boundaries at all."
    }
  };

  function setText(id, text){
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHTML(id, html){
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function renderLensInsight(lensKey, isFocus){
    const c = LENS_CONTENT[lensKey] || LENS_CONTENT.privacy;
    setText("lensKicker", isFocus ? "Focus lens" : "Lens insight");
    setText("lensInsightTitle", c.title);
    setText("lensInsightBody", c.body);
    setText("lensWhy", c.why);
    setText("lensGood", c.good);
    setText("lensTraps", c.traps);
  }

  // ---------- “Small actions” (dynamic) ----------
  function liCard(text, helper){
    // Expandable detail for each item
    const safeText = String(text || "").trim();
    const safeHelp = String(helper || "").trim();

    if (!safeText) return "";

    if (!safeHelp){
      return `<li class="action-item"><span class="action-dot" aria-hidden="true"></span><span>${escapeHTML(safeText)}</span></li>`;
    }

    return `
      <li class="action-item">
        <details class="action-detail">
          <summary>
            <span class="action-dot" aria-hidden="true"></span>
            <span>${escapeHTML(safeText)}</span>
          </summary>
          <div class="action-detail__body">${escapeHTML(safeHelp)}</div>
        </details>
      </li>
    `;
  }

  function escapeHTML(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function renderActionBlocks(snapshot, focusKey){
    const todayEl = document.getElementById("actionsToday");
    const weekEl  = document.getElementById("actionsWeek");
    const monthEl = document.getElementById("actionsMonth");
    const introEl = document.getElementById("actionsIntro");

    // Prefer snapshot.seed if present (your v2 output has this)
    const seed = snapshot && snapshot.seed ? snapshot.seed : null;

    // Support either:
    // - snapshot.seed.today / this_week / this_month (strings)
    // - OR fallback to lens-based defaults (below)
    const fallbackByLens = {
      privacy: {
        today: [
          { t: "Enable 2-step verification on your main email", h: "Start with the email that resets everything else. Use an authenticator app if possible." }
        ],
        week: [
          { t: "Review recovery options and remove old ones", h: "Old phone numbers and emails are a common takeover route." }
        ],
        month: [
          { t: "Use a password manager for your top 5 accounts", h: "Unique passwords at the top prevents cascade across the household." }
        ]
      },
      network: {
        today: [
          { t: "Change router admin password (not the Wi-Fi password)", h: "This protects the control panel of your home network." }
        ],
        week: [
          { t: "Turn off WPS and check WPA2/WPA3", h: "WPS is convenient but weak; WPA2/WPA3 is the safer baseline." }
        ],
        month: [
          { t: "Create a guest network for visitors + smart devices", h: "Separating devices reduces spread if one gets compromised." }
        ]
      },
      devices: {
        today: [
          { t: "Turn on automatic updates across devices", h: "Updates close known holes without you needing to remember." }
        ],
        week: [
          { t: "Remove unused apps + accounts", h: "Less surface area = less risk and fewer distractions." }
        ],
        month: [
          { t: "Back up irreplaceable photos/documents", h: "Backups reduce panic and loss when things go wrong." }
        ]
      },
      scams: {
        today: [
          { t: "Adopt a household ‘pause’ rule for urgent messages", h: "If it’s urgent + emotional, pause and verify first." }
        ],
        week: [
          { t: "Enable bank/transaction alerts", h: "Fast alerts shorten the damage window and increase recovery success." }
        ],
        month: [
          { t: "Create a simple verification habit", h: "Always check via the official app or a saved bookmark — not message links." }
        ]
      },
      wellbeing: {
        today: [
          { t: "Reduce notification overload", h: "Fewer alerts = more control and fewer impulsive clicks." }
        ],
        week: [
          { t: "Create a shared charging place", h: "Small environmental changes beat willpower every time." }
        ],
        month: [
          { t: "Set a calm device cut-off time", h: "Better sleep improves judgement and reduces conflict." }
        ]
      }
    };

    // If seed exists as strings, convert into one “best” card per bucket
    if (seed && (seed.today || seed.this_week || seed.this_month)){
      if (introEl){
        introEl.textContent = "These are the three most impactful next steps for your household right now.";
      }

      if (todayEl) todayEl.innerHTML = liCard(seed.today, "A small step that protects multiple systems at once.");
      if (weekEl)  weekEl.innerHTML  = liCard(seed.this_week, "A stabilising step that reduces future stress.");
      if (monthEl) monthEl.innerHTML = liCard(seed.this_month, "A durable step that strengthens long-term resilience.");
      return;
    }

    // Otherwise, use lens-based fallbacks (3 items)
    const pack = fallbackByLens[focusKey] || fallbackByLens.privacy;

    if (introEl){
      introEl.textContent = "Calm steps, not a checklist. Pick one — consistency beats intensity.";
    }

    if (todayEl) todayEl.innerHTML = pack.today.map(x => liCard(x.t, x.h)).join("");
    if (weekEl)  weekEl.innerHTML  = pack.week.map(x => liCard(x.t, x.h)).join("");
    if (monthEl) monthEl.innerHTML = pack.month.map(x => liCard(x.t, x.h)).join("");
  }

  // ---------- Fingerprint (calm + explainable) ----------
  function buildFingerprint(scores, lensMax){
    const vals = {
      network: scores.network,
      devices: scores.devices,
      privacy: scores.privacy,
      scams: scores.scams,
      wellbeing: scores.wellbeing,
    };

    // define “low” as bottom ~40% of lens scale
    const lowCutoff = Math.max(1, Math.floor(lensMax * 0.4));

    let pattern = "Emerging Resilience";
    let note = "Your system is functional — focus on one lens and you’ll feel the difference fast.";

    const lows = Object.entries(vals)
      .filter(([,v]) => isFiniteNumber(v) && v <= lowCutoff)
      .map(([k]) => k);

    if (lows.includes("privacy")){
      pattern = "Root Account Cascade Risk";
      note = "Email + Apple/Google sit at the centre. Strengthen them first to protect everything else.";
    } else if (lows.includes("network")){
      pattern = "Perimeter Drift";
      note = "The Wi-Fi boundary needs tightening so the household has a stronger edge.";
    } else if (lows.includes("devices")){
      pattern = "Device Hygiene Drag";
      note = "A few update + cleanup habits reduce risk and stress quickly.";
    } else if (lows.includes("scams")){
      pattern = "Pressure-Point Scam Risk";
      note = "One calm rule can prevent impulsive clicks turning into money or account loss.";
    } else if (lows.includes("wellbeing")){
      pattern = "Attention + Sleep Loop";
      note = "Stabilising routines reduces exposure, conflict, and risk moments.";
    }

    return { pattern, note };
  }

    // ---------- Baseline tracking ----------
  function getBaseline(){
    const raw = safeGetStorageItem(BASELINE_KEY);
    return raw ? safeJSONParse(raw) : null;
  }

  function setBaseline(snapshot, scores, stage){
    safeSetStorageItem(BASELINE_KEY, JSON.stringify({
      ts: Date.now(),
      scores,
      stage
    }));
  }

  function clearBaseline(){
    safeRemoveStorageItem(BASELINE_KEY);
  }

  function renderProgress(scores, lensMax){
    const grid = document.getElementById("progressGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const baseline = getBaseline();

    if (!baseline || !baseline.scores){
      grid.innerHTML = `
        <div class="progress-row">
          <div>
            <div class="progress-label">No baseline saved yet</div>
            <div class="mini">
              Save a baseline to compare progress over time on this device.
            </div>
          </div>
          <div class="progress-delta">—</div>
        </div>
      `;
      return;
    }

    const lenses = [
      ["network","Network"],
      ["devices","Devices"],
      ["privacy","Accounts & Privacy"],
      ["scams","Scams & Messages"],
      ["wellbeing","Children & Wellbeing"]
    ];

    lenses.forEach(([key,label]) => {
      const cur = scores[key];
      const base = baseline.scores[key];

      let delta = null;
      if (isFiniteNumber(cur) && isFiniteNumber(base)){
        delta = cur - base;
      }

      let badge = "—";
      let cls = "progress-delta";
      if (delta !== null){
        if (delta > 0){ badge = `+${delta}`; cls += " good"; }
        else if (delta < 0){ badge = `${delta}`; cls += " bad"; }
        else { badge = "0"; }
      }

      grid.innerHTML += `
        <div class="progress-row">
          <div>
            <div class="progress-label">${label}</div>
            <div class="mini">
              Baseline ${lensDisplay(base,lensMax)} → Now ${lensDisplay(cur,lensMax)}
            </div>
          </div>
          <div class="${cls}">${badge}</div>
        </div>
      `;
    });
  }

  // ---------- MAIN INIT ----------
  const snapshot = getLastSnapshot();

  if (!snapshot){
    const empty = document.getElementById("emptyStateCard");
    if (empty) empty.style.display = "block";
    return;
  }

  const scores = extractLensScores(snapshot);
  const lensMax = inferLensMax(scores);
  const stage = extractStage(snapshot);
  const focusKey = weakestLens(scores);

  // Header + overview
  setText("stageTitle", stage.stage);
  setText("stageDesc", stage.desc);

  setText("valNetwork",   lensDisplay(scores.network,lensMax));
  setText("valDevices",   lensDisplay(scores.devices,lensMax));
  setText("valPrivacy",   lensDisplay(scores.privacy,lensMax));
  setText("valScams",     lensDisplay(scores.scams,lensMax));
  setText("valWellbeing", lensDisplay(scores.wellbeing,lensMax));

  // Ring
  renderRing(scores, lensMax, stage.stage, focusKey);
  highlightLegend(focusKey);

  // Lens insight (default = focus)
  renderLensInsight(focusKey, true);

  // Make legend clickable
  document.querySelectorAll(".legend-row").forEach(row => {
    row.addEventListener("click", () => {
      const key = row.id.replace("legend","").toLowerCase();
      renderLensInsight(key, key === focusKey);
      highlightLegend(key);
    });
  });

  // Focus copy
  const focusCopy = LENS_CONTENT[focusKey] || LENS_CONTENT.privacy;
  setText("focusTitle", focusCopy.title);
  setText("focusDesc", focusCopy.body);

  // Fingerprint
  const fp = buildFingerprint(scores, lensMax);
  setHTML(
    "fingerprintLine",
    `<strong>Household fingerprint:</strong> ${fp.pattern} — ${fp.note}`
  );

  // Timestamp
  const ts =
    snapshot.ts ||
    snapshot.timestamp ||
    snapshot.createdAt ||
    snapshot.created_at;

  const when = formatDate(ts);
  if (when){
    setText("lastTakenLine", `Last snapshot on this device: ${when}`);
  }

  // Actions (THIS IS THE DYNAMIC BIT YOU ASKED ABOUT)
  renderActionBlocks(snapshot, focusKey);

  // Progress
  renderProgress(scores, lensMax);

  // Baseline buttons
  const saveBtn = document.getElementById("saveBaselineBtn");
  const clearBtn = document.getElementById("clearBaselineBtn");

  if (saveBtn){
    saveBtn.addEventListener("click", () => {
      setBaseline(snapshot, scores, stage);
      renderProgress(scores, lensMax);
      saveBtn.textContent = "Baseline saved";
      setTimeout(() => (saveBtn.textContent = "Save baseline"), 1200);
    });
  }

  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      clearBaseline();
      renderProgress(scores, lensMax);
      clearBtn.textContent = "Cleared";
      setTimeout(() => (clearBtn.textContent = "Clear baseline"), 1200);
    });
  }

})();
