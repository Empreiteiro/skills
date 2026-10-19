// Single frames for review: node tools/still.mjs --reel <id> --t 1,2.5,6 [--out out/<id>/stills] [--sheet] [--cols 3] [--nohud] [--q <query>]
// Shots without a reel: node tools/still.mjs --only <shot> --t 1,2.5 [--fmt 916]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openReel, args, ROOT } from './lib.mjs';

const a = args();
const times = String(a.t || '0').split(',').map(Number);
const out = path.resolve(ROOT, a.out || (a.reel ? `out/${a.reel}/stills` : `out/stills/${a.only || 'all'}`));
fs.mkdirSync(out, { recursive: true });
const t0 = Date.now();
const reel = await openReel({ only: a.only, fmt: a.fmt, reel: a.reel, query: (a.nohud ? 'nohud=1&' : '') + (a.q || '') });
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const files = [];
for (const t of times) {
  await reel.seek(t);
  const f = path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`);
  fs.writeFileSync(f, await reel.png());
  files.push(f);
}
if (reel.errors.length) console.log(reel.errors.slice(0, 30).join('\n'));
await reel.close();
let sheetDone = false;
if (a.sheet && files.length > 1) {
  const sheet = path.join(out, 'sheet.png');
  // ImageMagick contact sheet, built from +append rows stacked with -append. No labels and no `magick montage`:
  // -label/-annotate need Freetype and montage calls Ghostscript, which many ImageMagick builds lack. The frames
  // follow the --t order, left to right and top to bottom; the order is printed below.
  const cols = Math.min(files.length, a.cols ? Number(a.cols) : 3);
  const size = (String(a.fmt) === '916' || a.reel) ? '360x640' : '640x360';
  const rows = [];
  for (let i = 0; i < files.length; i += cols) rows.push('(', ...files.slice(i, i + cols), '-resize', size, '-bordercolor', '#222', '-border', '4', '+append', ')');
  try {
    execFileSync('magick', [...rows, '-background', '#222', '-gravity', 'NorthWest', '-append', '+repage', '-depth', '8', 'PNG24:' + sheet]);
    console.log(`${sheet}\norder: ${times.map(t => t.toFixed(2)).join(' · ')}`);
    sheetDone = true;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    console.log('WARNING: ImageMagick (`magick`) not found: contact sheet skipped, frames saved below.');
  }
}
if (!sheetDone) console.log(files.join('\n'));
