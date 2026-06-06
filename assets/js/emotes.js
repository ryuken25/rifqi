/* Chibi Dota emotes: peek-in on scroll, reactive mascot, easter egg.
   Vanilla JS, no deps, all paths relative. */
(function () {
  "use strict";
  var BASE = "assets/dota/emotes/";

  /* ---------- 1) peek-in when emotes enter viewport ---------- */
  var peeks = document.querySelectorAll(".emote--peek");
  if ("IntersectionObserver" in window && peeks.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.2 });
    peeks.forEach(function (el) { io.observe(el); });
  } else {
    peeks.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 2) reactive mascot + easter egg ---------- */
  var mascot = document.getElementById("mascot");
  if (mascot) {
    var mImg = document.getElementById("mascotImg");
    var mBub = document.getElementById("mascotBubble");
    var faces = ["charm_smile", "charm_wink", "charm_highfive", "charm_cheeky", "charm_cool"];
    var lines = ["GG! 🎉", "Semangat belajar!", "Nice last hit ✨", "Mantap, lanjutkan!", "Reflektif terus 💡"];
    var i = 0, clicks = 0, t;

    function react() {
      i = (i + 1) % faces.length;
      mImg.src = BASE + faces[i] + ".gif";
      mBub.textContent = lines[i];
      mascot.classList.add("is-talking");
      clearTimeout(t);
      t = setTimeout(function () { mascot.classList.remove("is-talking"); }, 1800);
    }

    function party() {
      ["stars", "gg", "heart", "charm_happytears"].forEach(function (n, k) {
        var s = document.createElement("img");
        s.className = "emote";
        s.src = BASE + n + ".gif";
        s.alt = "";
        s.setAttribute("aria-hidden", "true");
        s.style.cssText =
          "position:fixed;z-index:90;pointer-events:none;right:" + (20 + k * 46) +
          "px;bottom:96px;transition:transform 1s ease, opacity 1s ease";
        document.body.appendChild(s);
        requestAnimationFrame(function () {
          s.style.transform = "translateY(-130px) scale(1.4)";
          s.style.opacity = "0";
        });
        setTimeout(function () { s.remove(); }, 1100);
      });
    }

    mascot.addEventListener("mouseenter", react);
    mascot.addEventListener("click", function (e) {
      if (e.target.closest(".mascot__close")) return;
      react();
      if (++clicks >= 5) { clicks = 0; party(); }
    });
    mascot.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(); if (++clicks >= 5) { clicks = 0; party(); } }
    });

    var closeBtn = mascot.querySelector(".mascot__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        mascot.classList.add("is-hidden");
      });
    }
  }
})();
