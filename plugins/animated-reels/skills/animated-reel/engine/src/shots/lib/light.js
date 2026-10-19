// Scene item 'light': light and colour over the scene: the lamp, window light, the vignette, a colour layer and
// film grain. A dark CSS gradient bands (Chrome does not dither it), so every gradient here is painted pixel by
// pixel into a canvas during init, with ±1 LSB triangular dither, and the grain is redrawn per frame with that
// frame's own seed (floor(t × fps)), so it stays deterministic.
//
//   shape     radial | blinds | vignette | ink | grain
//   common    op (opacity) · blend (mix-blend-mode) · t0, t1 (+ fade s) · flicker { amp, freq } | true · z · depth
//   radial    x, y (centre) · r | rx, ry · color · falloff (1 linear, 2 default, 3 more concentrated)
//   blinds    window beams: x, y, w, h (area; default the frame) · ang (degrees from vertical, default 24) · n (beams) ·
//             breadth · gap · color · soften (soft edge width, px) · reach (0–1: where the beam ends) ·
//             origin [x, y] (centre of the first beam at the top)
//   vignette  strength (0–1) · radius (0–1: where it starts) · color
//   ink       colour layer: color | [color1, color2] (gradient, with ang) · x, y, w, h
//   grain     size (grain px, default 1.5) · fps (how often the grain changes, default 24) · op (default 0.07) ·
//             blend (default overlay)
import { el, css } from '../../core/dom.js';
import { mulberry32, clamp, smoothstep, fbm1 } from '../../core/math.js';

const rgbOf = c => {
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) return m[1].split(',').slice(0, 3).map(v => parseFloat(v));
  return [255, 255, 255];
};
// deterministic triangular dither (pixel hash): removes the 1/255 step without becoming visible noise
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tri = (x, y) => hash(x, y) + hash(x + 7919, y + 104729) - 1;

/** W×H canvas painted by f(px, py) → [r, g, b, a(0–1)], with dither on the alpha channel and on the colour. */
function paint(W, H, f) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, gg, b, a] = f(x + 0.5, y + 0.5), n = tri(x, y), i = (y * W + x) * 4;
    d[i] = clamp(r + n, 0, 255); d[i + 1] = clamp(gg + n, 0, 255); d[i + 2] = clamp(b + n, 0, 255); d[i + 3] = clamp(a * 255 + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return cv;
}

