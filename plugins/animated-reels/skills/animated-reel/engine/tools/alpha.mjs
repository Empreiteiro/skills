#!/usr/bin/env node
// Cleans the haze and halo off a transparent PNG. Generated characters come out with a haze around them (pixels
// neither opaque nor transparent) that turns into a glow on top of a painted plate. Here:
//   1. the core is whatever has alpha ≥ 0.6; core islands smaller than --island px (a stray dot near a boot) go;
//   2. away from the core (more than --radius px) faint haze fades out on a smooth curve (alpha < 0.12 goes to zero,
//      above 0.35 it stays): glow painted on purpose (a lamp, steam) survives, with no jagged edge; with --cut
//      everything away from the core turns transparent (flat linework: doodle, editorial);
//   3. the edge next to the core (where alpha drops in a steep step) hardens, so the ramp gets short, and with --cut
//      it becomes a hard ~1 px cut; inside a soft gradient nothing hardens;
//   4. that edge takes the colour of the nearest core pixel (defringe): the light or dark halo goes.
// Prints the haze before and after (the fraction of pixels with 0.03 < alpha < 0.6, the same metric pose.mjs checks),
// plus the corners and the transparent fraction.
//
//   node tools/alpha.mjs <in.png> <out.png> [--cut] [--radius 3] [--island 24]
// Needs ImageMagick 7 (`magick`) to read and write the PNG.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const pos = [];
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--cut') continue; if (argv[i] === '--radius' || argv[i] === '--island') { i++; continue; } pos.push(argv[i]); }
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const [inp, outp] = pos;
if (!inp || !outp) { console.log('usage: node tools/alpha.mjs <in.png> <out.png> [--cut] [--radius 3] [--island 24]'); process.exit(2); }
const CUT = argv.includes('--cut'), RADIUS = Number(flag('radius', 3)), ISLAND = Number(flag('island', 24));

function magick(args, opts = {}) {
  try { return execFileSync('magick', args, opts); } catch (e) {
    if (e.code === 'ENOENT') { console.error('ImageMagick 7 (`magick`) is required: https://imagemagick.org/script/download.php'); process.exit(1); }
    throw e;
  }
}

