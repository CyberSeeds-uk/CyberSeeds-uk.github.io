/* =========================================================
   Cyber Seeds - Resources Hub
   Local-first snapshot rendering and recovery controls
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    latest: "cyberseeds_snapshot_latest_v3",
    history: "cyberseeds_snapshot_history_v3",
    baseline: "cyberseeds_snapshot_baseline_v1",
    baselineCompat: "cyberseeds_snapshot_baseline_v3"
  };

  const LEGACY_BASELINE_KEYS = [
    STORAGE_KEYS.baselineCompat,
    "cs_snapshot_baseline"
  ];

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  function safeParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function lensLabels() {
    return {
      network: "Network",
      devices: "Devices",
      privacy: "Accounts & Privacy",
      scams: "Scams & Messages",
      wellbeing: "Children & Wellbeing"
    };
  }

  function formatLensName(value) {
    if (!value) return "";
    return lensLabels()[value] || (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
  }

  function getLensBand(value) {
    if (value >= 75) return "Established";
    if (value >= 50) return "Developing";
    return "Emerging";
  }

  function getLensSummary(lens, value) {
    const band = getLensBand(value).toLowerCase();
    const labels = {
      network: `Network foundations are ${band} and can be strengthened with small routine checks.`,
      devices: `Device habits are ${band} and benefit from calm consistency across the household.`,
      privacy: `Account and privacy routines are ${band} with room for clearer defaults.`,
      scams: `Scam and message awareness is ${band} and can improve through shared pause habits.`,
      wellbeing: `Children and wellbeing support is ${band} with space to keep expectations clear and gentle.`
    };
    return labels[lens] || "This lens can move forward through steady, manageable steps.";
  }

  function getLensDetails(lens) {
    const copy = {
      network: {
        interpretation:
          "A stable home connection supports everyday trust. Small improvements like router checks and known-device reviews help the whole household feel more settled.",
        next:
          "Set one recurring moment each month to review router settings and remove unknown devices."
      },
      devices: {
        interpretation:
          "Shared device routines reduce friction and support safer defaults. Clear charging, update, and handover habits make digital life easier for adults and children.",
        next:
          "Agree one simple household device routine, such as a weekly update check before weekend use."
      },
      privacy: {
        interpretation:
          "Privacy settings work best when they are understandable and repeatable. Keeping account controls simple helps everyone maintain confidence without extra pressure.",
        next:
          "Choose one important account and review sign-in and recovery settings together."
      },
      scams: {
        interpretation:
          "Scam resistance grows through shared pause-and-check behaviours. A calm response plan helps reduce urgency and protects decision-making.",
        next:
          "Create a family pause phrase to use before clicking links or sharing codes."
      },
      wellbeing: {
        interpretation:
          "Digital wellbeing is strengthened by predictable boundaries and open conversations. Children benefit when expectations are clear and support is non-judgemental.",
        next:
          "Set one short weekly check-in about online experiences and what support is needed."
      }
    };

    return copy[lens] || {
      interpretation: "Steady routines build resilience over time.",
      next: "Pick one manageable improvement and revisit it in a week."
    };
  }

  function normaliseSnapshot(snapshot) {
    if (!isPlainObject(snapshot)) return null;

    const now = Date.now();
    const totalValue = Number(snapshot.total ?? snapshot.hdss);
    const total = Number.isFinite(totalValue) ? Math.round(totalValue) : null;
    if (total === null) return null;

    const lensPercents = isPlainObject(snapshot.lensPercents)
      ? snapshot.lensPercents
      : (isPlainObject(snapshot.lenses) ? snapshot.lenses : {});

    const stageSource = snapshot.stage;
    const stage = typeof stageSource === "string"
      ? { label: stageSource, message: snapshot.signal?.summary || "" }
      : {
          label: stageSource?.label || "Current snapshot stage",
          message: stageSource?.message || snapshot.signal?.summary || ""
        };

    return {
      ...snapshot,
      schema: snapshot.schema || "cs.snapshot.v3",
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : now,
      id: String(snapshot.id || snapshot.snapshotId || now),
      hdss: Number.isFinite(snapshot.hdss) ? snapshot.hdss : total,
      total,
      lensPercents,
      lenses: isPlainObject(snapshot.lenses) ? snapshot.lenses : lensPercents,
      focus: snapshot.focus || "privacy",
      strongest: snapshot.strongest || null,
      weakest: snapshot.weakest || null,
      stage,
      signal: isPlainObject(snapshot.signal) ? snapshot.signal : { summary: stage.message || "" },
      answers: isPlainObject(snapshot.answers) ? snapshot.answers : {}
    };
  }

  function readLatestSnapshot() {
    const raw = safeGetItem(STORAGE_KEYS.latest);
    if (!raw) return null;

    const parsed = safeParse(raw, null);
    return normaliseSnapshot(parsed);
  }

  function readHistorySnapshots() {
    const parsed = safeParse(safeGetItem(STORAGE_KEYS.history), []);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(normaliseSnapshot).filter(Boolean);
  }

  function readBaselineSnapshot() {
    const fromPrimary = safeParse(safeGetItem(STORAGE_KEYS.baseline), null);
    const normalizedPrimary = normaliseSnapshot(fromPrimary);
    if (normalizedPrimary) return normalizedPrimary;

    for (const key of LEGACY_BASELINE_KEYS) {
      const parsed = safeParse(safeGetItem(key), null);
      const normalized = normaliseSnapshot(parsed);
      if (!normalized) continue;

      safeSetItem(STORAGE_KEYS.baseline, JSON.stringify(normalized));
      return normalized;
    }

    return null;
  }

  function writeBaselineSnapshot(snapshot) {
    const normalized = normaliseSnapshot(snapshot);
    if (!normalized) return false;

    const payload = JSON.stringify(normalized);
    const savedPrimary = safeSetItem(STORAGE_KEYS.baseline, payload);
    safeSetItem(STORAGE_KEYS.baselineCompat, payload);
    return savedPrimary;
  }

  function resetBaselineSnapshot() {
    safeRemoveItem(STORAGE_KEYS.baseline);
    safeRemoveItem(STORAGE_KEYS.baselineCompat);
    safeRemoveItem("cs_snapshot_baseline");
  }

  function buildBaselineComparison(current, baseline) {
    if (!baseline) {
      return "No baseline has been set yet.";
    }

    const diff = Math.round((current?.total || 0) - (baseline?.total || 0));

    if (diff > 0) {
      return `Signal improved by ${diff} points since baseline.`;
    }
    if (diff < 0) {
      return `Signal is ${Math.abs(diff)} points below baseline.`;
    }
    return "Signal unchanged since baseline.";
  }

  function findPreviousSnapshot(current, history) {
    if (!Array.isArray(history) || history.length < 2) return null;

    const currentId = current?.id;
    if (!currentId) return history[1] || null;

    const currentIndex = history.findIndex((entry) => entry.id === currentId);
    if (currentIndex >= 0 && currentIndex + 1 < history.length) {
      return history[currentIndex + 1];
    }

    return history.find((entry) => entry.id !== currentId) || null;
  }

  function buildPreviousComparison(current, history) {
    const previous = findPreviousSnapshot(current, history);
    if (!previous) return "";

    const delta = Math.round((current?.total || 0) - (previous?.total || 0));
    const signedDelta = `${delta > 0 ? "+" : ""}${delta}`;
    return `Change since previous snapshot: ${signedDelta} points.`;
  }

  function openSnapshotEmailDraft(snapshot) {
    if (!snapshot || !window.CSEmailDrafts) return;
    window.CSEmailDrafts.openResultsDraft(snapshot);
  }

  function buildBackupPayload(currentSnapshot) {
    const latest = normaliseSnapshot(currentSnapshot) || readLatestSnapshot();
    const historyRaw = readHistorySnapshots();
    const baseline = readBaselineSnapshot();

    const history = historyRaw.length ? historyRaw : (latest ? [latest] : []);
    if (latest && !history.some((item) => item.id === latest.id)) {
      history.unshift(latest);
    }

    return {
      latest,
      history,
      baseline
    };
  }

  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadPassport(snapshot) {
    const readable = {
      schema: snapshot.schema || "cs.snapshot.v3",
      id: snapshot.id || null,
      timestamp: Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : null,
      total: Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0),
      stage: snapshot.stage || { label: "Current snapshot stage", message: "" },
      focus: snapshot.focus || null,
      lenses: snapshot.lenses || snapshot.lensPercents || {},
      lensPercents: snapshot.lensPercents || snapshot.lenses || {},
      answers: snapshot.answers || {}
    };

    downloadBlob(
      "cyber-seeds-household-passport.json",
      JSON.stringify(readable, null, 2),
      "application/json"
    );
  }

  function exportSnapshotBackup(currentSnapshot) {
    const payload = buildBackupPayload(currentSnapshot);
    downloadBlob(
      "cyber-seeds-snapshot-backup.json",
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function validateSnapshotShape(value) {
    return !!normaliseSnapshot(value);
  }

  function validateImportPayload(payload) {
    if (!isPlainObject(payload)) {
      return { valid: false, message: "The selected file is not a valid JSON object." };
    }

    if (
      !Object.prototype.hasOwnProperty.call(payload, "latest") ||
      !Object.prototype.hasOwnProperty.call(payload, "history") ||
      !Object.prototype.hasOwnProperty.call(payload, "baseline")
    ) {
      return { valid: false, message: "Expected structure: { latest, history, baseline }." };
    }

    if (!validateSnapshotShape(payload.latest)) {
      return { valid: false, message: "The latest snapshot is missing required fields." };
    }

    if (!Array.isArray(payload.history)) {
      return { valid: false, message: "History must be an array of snapshot objects." };
    }

    if (!payload.history.every(validateSnapshotShape)) {
      return { valid: false, message: "One or more history entries are invalid." };
    }

    if (payload.baseline !== null && !validateSnapshotShape(payload.baseline)) {
      return { valid: false, message: "Baseline must be a snapshot object or null." };
    }

    const latest = normaliseSnapshot(payload.latest);
    const history = payload.history.map(normaliseSnapshot).filter(Boolean);
    const baseline = payload.baseline ? normaliseSnapshot(payload.baseline) : null;

    if (!history.some((entry) => entry.id === latest.id)) {
      history.unshift(latest);
    }

    return {
      valid: true,
      value: { latest, history, baseline }
    };
  }

  async function restoreSnapshotDataFromFile(file) {
    if (!file) {
      return { ok: false, message: "Choose a JSON file first." };
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const checked = validateImportPayload(parsed);

      if (!checked.valid) {
        return { ok: false, message: checked.message };
      }

      const hasExistingData =
        !!safeGetItem(STORAGE_KEYS.latest) ||
        !!safeGetItem(STORAGE_KEYS.history) ||
        !!safeGetItem(STORAGE_KEYS.baseline) ||
        !!safeGetItem(STORAGE_KEYS.baselineCompat);

      const confirmMessage = hasExistingData
        ? "Restoring this backup will replace your current latest snapshot, history, and baseline on this device. Continue?"
        : "Restore snapshot data on this device?";

      if (!window.confirm(confirmMessage)) {
        return { ok: false, message: "Restore cancelled. Existing data was not changed." };
      }

      const value = checked.value;
      safeSetItem(STORAGE_KEYS.latest, JSON.stringify(value.latest));
      safeSetItem(STORAGE_KEYS.history, JSON.stringify(value.history));

      if (value.baseline) {
        safeSetItem(STORAGE_KEYS.baseline, JSON.stringify(value.baseline));
        safeSetItem(STORAGE_KEYS.baselineCompat, JSON.stringify(value.baseline));
      } else {
        resetBaselineSnapshot();
      }

      return { ok: true, message: "Snapshot data restored successfully." };
    } catch {
      return { ok: false, message: "The file could not be read. Please check that it is valid JSON." };
    }
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

  function restorePanelMarkup() {
    return `
      <section class="resultCard snapshot-controls" aria-labelledby="dataToolsTitle">
        <details>
          <summary id="dataToolsTitle"><strong>Restore saved results</strong></summary>
          <div style="margin-top:12px">
            <p>Import a previously exported JSON backup to restore your latest snapshot, history, and baseline on this device.</p>
            <label for="snapshotRestoreInput">Snapshot backup JSON file</label>
            <input
              id="snapshotRestoreInput"
              type="file"
              accept="application/json"
              aria-label="Select a snapshot backup JSON file to restore"
            />
            <button class="btn-secondary" type="button" id="restoreSnapshotButton">Restore Snapshot Data</button>
            <p class="muted" id="restoreStatus" aria-live="polite"></p>
          </div>
        </details>
      </section>
    `;
  }

  function renderCompactProgress(snapshot, baseline, history) {
    const baselineMessage = buildBaselineComparison(snapshot, baseline);
    const previousMessage = buildPreviousComparison(snapshot, history);

    return `
      <section class="resultCard compact-progress-card" aria-labelledby="progressTitle">
        <div class="compact-progress-head">
          <h2 id="progressTitle">Progress</h2>
          <p class="muted compact-progress-summary">${escapeHtml(baselineMessage)}</p>
          ${previousMessage ? `<p class="muted compact-progress-summary">${escapeHtml(previousMessage)}</p>` : ""}
        </div>

        <details class="compact-progress-details">
          <summary><strong>Baseline options</strong></summary>
          <div class="compact-progress-actions">
            <button class="btn-secondary" type="button" id="setBaselineButton">Set Baseline</button>
            <p class="muted">Save this snapshot as your household baseline.</p>

            <button class="btn-secondary" type="button" id="resetBaselineButton">Reset Baseline</button>
            <p class="muted">Resetting baseline does not delete your snapshot history.</p>

            <p class="muted" id="baselineStatus" aria-live="polite"></p>
          </div>
        </details>
      </section>
    `;
  }

  function renderFallbackState(root) {
    root.innerHTML = `
      <section class="resource-panel" data-cs-resources-hub>
        <section class="signal-header">
          <p class="kicker">Resources</p>
          <h1 class="signal-pattern">No snapshot found</h1>
          <p class="signal-description">Take a short check-in when you are ready to see your household signal.</p>
        </section>

        <section class="resultCard" style="text-align:center">
          <button
            class="btn-primary snapshot-launch"
            data-open-snapshot
            type="button"
            aria-label="Start the Cyber Seeds household snapshot"
          >
            Take Household Snapshot
          </button>
        </section>

        ${restorePanelMarkup()}
      </section>
    `;
  }

  async function render() {
    const root = document.getElementById("resourcesRoot");
    if (!root) return;

    const snapshot = readLatestSnapshot();
    if (!snapshot) {
      renderFallbackState(root);
      bindRestoreControls(root);
      return;
    }

    const history = readHistorySnapshots();
    const baseline = readBaselineSnapshot();
    const lensValues = snapshot.lensPercents || snapshot.lenses || {};
    const orderedLensEntries = LENS_ORDER
      .map((lens) => [lens, Number(lensValues[lens])])
      .filter(([, value]) => Number.isFinite(value));

    const stageLabel = snapshot.stage?.label || "Current snapshot stage";
    const stageMessage =
      snapshot.signal?.summary ||
      snapshot.stage?.message ||
      "This snapshot is a supportive signal to help you choose your next calm step.";

    const focusLensKey = snapshot.focus || "privacy";
    const focusLens = formatLensName(focusLensKey);
    const signalValue = Number.isFinite(snapshot.total) ? snapshot.total : Math.round(snapshot.hdss || 0);

    const seed = await getFocusSeed(focusLensKey);
    const weekText = seed?.this_week || seed?.thisWeek || seed?.week || "";
    const monthText = seed?.this_month || seed?.thisMonth || seed?.month || "";

    root.innerHTML = `
      <section class="resource-panel" data-cs-resources-hub>
        <section class="resultCard signal-header">
          <p class="signal-kicker">Household signal</p>
          <h1 class="signal-pattern" data-stage-label>${escapeHtml(stageLabel)}</h1>
          <p class="signal-description">${escapeHtml(stageMessage)}</p>

          <div class="signal-score-block">
            <div class="score-circle">
              <span class="score-number">${signalValue}</span>
              <span class="score-label">Household signal</span>
            </div>
            <p class="certification-level">Focus lens: <span data-focus-lens>${escapeHtml(focusLens)}</span></p>
          </div>
        </section>

        <section class="resultCard" aria-labelledby="nextSeedTitle">
          <h2 id="nextSeedTitle">${escapeHtml(seed?.title || "Your next digital seed")}</h2>
          ${
            seed
              ? `
                <p><strong>Today:</strong> ${escapeHtml(seed.today || "")}</p>
                ${weekText ? `<p><strong>This week:</strong> ${escapeHtml(weekText)}</p>` : ""}
                ${monthText ? `<p><strong>This month:</strong> ${escapeHtml(monthText)}</p>` : ""}
              `
              : `
                <p>No digital seed available yet.</p>
              `
          }
        </section>

        <section class="resultCard lens-breakdown">
          <h2>Lens overview</h2>
          ${orderedLensEntries.map(([lens, value]) => `
            <article class="cs-lensRow ${lens === focusLensKey ? "cs-lensRow--focus" : ""}" data-lens="${escapeHtml(lens)}">
              <button class="cs-lensToggle" type="button" aria-expanded="${lens === focusLensKey ? "true" : "false"}">
                <div class="cs-lensLeft">
                  <div class="cs-lensName">${escapeHtml(formatLensName(lens))}</div>
                  <div class="cs-lensScore">${Math.round(value)}</div>
                </div>
                <div class="cs-lensRight">
                  <div class="cs-lensBand">${escapeHtml(getLensBand(value))}</div>
                  <div class="cs-lensSummary">${escapeHtml(getLensSummary(lens, value))}</div>
                </div>
              </button>
              <div class="cs-lensDetails" ${lens === focusLensKey ? "" : "hidden"}>
                <p class="cs-lensInterpretation">${escapeHtml(getLensDetails(lens).interpretation)}</p>
                <p class="cs-lensDirection"><strong>Next:</strong> ${escapeHtml(getLensDetails(lens).next)}</p>
              </div>
              <div class="lens-bar" style="padding:0 14px 14px;">
                <div class="lens-fill" style="width:${Math.round(value)}%"></div>
              </div>
            </article>
          `).join("")}
        </section>

        <section class="resultCard renewal-actions" aria-label="Snapshot actions">
          <div class="renewal-actions-grid">
            <button
              class="btn-secondary snapshot-launch"
              data-open-snapshot
              type="button"
              aria-label="Start the Cyber Seeds household snapshot"
            >
              Retake Snapshot
            </button>
            <button class="btn-secondary" type="button" id="downloadSnapshotReport">Download Snapshot Report (PDF)</button>
            <button class="btn-secondary" type="button" id="downloadPassport">Download Household Passport</button>
            <button class="btn-secondary" type="button" id="downloadSnapshotBackup">Download Backup (JSON)</button>
            <button class="btn-secondary" type="button" id="emailSnapshotButton">Email my results</button>
            <a class="btn-primary" href="/book/">Book a Full Audit</a>
          </div>
        </section>

        ${renderCompactProgress(snapshot, baseline, history)}

        ${restorePanelMarkup()}
      </section>
    `;

    bindCommonControls(root, snapshot);

    root.querySelectorAll(".cs-lensToggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const details = toggle.parentElement?.querySelector(".cs-lensDetails");
        if (!details) return;
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
      });
    });
  }

  function bindRestoreControls(root) {
    const restoreButton = root.querySelector("#restoreSnapshotButton");
    const restoreInput = root.querySelector("#snapshotRestoreInput");
    const restoreStatus = root.querySelector("#restoreStatus");

    if (!restoreButton || !restoreInput || !restoreStatus) return;

    restoreButton.addEventListener("click", async () => {
      const file = restoreInput.files?.[0] || null;
      const result = await restoreSnapshotDataFromFile(file);
      restoreStatus.textContent = result.message;

      if (result.ok) {
        restoreInput.value = "";
        await render();
      }
    });
  }

  function bindCommonControls(root, snapshot) {
    const setBaselineButton = root.querySelector("#setBaselineButton");
    const resetBaselineButton = root.querySelector("#resetBaselineButton");
    const baselineStatus = root.querySelector("#baselineStatus");
    const downloadSnapshotReportButton = root.querySelector("#downloadSnapshotReport");
    const downloadPassportButton = root.querySelector("#downloadPassport");
    const exportBackupButton = root.querySelector("#downloadSnapshotBackup");
    const emailSnapshotButton = root.querySelector("#emailSnapshotButton");

    if (setBaselineButton) {
      setBaselineButton.addEventListener("click", async () => {
        const ok = writeBaselineSnapshot(snapshot);
        if (baselineStatus) {
          baselineStatus.textContent = ok
            ? "Baseline saved for future comparisons."
            : "Baseline could not be saved on this device.";
        }
        await render();
      });
    }

    if (resetBaselineButton) {
      resetBaselineButton.addEventListener("click", async () => {
        resetBaselineSnapshot();
        if (baselineStatus) {
          baselineStatus.textContent = "Baseline reset. Snapshot history is unchanged.";
        }
        await render();
      });
    }

    bindRestoreControls(root);

    if (downloadSnapshotReportButton) {
      downloadSnapshotReportButton.addEventListener("click", () => {
        const latest = readLatestSnapshot();
        if (!latest) return;

        if (!window.CSSnapshotReport || typeof window.CSSnapshotReport.downloadPdf !== "function") {
          console.error("CSSnapshotReport is not available.");
          return;
        }

        window.CSSnapshotReport.downloadPdf(latest);
      });
    }

    if (downloadPassportButton) {
      downloadPassportButton.addEventListener("click", () => {
        downloadPassport(snapshot);
      });
    }

    if (exportBackupButton) {
      exportBackupButton.addEventListener("click", () => {
        exportSnapshotBackup(snapshot);
      });
    }

    if (emailSnapshotButton) {
      emailSnapshotButton.addEventListener("click", () => {
        const latest = readLatestSnapshot();
        if (!latest) return;
        openSnapshotEmailDraft(latest);
      });
    }
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
