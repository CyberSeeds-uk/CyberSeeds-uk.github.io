async function loadComponent(path, target) {
  const mount = document.querySelector(target);
  if (!mount) return;

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load component: ${path}`);
  }

  const html = await response.text();
  mount.innerHTML = html;
}

function normalisePath(pathname) {
  const clean = (pathname || "/").replace(/index\.html$/i, "");
  if (!clean) return "/";
  return clean.endsWith("/") ? clean : `${clean}/`;
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
  const header = document.querySelector(".cs-site-header");
  const toggle = document.querySelector(".cs-menu-toggle");
  const panel = document.querySelector("#cs-mobile-panel");

  markActiveNav();

  if (!header || !toggle || !panel) return;
  if (toggle.dataset.bound === "true") return;

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

  document.addEventListener("click", (event) => {
    const clickedInsideHeader = header.contains(event.target);
    if (!clickedInsideHeader) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      closeMenu();
    }
  });

  closeMenu();
  toggle.dataset.bound = "true";
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
