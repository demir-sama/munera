/** Shared helpers for the demo-video recorder (headless Chromium + CDP screencast, real devnet keypairs). */
import { chromium, type Browser, type BrowserContext, type Page, type CDPSession } from "playwright-core";
import { Keypair, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const SITE = process.env.SITE ?? "https://munera-opal.vercel.app";
export const WORK = process.env.WORK ?? "/workspace/demo-work";
export const AUDIO = path.join(WORK, "audio");
export const LINES: { id: string; text: string }[] = JSON.parse(fs.readFileSync(path.join(__dirname, "lines.json"), "utf8"));
export const DSF = Number(process.env.DSF ?? 1.25);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function loadKp(file: string, idx?: number): Keypair {
  const j = JSON.parse(fs.readFileSync(file.replace("~", os.homedir()), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(idx === undefined ? j : j[idx]));
}
export const sponsorKp = () => loadKp("~/.config/solana/id.json");
export const creatorKp = (i = 0) => loadKp("~/.config/solana/munera-demo-creators.json", i);

export function audioDur(id: string): number {
  const f = path.join(AUDIO, `${id}.wav`);
  const b = fs.readFileSync(f); // PCM wav: use header sample rate/byte rate
  const byteRate = b.readUInt32LE(28);
  return (b.length - 44) / byteRate;
}

function walletInit(pk: number[], b58: string) {
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

/** Cursor + click-ripple overlay (lives in the page so it is captured; zoomed together with the content). */
const CURSOR_INIT = `(() => {
  if (window.__mnCursor) return; window.__mnCursor = true;
  const mk = () => {
    if (!document.documentElement) return;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' +
      '.c{position:fixed;left:0;top:0;width:34px;height:34px;margin:-3px 0 0 -3px;display:none;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35));will-change:transform}' +
      '.r{position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(18,55,143,.28);border:3px solid #12378F;opacity:0;pointer-events:none}' +
      '.r.go{animation:rip .65s ease-out}' +
      '@keyframes rip{0%{opacity:.95;transform:scale(.5)}100%{opacity:0;transform:scale(4.2)}}' +
      '</style>' +
      '<svg class="c" viewBox="0 0 24 24"><path d="M3 2 L3 19.5 L7.6 15.4 L10.6 22 L13.4 20.8 L10.5 14.3 L16.6 14.1 Z" fill="#fff" stroke="#0A0A0A" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<div class="r"></div>';
    document.documentElement.appendChild(host);
    const c = root.querySelector('.c'), r = root.querySelector('.r');
    const set = (x, y) => { c.style.display = 'block'; c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; r.style.transform = 'translate(' + x + 'px,' + y + 'px)'; window.__mnPos = [x, y]; };
    addEventListener('mousemove', (e) => set(e.clientX, e.clientY), true);
    addEventListener('mousedown', (e) => { set(e.clientX, e.clientY); r.style.left = '0'; r.classList.remove('go'); void r.getBoundingClientRect(); r.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; r.classList.add('go'); c.style.transition = 'transform 0s'; }, true);
  };
  if (document.documentElement) mk(); else document.addEventListener('DOMContentLoaded', mk);
  const css = () => {};
  if (document.head) css(); else document.addEventListener('DOMContentLoaded', css);
})();`;

export async function newCtx(browser: Browser, kp?: Keypair): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: Math.round(1920 / DSF), height: Math.round(1080 / DSF) }, deviceScaleFactor: DSF, bypassCSP: true, locale: "en-US" });
  if (kp) {
    await ctx.exposeFunction("__signTx", (b64: string) => {
      const tx = Transaction.from(Buffer.from(b64, "base64"));
      tx.partialSign(kp);
      const entry = tx.signatures.find((s) => s.publicKey.equals(kp.publicKey))!;
      return Buffer.from(entry.signature!).toString("base64");
    });
    await ctx.addInitScript(walletInit(Array.from(kp.publicKey.toBytes()), kp.publicKey.toBase58()));
  }
  await ctx.addInitScript(CURSOR_INIT);
  return ctx;
}

export async function launch(): Promise<Browser> {
  return chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--font-render-hinting=none", "--hide-scrollbars", "--disable-gpu", "--disable-smooth-scrolling"] });
}

export type Ev =
  | { type: "cap"; id: string; t: number }
  | { type: "title"; num: string; text: string; t: number }
  | { type: "stat"; label: string; from: number; to: number; unit: string; sub?: string; t: number; dur?: number }
  | { type: "zoom"; cx: number; cy: number; z: number; t0: number; t1: number };

