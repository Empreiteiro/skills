#!/usr/bin/env node
// Downloads the open-licensed (SIL OFL 1.1) variable fonts of the editorial style into assets/fonts/ (git-ignored).
// Source: the Fontsource npm packages, pinned, through the jsDelivr CDN. Latin subset only.
//   node tools/fonts.mjs [--force]
// Without these files the page still renders: every class in src/style.css has a system fallback stack, and
// loadCanvasFonts() only warns. Renders without them will not match the reference look.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../assets/fonts/', import.meta.url));
const CDN = 'https://cdn.jsdelivr.net/npm/@fontsource-variable';
const FONTS = [
  // [file in assets/fonts, package@version, file in the package]
  ['Archivo.woff2', 'archivo@5.3.0', 'archivo-latin-wght-normal.woff2'],
  ['SourceSerif4.woff2', 'source-serif-4@5.3.1', 'source-serif-4-latin-wght-normal.woff2'],
  ['SourceSerif4-Italic.woff2', 'source-serif-4@5.3.1', 'source-serif-4-latin-wght-italic.woff2'],
  ['JetBrainsMono.woff2', 'jetbrains-mono@5.3.0', 'jetbrains-mono-latin-wght-normal.woff2'],
  ['Newsreader.woff2', 'newsreader@5.3.0', 'newsreader-latin-wght-normal.woff2'],
  ['Newsreader-Italic.woff2', 'newsreader@5.3.0', 'newsreader-latin-wght-italic.woff2'],
  ['Caveat.woff2', 'caveat@5.3.0', 'caveat-latin-wght-normal.woff2'],
];

const force = process.argv.includes('--force');
await fs.mkdir(DIR, { recursive: true });
let failed = 0;
for (const [name, pkg, file] of FONTS) {
  const out = path.join(DIR, name);
  if (!force) { try { if ((await fs.stat(out)).size > 1000) { console.log(`ok   ${name} (already there)`); continue; } } catch {} }
  const url = `${CDN}/${pkg}/files/${file}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error('not a woff2 file');
    await fs.writeFile(out, buf);
    console.log(`ok   ${name} ← ${pkg}/${file} (${Math.round(buf.length / 1024)} KB)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name} ← ${url}: ${e.message}`);
  }
}
console.log(failed ? `\n${failed} font(s) missing: the page falls back to system fonts.` : `\nfonts ready in ${DIR}`);
process.exit(failed ? 1 : 0);
