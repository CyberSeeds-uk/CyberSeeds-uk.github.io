/* ======================================================
   CYBER SEEDS – Main Interaction Script (2025)
   Sliding Drawer • Smooth Scroll • Sticky Nav
====================================================== */

/* ---------- ELEMENT SELECTORS ---------- */
const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("drawer-overlay");
const navbar = document.querySelector(".navbar");


/* ======================================================
   SLIDING DRAWER MENU
====================================================== */

function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.add("active");
  hamburger.classList.add("active");
}

function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("active");
  hamburger.classList.remove("active");
}

hamburger.addEventListener("click", () => {
  if (drawer.classList.contains("open")) {
    closeDrawer();
  } else {
    openDrawer();
  }
});

overlay.addEventListener("click", closeDrawer);

/* Close drawer when clicking any drawer link */
document.querySelectorAll(".drawer a").forEach(link => {
  link.addEventListener("click", closeDrawer);
});


/* ======================================================
   SMOOTH SCROLL FOR INTERNAL LINKS
====================================================== */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");

    // Only intercept when actually navigating inside the page
    if (targetId && targetId.startsWith("#") && targetId.length > 1) {
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});


/* ======================================================
   STICKY NAVBAR SHADOW
====================================================== */

window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    navbar.classList.add("nav-scrolled");
  } else {
    navbar.classList.remove("nav-scrolled");
  }
});
