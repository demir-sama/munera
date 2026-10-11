import { Rec, SITE, creatorKp, gotoReady, newCtx, sleep, WORK } from "./common";
import { chromium } from "playwright-core";
(async () => {
  const flags = (process.env.FLAGS ?? "").split(" ").filter(Boolean);
  const b = await (await import("./common")).launch();
  const ctx = await newCtx(b, creatorKp(0)); const page = await ctx.newPage();
  await gotoReady(page, SITE + "/", "a[href^='/bounty/']"); await sleep(1500);
  const r = new Rec(page, WORK + "/t_" + (process.env.TAG ?? "x"), "t"); await r.begin();
  await r.scroll(560, 1300);
  const card = "a[href^='/bounty/']";
  await r.click(card, 900);
  r.cutStart(); await page.waitForSelector("#submissions", { timeout: 60000 }); await r.settle(); r.cutEnd();
  await r.hold(1.0);
  await r.scrollToEl("#submissions", 120, 1300);
  await r.hold(1);
  await r.end(); await b.close();
})();
