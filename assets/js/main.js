/* Estúdio Gecê — interações leves, sem dependências */
(function () {
  "use strict";

  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") nav.classList.remove("is-open");
    });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = [].slice.call(document.querySelectorAll(".reveal"));

  function revealAll() { targets.forEach(function (el) { el.classList.add("is-in"); }); }

  if (reduce || !("IntersectionObserver" in window)) { revealAll(); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

  var vh = window.innerHeight || document.documentElement.clientHeight;
  targets.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh) { el.classList.add("is-in"); }
    else { io.observe(el); }
  });

  // trava final: garante que nada fique escondido
  setTimeout(revealAll, 2000);
})();
