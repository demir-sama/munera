/** Desktop screenshots (1360x900) of all routes into ../screenshots/desktop-*.png.  APP_URL=... pnpm tsx scripts/desktop-shots.ts */
import { chromium } from "playwright-core";
import * as path from "path";
const APP = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.resolve(__dirname, "../../screenshots");
const BOUNTY = process.env.BOUNTY ?? "BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU";
const CREATOR = process.env.CREATOR ?? "HbgL5FsuqxWQdkTKDdNEj1VhbFQK3PGZE6Jux5Mu22Kv";
const R: [string, string][] = [
  ["home", "/"], ["create", "/create"], ["dashboard", "/dashboard"], ["leaderboard", "/leaderboard"], ["payments", "/payments"],
  ["bounty", `/bounty/${BOUNTY}`], ["creator", `/creator/${CREATOR}`], ["docs", "/docs"], ["docs-contract", "/docs/contract-reference"],
];
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  for (const [n, r] of R) {
    const p = await ctx.newPage();
    await p.goto(APP + r, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const ow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(n, ow ? "OVERFLOW" : "ok");
    await p.screenshot({ path: path.join(OUT, `desktop-${n}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
})();
