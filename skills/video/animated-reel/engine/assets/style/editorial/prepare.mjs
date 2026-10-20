#!/usr/bin/env node
// Image preparation for the editorial style. A generated image (tools/pose.mjs or tools/plate.mjs) becomes a clean
// scene piece, ready for the img item:
//   1. hard alpha cut (tools/alpha.mjs --cut): dip-pen linework is flat, and the haze around it would glow on paper;
//   2. removes the MARKS the model bakes around the figure (style_en asks for "proofreader's marks drawn around the
//      figure", and the model draws them even when the scene says not to): in the video they are drawn live by the
//      stroke item, and a baked copy sits still and fights the live one. First the THIN BLUE strokes outside the body
//      mass go (the ring around the hips, the halo around the head, which touch the body); then the loose islands:
//      what stays is the main body (the largest opaque piece), whatever touches it (within --touch px: an earring, a
//      pencil in a bun) and every piece at least --large times the body's size (a second large object);
//   3. --paper (opaque plate): the paper cream turns transparent and only the drawing is left, so the plate sits on
//      the page like a magazine vignette, with no rectangle of paper in another tone;
//   4. crops the transparent surplus, leaving --margin px (smaller file, faster decode).
//
//   node assets/style/editorial/prepare.mjs <in.png> <out.png> [--marks keep] [--paper] [--margin 24]
//        [--touch 14] [--large 0.25] [--thin 5] [--ring [x,y,w,h]] [--retouch x,y,w,h ...] [--no-cut]
//   --thin 0 turns off the thin-blue-stroke pass (use it on a pose where a thin blue detail sits OUTSIDE the body).
// Needs ImageMagick 7 (`magick`) to read and write the PNG.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const argv = process.argv.slice(2);
const has = n => argv.includes(`--${n}`);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { if (['marks', 'margin', 'touch', 'large', 'thin', 'retouch'].includes(argv[i].slice(2)) || (argv[i] === '--ring' && /^\d+,\d+,\d+,\d+$/.test(argv[i + 1] || ''))) i++; continue; }
  pos.push(argv[i]);
}
const [inp, outp] = pos;
if (!inp || !outp) { console.log('usage: node assets/style/editorial/prepare.mjs <in.png> <out.png> [--marks keep] [--paper] [--margin 24] [--touch 14] [--large 0.25] [--thin 5] [--ring [x,y,w,h]] [--retouch x,y,w,h ...] [--no-cut]'); process.exit(2); }
const REMOVE_MARKS = flag('marks', 'remove') !== 'keep', PAPER = has('paper'), MARGIN = Number(flag('margin', 24));
const TOUCH = Number(flag('touch', 14)), LARGE = Number(flag('large', 0.25));
const PAPER_RGB = [0xf4, 0xee, 0xe4];

function magick(args, opts = {}) {
  try { return execFileSync('magick', args, opts); } catch (e) {
    if (e.code === 'ENOENT') { console.error('ImageMagick 7 (`magick`) is required: https://imagemagick.org/script/download.php'); process.exit(1); }
    throw e;
  }
}

