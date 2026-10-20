import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

// Playwright is a dependency of the engine (package.json); `npx playwright install chromium` fetches the browser.
import { chromium } from 'playwright';
export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Duration and metadata of a reel (src/reels/<id>.js), read in Node. */
export async function reelInfo(id) {
  const m = await import(new URL(`../src/reels/${id}.js`, import.meta.url));
  return { DUR: m.DUR, META: m.META || null };
}

export function args(argv = process.argv.slice(2)) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      o[k] = v;
    }
  }
  return o;
}

/** ANGLE backend for WebGL: Metal on macOS, D3D11 on Windows, Chromium's default elsewhere. ANGLE_BACKEND overrides
 *  it; an empty ANGLE_BACKEND passes no --use-angle flag at all. */
export function angleBackend() {
  if (process.env.ANGLE_BACKEND !== undefined) return process.env.ANGLE_BACKEND.trim();
  return { darwin: 'metal', win32: 'd3d11' }[process.platform] || '';
}

/** Chromium launch options: headless, GPU flags (unless gpu: false), and CHROMIUM_PATH as the executable when set. */
export function launchOptions({ gpu = true, extra = [] } = {}) {
  const angle = angleBackend();
  const gpuArgs = gpu ? [...(angle ? [`--use-angle=${angle}`] : []), '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [];
  return {
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [...gpuArgs, ...extra],
  };
}

/** Starts the static server + Chromium (GPU) and opens the reel, ready for seek(). */
export async function openReel({ only, query = '', fmt, reel, page: html = 'src/index.html' } = {}) {
  if (reel) fmt = '916'; // reels are always 9:16
  const V = String(fmt) === '916';
  const srv = await serve(ROOT);
  const port = srv.address().port;
  const browser = await chromium.launch(launchOptions({ extra: ['--autoplay-policy=no-user-gesture-required'] }));
  const page = await browser.newPage({ viewport: V ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  const q = new URLSearchParams(query);
  if (only) q.set('only', only);
  if (reel) q.set('reel', reel);
  if (V) q.set('fmt', '916');
  await page.goto(`http://127.0.0.1:${port}/${html}?${q}`);
  await page.waitForFunction(() => window.reelReady === true, null, { timeout: 180000 });
  const cdp = await page.context().newCDPSession(page);
  return {
    page, errors,
    async seek(t) { await page.evaluate(t => window.seek(t), t); },
    async png() { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }); return Buffer.from(data, 'base64'); },
    async close() { await browser.close(); srv.close(); },
  };
}
