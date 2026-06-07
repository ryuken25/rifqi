import { test, expect, Page } from "@playwright/test";

/* Runs against BASE_URL (local dev server or the live GitHub Pages URL).
   The same suite is the gate for both. */

const BASE = process.env.BASE_URL || "http://localhost:3000/";
const origin = new URL(BASE).origin;

const PAGES = [
  { path: "index.html", title: "RIFQI FAUSTA DIANTA" },
  { path: "artefak.html", title: "Artefak Pembelajaran" },
  { path: "refleksi.html", title: "Refleksi" },
];

const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 414, h: 896 },
  { w: 768, h: 1024 },
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
];

// Errors we never want from OUR site. Third-party iframe noise is ignored
// (we don't auto-load iframes anyway).
function isOwnError(text: string, location?: string) {
  if (location && !location.startsWith(origin)) return false;
  return true;
}

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const loc = msg.location()?.url || "";
      if (isOwnError(msg.text(), loc)) errors.push(`console: ${msg.text()} @ ${loc}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function trackFailedAssets(page: Page) {
  const failed: string[] = [];
  page.on("response", (res) => {
    const url = res.url();
    if (!url.startsWith(origin)) return; // only our own assets
    if (/\.(css|js|png|jpe?g|gif|webp|svg|woff2?)(\?|$)/i.test(url) && res.status() >= 400) {
      failed.push(`${res.status()} ${url}`);
    }
  });
  return failed;
}

async function loadAllImages(page: Page) {
  // trigger native lazy images by scrolling, then wait for decode
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    const imgs = Array.from(document.images);
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.all(
      imgs.map(
        (i) =>
          (i.complete && i.naturalWidth > 0)
            ? Promise.resolve()
            : new Promise<void>((res) => {
                const done = () => res();
                i.addEventListener("load", done, { once: true });
                i.addEventListener("error", done, { once: true });
                const s = i.src;
                i.src = "";
                i.src = s;
                setTimeout(done, 8000);
              })
      )
    );
  });
}

for (const p of PAGES) {
  test.describe(`${p.path}`, () => {
    test("no JS errors, no broken images, no failed assets", async ({ page }) => {
      const errors = await collectErrors(page);
      const failed = await trackFailedAssets(page);

      await page.goto(p.path, { waitUntil: "load" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await loadAllImages(page);

      // broken images
      const broken = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => !(i.naturalWidth > 0))
          .map((i) => i.currentSrc || i.src)
      );
      expect(broken, `broken images: ${broken.join(", ")}`).toEqual([]);

      // failed same-origin assets
      expect(failed, `failed assets: ${failed.join(", ")}`).toEqual([]);

      // console / page errors
      expect(errors, `errors: ${errors.join(" | ")}`).toEqual([]);
    });

    test("content sanity", async ({ page }) => {
      await page.goto(p.path, { waitUntil: "load" });
      await expect(page.locator("body")).toContainText("RIFQI FAUSTA DIANTA");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await expect(page.getByText(p.title, { exact: false }).first()).toBeVisible();
    });

    test("no horizontal overflow across viewports", async ({ page }) => {
      await page.goto(p.path, { waitUntil: "load" });
      for (const v of VIEWPORTS) {
        await page.setViewportSize({ width: v.w, height: v.h });
        await page.waitForTimeout(120);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflow, `${v.w}px overflow=${overflow}`).toBeLessThanOrEqual(1);
      }
    });
  });
}

test.describe("navigation", () => {
  test("navbar links navigate and active state is correct", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    await expect(page.locator(".nav-links a.active")).toHaveText(/Beranda/);

    await page.locator('.nav-links a[href="artefak.html"]').click();
    await expect(page).toHaveURL(/artefak(\.html)?$/);
    await expect(page.locator(".nav-links a.active")).toHaveText(/Artefak/);

    await page.locator('.nav-links a[href="refleksi.html"]').click();
    await expect(page).toHaveURL(/refleksi(\.html)?$/);
    await expect(page.locator(".nav-links a.active")).toHaveText(/Refleksi/);
  });

  test("navbar stays sticky on scroll", async ({ page }) => {
    await page.goto("artefak.html", { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(200);
    const top = await page.locator(".nav").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top), `nav top after scroll = ${top}`).toBeLessThanOrEqual(1);
    const navY = await page.evaluate(() => window.scrollY);
    expect(navY).toBeGreaterThan(500); // we actually scrolled
  });

  test("mobile hamburger opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("index.html", { waitUntil: "load" });
    const links = page.locator(".nav-links");
    const toggle = page.locator(".nav-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator(".nav.open")).toBeVisible();
    // a link should be reachable; clicking it closes the drawer + navigates
    await links.locator('a[href="artefak.html"]').click();
    await expect(page).toHaveURL(/artefak(\.html)?$/);
  });
});

test.describe("interactions", () => {
  test("siklus accordions + tabs work (artefak)", async ({ page }) => {
    await page.goto("artefak.html", { waitUntil: "load" });
    const s2 = page.locator("#siklus-2");
    await expect(s2).not.toHaveClass(/open/);
    await s2.locator(".siklus-head").click();
    await expect(s2).toHaveClass(/open/);
    await s2.locator(".siklus-head").click();
    await expect(s2).not.toHaveClass(/open/);

    // tab switcher opens target siklus
    await page.locator('.siklus-tab[data-target="siklus-3"]').click();
    await expect(page.locator("#siklus-3")).toHaveClass(/open/);
  });

  test("all expected embeds wired with correct src", async ({ page }) => {
    await page.goto("artefak.html", { waitUntil: "load" });
    const expected = [
      "https://www.youtube.com/embed/-3XixSO98yU",
      "https://www.youtube.com/embed/mEO9FAZNwQE",
      "https://drive.google.com/file/d/1wzCaI2hKRO7HCh1buahIcxb68nwk2kZt/preview",
      "https://www.youtube.com/embed/3v-cGs70_FM",
      "https://www.youtube.com/embed/DOBXXgQ0tl0",
      "https://drive.google.com/file/d/11k9wxID76kIpslzvJzPDMp6MxGge0x7m/preview",
      "https://www.youtube.com/embed/2sMGtxxbXZk",
      "https://www.youtube.com/embed/sDKc5C81IhU",
      "https://drive.google.com/file/d/1cRyykyVprwYaNloxc8sUHseMrJZx7yyB/preview",
    ];
    const srcs = await page.locator(".embed[data-src]").evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-src"))
    );
    for (const e of expected) expect(srcs).toContain(e);

    // clicking a facade opens the preview modal with the correct iframe src
    const first = page.locator("#siklus-1 .embed").first();
    await first.locator(".ph").click();
    await expect(page.locator(".media-modal.open")).toBeVisible();
    await expect(page.locator(".media-modal iframe")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/-3XixSO98yU"
    );
    // Dota-style close button dismisses it and stops playback
    await page.locator(".media-modal .dota-close").click();
    await expect(page.locator(".media-modal.open")).toHaveCount(0);
    await expect(page.locator(".media-modal iframe")).toHaveCount(0);
  });

  test("reflection cards expand (refleksi)", async ({ page }) => {
    await page.goto("refleksi.html", { waitUntil: "load" });
    const card = page.locator(".refl-card").first();
    await expect(card).not.toHaveClass(/open/);
    await card.locator(".rc-trigger").click();
    await expect(card).toHaveClass(/open/);
  });

  test("lightbox opens and closes (index)", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    await page.locator(".gallery figure").first().click();
    await expect(page.locator(".lightbox.open")).toBeVisible();
    await page.locator(".lightbox .lb-close").click();
    await expect(page.locator(".lightbox.open")).toHaveCount(0);
  });

  test("contact links have correct hrefs (index)", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    await expect(page.locator('a[href="mailto:rifqia48@gmail.com"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://wa.me/6287839962270"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://instagram.com/rifqia48_"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="https://linkedin.com/in/rifqi-fausta-dianta-457130178/"]').first()
    ).toBeVisible();
  });
});

test.describe("emotes", () => {
  test("old 8-bit gallery is fully removed (index)", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    await expect(page.locator(".hero-gallery")).toHaveCount(0);
    await expect(page.locator(".hero-card")).toHaveCount(0);
    await expect(page.getByText(/Galeri 8-?Bit|8-?Bit Heroes/i)).toHaveCount(0);
  });

  for (const p of PAGES) {
    test(`emotes self-hosted, loaded & spread (${p.path})`, async ({ page }) => {
      await page.goto(p.path, { waitUntil: "load" });
      await loadAllImages(page);

      const info = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("img.emote")) as HTMLImageElement[];
        return {
          count: els.length,
          notLocal: els.map((e) => e.getAttribute("src") || "").filter((s) => !s.startsWith("assets/")),
          broken: els.filter((e) => !(e.naturalWidth > 0)).map((e) => e.src),
        };
      });

      expect(info.count, "emote count").toBeGreaterThanOrEqual(12);
      expect(info.notLocal, `non-local emote src: ${info.notLocal.join(", ")}`).toEqual([]);
      expect(info.broken, `broken emotes: ${info.broken.join(", ")}`).toEqual([]);
    });
  }

  test("emotes present in each major section", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    for (const sel of [".hero", "#profil", "#kontak", "#sekolah", "footer.footer"]) {
      await expect(page.locator(`${sel} img.emote`).first(), sel).toHaveCount(1);
    }
    await page.goto("artefak.html", { waitUntil: "load" });
    for (const sel of ["#siklus-1", "#siklus-2", "#siklus-3", "footer.footer"]) {
      await expect(page.locator(`${sel} img.emote`).first(), sel).toHaveCount(1);
    }
    await page.goto("refleksi.html", { waitUntil: "load" });
    const cards = page.locator(".refl-card img.emote");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".talent img.emote").first()).toHaveCount(1);
    await expect(page.locator("footer.footer img.emote").first()).toHaveCount(1);
  });

  test("mascot reacts on click (changes face + bubble)", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    const mascot = page.locator("#mascot");
    const img = page.locator("#mascotImg");
    await expect(mascot).toBeVisible();
    const before = await img.getAttribute("src");
    await mascot.click();
    await expect(page.locator(".mascot.is-talking")).toBeVisible();
    await expect(page.locator("#mascotBubble")).not.toBeEmpty();
    await expect(img).not.toHaveAttribute("src", before || "");
    // close button hides the mascot
    await page.locator(".mascot__close").click();
    await expect(page.locator(".mascot.is-hidden")).toHaveCount(1);
  });

  test("peek emotes reveal on scroll", async ({ page }) => {
    await page.goto("index.html", { waitUntil: "load" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 200) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    const inCount = await page.locator(".emote--peek.is-in").count();
    expect(inCount).toBeGreaterThan(0);
  });
});

test.describe("polish", () => {
  test("cheap emoji replaced by HUD icons (artefak)", async ({ page }) => {
    await page.goto("artefak.html", { waitUntil: "load" });
    // HUD mask-icons present
    expect(await page.locator(".hicon").count()).toBeGreaterThanOrEqual(18);
    // the flat target/check/warn/book/film/doc emoji are gone from the body text
    const body = await page.locator("body").innerText();
    for (const e of ["🎯", "✅", "⚠️", "📚", "🎥", "📄"]) {
      expect(body.includes(e), `emoji ${e} should be gone`).toBeFalsy();
    }
  });

  test("cursor + icon assets resolve (no 404)", async ({ page }) => {
    const base = new URL("./", BASE).toString();
    for (const rel of [
      "assets/cursor/cursor.svg",
      "assets/cursor/cursor-green.svg",
      "assets/icons/target.svg",
      "assets/icons/check.svg",
      "assets/icons/rocket.svg",
    ]) {
      const res = await page.request.get(base + rel);
      expect(res.status(), rel).toBe(200);
    }
  });

  test("reflection bullets use animated effect gifs (refleksi)", async ({ page }) => {
    await page.goto("refleksi.html", { waitUntil: "load" });
    const srcs = await page.locator(".feat-list .ico img").evaluateAll((els) =>
      els.map((e) => e.getAttribute("src") || "")
    );
    expect(srcs.length).toBeGreaterThanOrEqual(9);
    for (const s of srcs) expect(s.endsWith(".gif"), s).toBeTruthy();
  });
});

test.describe("visual", () => {
  test("capture screenshots", async ({ page }) => {
    for (const p of PAGES) {
      for (const v of [{ w: 390, h: 844, n: "mobile" }, { w: 1366, h: 768, n: "desktop" }]) {
        await page.setViewportSize({ width: v.w, height: v.h });
        await page.goto(p.path, { waitUntil: "load" });
        // scroll through to trigger reveal-on-scroll + lazy images
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 200) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 110));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `tests/__screens__/${p.path.replace(".html", "")}-${v.n}.png`,
          fullPage: true,
        });
      }
    }
  });
});
