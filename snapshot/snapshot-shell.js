import "/components/cyber-seeds-snapshot.js";

const SELECTOR = "[data-open-snapshot]";

function ensureComponent() {
  let el = document.querySelector("cyber-seeds-snapshot");
  if (!el) {
    el = document.createElement("cyber-seeds-snapshot");
    document.body.appendChild(el);
  }
  return el;
}

function bindCTAs() {
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!btn) return;
    e.preventDefault();
    ensureComponent().open();
  });
}

function boot() {
  ensureComponent(); // pre-create so CSS/fonts load cleanly
  bindCTAs();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