/** Records a page via CDP screencast (JPEG frames + timestamps) and logs timeline events. All event times are wall-clock secs. */
export class Rec {
  frames: { t: number; f: string }[] = [];
  events: Ev[] = [];
  cuts: [number, number][] = [];
  private cutOpen: number | null = null;
  private cdp!: CDPSession;
  private n = 0;
  private running = false;
  private loop: Promise<void> | null = null;
  private tBegin = 0;
  cursor: [number, number] = [768, 432];
  constructor(public page: Page, public dir: string, public name: string) {}
  async begin() {
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.running = true;
    this.loop = (async () => {
      while (this.running) {
        const t = Date.now() / 1000;
        try {
          const r: any = await Promise.race([
            this.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, optimizeForSpeed: true }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("shot timeout")), 4000)),
          ]);
          const f = `${this.dir}/${String(this.n++).padStart(6, "0")}.jpg`;
          fs.writeFileSync(f, Buffer.from(r.data, "base64"));
          this.frames.push({ t: (t + Date.now() / 1000) / 2, f });
        } catch {
          await sleep(100);
          try { this.cdp = await this.page.context().newCDPSession(this.page); } catch { /* retry */ }
        }
      }
    })();
    this.tBegin = Date.now() / 1000;
    await this.page.mouse.move(this.cursor[0], this.cursor[1]); // paints the cursor + forces a first frame
    await sleep(250);
  }
  now() { return Date.now() / 1000; }
  /** seconds of *output* time elapsed since begin (wall time minus cuts) */
  outNow() {
    let cut = 0;
    for (const [a, b] of this.cuts) cut += b - a;
    if (this.cutOpen !== null) cut += this.now() - this.cutOpen;
    return this.now() - this.tBegin - cut;
  }
  cutStart() { if (this.cutOpen === null) this.cutOpen = this.now(); }
  cutEnd() { if (this.cutOpen !== null) { this.cuts.push([this.cutOpen, this.now()]); this.cutOpen = null; } }
  /** hold for `s` seconds of output time */
  async hold(s: number) { const end = this.outNow() + s; while (this.outNow() < end) await sleep(40); }
  /** caption + narration cue; resolves when narration (+ small tail) is over */
  say(id: string, tail = 0.45): Promise<void> {
    const t = this.now();
    this.events.push({ type: "cap", id, t });
    const end = this.outNow() + audioDur(id) + tail;
    return (async () => { while (this.outNow() < end) await sleep(40); })();
  }
  title(num: string, text: string) { this.events.push({ type: "title", num, text, t: this.now() }); }
  stat(label: string, from: number, to: number, unit: string, sub?: string, dur = 1.4) { this.events.push({ type: "stat", label, from, to, unit, sub, t: this.now(), dur }); }
  /** smooth glide of the pointer */
  async glide(x: number, y: number, ms = 800) {
    const [x0, y0] = this.cursor;
    const steps = Math.max(8, Math.round(ms / 16));
    const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const t0 = Date.now();
    for (let i = 1; i <= steps; i++) {
      const u = ease(i / steps);
      await this.page.mouse.move(x0 + (x - x0) * u, y0 + (y - y0) * u);
      const wait = t0 + (ms * i) / steps - Date.now();
      if (wait > 0) await sleep(wait);
    }
    this.cursor = [x, y];
  }
  async center(sel: string) {
    const loc = this.page.locator(sel).first();
    await loc.waitFor({ state: "visible", timeout: 60000 });
    const b = (await loc.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
  }
  async moveTo(sel: string, ms = 800, dx = 0, dy = 0) { const c = await this.center(sel); await this.glide(c.x + dx, c.y + dy, ms); return c; }
  async click(sel: string, ms = 800) { await this.moveTo(sel, ms); await sleep(120); await this.page.mouse.down(); await sleep(70); await this.page.mouse.up(); await sleep(150); }
  async type(sel: string, text: string, delay = 60) { await this.click(sel, 650); await this.page.keyboard.press("Control+A"); await this.page.keyboard.type(text, { delay }); }
  async scroll(y: number, ms = 1400) {
    // real wheel input (compositor-driven scrolling renders cleanly in headless); eased velocity
    const y0 = await this.page.evaluate("scrollY") as number;
    const max = (await this.page.evaluate("document.documentElement.scrollHeight - innerHeight")) as number;
    const target = Math.max(0, Math.min(max, y));
    const total = target - y0;
    if (Math.abs(total) < 1) return;
    const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const steps = Math.max(10, Math.round(ms / 20));
    let done = 0; const t0 = Date.now();
    await this.page.mouse.move(this.cursor[0], this.cursor[1]);
    for (let i = 1; i <= steps; i++) {
      const want = total * ease(i / steps);
      const d = want - done;
      if (Math.abs(d) >= 0.5) { await this.page.mouse.wheel(0, d); done += d; }
      const wait = t0 + (ms * i) / steps - Date.now();
      if (wait > 0) await sleep(wait);
    }
    await sleep(120);
  }
  /** force a clean repaint after client-side navigation */
  async settle() {
    await this.page.evaluate("window.scrollTo(0, 0)");
    await sleep(120);
    await this.page.evaluate("document.body.style.transform='translateZ(0)';requestAnimationFrame(()=>{document.body.style.transform=''})");
    await sleep(350);
  }
  async scrollToEl(sel: string, offset = 140, ms = 1400) {
    const y = await this.page.locator(sel).first().evaluate((el, o) => el.getBoundingClientRect().top + window.scrollY - o, offset);
    await this.scroll(Math.max(0, y), ms);
  }
  /** smooth zoom into a region for `holdS` output seconds (zoom events are resolved in post) */
  async zoom(target: string | { cx: number; cy: number }, z: number, holdS: number) {
    let cx: number, cy: number;
    if (typeof target === "string") { const c = await this.center(target); cx = c.x; cy = c.y; } else { cx = target.cx; cy = target.cy; }
    const t0 = this.now();
    await this.hold(holdS);
    this.events.push({ type: "zoom", cx: cx * DSF, cy: cy * DSF, z, t0, t1: this.now() });
  }
  async end(note = "") {
    await sleep(350);
    this.running = false; await this.loop;
    const tEnd = this.now();
    // map to a manifest
    const mf = { name: this.name, tBegin: this.tBegin, tEnd, frames: this.frames, events: this.events, cuts: this.cuts, note };
    fs.writeFileSync(path.join(this.dir, "manifest.json"), JSON.stringify(mf));
    return mf;
  }
}

export async function gotoReady(page: Page, url: string, readySel: string, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector(readySel, { timeout: 45000 });
      return;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2500);
    }
  }
}
