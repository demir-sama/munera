/**
 * Headless-browser e2e + screenshots against a local validator (seeded by seed-local.ts) and a running app.
 * A fake Phantom provider is injected into the page; signing happens in node via page.exposeFunction.
 *   APP_URL=http://localhost:3100 pnpm tsx scripts/e2e.ts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { Keypair, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.resolve(__dirname, "../../screenshots");
const seed = JSON.parse(fs.readFileSync("/tmp/munera-seed.json", "utf8"));
const sponsor = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8"))));
const creators = (seed.creators as number[][]).map((s) => Keypair.fromSecretKey(Uint8Array.from(s)));

function initScript(pk: number[], b58: string) {
  return `(() => {
    const PK = ${JSON.stringify(pk)}; const B58 = ${JSON.stringify(b58)};
    const listeners = {};
    const pub = { toBytes: () => Uint8Array.from(PK), toString: () => B58, toBase58: () => B58 };
    const provider = {
      isPhantom: true, isConnected: false, publicKey: null,
      connect: async function () { this.publicKey = pub; this.isConnected = true; (listeners.connect||[]).forEach(f=>f(pub)); return { publicKey: pub }; },
      disconnect: async function () { this.publicKey = null; this.isConnected = false; (listeners.disconnect||[]).forEach(f=>f()); },
      on: (e, f) => { (listeners[e] = listeners[e] || []).push(f); },
      off: (e, f) => { listeners[e] = (listeners[e]||[]).filter(x => x !== f); },
      removeListener: (e, f) => { listeners[e] = (listeners[e]||[]).filter(x => x !== f); },
      signTransaction: async function (tx) {
        const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        let s = ''; bytes.forEach(b => s += String.fromCharCode(b));
        const sigB64 = await window.__signTx(btoa(s));
        const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        tx.addSignature(tx.feePayer, sig);
        return tx;
      },
      signAllTransactions: async function (txs) { return Promise.all(txs.map(t => this.signTransaction(t))); },
      signMessage: async () => { throw new Error('unsupported'); },
    };
    window.isPhantomInstalled = true; window.phantom = { solana: provider }; window.solana = provider;
    localStorage.setItem('walletName', JSON.stringify('Phantom'));
  })();`;
}

async function newCtx(browser: Browser, kp?: Keypair): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  if (kp) {
    await ctx.exposeFunction("__signTx", (b64: string) => {
      const tx = Transaction.from(Buffer.from(b64, "base64"));
      tx.partialSign(kp);
      const entry = tx.signatures.find((s) => s.publicKey.equals(kp.publicKey))!;
      return Buffer.from(entry.signature!).toString("base64");
    });
    await ctx.addInitScript(initScript(Array.from(kp.publicKey.toBytes()), kp.publicKey.toBase58()));
  }
  return ctx;
}

const shot = async (page: Page, name: string, full = true) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  console.log("shot", name);
};
const log = (...a: unknown[]) => console.log("•", ...a);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  const errors: string[] = [];
  const watch = (p: Page, tag: string) => {
    p.on("pageerror", (e) => errors.push(`[${tag}] pageerror ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`[${tag}] console ${m.text().slice(0, 200)}`); });
  };

  // ---- 1. Disconnected visitor ----
  let ctx = await newCtx(browser);
  let page = await ctx.newPage(); watch(page, "visitor");
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Best 30-second product clip");
  await shot(page, "home");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "home-mobile", false);
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto(`${APP}/create`, { waitUntil: "networkidle" });
  await shot(page, "create-disconnected");
  await page.goto(`${APP}/bounty/${seed.bounties.b1}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Submissions");
  await page.waitForSelector("text=View payout tx");
  await shot(page, "bounty-visitor");
  await page.goto(`${APP}/payments`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tx ");
  await shot(page, "payments");
  const txLinks = await page.$$eval("a[href*='explorer.solana.com/tx/']", (as) => as.map((a) => (a as HTMLAnchorElement).href));
  log("payments tx links", txLinks.length, txLinks[0]);
  if (txLinks.length < 2) throw new Error("expected 2 payout tx links");
  await page.goto(`${APP}/payments?bounty=${seed.bounties.b1}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tx ");
  const filtered = await page.$$eval("a[href*='explorer.solana.com/tx/']", (as) => as.length);
  log("filtered payments rows", filtered);
  if (filtered !== 1) throw new Error("filter failed");
  await ctx.close();

  // ---- 2. Sponsor: seeded bounty views ----
  ctx = await newCtx(browser, sponsor);
  page = await ctx.newPage(); watch(page, "sponsor");
  await page.goto(`${APP}/bounty/${seed.bounties.b1}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Approve & pay");
  await shot(page, "bounty-sponsor");
  await page.goto(`${APP}/bounty/${seed.bounties.b3}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Reclaim unspent", { timeout: 5000 }).catch(() => log("b3 already reclaimed (re-run)"));
  await shot(page, "bounty-expired-sponsor");

  // ---- 3. Create a bounty through the UI ----
  await page.goto(`${APP}/create`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=1,", { timeout: 20000 }).catch(() => {});
  await page.fill("#title", "E2E: Remix our anthem");
  await page.fill("#desc", "Create a remix of the Munera anthem. Playwright-created bounty.");
  await page.fill("#reward", "7.5");
  await page.fill("#winners", "2");
  await shot(page, "create-sponsor");
  await page.click("text=Lock funds & create bounty");
  await page.waitForURL(/\/bounty\//, { timeout: 30000 });
  const newUrl = page.url();
  await page.waitForSelector("text=E2E: Remix our anthem");
  log("created bounty", newUrl);
  await shot(page, "bounty-created");
  const vaultText = await page.textContent("text=In vault now");
  log(vaultText);
  if (!/15\.00/.test(vaultText ?? "")) throw new Error("vault should hold 15.00");
  await ctx.close();

  // ---- 4. Creator submits ----
  ctx = await newCtx(browser, creators[3]);
  page = await ctx.newPage(); watch(page, "creator");
  await page.goto(newUrl, { waitUntil: "networkidle" });
  await page.fill("#link", "not a url");
  await page.click("text=Submit entry");
  await page.waitForSelector("text=Enter a valid URL");
  await page.fill("#link", "https://x.com/remixer/status/42");
  await page.click("text=Submit entry");
  await page.waitForSelector("text=https://x.com/remixer/status/42");
  await page.waitForSelector("text=You");
  log("creator submitted");
  await shot(page, "bounty-creator-submitted");
  // duplicate: the form is replaced by a notice
  await page.waitForSelector("text=already entered");
  await ctx.close();

  // ---- 5. Sponsor approves ----
  ctx = await newCtx(browser, sponsor);
  page = await ctx.newPage(); watch(page, "sponsor2");
  await page.goto(newUrl, { waitUntil: "networkidle" });
  await page.click("text=Approve & pay");
  await page.waitForSelector("text=Paid 7.50 USDC", { timeout: 30000 });
  await page.waitForSelector("text=View payout tx");
  log("approved & paid");
  await shot(page, "bounty-approved");
  await page.goto(`${APP}/payments`, { waitUntil: "networkidle" });
  await page.waitForSelector("a:has-text('E2E: Remix our anthem')");
  await shot(page, "payments-after");
  // reclaim on expired bounty b3
  await page.goto(`${APP}/bounty/${seed.bounties.b3}`, { waitUntil: "networkidle" });
  if (await page.$("button:has-text(\"Reclaim unspent\")")) await page.click("button:has-text(\"Reclaim unspent\")");
  await page.waitForSelector("text=This bounty is closed", { timeout: 30000 });
  log("reclaimed b3");
  await shot(page, "bounty-closed");
  await ctx.close();

  // ---- 6. Wallet without USDC ----
  ctx = await newCtx(browser, Keypair.generate());
  page = await ctx.newPage(); watch(page, "nousdc");
  await page.goto(`${APP}/create`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=has no USDC yet");
  await page.click("text=Copy wallet address");
  await page.waitForSelector("text=yarn mint-to");
  await shot(page, "create-no-usdc");
  await ctx.close();

  await browser.close();
  console.log(errors.length ? "BROWSER ERRORS:\n" + errors.join("\n") : "no browser errors");
  console.log("E2E OK");
}
main().catch((e) => { console.error("E2E FAILED", e); process.exit(1); });
