#!/usr/bin/env node
// OPAQUE background plate in the cast's art style: the scene's setting, with nobody in it by default, no text and no
// logo, in a vertical composition that leaves room where the character (img item, transparent PNG) will stand. In the
// editorial style the plate becomes a VIGNETTE: run it through prepare.mjs --paper (the cream turns transparent and
// only the drawing is left).
//
//   node tools/plate.mjs --style <id> --scene "<English>" --out <absolute .png> [--size 1088x1920]
//        [--style-ref <png>] [--character <id>] [--n 1] [--space "<where the open patch goes>"] [--model <name>] [--dry]
//
// The style is the FULL style_en of cast/style.json (never summarized). Key: OPENAI_API_KEY (never printed). Model:
// --model, else OPENAI_IMAGE_MODEL, else gpt-image-2.5-flare. Quality high, png, background opaque: with reference
// images the call is /v1/images/edits (image[]), without them /v1/images/generations; 429/5xx/network errors retry
// with backoff. Writes <out>.png (or <out>-1.png ... with --n > 1) and a .json beside it with the model, prompt, refs,
// usage, timing and the opacity check (ImageMagick; skipped without it). Size: 1088x1920 (native 9:16, the default: no
// crop or upscale in the frame); 1024x1792 and 1024x1536 also work with the default model.
// With --character, the character (the first of its refs in cast/cast.json, already in the style) appears in the scene,
// full body. With --style-ref, a finished image in the style locks linework and palette, and the prompt tells the
// model to copy nothing else from it (the model copies whatever a reference shows).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sh = promisify(execFile);
const QUALITY = 'high';

const argv = process.argv.slice(2);
const die = msg => { console.log(msg); process.exit(2); };
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); if (i === -1) return def; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const style = flag('style'), scene = flag('scene'), out = flag('out');
if (typeof style !== 'string' || typeof scene !== 'string' || typeof out !== 'string' || !path.isAbsolute(out)) {
  console.log('usage: node tools/plate.mjs --style <id> --scene "<English>" --out <absolute .png> [--size 1088x1920] [--style-ref <png>] [--character <id>] [--n 1] [--space "..."] [--model <name>] [--dry]');
  process.exit(2);
}
const size = String(flag('size', '1088x1920')), n = Math.max(1, Number(flag('n', 1)));
const MODEL = typeof flag('model') === 'string' ? flag('model') : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';
const characterId = typeof flag('character') === 'string' ? flag('character') : null;
const styleRef = typeof flag('style-ref') === 'string' ? path.resolve(flag('style-ref')) : null;
const space = typeof flag('space') === 'string' ? flag('space') : 'the middle of the lower half of the frame';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const S = JSON.parse(await readFile(path.join(ROOT, 'cast/style.json'), 'utf8'));
if (style !== S.id) die(`unknown style: ${style} (cast/style.json defines ${S.id})`);
const cast = JSON.parse(await readFile(path.join(ROOT, 'cast/cast.json'), 'utf8'));
const C = characterId ? (cast.characters || []).find(c => c.id === characterId) : null;
if (characterId && !C) die(`unknown character: ${characterId} (cast/cast.json has: ${(cast.characters || []).map(c => c.id).join(', ') || 'none'})`);

// references: the character first (its portrait, already in the style), then the style reference
const charRef = C?.refs?.length ? path.join(ROOT, C.refs[0]) : null;
const refs = [charRef, styleRef].filter(Boolean);
const missing = refs.filter(r => !existsSync(r));
if (missing.length) die(`reference image not found: ${missing.join(', ')}`);
const quoted = /"[^"]+"/.test(scene);
const L = [];
if (C) L.push((charRef
  ? `Image 1 is the character, already drawn in this art style: keep exactly their identity (same face, skin tone, hairstyle, outfit and props: ${C.anchors}) and the same linework and palette.`
  : `The character: ${C.anchors}.`) + (C.skin ? ' ' + C.skin : ''));
if (styleRef) L.push(`Image ${charRef ? 2 : 1} is a finished illustration in the target art style: match its linework, palette, texture and rendering exactly, and take nothing else from it (not its characters, pose, props or composition).`);
L.push(`A background plate for a vertical 9:16 animated video, drawn in this art style: ${S.style_en}.`);
L.push(`Scene: ${scene}`);
L.push(C
  ? `The character appears once, full body from head to toe with a small margin, inside the scene and grounded on the floor, at a size where the whole body fits comfortably in the frame; nobody else is in the picture.`
  : `An empty set: no people, no characters, no animals and no body parts anywhere, as if the actor just stepped out of frame.`);
