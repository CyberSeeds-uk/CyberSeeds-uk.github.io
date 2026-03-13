async function loadComponent(path, target) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load component: ${path}`);
  }

  const html = await response.text();
  const host = document.querySelector(target);

  if (!host) return null;

  host.innerHTML = html;
  return host;
}

function normalisePath(pathname) {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getCurrentNavKey() {
  const path = normalisePath(window.location.pathname);

  if (path === "/") return "home";
  if (path.startsWith("/snapshot/")) return "snapshot";
  if (path.startsWith("/resources/")) return "resources";
  if (path.startsWith("/contact/")) return "contact";
  if (path.startsWith("/book/")) return "book";

  return "";
}

function markActiveNav() {
  const current = getCurrentNavKey();
  if (!current) return;

  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === current) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function initHeader() {
  const toggle = document.querySelector(".cs-menu-toggle");
  const panel = document.querySelector("#cs-mobile-panel");

  if (!toggle || !panel) return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
    panel.hidden = true;
    panel.classList.remove("is-open");
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("is-open");
    panel.hidden = false;
    panel.classList.add("is-open");
  };

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      closeMenu();
    }
  });

  closeMenu();
  markActiveNav();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (document.querySelector("#header")) {
      await loadComponent("/components/header.html", "#header");
      initHeader();
    }

    if (document.querySelector("#footer")) {
      await loadComponent("/components/footer.html", "#footer");
    }
  } catch (error) {
    console.error(error);
  }
});
