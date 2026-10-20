#!/usr/bin/env node
// New pose of a cast character in the cast's art style (transparent PNG), ready for prepare.mjs.
//
//   node tools/pose.mjs --character <id> --scene "<English: posture, what the hands do, expression, 2 to 5 props>"
//        --out <absolute dir>/<name>.png [--ref <png> ...] [--n 2] [--size 1024x1536] [--model <name>] [--dry]
//
// Identity comes from art already drawn in the style: the character's `refs` in cast/cast.json (a portrait plus a
// pose, say) go in as image[] and lock face, outfit and linework at once. --ref adds another (an approved pose, when
// the scene needs the same prop). With refs the call is /v1/images/edits; with none at all, /v1/images/generations
// with the same prompt. The prompt joins, never summarized: the full style_en of cast/style.json, the character's
// anchors, its skin sentence (if any), the style's nothing_around sentence, its noLogo sentence (if any) and the
// scene. The model may still bake marks around the figure; prepare.mjs removes them.
//
// Key: OPENAI_API_KEY (never printed). Model: --model, else OPENAI_IMAGE_MODEL, else gpt-image-2.5-flare. Quality high,
// background transparent, png; input_fidelity is not sent. ~25 s per image. Writes <out>-1.png ... and a .json beside
// each with the model, prompt, refs, timing, usage and the alpha check (ImageMagick; skipped without it).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sh = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const QUALITY = 'high';

const argv = process.argv.slice(2);
const die = msg => { console.log(msg); process.exit(2); };
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); if (i === -1) return def; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const all = name => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--') ? [argv[i + 1]] : []));
const characterId = flag('character'), scene = flag('scene'), out = flag('out');
if (typeof characterId !== 'string' || typeof scene !== 'string' || typeof out !== 'string' || !path.isAbsolute(out)) {
  console.log('usage: node tools/pose.mjs --character <id> --scene "<English>" --out <absolute .png> [--ref <png> ...] [--n 2] [--size 1024x1536] [--model <name>] [--dry]');
  process.exit(2);
}
const n = Math.max(1, Number(flag('n', 2))), size = String(flag('size', '1024x1536'));
const MODEL = typeof flag('model') === 'string' ? flag('model') : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';

const S = JSON.parse(await readFile(path.join(ROOT, 'cast/style.json'), 'utf8'));
const cast = JSON.parse(await readFile(path.join(ROOT, 'cast/cast.json'), 'utf8'));
const C = (cast.characters || []).find(c => c.id === characterId);
if (!C) die(`unknown character: ${characterId} (cast/cast.json has: ${(cast.characters || []).map(c => c.id).join(', ') || 'none'})`);
const refs = [...(C.refs || []).map(r => path.join(ROOT, r)), ...all('ref').map(r => path.resolve(r))];
const missing = refs.filter(r => !existsSync(r));
if (missing.length) die(`reference image not found: ${missing.join(', ')}`);

const quoted = /"[^"]+"/.test(scene);
const sceneText = [C.skin, scene, S.nothing_around, C.noLogo].filter(Boolean).join(' ');
const identity = refs.length
  ? [`Image 1${refs.length > 1 ? ` to image ${refs.length}` : ''} show${refs.length > 1 ? '' : 's'} the character, already drawn in the target art style: keep exactly their identity (same face, skin tone, hairstyle, outfit and props: ${C.anchors}) and match the linework, palette, texture and proportions exactly. Take nothing else from the reference${refs.length > 1 ? 's' : ''}: not the pose, the props in hand or the composition.`,
    'Use the character in a new moment.']
  : [`The character: ${C.anchors}.`];
const prompt = [
  ...identity,
  `Scene: ${sceneText}`,
  `Art style: ${S.style_en}. Render EVERYTHING in this style: linework, shading, palette and texture follow the style.`,
  'Composition: a self-contained spot illustration, the character plus only the few props this moment needs, grouped tightly, the whole figure inside the frame with a small margin, nothing cut by the edges. Fully transparent background: no room, no wall, no sky, no floor plane, no frame, no border.',
  `Writing on pages or screens is abstract squiggle lines, never legible text; no letters, captions or watermark${quoted ? ', except the exact quoted word(s) in the scene' : ''}.`,
].join('\n');

