// Renders the film with real motion blur (average of sub-frames, 180-degree shutter).
//   node tools/render.mjs --reel <id> [--from 0] [--to DUR] [--fps 30] [--sub 6] [--shutter 0.5] [--workers 3] [--nohud] [--out out/<id>/video.mkv]
//   node tools/render.mjs --from 0 --to 58 [--only id,id] [--fmt 916] [--out out/reel.mkv]   (shots without a reel)
// Quick preview of a passage: --sub 1 --workers 1 --out out/prev.mp4
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { openReel, args, ROOT, reelInfo } from './lib.mjs';

const a = args();
const fps = Number(a.fps || 30), sub = Number(a.sub || 6), shutter = Number(a.shutter || 0.5);
const from = Number(a.from || 0), to = Number(a.to || (a.reel ? (await reelInfo(a.reel)).DUR : 58));
const workers = Number(a.workers || 3);
const out = path.resolve(ROOT, a.out || (a.reel ? `out/${a.reel}/video.mkv` : 'out/reel.mkv'));
const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0;
const tmp = path.join(path.dirname(out), `.seg-${path.basename(out)}`);
fs.mkdirSync(tmp, { recursive: true });

const vf = sub > 1
  ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB)`
  : `setpts=N/(${fps}*TB)`;

async function worker(k, a0, a1) {
  const seg = path.join(tmp, `seg${String(k).padStart(2, '0')}.mkv`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', 'png', '-i', '-',
    '-vf', vf, '-r', String(fps), '-c:v', 'libx264', '-preset', 'fast', '-crf', '4', '-pix_fmt', 'yuv444p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res(seg) : rej(new Error('ffmpeg ' + c)))));
  const reel = await openReel({ only: a.only, fmt: a.fmt, reel: a.reel, query: a.nohud ? 'nohud=1' : '' });
  const t0 = Date.now();
  for (let f = a0; f < a1; f++) {
    for (let s = 0; s < sub; s++) {
      const t = (f + (sub > 1 ? (shutter * (s + 0.5)) / sub : 0)) / fps;
      await reel.seek(t);
      const buf = await reel.png();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if ((f - a0) % 30 === 0) {
      const el = (Date.now() - t0) / 1000, n = f - a0 + 1;
      process.stdout.write(`w${k} ${n}/${a1 - a0} (${(n / el).toFixed(1)} frames/s)\n`);
    }
  }
  if (reel.errors.length) console.log(`w${k} errors:\n` + reel.errors.slice(0, 10).join('\n'));
  await reel.close();
  ff.stdin.end();
  return done;
}

const per = Math.ceil(total / workers);
const t0 = Date.now();
const segs = await Promise.all(Array.from({ length: workers }, (_, k) => {
  const a0 = f0 + k * per, a1 = Math.min(f1, a0 + per);
  return a0 < a1 ? worker(k, a0, a1) : null;
}).filter(Boolean));
const list = path.join(tmp, 'list.txt');
// concat list: single quotes keep Windows backslashes literal; a quote inside the path is closed, escaped and reopened
fs.writeFileSync(list, segs.map(s => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
const final = out.endsWith('.mp4')
  ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
  : ['-c', 'copy'];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...final, out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`ok ${out} · ${total} frames × ${sub} sub-frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
