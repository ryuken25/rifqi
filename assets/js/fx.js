/* Storm Spirit "Ball Lightning" ambient FX — self-contained canvas layer.
   Zero external deps. GPU-light (no DOM thrash). Pauses when tab hidden.
   Honors prefers-reduced-motion. */
(function () {
  "use strict";
  var canvas = document.getElementById("fx-canvas");
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var particles = [];
  var bolts = [];
  var raf = null, running = false;
  var COLORS = ["#3aa0ff", "#7b5cff", "#9ad0ff", "#c8aa6e"];

  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function count() {
    // fewer particles on small screens for performance
    if (W < 560) return 26;
    if (W < 1000) return 40;
    return 64;
  }

  function seed() {
    particles = [];
    var n = count();
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.4 + 0.12),
        a: Math.random() * 0.5 + 0.2,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  // jagged lightning bolt between two points
  function makeBolt(x1, y1, x2, y2) {
    var segs = 7, pts = [{ x: x1, y: y1 }];
    for (var i = 1; i < segs; i++) {
      var t = i / segs;
      var nx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 46;
      var ny = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 46;
      pts.push({ x: nx, y: ny });
    }
    pts.push({ x: x2, y: y2 });
    return { pts: pts, life: 1, c: Math.random() > 0.5 ? "#7b5cff" : "#3aa0ff" };
  }

  function spawnBolt() {
    if (W <= 0) return;
    var x1 = Math.random() * W, y1 = Math.random() * H * 0.5;
    var x2 = x1 + (Math.random() - 0.5) * 280, y2 = y1 + Math.random() * 180 + 60;
    bolts.push(makeBolt(x1, y1, x2, y2));
  }

  var lastBolt = 0;
  function frame(ts) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // particles (drifting energy)
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.tw += 0.05;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      var alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = p.c;
      ctx.globalAlpha = alpha;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // lightning bolts
    if (ts - lastBolt > (W < 560 ? 1400 : 850) && bolts.length < 4) {
      spawnBolt(); lastBolt = ts;
    }
    for (var b = bolts.length - 1; b >= 0; b--) {
      var bolt = bolts[b];
      bolt.life -= 0.045;
      if (bolt.life <= 0) { bolts.splice(b, 1); continue; }
      ctx.strokeStyle = bolt.c;
      ctx.globalAlpha = bolt.life * 0.8;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = bolt.c;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(bolt.pts[0].x, bolt.pts[0].y);
      for (var j = 1; j < bolt.pts.length; j++) ctx.lineTo(bolt.pts[j].x, bolt.pts[j].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce) return;
    running = true; raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  function init() {
    size(); seed();
    if (reduce) {
      // draw a single static frame so it isn't blank
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.beginPath(); ctx.fillStyle = p.c; ctx.globalAlpha = p.a;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      return;
    }
    start();
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { size(); seed(); }, 200);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
