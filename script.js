/* ===========================================================
   Cyber Seeds — Site Controller
   Calm, minimal, public-facing
   =========================================================== */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  // ---- Year ----
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Snapshot → Resources Handoff (button reveal) ----
  document.addEventListener("cyberseeds:snapshot-complete", () => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });

  // Optional: if a snapshot already exists, reveal resources immediately
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const raw = localStorage.getItem("cyberseeds_snapshot_v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.stage) {
        const btn = $("#goToResources");
        if (btn) btn.style.display = "inline-flex";
      }
    } catch {}
  });
})();