magick(['-version'], { stdio: 'ignore' });   // fail early, with the message above, when ImageMagick is missing
const tmp = path.join(os.tmpdir(), `prepare-${process.pid}.png`);
let source = path.resolve(inp);
// 1. hard cut (a --paper plate is opaque: there is nothing for the cut to do)
if (!has('no-cut') && !PAPER) {
  const r = execFileSync(process.execPath, [path.join(ROOT, 'tools/alpha.mjs'), source, tmp, '--cut'], { encoding: 'utf8' });
  process.stdout.write(r.split('\n').filter(l => /^\s*haze/.test(l)).map(l => '  alpha: ' + l.trim()).join('\n') + '\n');
  source = tmp;
}
const [W, H] = magick(['identify', '-format', '%w %h', source + '[0]'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
const px = Buffer.from(magick([source + '[0]', '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 30 }));
const N = W * H;

// 3. paper → transparent (before the islands: the plate's drawing becomes islands over nothing)
if (PAPER) {
  for (let i = 0; i < N; i++) {
    const o = i * 4, d = Math.max(Math.abs(px[o] - PAPER_RGB[0]), Math.abs(px[o + 1] - PAPER_RGB[1]), Math.abs(px[o + 2] - PAPER_RGB[2]));
    // up to 14 away is paper (the fibre the model paints), from 46 on it is ink; in between, a smooth ramp
    const t = Math.min(1, Math.max(0, (d - 14) / 32)), a = t * t * (3 - 2 * t);
    px[o + 3] = Math.round(px[o + 3] * a);
  }
}

// 2a. THIN blue strokes outside the body mass: the ring the model draws around the hips, the halo around the head.
// They touch the body (the island pass misses them), but they are thin (< 2·THIN+1 px) and slate blue. The body mass
// is the morphological opening of the alpha (erode, then dilate, THIN px): whatever is left outside it is a wisp. Only
// BLUE wisps go, so a pen, a finger, a lock of hair, a pencil, a strap or a stem (ink or cream) stays; blue INSIDE the
// mass (a lanyard over a shirt, a mark drawn on a page the figure holds) stays too.
const THIN = Number(flag('thin', 5));
let wisps = 0, retouched = 0, rings = 0;
// --ring [x,y,w,h]: repaints the ring with a light-blue core (only when asked; optionally only inside the rectangle).
// NOT the default: light blue is also a legitimate highlight (on black trousers, lanyards, stickers, sticky notes).
const iRing = argv.indexOf('--ring'), RING = iRing >= 0;
const RING_RECT = RING && argv[iRing + 1] && /^\d+,\d+,\d+,\d+$/.test(argv[iRing + 1]) ? argv[iRing + 1].split(',').map(Number) : null;
// --retouch x,y,w,h (repeatable): rectangles of the input image where thin blue over ink becomes ink
const RETOUCHES = argv.flatMap((a, i) => a === '--retouch' ? [argv[i + 1].split(',').map(Number)] : []);
if (REMOVE_MARKS && THIN > 0) {
  const A0 = new Uint8Array(N);
  for (let i = 0; i < N; i++) A0[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
  // separable minimum/maximum over a (2·r+1) square window
  const morph = (src, r, op) => {
    const tmpv = new Uint8Array(N), out = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = op === 'min' ? 1 : 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; const s = xx < 0 || xx >= W ? 0 : src[y * W + xx]; if (op === 'min') { if (!s) { v = 0; break; } } else if (s) { v = 1; break; } }
      tmpv[y * W + x] = v;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = op === 'min' ? 1 : 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; const s = yy < 0 || yy >= H ? 0 : tmpv[yy * W + x]; if (op === 'min') { if (!s) { v = 0; break; } } else if (s) { v = 1; break; } }
      out[y * W + x] = v;
    }
    return out;
  };
  const mass = morph(morph(A0, THIN, 'min'), THIN + 1, 'max');
  const blue = o => { const r = px[o], g = px[o + 1], b = px[o + 2]; return b - r >= 28 && b - g >= 8 && b >= 80; };
  const removed = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (!px[o + 3] || mass[i]) continue;
    if (blue(o)) { px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; wisps++; removed[i] = 1; }
  }
  // the wisp's light fringe (the half-tone between blue and paper, which the blue test misses) goes too: up to 2 px
  // around what was removed, outside the mass, whatever is not dark ink
  const near = morph(removed, 2, 'max');
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (!near[i] || removed[i] || mass[i] || !px[o + 3]) continue;
    if (Math.max(px[o], px[o + 1], px[o + 2]) > 110) { px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; wisps++; }
  }
  // RING (--ring, optional): the stroke the model draws around the hips (sometimes an arm) has a LIGHT-BLUE core
  // (~190,213,239), a colour the style uses for nothing else (the palette is ink, cream and slate). The core finds the
  // whole ring: it and its outline (3 px around) are repainted with the colour of the nearest valid neighbour, so
  // over a blue garment the blue comes back, over black trousers the black. Fewer than 30 core px = no ring.
  {
    const light = o => { const r = px[o], g = px[o + 1], b = px[o + 2]; return r >= 110 && b >= 180 && b - r >= 30 && b - g >= 12; };
    const ringCore = new Uint8Array(N); let nm = 0;
    const [ax, ay, aw, ah] = RING_RECT || [0, 0, W, H];
    for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; if (x >= ax && x < ax + aw && y >= ay && y < ay + ah && px[i * 4 + 3] >= 128 && light(i * 4)) { ringCore[i] = 1; nm++; } }
    if (nm >= 30 && RING) {
      const ring = morph(ringCore, 3, 'max');
      const queue = new Int32Array(N), color = new Int32Array(N).fill(-1);
      let qa = 0, qb = 0;
      for (let i = 0; i < N; i++) if (!ring[i] && px[i * 4 + 3] >= 128) { color[i] = i; }
      // frontier: valid pixels next to the ring
      for (let i = 0; i < N; i++) {
        if (color[i] < 0) continue;
        const x = i % W, y = (i / W) | 0;
        if ((x > 0 && ring[i - 1]) || (x < W - 1 && ring[i + 1]) || (y > 0 && ring[i - W]) || (y < H - 1 && ring[i + W])) queue[qb++] = i;
      }
      let painted = 0;
      while (qa < qb) {
        const j = queue[qa++], x = j % W, y = (j / W) | 0;
        for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
          if (k < 0 || !ring[k] || color[k] >= 0 || px[k * 4 + 3] < 128) continue;
          color[k] = color[j]; queue[qb++] = k;
          const o = k * 4, f = color[j] * 4; px[o] = px[f]; px[o + 1] = px[f + 1]; px[o + 2] = px[f + 2]; painted++;
        }
      }
      // the ring's semi-transparent pixels (its edge over the background) go
      for (let i = 0; i < N; i++) if (ring[i] && px[i * 4 + 3] < 128 && color[i] < 0) { const o = i * 4; px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
      rings = painted;
    }
  }
  // RETOUCH (optional): the part of the ring that crosses OVER dark clothing (black trousers) survives the pass above,
  // because it is inside the mass. Inside each --retouch x,y,w,h rectangle (px of the INPUT image), thin blue
  // surrounded by ink becomes ink. Only inside the rectangle: the style draws blue highlights on black on purpose,
  // and a repair across the whole image would erase them all.
  // 13 px window: ≥ 50% ink around and ≤ 45% blue (it is a line, not an area).
  const R = 6, dark = new Uint8Array(N), isBlue = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const o = i * 4; if (px[o + 3] >= 128) { dark[i] = Math.max(px[o], px[o + 1], px[o + 2]) < 70 ? 1 : 0; isBlue[i] = blue(o) ? 1 : 0; } }
  const swaps = [];
  for (const [rx, ry, rw, rh] of RETOUCHES) for (let y = Math.max(R, ry); y < Math.min(H - R, ry + rh); y++) for (let x = Math.max(R, rx); x < Math.min(W - R, rx + rw); x++) {
    const i = y * W + x;
    if (!isBlue[i]) continue;
    let ne = 0, na = 0, sr = 0, sg = 0, sb = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const k = i + dy * W + dx;
      if (dark[k]) { ne++; sr += px[k * 4]; sg += px[k * 4 + 1]; sb += px[k * 4 + 2]; } else if (isBlue[k]) na++;
    }
    const tot = (2 * R + 1) ** 2;
    if (ne >= 0.5 * tot && na <= 0.45 * tot) swaps.push([i, sr / ne, sg / ne, sb / ne]);
  }
  for (const [i, r, g, b] of swaps) { const o = i * 4; px[o] = Math.round(r); px[o + 1] = Math.round(g); px[o + 2] = Math.round(b); }
  retouched = swaps.length;
}

