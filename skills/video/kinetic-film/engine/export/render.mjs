#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   REMARK brand film — frame-exact renderer.

   Opens index.html in headless Chromium, waits for window.__ready (which is
   only true after document.fonts.ready), then steps the master timeline one
   frame at a time through window.__seek(ms) and screenshots 1920×1080 PNGs.
   Nothing is captured in real time, so the output is identical on every run.

     node export/render.mjs                     → out/ad.mp4 + out/stills
     node export/render.mjs --stills-only       → just the key beats
     node export/render.mjs --audio track.wav   → muxes a commissioned track
     node export/render.mjs --range 900 1100    → a slice, for checking

   Ships SILENT unless --audio is given. See out/music-brief.json.
   ═══════════════════════════════════════════════════════════════════════════ */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(ROOT, 'out');
const FRAMES = join(OUT, 'frames');
const STILLS = join(OUT, 'stills');
const FFMPEG = process.env.FFMPEG || (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const FPS = 30;

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = f => { const i = argv.indexOf(f); return i < 0 ? null : argv[i + 1]; };

/* The beats worth reading back as images — one per section, plus every
   demo action. Named so a failure points at the frame that broke. */
const KEY = [
  ['01-cold-open',        60],
  ['02-writing-marked',   140],
  ['03-writing-red',      170],
  ['04-accel-beat',       200],
  ['05-accel-inverted',   300],
  ['06-obvious',          438],
  ['07-scroll',           540],
  ['08-suddenly',         566],
  ['09-prompting',        620],
  ['10-dead-stop',        680],
  ['11-caret',            728],
  ['12-remark',           760],
  ['13-human-red',        900],
  ['14-demo-select',      986],
  ['15-demo-composer',   1034],
  ['16-demo-rewritten',  1050],
  ['17-demo-review',     1104],
  ['18-demo-principles', 1188],
  ['19-demo-ghost',      1230],
  ['20-demo-autosuggest',1272],
  ['21-demo-inline-ai',  1350],
  ['22-payoff-you',      1460],
  ['23-stop-settling',   1500],
  ['24-remarkable',      1640],
  ['25-mark',            1712],
  ['26-end',             1755],
];

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('  [console]', m.text()); });
page.on('pageerror', e => console.error('  [pageerror]', e.message));

await page.goto('file://' + join(ROOT, 'index.html'));
await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });

const { duration, total, bpm } = await page.evaluate(
  () => ({ duration: window.__duration, total: window.__frames, bpm: window.__bpm }));
console.log(`film: ${total} frames · ${(duration / 1000).toFixed(2)}s @ ${FPS}fps · BPM ${bpm}`);

mkdirSync(STILLS, { recursive: true });

/* ── stills ─────────────────────────────────────────────────────────────── */
if (!has('--no-stills')) {
  rmSync(STILLS, { recursive: true, force: true });
  mkdirSync(STILLS, { recursive: true });
  for (const [name, frame] of KEY) {
    await page.evaluate(ms => window.__seek(ms), (frame / FPS) * 1000);
    await page.screenshot({ path: join(STILLS, `${name}.png`) });
  }
  console.log(`stills: ${KEY.length} → out/stills/`);
}
if (has('--stills-only')) { await browser.close(); process.exit(0); }

/* ── every frame ────────────────────────────────────────────────────────── */
const from = has('--range') ? +argv[argv.indexOf('--range') + 1] : 0;
const to   = has('--range') ? +argv[argv.indexOf('--range') + 2] : total;

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const t0 = Date.now();
for (let i = from; i < to; i++) {
  await page.evaluate(ms => window.__seek(ms), (i / FPS) * 1000);
  await page.screenshot({ path: join(FRAMES, String(i - from).padStart(5, '0') + '.png') });
  if ((i - from) % 120 === 0) {
    const done = i - from + 1, pct = (done / (to - from) * 100).toFixed(0);
    const eta = ((Date.now() - t0) / done * ((to - from) - done) / 1000).toFixed(0);
    process.stdout.write(`\r  frame ${i}/${to}  ${pct}%  eta ${eta}s   `);
  }
}
console.log(`\nframes: ${to - from} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await browser.close();

/* ── encode ─────────────────────────────────────────────────────────────── */
const audio = val('--audio');
const mp4 = join(OUT, 'ad.mp4');
const args = ['-y', '-framerate', String(FPS), '-i', join(FRAMES, '%05d.png')];
if (audio) args.push('-i', resolve(audio));
args.push(
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-r', String(FPS), '-vf', 'scale=1920:1080:flags=lanczos',
);
if (audio) args.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
else args.push('-an');
args.push(mp4);

execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'inherit'] });
const n = readdirSync(FRAMES).length;
console.log(`encoded: out/ad.mp4  (${n} frames${audio ? ' + ' + audio : ' · SILENT'})`);
rmSync(FRAMES, { recursive: true, force: true });
