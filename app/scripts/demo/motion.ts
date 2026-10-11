/**
 * Renders the motion-graphics scenes (HTML/SVG + Playwright frame stream -> ffmpeg).
 *   pnpm tsx scripts/demo/motion.ts <intro,prob,how,feat,sec,end|all> [still:<t>]
 */
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { LINES, WORK, audioDur } from "./common";

const FPS = 30;
const textOf = (id: string) => LINES.find((l) => l.id === id)!.text;
type Cfg = { dur: number; cues: [string, number][]; nocap?: string[] };
export const CFG: Record<string, Cfg> = {
  intro: { dur: 9.5, cues: [["i1", 2.3]], nocap: ["i1"] },
  prob: { dur: 13.9, cues: [["p1", 0.4], ["p2", 2.4], ["p3", 4.2], ["p4", 9.5]] },
  how: { dur: 15.7, cues: [["h0", 0.2], ["h1", 1.1], ["h2", 4.3], ["h3", 6.8], ["h4", 9.4]] },
  feat: { dur: 16.0, cues: [["f1", 0.3], ["f2", 3.5], ["f3", 7.3], ["f4", 10.9]] },
  sec: { dur: 15.6, cues: [["s1", 0.3], ["s2", 4.9], ["s3", 8.8]] },
  end: { dur: 11.0, cues: [["e1", 1.9], ["c12", 4.6]] },
};
const SC = path.join(WORK, "scenes");

(async () => {
  fs.mkdirSync(SC, { recursive: true });
  const args = process.argv.slice(2);
  const which = (args[0] ?? "all") === "all" ? Object.keys(CFG) : args[0].split(",");
  const still = args[1]?.startsWith("still:") ? args[1].slice(6).split(",").map(Number) : null;
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--font-render-hinting=none", "--disable-gpu", "--allow-file-access-from-files"] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await pg.goto("file://" + path.join(__dirname, "motion.html"));
  await pg.evaluate("window.ready");
  for (const name of which) {
    const c = CFG[name];
    const caps = c.cues.filter(([id]) => !(c.nocap ?? []).includes(id)).map(([id, s], i, arr) => ({ id, text: textOf(id), s, e: Math.min(s + audioDur(id) + 0.6, arr[i + 1] ? arr[i + 1][1] - 0.05 : c.dur) }));
    const cues = { caps, titles: [], stats: [] };
    if (still) { for (const t of still) { await pg.evaluate(([n, t, cu]) => (window as any).render(n, t, cu), [name, t, cues] as any); await pg.screenshot({ path: `/tmp/m_${name}_${t}.png` }); } continue; }
    const out = path.join(SC, `${name}.mp4`);
    const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", String(FPS), out], { stdio: ["pipe", "inherit", "inherit"] });
    const N = Math.round(c.dur * FPS);
    for (let i = 0; i < N; i++) {
      await pg.evaluate(([n, t, cu]) => (window as any).render(n, t, cu), [name, i / FPS, cues] as any);
      const buf = await pg.screenshot({ type: "png" });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    fs.writeFileSync(path.join(SC, `${name}.json`), JSON.stringify({ file: out, dur: N / FPS, cues: c.cues.map(([id, t]) => ({ id, t })) }));
    console.log("rendered", name);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