export function mountLight(parent, it, P) {
  const shape = it.shape || 'radial';
  let node, frame = null;
  if (shape === 'radial') {
    const rx = it.rx ?? it.r ?? 420, ry = it.ry ?? it.r ?? 420, cx = it.x ?? 540, cy = it.y ?? 700, falloff = it.falloff ?? 2;
    // only the part that can show (the frame plus slack for the camera)
    const X0 = Math.max(Math.floor(cx - rx), -240), Y0 = Math.max(Math.floor(cy - ry), -240), X1 = Math.min(Math.ceil(cx + rx), 1320), Y1 = Math.min(Math.ceil(cy + ry), 2160);
    const [r, g, b] = rgbOf(it.color || '#ffd9a0');
    const cv = paint(Math.max(1, X1 - X0), Math.max(1, Y1 - Y0), (x, y) => { const dx = (x + X0 - cx) / rx, dy = (y + Y0 - cy) / ry, dd = Math.sqrt(dx * dx + dy * dy); return [r, g, b, dd >= 1 ? 0 : Math.pow(1 - dd, falloff)]; });
    node = css(el(parent, 'abs'), { left: X0 + 'px', top: Y0 + 'px', width: (X1 - X0) + 'px', height: (Y1 - Y0) + 'px', pointerEvents: 'none' });
    css(cv, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%' });
    node.appendChild(cv);
  } else if (shape === 'blinds') {
    const X = it.x ?? 0, Y = it.y ?? 0, W = Math.ceil(it.w ?? 1080), H = Math.ceil(it.h ?? 1920);
    const ang = ((it.ang ?? 24) * Math.PI) / 180, n = it.n ?? 3, breadth = it.breadth ?? 150, gap = it.gap ?? 90, soften = it.soften ?? 36;
    const dx = Math.sin(ang), dy = Math.cos(ang), nx = Math.cos(ang), ny = -Math.sin(ang);   // along · across
    const O = it.origin ? [it.origin[0] - X, it.origin[1] - Y] : [W * 0.28, 0];
    const reachPx = (it.reach ?? 0.9) * Math.hypot(W, H);
    const [r, g, b] = rgbOf(it.color || '#fff1d6');
    const cv = paint(W, H, (x, y) => {
      const px = x - O[0], py = y - O[1], v = px * dx + py * dy, u = px * nx + py * ny;
      if (v < -soften) return [r, g, b, 0];
      let a = 0;
      for (let k = 0; k < n; k++) { const uc = k * (breadth + gap), du = Math.abs(u - uc); a = Math.max(a, 1 - smoothstep(breadth / 2 - soften, breadth / 2 + soften, du)); }
      const q = clamp(v / reachPx);
      return [r, g, b, a * Math.pow(1 - q, 1.6) * smoothstep(-soften, soften * 2, v)];
    });
    node = css(el(parent, 'abs'), { left: X + 'px', top: Y + 'px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
    css(cv, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%' });
    node.appendChild(cv);
  } else if (shape === 'vignette') {
    const strength = it.strength ?? 0.55, radius = it.radius ?? 0.45, [r, g, b] = rgbOf(it.color || '#000000');
    const cv = paint(1080, 1920, (x, y) => { const dx = (x - 540) / 540, dy = (y - 960) / 960, d = Math.sqrt(dx * dx * 0.92 + dy * dy * 0.85); return [r, g, b, strength * smoothstep(radius, 1.3, d)]; });
    node = css(el(parent, 'abs'), { left: '0px', top: '0px', width: '1080px', height: '1920px', pointerEvents: 'none' });
    css(cv, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%' });
    node.appendChild(cv);
  } else if (shape === 'ink') {
    const X = it.x ?? 0, Y = it.y ?? 0, W = Math.ceil(it.w ?? 1080), H = Math.ceil(it.h ?? 1920);
    node = css(el(parent, 'abs'), { left: X + 'px', top: Y + 'px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
    if (Array.isArray(it.color)) {
      const [a0, a1] = [rgbOf(it.color[0]), rgbOf(it.color[1])], ang = ((it.ang ?? 180) * Math.PI) / 180;
      const ux = Math.sin(ang), uy = -Math.cos(ang), half = (Math.abs(W * ux) + Math.abs(H * uy)) / 2;
      const cv = paint(W, H, (x, y) => { const q = clamp(((x - W / 2) * ux + (y - H / 2) * uy) / (2 * half) + 0.5); return [a0[0] + (a1[0] - a0[0]) * q, a0[1] + (a1[1] - a0[1]) * q, a0[2] + (a1[2] - a0[2]) * q, 1]; });
      css(cv, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%' });
      node.appendChild(cv);
    } else node.style.background = it.color || '#f2b880';
  } else if (shape === 'grain') {
    const size = it.size ?? 1.5, W = Math.ceil(1080 / size), H = Math.ceil(1920 / size), fps = it.fps ?? 24;
    const cv = css(el(parent, 'abs', null, 'canvas'), { left: '0px', top: '0px', width: '1080px', height: '1920px', pointerEvents: 'none' });
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    // 6 tiles of 256 px of near-Gaussian grey noise; per frame: one tile and an offset picked by hash
    const tiles = Array.from({ length: 6 }, (_, k) => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const gg = c.getContext('2d'), im = gg.createImageData(256, 256), r = mulberry32(9001 + k * 131);
      for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() + r() + r() - 1.5) * 118; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      gg.putImageData(im, 0, 0);
      return g.createPattern(c, 'repeat');
    });
    let last = null;
    node = cv;
    frame = t => {
      const f = Math.floor(t * fps + 1e-6);
      if (f === last) return;
      last = f;
      const h1 = hash(f, 17), h2 = hash(f, 91);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.translate(-Math.floor(h1 * 256), -Math.floor(h2 * 256));
      g.fillStyle = tiles[((f % 6) + 6) % 6];
      g.fillRect(0, 0, W + 256, H + 256);
    };
  } else throw new Error('light: unknown shape ' + shape);

  // the grain's default blend (overlay) is applied by the scene on the item's wrapper (defaultBlend)
  const t0 = it.t0 ?? -1e9, t1 = it.t1 ?? 1e9, fade = it.fade ?? 0.4, op = it.op ?? (shape === 'grain' ? 0.07 : 1);
  const FL = it.flicker ? { amp: 0.22, freq: 6, ...(it.flicker === true ? {} : it.flicker) } : null;
  return {
    node,
    upd(t) {
      const env = Math.min(smoothstep(t0, t0 + fade, t), 1 - smoothstep(t1 - fade, t1, t));
      let o = op * env;
      if (FL) o *= 1 - FL.amp * (0.5 + 0.5 * fbm1(t * FL.freq + (FL.seed ?? 3.7), 2));
      if (o <= 0.001) { node.style.display = 'none'; return; }
      node.style.display = 'block';
      node.style.opacity = o.toFixed(4);
      if (frame) frame(t);
    },
  };
}

/** Each shape's default blend (the scene sets it on the item's wrapper when the script names none). */
export const defaultBlend = it => (it.shape === 'grain' ? 'overlay' : null);
