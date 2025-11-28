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
