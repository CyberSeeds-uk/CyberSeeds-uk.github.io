/* ===========================================================
   Cyber Seeds — Site Controller
   Calm, minimal, public-facing
   =========================================================== */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Snapshot → Resources Handoff ---------- */
  document.addEventListener("cyberseeds:snapshot-complete", (e) => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });
<script src="/snapshot.js" defer></script>
})();