/** Corners, transparent fraction and haze, measured with ImageMagick. */
function check(file) {
  const c = magick([file, '-format', '%[fx:p{0,0}.a] %[fx:p{w-1,0}.a] %[fx:p{0,h-1}.a] %[fx:p{w-1,h-1}.a]', 'info:'], { encoding: 'utf8' });
  const corners = c.trim().split(/\s+/).map(Number);
  const transparent = Number(magick([file, '-alpha', 'extract', '-threshold', '2%', '-negate', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' }).trim());
  const haze = Number(magick([file, '-alpha', 'extract', '-fx', '(u>0.03 && u<0.6) ? 1 : 0', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' }).trim());
  const r3 = x => Math.round(x * 1000) / 1000;
  return { corners, transparent: r3(transparent), haze: r3(haze), hazePct: (haze * 100).toFixed(2) + '%', ok: corners.every(a => a < 0.05) && transparent > 0.08 && haze < 0.06 };
}

const [W, H] = magick(['identify', '-format', '%w %h', inp + '[0]'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
const raw = magick([inp + '[0]', '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 30 });
const N = W * H, px = Buffer.from(raw);
const A = new Uint8Array(N);
for (let i = 0; i < N; i++) A[i] = px[i * 4 + 3];
const before = check(inp);

// 1. core and islands
const CORE = 153;   // 0.6
const core = new Uint8Array(N);
for (let i = 0; i < N; i++) core[i] = A[i] >= CORE ? 1 : 0;
const seen = new Uint8Array(N), stack = new Int32Array(N);
let islands = 0;
for (let i = 0; i < N; i++) {
  if (!core[i] || seen[i]) continue;
  let top = 0, n = 0;
  const members = [];
  stack[top++] = i; seen[i] = 1;
  while (top) {
    const j = stack[--top]; n++; if (n <= ISLAND) members.push(j);
    const x = j % W, y = (j / W) | 0;
    if (x > 0 && core[j - 1] && !seen[j - 1]) { seen[j - 1] = 1; stack[top++] = j - 1; }
    if (x < W - 1 && core[j + 1] && !seen[j + 1]) { seen[j + 1] = 1; stack[top++] = j + 1; }
    if (y > 0 && core[j - W] && !seen[j - W]) { seen[j - W] = 1; stack[top++] = j - W; }
    if (y < H - 1 && core[j + W] && !seen[j + W]) { seen[j + W] = 1; stack[top++] = j + W; }
  }
  if (n < ISLAND) { for (const j of members) core[j] = 0; islands++; }
}

// 2. distance to the core (BFS up to RADIUS), carrying the source core pixel along (for the defringe)
const dist = new Int16Array(N).fill(-1), source = new Int32Array(N).fill(-1), queue = new Int32Array(N);
let qa = 0, qb = 0;
for (let i = 0; i < N; i++) if (core[i]) { dist[i] = 0; source[i] = i; queue[qb++] = i; }
while (qa < qb) {
  const j = queue[qa++], d = dist[j];
  if (d >= RADIUS) continue;
  const x = j % W, y = (j / W) | 0;
  for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
    if (k < 0 || dist[k] !== -1) continue;
    dist[k] = d + 1; source[k] = source[j]; queue[qb++] = k;
  }
}

// 3 and 4. new alpha and edge colour
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// a real edge = alpha with a steep step (≥ 0.12 per px); inside a soft gradient (glow, steam) the gradient is small
// and nothing there hardens or changes colour
const edgeStep = i => { const a = A[i], x = i % W; let g = 0;
  if (x > 0) g = Math.max(g, Math.abs(a - A[i - 1])); if (x < W - 1) g = Math.max(g, Math.abs(a - A[i + 1]));
  if (i >= W) g = Math.max(g, Math.abs(a - A[i - W])); if (i < N - W) g = Math.max(g, Math.abs(a - A[i + W]));
  return g / 255; };
let cleared = 0;
for (let i = 0; i < N; i++) {
  const a = A[i] / 255;
  let na, edge = false;
  if (core[i]) na = CUT ? 1 : a;
  else if (CUT) { na = dist[i] > 0 ? ss(0.35, 0.65, a) : 0; edge = dist[i] > 0; }
  else if (dist[i] > 0 && edgeStep(i) >= 0.12) { na = Math.min(1, Math.max(0, (a - 0.1) / 0.5)); edge = true; }
  else na = a * ss(0.12, 0.35, a);
  if (A[i] > 0 && na < A[i] / 255 - 0.02 && !core[i]) cleared++;
  const o = i * 4;
  if (edge && na > 0 && na < 1 && source[i] >= 0 && source[i] !== i) { const f = source[i] * 4; px[o] = px[f]; px[o + 1] = px[f + 1]; px[o + 2] = px[f + 2]; }
  if (na === 0) { px[o] = px[o + 1] = px[o + 2] = 0; }
  px[o + 3] = Math.round(na * 255);
}
fs.mkdirSync(path.dirname(path.resolve(outp)), { recursive: true });
magick(['-size', `${W}x${H}`, '-depth', '8', 'rgba:-', 'PNG32:' + outp], { input: px, maxBuffer: 1 << 30 });
const after = check(outp);
console.log(`${path.basename(inp)} → ${path.basename(outp)} (${W}×${H}${CUT ? ', hard cut' : ''}, radius ${RADIUS}, island ${ISLAND})`);
console.log(`  haze    before ${before.hazePct}  after ${after.hazePct}`);
console.log(`  transp. before ${before.transparent}  after ${after.transparent} · corners ${after.corners.join(' ')} · ok ${before.ok} → ${after.ok}`);
console.log(`  ${cleared} semi-transparent px cleared or lightened · ${islands} island(s) < ${ISLAND} px removed`);
