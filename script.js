/*
 * Cyber Seeds — Household Snapshot script
 *
 * Handles form submission, computes an overall signal percentage,
 * generates a narrative based on that signal, and provides a per‑lens
 * classification. Also reveals the static lens details section once a
 * snapshot has been generated. Children’s safety questions are hidden
 * if there are no children in the household.
 */

const form = document.getElementById("quizForm");
const resultPanel = document.getElementById("result");
const detailSection = document.getElementById("detailSection");
const childrenBlock = document.getElementById("childrenBlock");

// When the number of children changes, hide or show the childrenSafety fieldset
document.querySelectorAll('input[name="children"]').forEach(input => {
  input.addEventListener("change", () => {
    childrenBlock.style.display = input.value === "0" ? "none" : "block";
  });
});

form.addEventListener("submit", e => {
  e.preventDefault();

  const data = new FormData(form);
  let totalScore = 0;
  let factors = 0;

  // Capture individual lens values for classification
  // Helper to safely parse integers from form values. Returns a number or 0
  const safeParse = v => {
    const n = parseInt(v);
    return isNaN(n) ? 0 : n;
  };

  const values = {
    network: safeParse(data.get("network")),
    devices: safeParse(data.get("devices")),
    privacy: safeParse(data.get("privacy")),
    scams: safeParse(data.get("scams")),
  };

  // Only read childrenSafety if children > 0
  if (data.get("children") !== "0") {
    values.childrenSafety = safeParse(data.get("childrenSafety"));
  }

  // Compute total signal score (skip childrenSafety if not present)
  for (const [key, value] of Object.entries(values)) {
    totalScore += value;
    factors++;
  }

  const signal = Math.round((totalScore / (factors * 2)) * 100);

  // Narrative based on overall signal
  let narrative;
  if (signal < 35) {
    narrative = "Your household is at an early stage of digital resilience. Awareness itself is already a meaningful first step.";
  } else if (signal < 65) {
    narrative = "Your household shows developing digital stability. A small number of focused improvements could significantly strengthen resilience.";
  } else {
    narrative = "Your household demonstrates strong digital care and awareness. This is a healthy, well‑tended digital environment.";
  }

  // Mapping value to classification message
  const classifications = {
    '-1': 'Needs attention — start with simple, foundational changes.',
    '0': 'Basic — some measures in place, there’s room to grow.',
    '1': 'Healthy — you’re on a good track.',
    '2': 'Excellent — actively managed and thriving.',
  };

  // Build per-lens summary
  let summaryHtml = '<ul class="lens-summary">';
  summaryHtml += `<li><strong>Home Wi‑Fi:</strong> ${classifications[values.network]}</li>`;
  summaryHtml += `<li><strong>Device care:</strong> ${classifications[values.devices]}</li>`;
  summaryHtml += `<li><strong>Privacy &amp; passwords:</strong> ${classifications[values.privacy]}</li>`;
  summaryHtml += `<li><strong>Scam awareness:</strong> ${classifications[values.scams]}</li>`;
  if (Object.prototype.hasOwnProperty.call(values, 'childrenSafety')) {
    summaryHtml += `<li><strong>Children’s online safety:</strong> ${classifications[values.childrenSafety]}</li>`;
  }
  summaryHtml += '</ul>';

  // Populate result panel
  resultPanel.innerHTML = `
    <h3>Household Signal: ${signal}%</h3>
    <p>${narrative}</p>
    <div class="summary-wrapper">
      <h4>How each area is doing</h4>
      ${summaryHtml}
    </div>
    <p><em>This snapshot reflects current conditions, not capability or worth.</em></p>
  `;

  resultPanel.style.display = "block";
  // Reveal the lens detail section once a snapshot is generated
  detailSection.style.display = "block";
  resultPanel.focus();
});
