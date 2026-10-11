/**
 * Records the LIVE Munera demo flow on devnet (real txs) as raw screencast frames + an event manifest per scene.
 *   pnpm tsx scripts/demo/record.ts <a|b|c|d|all>      (DRY=1: no transactions, uses the example bounty)
 * Scenes: a = sponsor creates bounty, b = creator submits, c = sponsor approves, d = proof (payments, explorer, leaderboard, profile)
 */
import * as fs from "fs";
import * as path from "path";
import { Rec, SITE, WORK, creatorKp, gotoReady, launch, newCtx, sleep, sponsorKp } from "./common";

const DRY = !!process.env.DRY;
const STATE = path.join(WORK, "state.json");
const EXAMPLE = "BBwYwxKXpDjyhJjdMQfWRhifxjcVFatAqqDkcet493SU";
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {});
const save = (s: any) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
const log = (...a: unknown[]) => console.log("•", ...a);
const dirFor = (n: string) => path.join(WORK, DRY ? "dry" : "live", n);

function deadlineLocal() {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000); d.setHours(12, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function sceneA(b: any) {
  const ctx = await newCtx(b, sponsorKp()); const page = await ctx.newPage();
  await gotoReady(page, SITE + "/", "header >> text=/6Gui/");
  await sleep(1200);
  const r = new Rec(page, dirFor("a"), "a"); await r.begin();
  r.title("01", "Sponsor locks the budget");
  await r.say("d0");
  await r.moveTo("header a[href='/create']", 900);
  await sleep(150); await page.mouse.down(); await sleep(70); await page.mouse.up();
  await page.waitForSelector("#title", { timeout: 30000 });
  await r.hold(0.6);
  const s4 = r.say("c4");
  await r.type("#title", "Clip our launch", 85);
  await r.type("#desc", "Make a 30-second clip of the Munera launch. Best clips win 5 USDC each. One entry per creator.", 22);
  await r.type("#reward", "5", 160);
  await r.type("#winners", "3", 160);
  await r.click("#deadline", 650);
  await page.fill("#deadline", deadlineLocal());
  await r.hold(0.4);
  await s4;
  await r.scrollToEl("text=Total budget to escrow", 520, 900);
  r.stat("Total budget", 0, 15, "USDC", "5 USDC × 3 winners", 1.3);
  await r.zoom("text=Total budget to escrow", 1.35, 2.6);
  if (DRY) { await r.end("dry"); await ctx.close(); return; }
  const s5 = r.say("c5");
  await r.click("button:has-text('Lock funds')", 900);
  await sleep(900); r.cutStart();
  await page.waitForURL(/\/bounty\//, { timeout: 90000 });
  r.cutEnd();
  const addr = page.url().split("/bounty/")[1].split(/[?#]/)[0];
  const sig = await page.locator("a[href*='/tx/']").first().getAttribute("href", { timeout: 5000 }).catch(() => null);
  await page.waitForSelector("text=/In vault now: 15/", { timeout: 60000 });
  await r.scroll(0, 600);
  await r.hold(0.5);
  r.stat("Vault balance", 0, 15, "USDC", "Locked in escrow", 1.4);
  await r.zoom("text=Funded budget", 1.4, 2.8);
  await s5;
  await r.hold(0.8);
  const st = load(); st.bounty = addr; st.createTx = sig; save(st);
  log("bounty", addr, "create tx link", sig);
  await r.end(); await ctx.close();
}

async function sceneB(b: any) {
  const st = load(); const bounty = DRY ? EXAMPLE : st.bounty;
  const ctx = await newCtx(b, creatorKp(0)); const page = await ctx.newPage();
  await gotoReady(page, SITE + "/", DRY ? "a[href^='/bounty/']" : `a[href='/bounty/${bounty}']`);
  await page.waitForSelector("header >> text=/Hbg/", { timeout: 20000 }).catch(() => {});
  await sleep(1000);
  const r = new Rec(page, dirFor("b"), "b"); r.cursor = [1200, 300]; await r.begin();
  r.title("02", "Creators submit");
  const s6 = r.say("c6");
  await r.scroll(560, 1300);
  const card = `a[href='/bounty/${bounty}']`;
  await r.moveTo(card, 1000);
  await r.zoom(card, 1.25, 1.2);
  await s6;
  await r.click(card, 300);
  await page.waitForSelector(DRY ? "#submissions" : "#link", { timeout: 60000 });
  await r.hold(1.0);
  const s7 = r.say("c7");
  if (DRY) { await r.scrollToEl("#submissions", 120, 1300); await s7; await r.end("dry"); await ctx.close(); return; }
  await r.scrollToEl("#link", 420, 1300);
  await r.type("#link", "https://x.com/munera_xyz", 70);
  await r.hold(0.5);
  await r.click("button:has-text('Submit entry')", 800);
  await sleep(900); r.cutStart();
  await page.waitForSelector("text=Pending", { timeout: 90000 });
  await page.waitForSelector("text=Demo Creator", { timeout: 60000 }).catch(() => {});
  r.cutEnd();
  await r.hold(0.4);
  await r.scrollToEl("#submissions", 120, 1000);
  await r.hold(0.6);
  await r.zoom("text=Pending >> nth=0", 1.4, 3.2);
  await s7;
  await r.hold(0.8);
  await r.end(); await ctx.close();
}

async function sceneC(b: any) {
  const st = load(); const bounty = DRY ? EXAMPLE : st.bounty;
  const ctx = await newCtx(b, sponsorKp()); const page = await ctx.newPage();
  await gotoReady(page, `${SITE}/bounty/${bounty}`, DRY ? "text=Funded budget" : "button:has-text('Approve & pay')");
  await page.waitForSelector("text=Demo Creator", { timeout: 40000 }).catch(() => {});
  await sleep(1000);
  const r = new Rec(page, dirFor("c"), "c"); r.cursor = [1500, 380]; await r.begin();
  r.title("03", "Approval = instant payout");
  const s8 = r.say("c8");
  await r.hold(0.8);
  await r.scrollToEl("#submissions", 120, 1500);
  await r.hold(0.6);
  await r.zoom("#submissions", 1.2, 1.6);
  await s8;
  if (DRY) { await r.end("dry"); await ctx.close(); return; }
  const s9 = r.say("c9");
  const btn = "button:has-text('Approve & pay')";
  await r.moveTo(btn, 1000);
  await r.zoom(btn, 1.5, 1.4);
  await r.click(btn, 300);
  await sleep(900); r.cutStart();
  await page.waitForSelector("text=/Paid 5/", { timeout: 90000 });
  r.cutEnd();
  const sig = await page.locator("a[href*='/tx/']").first().getAttribute("href", { timeout: 3000 }).catch(() => null);
  await r.hold(0.8);
  await r.zoom("text=/Paid 5/ >> nth=0", 1.4, 1.8);
  await r.scroll(0, 1200);
  await r.hold(0.4);
  r.stat("Vault balance", 15, 10, "USDC", "5.00 USDC paid out", 1.6);
  await page.waitForSelector("text=/In vault now: 10/", { timeout: 30000 }).catch(() => log("WARN vault text not 10"));
  await r.zoom("text=Slots left", 1.35, 3.0);
  await s9;
  await r.hold(0.9);
  st.approveTx = sig; save(st);
  log("approve link", sig);
  await r.end(); await ctx.close();
}

async function sceneD(b: any) {
  const st = load();
  const ctx = await newCtx(b, undefined); const page = await ctx.newPage();
  await gotoReady(page, SITE + "/payments", DRY ? "a:has-text('Tx ')" : "a:has-text('Clip our launch')");
  await page.waitForSelector("a:has-text('Tx ')", { timeout: 60000 });
  await sleep(1500);
  const r = new Rec(page, dirFor("d"), "d"); r.cursor = [1400, 420]; await r.begin();
  r.title("04", "Verify onchain");
  const s10 = r.say("c10");
  await r.hold(0.8);
  const txSel = st.approveTx ? `a[href='${st.approveTx}']` : "a:has-text('Tx ') >> nth=0";
  const rowC = await r.center(txSel);
  await r.zoom({ cx: 768, cy: rowC.y }, 1.3, 1.6);
  await r.moveTo(txSel, 1000);
  r.stat("USDC paid", 0, 5, "USDC", "Creator paid from the vault", 1.2);
  await r.hold(1.2);
  await page.evaluate(() => document.querySelectorAll("a").forEach((a) => a.removeAttribute("target")));
  await r.click(txSel, 300);
  await sleep(700); r.cutStart();
  await page.waitForSelector("text=Summary", { timeout: 60000 });
  await page.waitForSelector("text=Finalized", { timeout: 60000 }).catch(() => {});
  await sleep(1200); r.cutEnd();
  await r.hold(0.8);
  await r.zoom({ cx: 768, cy: 300 }, 1.3, 2.2);
  await s10;
  await r.scrollToEl("a[href='#tokens']", 430, 1200);
  await r.hold(0.4);
  await r.click("a[href='#tokens']", 900).catch(() => log("WARN tokens tab"));
  await r.hold(1.0);
  r.stat("Token transfer", 0, 5, "USDC", "Vault → creator, same tx", 1.4);
  await r.zoom({ cx: 768, cy: 190 }, 1.45, 3.4);
  await r.hold(0.6);
  // leaderboard
  const s11 = r.say("c11");
  await page.goto(SITE + "/leaderboard", { waitUntil: "domcontentloaded" });
  await page.mouse.move(r.cursor[0], r.cursor[1]);
  r.cutStart();
  await page.waitForSelector("ol a:has-text('Profile')", { timeout: 60000 });
  await page.waitForSelector("text=Demo Creator", { timeout: 60000 }).catch(() => {});
  await sleep(800); r.cutEnd();
  await r.hold(0.8);
  r.stat("Creator earned", 5, 10, "USDC", "Demo Creator · 2 approved clips", 1.4);
  await r.zoom("ol li >> nth=0", 1.3, 2.4);
  await r.click("ol a:has-text('Profile') >> nth=0", 900);
  await page.waitForSelector("text=/Total earned/i", { timeout: 60000 });
  await page.waitForSelector("text=Demo Creator", { timeout: 60000 }).catch(() => {});
  await r.hold(0.8);
  await r.zoom({ cx: 768, cy: 330 }, 1.3, 3.2);
  await s11;
  await r.hold(0.8);
  await r.end(); await ctx.close();
}

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  const which = (process.argv[2] ?? "all").split(",");
  const b = await launch();
  try {
    for (const [k, fn] of Object.entries({ a: sceneA, b: sceneB, c: sceneC, d: sceneD }) as [string, any][]) {
      if (which.includes("all") || which.includes(k)) { log("scene", k); await fn(b); }
    }
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
