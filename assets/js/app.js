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

  /* ---------- Dota-style X close button markup ---------- */
  var X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';

  /* ---------- image lightbox (preview/zoom) ---------- */
  var lb = document.querySelector(".lightbox");
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", "Pratinjau gambar");
    lb.setAttribute("aria-hidden", "true");
    lb.innerHTML = '<button class="dota-close lb-close" type="button" aria-label="Tutup">' + X_SVG + '</button>' +
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" />';
    document.body.appendChild(lb);
  } else {
    // upgrade an existing static close button to the Dota style
    var oldClose = lb.querySelector(".lb-close");
    if (oldClose) { oldClose.classList.add("dota-close"); oldClose.innerHTML = X_SVG; }
  }
  var lbImg = lb.querySelector("img");
  var openLb = function (src, alt) {
    lbImg.src = src; lbImg.alt = alt || "";
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  };
  var closeLb = function () { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
  document.querySelectorAll("[data-lightbox]").forEach(function (el) {
    el.addEventListener("click", function () {
      var img = el.querySelector("img") || el;
      openLb(img.getAttribute("src") || el.getAttribute("data-lightbox"), img.getAttribute("alt"));
    });
  });
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.closest(".lb-close")) closeLb();
  });

  /* ---------- video/doc preview modal ----------
     Clicking an embed facade opens the media in a centered preview
     overlay (like the image lightbox) with a Dota-style X. Iframes
     load only on click and are torn down on close (stops playback). */
  var embeds = document.querySelectorAll(".embed[data-src]");
  var mm = null;
  if (embeds.length) {
    mm = document.createElement("div");
    mm.className = "media-modal";
    mm.setAttribute("role", "dialog");
    mm.setAttribute("aria-label", "Pemutar media");
    mm.setAttribute("aria-hidden", "true");
    mm.innerHTML = '<button class="dota-close mm-close" type="button" aria-label="Tutup">' + X_SVG + '</button><div class="mm-frame"></div>';
    document.body.appendChild(mm);
    var mmFrame = mm.querySelector(".mm-frame");

    var openMedia = function (src, title) {
      mmFrame.innerHTML = "";
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      iframe.title = title || "Embedded media";
      mmFrame.appendChild(iframe);
      mm.classList.add("open"); mm.setAttribute("aria-hidden", "false");
    };
    var closeMedia = function () {
      mm.classList.remove("open"); mm.setAttribute("aria-hidden", "true");
      mmFrame.innerHTML = ""; // stop playback
    };
    mm.addEventListener("click", function (e) {
      if (e.target === mm || e.target.closest(".mm-close")) closeMedia();
    });

    embeds.forEach(function (box) {
      var go = function () { openMedia(box.getAttribute("data-src"), box.getAttribute("data-title")); };
      var ph = box.querySelector(".ph");
      if (ph) {
        ph.addEventListener("click", go);
        ph.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
        });
      }
    });

    var closeMediaRef = closeMedia;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLb(); if (mm) mm.classList.remove("open"), (mm.querySelector(".mm-frame").innerHTML = ""); }
  });

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
