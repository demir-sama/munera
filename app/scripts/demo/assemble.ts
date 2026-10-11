/**
 * Stitch scene clips (0.3s crossfades), mix Piper narration at each cue, encode the final MP4 + poster.
 *   pnpm tsx scripts/demo/assemble.ts [--silent]
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { AUDIO, WORK } from "./common";

const ORDER = ["intro", "prob", "how", "live_a", "live_b", "live_c", "live_d", "feat", "sec", "end"];
const XF = 0.3;
const silent = process.argv.includes("--silent");
const OUT = process.env.OUT ?? "/workspace/munera/assets/munera-demo.mp4";
const scenes = ORDER.map((n) => JSON.parse(fs.readFileSync(path.join(WORK, "scenes", n + ".json"), "utf8")));

const inputs: string[] = [];
scenes.forEach((s) => inputs.push("-i", s.file));
let fc = scenes.map((_, k) => `[${k}:v]scale=out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1[n${k}];`).join("");
let L = scenes[0].dur;
let prev = "[n0]";
const starts = [0];
for (let k = 1; k < scenes.length; k++) {
  const off = L - XF;
  starts.push(off);
  const lab = k === scenes.length - 1 ? "[vout]" : `[x${k}]`;
  fc += `${prev}[n${k}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}${lab};`;
  prev = lab;
  L = off + scenes[k].dur;
}
console.log("total duration", L.toFixed(2), "starts", starts.map((x) => x.toFixed(1)).join(" "));

// audio
const cueList: { id: string; g: number }[] = [];
scenes.forEach((s, k) => s.cues.forEach((c: any) => cueList.push({ id: c.id, g: starts[k] + c.t })));
fs.writeFileSync(path.join(WORK, "cues_global.json"), JSON.stringify(cueList, null, 1));
const aIn: string[] = [];
let amix = "";
if (!silent) {
  cueList.forEach((c, i) => {
    aIn.push("-i", path.join(AUDIO, c.id + ".wav"));
    const ms = Math.round((c.g + 0.1) * 1000);
    amix += `[${scenes.length + i}:a]aresample=48000,adelay=${ms}|${ms},volume=1.0[a${i}];`;
  });
  amix += cueList.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${cueList.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=9,apad=whole_dur=${L.toFixed(3)}[aout]`;
}
const filter = fc + amix;
const args = ["-y", "-v", "error", ...inputs, ...aIn, "-filter_complex", filter, "-map", "[vout]"];
if (!silent) args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k");
args.push("-t", L.toFixed(3), "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF ?? "21", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", OUT);
execFileSync("ffmpeg", args, { stdio: "inherit" });
const poster = OUT.replace(/\.mp4$/, "-poster.png");
execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "4.9", "-i", OUT, "-frames:v", "1", poster], { stdio: "inherit" });
console.log("wrote", OUT, (fs.statSync(OUT).size / 1e6).toFixed(1) + " MB");
