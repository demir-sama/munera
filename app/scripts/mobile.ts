/**
 * Mobile audit: Android-style emulation (isMobile + hasTouch) at several widths, for every route.
 * Reports horizontal overflow (scrollWidth > innerWidth) with the offending elements, small touch targets,
 * small input fonts, and writes screenshots to ../screenshots/mobile-<route>-<width>.png.
 *   APP_URL=http://localhost:3100 pnpm tsx scripts/mobile.ts
 */
import { chromium } from "playwright-core";
import * as fs from "fs";
import * as path from "path";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.resolve(__dirname, "../../screenshots");
const BOUNTY = process.env.BOUNTY ?? "BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU";
const CREATOR = process.env.CREATOR ?? "HbgL5FsuqxWQdkTKDdNEj1VhbFQK3PGZE6Jux5Mu22Kv";
const ROUTES: [string, string][] = [
  ["home", "/"],
  ["create", "/create"],
  ["dashboard", "/dashboard"],
  ["leaderboard", "/leaderboard"],
  ["payments", "/payments"],
  ["profile", "/profile"],
  ["bounty", `/bounty/${BOUNTY}`],
  ["creator", `/creator/${CREATOR}`],
  ["docs", "/docs"],
  ["docs-quickstart", "/docs/quickstart"],
  ["docs-contract", "/docs/contract-reference"],
  ["docs-devnet", "/docs/devnet-addresses"],
];
const ALL_SIZES = [
  { w: 360, h: 640, dpr: 3 },
  { w: 360, h: 800, dpr: 3 },
  { w: 390, h: 844, dpr: 3 },
  { w: 412, h: 915, dpr: 2.625 },
];
const ONLY = process.env.ONLY_SIZE; // e.g. 360x800
const SIZES = ONLY ? ALL_SIZES.filter((x) => `${x.w}x${x.h}` === ONLY) : ALL_SIZES;
const SHOT_WIDTHS = new Set([360, 412]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  let failures = 0;
  const small: string[] = [];
  for (const s of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: s.dpr,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    });
    for (const [name, route] of ROUTES) {
      const page = await ctx.newPage();
      await page.goto(APP + route, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const iw = window.innerWidth;
        const doc = document.documentElement;
        const offenders: string[] = [];
        document.querySelectorAll("body *").forEach((el) => {
          const b = (el as HTMLElement).getBoundingClientRect();
          if (b.width === 0 || b.height === 0) return;
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.visibility === "hidden") return;
          // ignore elements inside horizontally scrollable containers
          let p: HTMLElement | null = el.parentElement;
          while (p && p !== document.body) {
            const o = getComputedStyle(p).overflowX;
            if (o === "auto" || o === "scroll" || o === "hidden") return;
            p = p.parentElement;
          }
          if (b.right > iw + 1 || b.left < -1) offenders.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") || "").split(" ").slice(0, 3).join(".")} [${Math.round(b.left)}..${Math.round(b.right)}]`);
        });
        const tiny: string[] = [];
        document.querySelectorAll("button, input, select, textarea, summary, [role=tab], a.btn, a[class*='btn']").forEach((el) => {
          const b = (el as HTMLElement).getBoundingClientRect();
          if (b.width === 0 || b.height === 0) return;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") return;
          if (b.height < 43.5) tiny.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}" h=${Math.round(b.height)}`);
        });
        const smallInputs: string[] = [];
        document.querySelectorAll("input, select, textarea").forEach((el) => {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 16 && (el as HTMLInputElement).type !== "hidden" && (el as HTMLElement).getBoundingClientRect().width > 0) smallInputs.push(`${el.tagName.toLowerCase()} ${fs}px`);
        });
        return { scrollW: doc.scrollWidth, bodyW: document.body.scrollWidth, iw, offenders: offenders.slice(0, 6), tiny, smallInputs, text: document.body.innerText.length };
      });
      const over = Math.max(r.scrollW, r.bodyW) > r.iw;
      if (over) failures++;
      console.log(
        `${over ? "FAIL" : "ok  "} ${s.w}x${s.h} ${route.slice(0, 34).padEnd(34)} scrollW=${r.scrollW} iw=${r.iw}` +
          (r.offenders.length ? ` offenders=${JSON.stringify(r.offenders)}` : "") +
          (r.smallInputs.length ? ` smallInputs=${JSON.stringify(r.smallInputs)}` : "")
      );
      for (const t of r.tiny) small.push(`${s.w} ${route} ${t}`);
      if (SHOT_WIDTHS.has(s.w) && s.h > 640) await page.screenshot({ path: path.join(OUT, `mobile-${name}-${s.w}.png`), fullPage: true });
      if (name === "home" && s.w === 360 && s.h === 800) {
        await page.click('button[aria-label="Open menu"]');
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `mobile-menu-360.png`) });
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  const uniq = [...new Set(small)];
  console.log(`\nOverflow failures: ${failures}`);
  console.log(`Controls under 44px tall: ${uniq.length}`);
  uniq.slice(0, 40).forEach((x) => console.log("  " + x));
  process.exit(failures ? 1 : 0);
})();
