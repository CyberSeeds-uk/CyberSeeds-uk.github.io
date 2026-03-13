async function loadComponent(path, target) {
  const mount = document.querySelector(target);
  if (!mount) return;

  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load component: ${path}`);
  }

  const html = await response.text();
  mount.innerHTML = html;
}

function setActiveNav() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  const map = {
    "/": "home",
    "/snapshot": "snapshot",
    "/resources": "resources",
    "/contact": "contact",
    "/book": "book"
  };

  const active = map[path];
  if (!active) return;

  const link = document.querySelector(`[data-nav="${active}"]`);
  if (link) {
    link.setAttribute("aria-current", "page");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Promise.all([
      loadComponent("/components/header.html", "#header"),
      loadComponent("/components/footer.html", "#footer")
    ]);

    setActiveNav();
  } catch (err) {
    console.error("Layout load failed:", err);
  }
});
