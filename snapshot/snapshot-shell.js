/* =========================================================
   Cyber Seeds — Snapshot Shell
   Loads Web Component + binds homepage CTA
   ========================================================= */
(async function(){
  "use strict";

  async function ensureComponent(){
    if (customElements.get("cyber-seeds-snapshot")) return;

    // Engine first (safe to import multiple times)
    await import("/seedforge.js");
    await import("/snapshot/cyber-seeds-snapshot.js");
  }

  function ensureInstance(){
    let el = document.querySelector("cyber-seeds-snapshot");
    if (!el){
      el = document.createElement("cyber-seeds-snapshot");
      document.body.appendChild(el);
    }
    return el;
  }

  await ensureComponent();
  const component = ensureInstance();

  // Bind any [data-open-snapshot] on the page
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-snapshot]");
    if (!btn) return;
    e.preventDefault();
    component.open();
  });
})();
