/* ===========================================================
   Cyber Seeds — Site Controller
   =========================================================== */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Year ---------- */
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Resources Handoff ---------- */
  document.addEventListener("cyberseeds:snapshot-complete", () => {
    const btn = $("#goToResources");
    if (btn) btn.style.display = "inline-flex";
  });

})();
