/* ======================================================
   CYBER SEEDS – Main Interaction Script
   Mobile Menu • Smooth Scroll • UI Enhancements
====================================================== */

/* ---------- Mobile Navigation Toggle ---------- */
const navToggle = document.getElementById("nav-toggle");
const navLinks = document.querySelector(".nav-links");

document.querySelector(".hamburger").addEventListener("click", () => {
  navToggle.checked = !navToggle.checked;
});

/* Auto-close menu when clicking a link */
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navToggle.checked = false;
  });
});


/* ---------- Smooth Scroll (Extra Support for Older Browsers) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");

    if (targetId.startsWith("#") && targetId.length > 1) {
      e.preventDefault();
      const target = document.querySelector(targetId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
});


/* ---------- Sticky Nav Shadow on Scroll ---------- */
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    navbar.classList.add("nav-scrolled");
  } else {
    navbar.classList.remove("nav-scrolled");
  }
});

/* -------------------------------------------
   SLIDING DRAWER MENU JS (2025)
------------------------------------------- */

const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("drawer-overlay");

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

/* Close drawer when clicking a menu link */
document.querySelectorAll(".drawer a").forEach(link => {
  link.addEventListener("click", closeDrawer);
});
