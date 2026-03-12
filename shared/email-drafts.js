(function () {
  "use strict";

  const EMAIL_ADDRESS = "cyberseeds.uk@gmail.com";

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  const LENS_LABELS = {
    network: "Network & Wi-Fi Safety",
    devices: "Device Hygiene",
    privacy: "Privacy & Identity",
    scams: "Scam Awareness",
    wellbeing: "Children's Digital Wellbeing"
  };

  function escapeLine(value) {
    return String(value ?? "").replace(/\r?\n/g, " ").trim();
  }

  function formatScore(value) {
    const num = Number(value);
    return Number.isFinite(num) ? `${Math.round(num)} / 100` : "Not available";
  }

  function formatPercent(value) {
    const num = Number(value);
    return Number.isFinite(num) ? `${Math.round(num)}%` : "Not available";
  }

  function formatFocusLens(focus) {
    return LENS_LABELS[focus] || "Not available";
  }

  function formatDate(timestamp) {
    const num = Number(timestamp);
    if (!Number.isFinite(num)) return "Not available";

    try {
      return new Date(num).toLocaleString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Not available";
    }
  }

  function getLensLines(snapshot) {
    const lensPercents = snapshot?.lensPercents || snapshot?.lenses || {};

    return LENS_ORDER.map((key) => {
      const label = LENS_LABELS[key];
      const value = lensPercents?.[key];
      return `- ${label}: ${formatPercent(value)}`;
    });
  }

  function buildSharedSnapshotBlock(snapshot) {
    const total = snapshot?.total ?? snapshot?.hdss;
    const stageLabel = snapshot?.stage?.label || "Not available";
    const stageMessage =
      snapshot?.signal?.summary ||
      snapshot?.stage?.message ||
      "Not available";

    const focusLens = formatFocusLens(snapshot?.focus);
    const completed = formatDate(snapshot?.timestamp);

    return [
      "HOUSEHOLD SNAPSHOT SUMMARY",
      "--------------------------",
      `Household Signal: ${formatScore(total)}`,
      `Current Stage: ${escapeLine(stageLabel)}`,
      `Focus Lens: ${escapeLine(focusLens)}`,
      `Completed: ${escapeLine(completed)}`,
      "",
      "What this means",
      `${escapeLine(stageMessage)}`,
      "",
      "Five-Lens Summary",
      ...getLensLines(snapshot)
    ].join("\n");
  }

  function buildBookingEmailBody(snapshot) {
    const snapshotBlock = snapshot
      ? buildSharedSnapshotBlock(snapshot)
      : [
          "HOUSEHOLD SNAPSHOT SUMMARY",
          "--------------------------",
          "No snapshot data was attached to this request."
        ].join("\n");

    return [
      "Hello Cyber Seeds,",
      "",
      "I would like to book a Home Cyber Audit.",
      "",
      "My details are below, and my latest Household Snapshot summary is included for context.",
      "",
      snapshotBlock,
      "",
      "BOOKING DETAILS",
      "---------------",
      "Name:",
      "Location:",
      "Best contact email:",
      "Preferred format: Online / In-person",
      "Preferred days or times:",
      "Anything you would like us to know:",
      "",
      "Kind regards,"
    ].join("\n");
  }

  function buildResultsEmailBody(snapshot) {
    const snapshotBlock = snapshot
      ? buildSharedSnapshotBlock(snapshot)
      : [
          "HOUSEHOLD SNAPSHOT SUMMARY",
          "--------------------------",
          "No snapshot data was available."
        ].join("\n");

    return [
      "Hello Cyber Seeds,",
      "",
      "Please find my latest Household Snapshot below.",
      "",
      snapshotBlock,
      "",
      "Message:",
      "",
      "Kind regards,"
    ].join("\n");
  }

  function openMailto(subject, body) {
    const href =
      `mailto:${EMAIL_ADDRESS}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  window.CSEmailDrafts = {
    buildBookingEmailBody,
    buildResultsEmailBody,
    openBookingDraft(snapshot) {
      const subject = snapshot
        ? "Cyber Seeds Home Audit Request + Household Snapshot"
        : "Cyber Seeds Home Audit Request";

      openMailto(subject, buildBookingEmailBody(snapshot));
    },
    openResultsDraft(snapshot) {
      const subject = "Cyber Seeds Household Snapshot";
      openMailto(subject, buildResultsEmailBody(snapshot));
    }
  };
})();
