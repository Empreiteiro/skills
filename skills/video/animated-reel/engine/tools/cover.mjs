// Reel cover (1080x1920): draws the COVER of src/reels/<id>.js (a single shot at time COVER.t, with opts.cover = true).
//   node tools/cover.mjs --reel <id> [--out out/<id>/cover.png]
import fs from 'node:fs';
import path from 'node:path';
import { openReel, args, ROOT } from './lib.mjs';

const a = args();
if (typeof a.reel !== 'string') { console.log('usage: node tools/cover.mjs --reel <id> [--out out/<id>/cover.png]'); process.exit(2); }
const out = path.resolve(ROOT, a.out || `out/${a.reel}/cover.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const reel = await openReel({ reel: a.reel, query: 'cover=1&nohud=1' });
await reel.seek(0);
fs.writeFileSync(out, await reel.png());
if (reel.errors.length) console.log(reel.errors.join('\n'));
await reel.close();
console.log(out);
