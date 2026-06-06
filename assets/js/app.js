/* Shared UI behaviour: nav drawer, accordions, reflection cards,
   lightbox, lazy iframe embeds, scroll reveal. Vanilla JS, no deps. */
(function () {
  "use strict";

  /* ---------- mobile nav drawer ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    var closeNav = function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest(".nav-scrim")) closeNav();
      if (e.target.closest(".nav-links a")) closeNav();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  /* ---------- generic accordion (siklus + reflection cards) ---------- */
  document.querySelectorAll("[data-accordion]").forEach(function (head) {
    head.addEventListener("click", function () {
      var item = head.closest("[data-acc-item]");
      if (!item) return;
      var expanded = item.classList.toggle("open");
      head.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  });

  /* ---------- siklus tab switcher (artefak) ---------- */
  document.querySelectorAll(".siklus-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-target");
      var target = document.getElementById(id);
      if (!target) return;
      document.querySelectorAll(".siklus-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      // ensure target open then scroll to it
      target.classList.add("open");
      var h = target.querySelector("[data-accordion]");
      if (h) h.setAttribute("aria-expanded", "true");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- lazy iframe embeds (click-to-load facade) ----------
     We do NOT auto-load third-party iframes: they only load on user
     intent. This keeps page load fast and free of third-party noise.
     The real src lives in data-src and is injected on click. */
  document.querySelectorAll(".embed[data-src]").forEach(function (box) {
    var load = function () {
      if (box.dataset.loaded) return;
      box.dataset.loaded = "1";
      var iframe = document.createElement("iframe");
      iframe.src = box.getAttribute("data-src");
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      iframe.title = box.getAttribute("data-title") || "Embedded media";
      var ph = box.querySelector(".ph");
      if (ph) ph.remove();
      box.appendChild(iframe);
    };
    var ph = box.querySelector(".ph");
    if (ph) {
      ph.addEventListener("click", load);
      ph.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); }
      });
    }
  });

  /* ---------- lightbox (gallery + hero cards) ---------- */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    var open = function (src, alt) {
      lbImg.src = src; lbImg.alt = alt || "";
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
    };
    var close = function () { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
    document.querySelectorAll("[data-lightbox]").forEach(function (el) {
      el.addEventListener("click", function () {
        var img = el.querySelector("img") || el;
        open(img.getAttribute("src") || el.getAttribute("data-lightbox"), img.getAttribute("alt"));
      });
    });
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest(".lb-close")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- year stamp (optional) ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = "2026"; });
})();