// 2b. islands: opaque pieces (alpha ≥ 50%), 8-connected
const opaque = new Uint8Array(N);
for (let i = 0; i < N; i++) opaque[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
const label = new Int32Array(N).fill(-1), areas = [], stack = new Int32Array(N);
for (let i = 0; i < N; i++) {
  if (!opaque[i] || label[i] >= 0) continue;
  const id = areas.length; let top = 0, n = 0;
  stack[top++] = i; label[i] = id;
  while (top) {
    const j = stack[--top]; n++;
    const x = j % W, y = (j / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const k = yy * W + xx;
      if (opaque[k] && label[k] < 0) { label[k] = id; stack[top++] = k; }
    }
  }
  areas.push(n);
}
let dropped = 0, droppedArea = 0;
if (REMOVE_MARKS && PAPER) {
  const sum = areas.map(() => [0, 0, 0]);
  for (let i = 0; i < N; i++) if (label[i] >= 0) { const o = i * 4, s3 = sum[label[i]]; s3[0] += px[o]; s3[1] += px[o + 1]; s3[2] += px[o + 2]; }
  const drop = areas.map((a, c) => { const [r, g, b] = sum[c].map(v => v / a); return a < 1500 && b - r >= 28 && b - g >= 8; });
  for (let i = 0; i < N; i++) if (label[i] >= 0 && drop[label[i]]) { const o = i * 4; px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
  for (let c = 0; c < areas.length; c++) if (drop[c]) { dropped++; droppedArea += areas[c]; }
}
if (REMOVE_MARKS && areas.length > 1 && !PAPER) {
  const body = areas.indexOf(Math.max(...areas));
  // distance to the body, up to TOUCH px (BFS, 4-connected)
  const dist = new Int16Array(N).fill(-1), queue = new Int32Array(N);
  let qa = 0, qb = 0;
  for (let i = 0; i < N; i++) if (label[i] === body) { dist[i] = 0; queue[qb++] = i; }
  while (qa < qb) {
    const j = queue[qa++], d = dist[j];
    if (d >= TOUCH) continue;
    const x = j % W, y = (j / W) | 0;
    for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
      if (k < 0 || dist[k] !== -1) continue;
      dist[k] = d + 1; queue[qb++] = k;
    }
  }
  const keep = new Uint8Array(areas.length);
  keep[body] = 1;
  for (let c = 0; c < areas.length; c++) if (areas[c] >= LARGE * areas[body]) keep[c] = 1;
  for (let i = 0; i < N; i++) if (label[i] >= 0 && dist[i] >= 0) keep[label[i]] = 1;
  // a piece that stays takes its semi-transparent edge along (up to 3 px); everything else goes
  const owner = new Int32Array(N).fill(-1), d2 = new Int16Array(N).fill(-1);
  qa = 0; qb = 0;
  for (let i = 0; i < N; i++) if (label[i] >= 0) { owner[i] = label[i]; d2[i] = 0; queue[qb++] = i; }
  while (qa < qb) {
    const j = queue[qa++], d = d2[j];
    if (d >= 3) continue;
    const x = j % W, y = (j / W) | 0;
    for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
      if (k < 0 || d2[k] !== -1) continue;
      d2[k] = d + 1; owner[k] = owner[j]; queue[qb++] = k;
    }
  }
  for (let c = 0; c < areas.length; c++) if (!keep[c]) { dropped++; droppedArea += areas[c]; }
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (px[o + 3] === 0) continue;
    if (owner[i] < 0 || !keep[owner[i]]) { px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
  }
}

