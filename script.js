/* Cyber Seeds — Household Signal bootstrap
   This file intentionally mounts the interactive signal
   without affecting layout or accessibility.
*/

document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("signalApp");
  if (!mount) return;

  mount.innerHTML = `
    <p><strong>Household Signal loading…</strong></p>
    <p class="muted">Interactive module initialising.</p>
  `;
});