// a style's accent colours belong to the characters: with nobody in the scene, the set stays in the base palette
if (!C) L.push(`Color: the style's signature accent colors belong to the characters, so this empty set stays in the style's base palette${/black-and-white|monochrome/i.test(S.style_en) ? ': strictly black and white, with no accent color on any object' : ''}.`);
L.push(`Composition: a vertical frame at eye level with the floor or ground visible in the lower third. Keep ${space} open and uncluttered, a clear patch of floor where a character will be composited later; keep the upper third calm and simple so on-screen captions stay readable; props sit at the sides and in the background.`);
L.push('Fill the whole canvas edge to edge, fully opaque: no border, no frame, no vignette frame, no torn paper edge, no sticker outline and no transparent areas.');
L.push(`No text anywhere: no letters, numbers, signs, labels, captions or watermark${quoted ? ', except the exact quoted word(s) in the scene' : ''}; screens, book spines and papers show only abstract squiggles or blank shapes. No brand logos or brand marks on any object, clothing, cup, laptop or shoe.`);
const prompt = L.join('\n');

if (flag('dry')) { console.log(`model: ${MODEL}\nrefs: ${refs.join(', ') || '(none: /v1/images/generations)'}\n\n${prompt}`); process.exit(0); }

const key = process.env.OPENAI_API_KEY;
if (!key) { console.log('set OPENAI_API_KEY'); process.exit(2); }

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
async function callOnce() {
  const common = { model: MODEL, prompt, size, quality: QUALITY, background: 'opaque', output_format: 'png' };
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
    const transient = r.status === 0 || r.status === 429 || r.status >= 500 || (r.status === 200 && !b64);
    if (!transient) break;
    const wait = (r.retryAfter || Math.min(90, 6 * 2 ** attempt)) * 1000 + Math.random() * 3000;
    console.log(`  ... ${label} attempt ${attempt} failed (${last.slice(0, 120)}); retrying in ${Math.round(wait / 1000)} s`);
    await new Promise(ok => setTimeout(ok, wait));
  }
  throw new Error(last);
}
async function verify(file) {
  try {
    const { stdout } = await sh('magick', [file, '-format', '%w %h %[opaque]', 'info:']);
    const [w, h, opaque] = stdout.trim().split(/\s+/);
    let minAlpha = 1;
    if (opaque !== 'True' && opaque !== 'true') { const { stdout: a } = await sh('magick', [file, '-alpha', 'extract', '-format', '%[fx:minima]', 'info:']); minAlpha = Number(a.trim()); }
    return { w: Number(w), h: Number(h), opaque: minAlpha >= 0.999, minAlpha };
  } catch (e) {
    if (e.code === 'ENOENT') return null;   // no ImageMagick: no check
    throw e;
  }
}

await mkdir(path.dirname(out), { recursive: true });
const targets = n === 1 ? [out] : Array.from({ length: n }, (_, k) => out.replace(/\.png$/i, '') + `-${k + 1}.png`);
let errors = 0, unchecked = false;
await Promise.all(targets.map(async (file, k) => {
  await new Promise(ok => setTimeout(ok, k * 400));
  try {
    const { b64, usage, attempts, ms } = await generate(path.basename(file));
    await writeFile(file, Buffer.from(b64, 'base64'));
    const c = await verify(file);
    if (!c) unchecked = true;
    await writeFile(file.replace(/\.png$/i, '') + '.json', JSON.stringify({
      type: 'plate', style, scene, character: characterId, style_ref: styleRef, space, prompt, refs, size, model: MODEL, quality: QUALITY,
      background: 'opaque', endpoint: refs.length ? 'edits' : 'generations', ms, attempts, usage, verification: c, generated_at: new Date().toISOString(),
    }, null, 2));
    console.log(`ok ${file} ${Math.round(ms / 1000)} s${c ? ` ${c.w}×${c.h}${c.opaque ? '' : ` WARNING minimum alpha ${c.minAlpha}`}` : ''}`);
  } catch (e) { errors++; console.log(`ERROR ${file}: ${String(e.message).slice(0, 300)}`); }
}));
if (unchecked) console.log('WARNING: ImageMagick (`magick`) not found: opacity check skipped');
process.exit(errors ? 1 : 0);