// 4. crop with margin
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
if (x1 < 0) { console.log('image is empty after preparation'); process.exit(1); }
x0 = Math.max(0, x0 - MARGIN); y0 = Math.max(0, y0 - MARGIN); x1 = Math.min(W - 1, x1 + MARGIN); y1 = Math.min(H - 1, y1 + MARGIN);
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) px.copy(out, y * cw * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + cw) * 4);
fs.mkdirSync(path.dirname(path.resolve(outp)), { recursive: true });
magick(['-size', `${cw}x${ch}`, '-depth', '8', 'rgba:-', 'PNG32:' + path.resolve(outp)], { input: out, maxBuffer: 1 << 30 });
fs.rmSync(tmp, { force: true });
console.log(`${path.basename(inp)} → ${path.basename(outp)}: ${W}×${H} → ${cw}×${ch}` +
  (PAPER ? ' · paper → transparent' : '') +
  (!REMOVE_MARKS ? ' · marks kept' : ` · ${wisps} px of thin blue stroke removed` + (rings ? ` · ring repainted (${rings} px)` : '') + (RETOUCHES.length ? ` · ${retouched} px retouched` : '') +
    (PAPER ? ` · ${dropped} loose blue mark(s) removed` : ` · ${areas.length} pieces, ${dropped} loose mark(s) removed (${droppedArea} px)`)));
