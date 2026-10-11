/**
 * Post-process a recorded live scene: drop cut intervals, zoom/pan (ffmpeg scale+crop, smooth), then composite the
 * deterministic overlay layer (captions, lower-third, stat callouts) rendered as a transparent PNG sequence.
 *   pnpm tsx scripts/demo/post.ts <live|dry> <a,b,c,d>
 */
import { chromium } from "playwright-core";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { LINES, WORK, audioDur } from "./common";

const mode = process.argv[2] ?? "live";
const names = (process.argv[3] ?? "a,b,c,d").split(",");
const FPS = 30;
const SCENES_DIR = path.join(WORK, "scenes");
fs.mkdirSync(SCENES_DIR, { recursive: true });
const textOf = (id: string) => LINES.find((l) => l.id === id)!.text;

export type Cues = { caps: any[]; titles: any[]; stats: any[] };

async function renderOverlay(cues: Cues, dur: number, outDir: string) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--font-render-hinting=none", "--disable-gpu"] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await pg.goto("file://" + path.join(__dirname, "overlay.html"));
  await pg.evaluate("window.ready");
  const N = Math.ceil(dur * FPS);
  let lastKey: string | null = null, lastFile = "";
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    const file = path.join(outDir, `${String(i).padStart(5, "0")}.png`);
    const key = (await pg.evaluate(([t, c]) => (window as any).ovKey(t, c), [t, cues] as any)) as string | null;
    if (key !== null && key === lastKey) { fs.copyFileSync(lastFile, file); continue; }
    await pg.evaluate(([t, c]) => (window as any).ovRender(t, c), [t, cues] as any);
    await pg.screenshot({ path: file, omitBackground: true });
    lastKey = key; lastFile = file;
  }
  await b.close();
  return N;
}

function smooth(a: number, d: number) { const x = `clip((t-${a.toFixed(3)})/${d},0,1)`; return `(${x}*${x}*(3-2*${x}))`; }

async function post(name: string) {
  const dir = path.join(WORK, mode, name);
  const mf = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const cuts: [number, number][] = mf.cuts;
  const tB: number = mf.tBegin;
  const xc = path.join(dir, "extracuts.json"); // optional [startSec, endSec] offsets from scene begin (output-time before other cuts)
  if (fs.existsSync(xc)) for (const [a, b] of JSON.parse(fs.readFileSync(xc, "utf8"))) cuts.push([tB + a, tB + b]);
  cuts.sort((x, y) => x[0] - y[0]);
  const cutBefore = (t: number) => cuts.reduce((s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0);
  const out = (t: number) => t - tB - cutBefore(t);
  // 1) frame durations, minus cuts
  const frames = mf.frames as { t: number; f: string }[];
  const lines: string[] = [];
  let total = 0;
  const kept: { f: string; d: number }[] = [];
  for (let i = 0; i < frames.length; i++) {
    const a = Math.max(frames[i].t, tB), b = i + 1 < frames.length ? frames[i + 1].t : mf.tEnd;
    const d = Math.max(0, out(b) - out(a));
    if (d > 0.0005) kept.push({ f: frames[i].f, d });
  }
  for (const k of kept) { lines.push(`file '${k.f}'`, `duration ${k.d.toFixed(5)}`); total += k.d; }
  lines.push(`file '${kept[kept.length - 1].f}'`);
  const list = path.join(dir, "list.txt");
  fs.writeFileSync(list, lines.join("\n"));
  const dur = Math.round(total * FPS) / FPS;
  console.log(name, "frames", kept.length, "duration", dur.toFixed(2));
  // 2) zoom filter
  const zs = (mf.events as any[]).filter((e) => e.type === "zoom").map((e) => ({ ...e, a: out(e.t0), b: out(e.t1) }));
  const D = 0.8;
  let envs = zs.map((z) => `(${smooth(z.a, D)}-${smooth(z.b, D)})`);
  const zExpr = zs.length ? "(1" + zs.map((z, i) => `+${(z.z - 1).toFixed(3)}*${envs[i]}`).join("") + ")" : "1";
  const cxExpr = zs.length ? "(960" + zs.map((z, i) => `+(${z.cx.toFixed(1)}-960)*${envs[i]}`).join("") + ")" : "960";
  const cyExpr = zs.length ? "(540" + zs.map((z, i) => `+(${z.cy.toFixed(1)}-540)*${envs[i]}`).join("") + ")" : "540";
  const filt = `fps=${FPS},scale=w='trunc(1920*${zExpr}/2)*2':h='trunc(1080*${zExpr}/2)*2':eval=frame:flags=bicubic,crop=w=1920:h=1080:x='clip(${cxExpr}*${zExpr}-960,0,iw-1920)':y='clip(${cyExpr}*${zExpr}-540,0,ih-1080)',format=yuv420p`;
  const fscript = path.join(dir, "zoom.txt");
  fs.writeFileSync(fscript, filt);
  const base = path.join(dir, "base.mp4");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-/filter:v", fscript, "-t", dur.toFixed(3), "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p", base], { stdio: "inherit" });
  // 3) cues
  const evs = mf.events as any[];
  const capEvs = evs.filter((e) => e.type === "cap");
  const caps = capEvs.map((e, i) => {
    const s = out(e.t);
    const natural = s + audioDur(e.id) + 0.6;
    const next = capEvs[i + 1] ? out(capEvs[i + 1].t) - 0.05 : dur;
    return { id: e.id, text: textOf(e.id), s, e: Math.min(Math.max(natural, s + 1.5), next, dur) };
  });
  const titles = evs.filter((e) => e.type === "title").map((e) => ({ num: e.num, text: e.text, s: out(e.t), e: out(e.t) + 3.8 }));
  const stats = evs.filter((e) => e.type === "stat").map((e) => ({ label: e.label, from: e.from, to: e.to, unit: e.unit, sub: e.sub, dur: e.dur ?? 1.4, s: out(e.t), e: out(e.t) + 0.35 + (e.dur ?? 1.4) + 2.0 }));
  const cues: Cues = { caps, titles, stats };
  fs.writeFileSync(path.join(dir, "cues.json"), JSON.stringify(cues, null, 1));
  // 4) overlay + composite
  const ovDir = path.join(dir, "ov");
  await renderOverlay(cues, dur, ovDir);
  const outFile = path.join(SCENES_DIR, `live_${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", base, "-framerate", String(FPS), "-i", path.join(ovDir, "%05d.png"), "-filter_complex", "[0:v][1:v]overlay=format=auto:shortest=1,format=yuv420p", "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", outFile], { stdio: "inherit" });
  fs.writeFileSync(path.join(SCENES_DIR, `live_${name}.json`), JSON.stringify({ file: outFile, dur, cues: caps.map((c) => ({ id: c.id, t: c.s })) }));
  console.log("wrote", outFile);
}

(async () => { for (const n of names) await post(n); })().catch((e) => { console.error(e); process.exit(1); });
