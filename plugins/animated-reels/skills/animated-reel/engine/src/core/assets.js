import * as THREE from 'three';

// Cached loaders. Everything is local (served from /assets).
const cache = new Map();
const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

export const load = {
  /** Texture from an image (sRGB). */
  texture: (url) => once('tex:' + url, async () => {
    const t = await new THREE.TextureLoader().loadAsync(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }),
  /** Decoded HTMLImageElement (for canvas 2D). */
  image: (url) => once('img:' + url, () => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; })),
  };

const FONTS = [
  '700 64px Archivo', '600 64px Archivo', '900 64px Archivo', '350 40px "Source Serif 4"', '400 40px "Source Serif 4"', 'italic 400 40px "Source Serif 4"',
  '600 40px "Source Serif 4"', '500 24px "JetBrains Mono"', '600 24px "JetBrains Mono"', '400 40px Newsreader', 'italic 400 40px Newsreader', '500 40px Newsreader', '600 60px Caveat',
];
/** 'italic 400 40px "Source Serif 4"' → 'Source Serif 4 italic' (for the warning). */
const faceName = f => f.replace(/^.*?\d+px\s+/, '').replace(/"/g, '') + (/^italic\b/.test(f) ? ' italic' : '');

/**
 * Loads the fonts before the first frame (the DOM and canvas 2D use the same faces declared in style.css).
 * Never throws: the font files are not vendored (a setup script fetches them into assets/fonts/), so a missing
 * file logs one warning and the page falls back to the system stacks in style.css.
 */
export async function loadCanvasFonts() {
  const results = await Promise.allSettled(FONTS.map(f => document.fonts.load(f)));
  const missing = new Set();
  results.forEach((r, i) => {
    const failed = r.status === 'rejected' || !r.value.length || r.value.some(face => face.status === 'error');
    if (failed) missing.add(faceName(FONTS[i]));
  });
  if (missing.size) console.warn(`[fonts] missing, using system fallbacks: ${[...missing].join(', ')} (expected in assets/fonts/)`);
  await document.fonts.ready;
}