if (flag('dry')) { console.log(`model: ${MODEL}\nrefs:${refs.length ? '\n  ' + refs.join('\n  ') : ' (none: /v1/images/generations)'}\n\n${prompt}`); process.exit(0); }

const key = process.env.OPENAI_API_KEY;
if (!key) { console.log('set OPENAI_API_KEY'); process.exit(2); }

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const endpoint = refs.length ? 'edits' : 'generations';
async function callOnce() {
  const common = { model: MODEL, prompt, size, quality: QUALITY, background: 'transparent', output_format: 'png' };
  const signal = AbortSignal.timeout(300_000);
  let res;
  if (refs.length) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(common)) fd.append(k, v);
    for (const r of refs) fd.append('image[]', new Blob([await readFile(r)], { type: MIME[path.extname(r).toLowerCase()] || 'image/png' }), path.basename(r));
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd, signal });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(common), signal });
  }
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: { message: text.slice(0, 300) } }; }
  return { status: res.status, body, retryAfter: Number(res.headers.get('retry-after')) || 0 };
}
async function generate(label) {
  const t0 = Date.now();
  let last = '';
  for (let attempt = 1; attempt <= 6; attempt++) {
    let r;
    try { r = await callOnce(); } catch (e) { r = { status: 0, body: { error: { message: String(e.message || e) } } }; }
    const b64 = r.body?.data?.[0]?.b64_json;
    if (r.status === 200 && b64) return { b64, usage: r.body.usage, attempts: attempt, ms: Date.now() - t0 };
    last = `${r.status} ${r.body?.error?.code || ''} ${r.body?.error?.message || ''}`.trim();
    if (!(r.status === 0 || r.status === 429 || r.status >= 500 || (r.status === 200 && !b64))) break;
    const wait = (r.retryAfter || Math.min(90, 6 * 2 ** attempt)) * 1000 + Math.random() * 3000;
    console.log(`  ... ${label} attempt ${attempt} failed (${last.slice(0, 120)}); retrying in ${Math.round(wait / 1000)} s`);
    await new Promise(ok => setTimeout(ok, wait));
  }
  throw new Error(last);
}
/** Transparent corners and little haze is what a clean result looks like. Semi-transparent halo above ~6%: generate another. */
async function alpha(file) {
  try {
    const { stdout: c } = await sh('magick', [file, '-format', '%[fx:p{0,0}.a] %[fx:p{w-1,0}.a] %[fx:p{0,h-1}.a] %[fx:p{w-1,h-1}.a]', 'info:']);
    const { stdout: h } = await sh('magick', [file, '-alpha', 'extract', '-fx', '(u>0.03 && u<0.6) ? 1 : 0', '-format', '%[fx:mean]', 'info:']);
    const corners = c.trim().split(/\s+/).map(Number), haze = Number(h.trim());
    return { corners, haze: Math.round(haze * 1000) / 1000, ok: corners.every(a => a < 0.05) && haze < 0.06 };
  } catch (e) {
    if (e.code === 'ENOENT') return null;   // no ImageMagick: no check
    throw e;
  }
}

await mkdir(path.dirname(out), { recursive: true });
let errors = 0, unchecked = false;
await Promise.all(Array.from({ length: n }, async (_, k) => {
  await new Promise(ok => setTimeout(ok, k * 400));
  const file = `${out.replace(/\.png$/i, '')}-${k + 1}.png`;
  try {
    const { b64, usage, attempts, ms } = await generate(path.basename(file));
    await writeFile(file, Buffer.from(b64, 'base64'));
    const a = await alpha(file);
    if (!a) unchecked = true;
    await writeFile(file.replace(/\.png$/i, '.json'), JSON.stringify({
      character: C.id, scene, prompt, refs, size, model: MODEL, quality: QUALITY, endpoint, ms, attempts, usage, alpha: a, generated_at: new Date().toISOString(),
    }, null, 2));
    console.log(`ok ${file} ${Math.round(ms / 1000)} s${a && !a.ok ? ` WARNING alpha ${JSON.stringify(a)}` : ''}`);
  } catch (e) { errors++; console.log(`ERROR ${file}: ${String(e.message).slice(0, 300)}`); }
}));
if (unchecked) console.log('WARNING: ImageMagick (`magick`) not found: alpha check skipped');
process.exit(errors ? 1 : 0);
