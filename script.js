/* =========================================
   Cyber Seeds — Site Shell
   - Navigation
   - Snapshot modal open / close
   - No snapshot logic here
========================================= */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- NAV ----------
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$("a", navMenu).forEach(a =>
      a.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------- SNAPSHOT MODAL ----------
  const modal = $("#snapshotModal");
  const closeBtn = $("#closeSnapshot");
  const backdrop = modal?.querySelector(".modal-backdrop");

  function openModal() {
    modal?.classList.add("is-open");
    document.body.classList.add("modal-lock");
  }

  function closeModal() {
    modal?.classList.remove("is-open");
    document.body.classList.remove("modal-lock");
  }

  $$("[data-open-snapshot]").forEach(btn =>
    btn.addEventListener("click", openModal)
  );

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

})();
