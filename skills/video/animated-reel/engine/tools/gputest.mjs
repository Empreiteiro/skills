// GPU check: launches Chromium exactly as the renderer does, prints the WebGL renderer and how long a frame capture
// takes. A software renderer (SwiftShader, llvmpipe, ...) still works, but every frame is drawn on the CPU and a full
// render takes far longer.
//   node tools/gputest.mjs
import { serve } from './serve.mjs';
import { ROOT, launchOptions, angleBackend } from './lib.mjs';
import { chromium } from 'playwright';

const srv = await serve(ROOT); const port = srv.address().port;
let code = 0;
try {
  const b = await chromium.launch(launchOptions());
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${port}/src/gputest.html`);
  await page.waitForFunction(() => window.ready);
  const info = await page.evaluate(() => window.glInfo);
  const cdp = await page.context().newCDPSession(page);
  const time = async (label, fn) => { const t0 = performance.now(); for (let i = 0; i < 10; i++) { await page.evaluate(t => window.seek(t), i * 0.1); await fn(); } return `${label} ${((performance.now() - t0) / 10).toFixed(0)} ms`; };
  const r1 = await time('cdp-png', () => cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }));
  const r2 = await time('cdp-jpeg95', () => cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true }));
  const r3 = await time('pw-jpeg', () => page.screenshot({ type: 'jpeg', quality: 95 }));
  await b.close();
  const angle = angleBackend();
  console.log(`WebGL renderer: ${info || '(unavailable)'}`);
  console.log(`ANGLE backend: ${angle || '(Chromium default)'} · set ANGLE_BACKEND to change it, ANGLE_BACKEND= to pass none`);
  console.log(`capture per frame: ${r1} (the renderer uses this one) · ${r2} · ${r3}`);
  if (!info || /swiftshader|llvmpipe|softpipe|software|basic render/i.test(info)) {
    console.log('WARNING: no hardware GPU in headless Chromium. Rendering will run on the CPU and be slow. Try another ANGLE_BACKEND (for example gl, vulkan, d3d11, metal) or point CHROMIUM_PATH at a GPU-enabled Chromium.');
  }
} catch (e) {
  console.log(`ERROR: Chromium did not start: ${e.message.split('\n')[0]}`);
  console.log('Run `npx playwright install chromium` in the engine folder (on Linux also `npx playwright install-deps chromium`), or set CHROMIUM_PATH.');
  code = 1;
}
srv.close();
process.exit(code);
