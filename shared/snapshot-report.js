(function () {
  "use strict";

  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.error("jsPDF is required for snapshot-report.js");
    return;
  }

  const { jsPDF } = window.jspdf;

  const BRAND = {
    ink: [19, 33, 30],
    muted: [74, 85, 82],
    line: [220, 226, 223],
    accent: [26, 106, 93],
    accentSoft: [232, 243, 239],
    panel: [248, 250, 249]
  };

  const LENS_ORDER = ["network", "devices", "privacy", "scams", "wellbeing"];

  const LENS_LABELS = {
    network: "Network & Wi-Fi Safety",
    devices: "Device Hygiene",
    privacy: "Privacy & Identity",
    scams: "Scam Awareness",
    wellbeing: "Children's Digital Wellbeing"
  };

  const NEXT_STEPS = {
    network: [
      "Review router settings and remove unknown devices.",
      "Check Wi-Fi password strength and guest access arrangements."
    ],
    devices: [
      "Confirm updates are enabled across household devices.",
      "Create one simple routine for charging, updates, and safe handover."
    ],
    privacy: [
      "Review sign-in and recovery settings on important accounts.",
      "Turn on two-factor authentication where possible."
    ],
    scams: [
      "Maintain awareness of new phishing techniques.",
      "Review scam guidance with household members before responding to urgent messages."
    ],
    wellbeing: [
      "Set one short family check-in about online experiences each week.",
      "Keep boundaries clear, calm, and age-appropriate across devices and apps."
    ]
  };

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  function formatDate(timestamp) {
    const n = Number(timestamp);
    if (!Number.isFinite(n)) return "Not available";

    try {
      return new Date(n).toLocaleString("en-GB", {
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

  function buildReference(snapshot) {
    const ts = Number(snapshot?.timestamp) || Date.now();
    const d = new Date(ts);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return `CS-${yyyy}${mm}${dd}-${hh}${min}`;
  }

  function focusLabel(focus) {
    return LENS_LABELS[focus] || "Not available";
  }

  function getNextSteps(snapshot) {
    const focus = snapshot?.focus || "privacy";
    return NEXT_STEPS[focus] || [
      "Choose one manageable improvement for this household.",
      "Review progress with a fresh snapshot at a later date."
    ];
  }

  function getLensRows(snapshot) {
    const lenses = snapshot?.lensPercents || snapshot?.lenses || {};
    return LENS_ORDER.map((key) => ({
      label: LENS_LABELS[key],
      value: safeNumber(lenses[key])
    }));
  }

  function drawWrappedText(doc, text, x, y, maxWidth, options = {}) {
    const lines = doc.splitTextToSize(String(text || ""), maxWidth);
    const lineHeight = options.lineHeight || 6.2;

    lines.forEach((line, idx) => {
      doc.text(line, x, y + idx * lineHeight);
    });

    return y + lines.length * lineHeight;
  }

  function drawSectionTitle(doc, title, x, y) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.ink);
    doc.text(title, x, y);

    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.5);
    doc.line(x, y + 2, 190, y + 2);

    return y + 8;
  }

  function drawInfoRow(doc, label, value, x, y, valueX) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND.ink);
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(String(value || "Not available"), valueX, y);

    return y + 6.5;
  }

  function downloadSnapshotReport(snapshot) {
    if (!snapshot) {
      alert("No snapshot was found on this device.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const ref = buildReference(snapshot);
    const total = safeNumber(snapshot?.total ?? snapshot?.hdss);
    const stage = snapshot?.stage?.label || "Not available";
    const stageMessage =
      snapshot?.signal?.summary ||
      snapshot?.stage?.message ||
      "This snapshot is a supportive signal to help guide next steps.";
    const focus = focusLabel(snapshot?.focus);
    const completed = formatDate(snapshot?.timestamp);
    const lensRows = getLensRows(snapshot);
    const nextSteps = getNextSteps(snapshot);

    let y = 18;

    // Header band
    doc.setFillColor(...BRAND.accent);
    doc.roundedRect(12, 12, 186, 28, 4, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("CYBER SEEDS", 18, 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text("Household Digital Snapshot Report", 18, 31);

    doc.setFontSize(9);
    doc.text(`Reference: ${ref}`, 150, 23);
    doc.text(`Generated: ${completed}`, 132, 31);

    y = 50;

    // Signal panel
    doc.setFillColor(...BRAND.panel);
    doc.setDrawColor(...BRAND.line);
    doc.roundedRect(12, y, 186, 34, 4, 4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.ink);
    doc.text("Snapshot Summary", 18, y + 9);

    doc.setFontSize(22);
    doc.setTextColor(...BRAND.accent);
    doc.text(total !== null ? String(total) : "N/A", 18, y + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text("Household Signal / 100", 33, y + 23);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND.ink);
    doc.text("Stage", 95, y + 12);
    doc.text("Focus Lens", 95, y + 20);
    doc.text("Completed", 95, y + 28);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(stage, 125, y + 12);
    doc.text(focus, 125, y + 20);
    doc.text(completed, 125, y + 28);

    y += 44;

    // Interpretation
    y = drawSectionTitle(doc, "What this means", 12, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND.muted);
    y = drawWrappedText(doc, stageMessage, 12, y, 176, { lineHeight: 5.8 });
    y += 4;

    // Five-lens summary
    y = drawSectionTitle(doc, "Five Lens Summary", 12, y);

    const tableX = 12;
    const col1 = 120;
    const col2 = 40;
    const rowH = 10;
    let rowY = y;

    // Table header
    doc.setFillColor(...BRAND.accentSoft);
    doc.setDrawColor(...BRAND.line);
    doc.rect(tableX, rowY, col1, rowH, "FD");
    doc.rect(tableX + col1, rowY, col2, rowH, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.ink);
    doc.text("Lens", tableX + 4, rowY + 6.5);
    doc.text("Score", tableX + col1 + 4, rowY + 6.5);

    rowY += rowH;

    lensRows.forEach((row) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(tableX, rowY, col1, rowH, "FD");
      doc.rect(tableX + col1, rowY, col2, rowH, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.ink);
      doc.text(row.label, tableX + 4, rowY + 6.5);

      doc.setFont("helvetica", "bold");
      doc.text(
        row.value !== null ? `${row.value}%` : "N/A",
        tableX + col1 + 4,
        rowY + 6.5
      );

      rowY += rowH;
    });

    y = rowY + 6;

    // Focus lens
    y = drawSectionTitle(doc, "Focus Lens", 12, y);
    y = drawInfoRow(doc, "Primary focus", focus, 12, y, 46);
    y += 2;

    // Next steps
    y = drawSectionTitle(doc, "Next Steps", 12, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND.muted);

    nextSteps.forEach((step) => {
      doc.text("-", 14, y);
      y = drawWrappedText(doc, step, 18, y, 170, { lineHeight: 5.8 });
      y += 1.5;
    });

    y += 3;

    // Footer note
    doc.setDrawColor(...BRAND.line);
    doc.line(12, 280, 198, 280);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      "This report is a supportive household snapshot generated locally in the browser. It is not a diagnosis or compliance certificate.",
      12,
      286
    );

    doc.save(`cyber-seeds-snapshot-report-${ref}.pdf`);
  }

  window.CSSnapshotReport = {
    downloadPdf: downloadSnapshotReport,
    buildReference
  };
})();
