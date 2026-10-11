/** Grab real screenshots of the live site (desktop + 412px mobile) for the features montage. */
import { chromium, devices } from "playwright-core";
import * as fs from "fs";
import * as path from "path";
import { SITE, WORK, creatorKp, gotoReady, newCtx, sleep, sponsorKp } from "./common";

const OUT = path.join(WORK, "shots");
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--font-render-hinting=none"] });
  const creator = creatorKp(0).publicKey.toBase58();
  const desk = async (name: string, url: string, ready: string, kp?: any, extra?: (p: any) => Promise<void>) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    if (kp) { // reuse wallet injection from common
      await ctx.close();
      const c2 = await newCtx(b, kp); await c2.pages(); 
      const page = await c2.newPage(); await page.setViewportSize({ width: 1440, height: 900 });
      await gotoReady(page, SITE + url, ready); await sleep(2500); if (extra) await extra(page);
      await page.screenshot({ path: path.join(OUT, name + ".png") }); await c2.close(); return;
    }
    const page = await ctx.newPage();
    await gotoReady(page, SITE + url, ready); await sleep(2500); if (extra) await extra(page);
    await page.screenshot({ path: path.join(OUT, name + ".png") }); await ctx.close();
    console.log("shot", name);
  };
  await desk("leaderboard", "/leaderboard", "text=Demo Creator");
  await desk("profile", `/creator/${creator}`, "text=/Total earned/i", undefined, async (p) => { await p.waitForSelector("text=Demo Creator", { timeout: 30000 }).catch(() => {}); });
  await desk("dashboard", "/dashboard", "text=My bounties", sponsorKp());
  await desk("docs", "/docs/quickstart", "h1");
  const mctx = await b.newContext({ ...devices["Pixel 5"], viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  for (const [n, u, r] of [["m_home", "/", "a[href^='/bounty/']"], ["m_bounty", "/bounty/BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU", "text=Funded budget"]] as const) {
    const p = await mctx.newPage(); await gotoReady(p, SITE + u, r); await sleep(2500);
    await p.screenshot({ path: path.join(OUT, n + ".png") }); await p.close(); console.log("shot", n);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
