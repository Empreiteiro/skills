// Text that turns to dust, and dust that turns into other text, in a 2D canvas inside the DOM, so it works over
// any skin (the GL canvas sits behind the DOM's background). It samples the glyph pixels exactly where the DOM
// drew them, and each particle travels from a pixel of text A to a pixel of text B along a fixed (seeded) curve,
// as a function of t. Motion trails come from the render's sub-frames (--sub 3+).
//
//   const p = dust(layer, { n: 5000, color: '#201e1d', seed: 3 });
//   p.from(nodeA); p.to(nodeB);               // DOM nodes already built (layer visible during init, to measure)
//   update: p.frame(t, { t0, t1, scatter })    // before t0: nothing; after t1: nothing (the shot shows node B)
import { el, css } from '../../core/dom.js';
import { mulberry32, clamp, prog } from '../../core/math.js';

function samplePoints(node, base, step = 2) {
  // redraws each letter of the node on a frame-sized canvas, at its measured position, and collects the lit pixels
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const b = base.getBoundingClientRect();
  const walk = n => {
    if (n.nodeType === 3) {
      const cs = getComputedStyle(n.parentElement);
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      g.fillStyle = '#fff';
      g.textBaseline = 'alphabetic';
      const m = g.measureText('Hg'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      for (let i = 0; i < n.textContent.length; i++) {
        const ch = n.textContent[i]; if (ch === ' ') continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
        const q = r.getBoundingClientRect();
        if (q.width <= 0) continue;
        g.fillText(ch, q.left - b.left, q.top - b.top + (q.height - (asc + desc)) / 2 + asc);
      }
    } else for (const c of n.childNodes) walk(c);
  };
  walk(node);
  const d = g.getImageData(0, 0, 1080, 1920).data, pts = [];
  for (let y = 0; y < 1920; y += step) for (let x = 0; x < 1080; x += step) if (d[(y * 1080 + x) * 4 + 3] > 120) pts.push(x, y);
  return pts;
}

export function dust(layer, { n = 5000, color = '#201e1d', seed = 3, size = 2.2, sparkle = false, z = 5 } = {}) {
  const cv = css(el(layer, 'abs', null, 'canvas'), { left: '0px', top: '0px', width: '1080px', height: '1920px', zIndex: String(z), pointerEvents: 'none' });
  cv.width = 1080; cv.height = 1920;
  const g = cv.getContext('2d');
  let A = null, B = null, P = null;
  const build = () => {
    if (!A) return;
    const r = mulberry32(seed), N = n;
    P = new Float32Array(N * 8);
    for (let i = 0; i < N; i++) {
      const pick = Math.floor(r() * (A.length / 2)) * 2;
      const jb = B && B.length ? Math.floor(r() * (B.length / 2)) * 2 : -1;
      const ax = A[pick] + r() * 2 - 1, ay = A[pick + 1] + r() * 2 - 1;
      const bx = jb >= 0 ? B[jb] + r() * 2 - 1 : ax + (r() - 0.5) * 900, by = jb >= 0 ? B[jb + 1] + r() * 2 - 1 : ay - 200 - r() * 700;
      // delay by x position (the dust lets go from left to right, like reading) and a curve offset
      P.set([ax, ay, bx, by, clamp(ax / 1080) * 0.35 + r() * 0.12, (r() - 0.5) * 520, (r() - 0.5) * 380 - 120, r()], i * 8);
    }
  };
  return {
    canvas: cv,
    from(node, base = layer) { A = samplePoints(node, base); build(); return A.length / 2; },
    to(node, base = layer) { B = node ? samplePoints(node, base) : null; build(); return B ? B.length / 2 : 0; },
    /** t0 → t1: A dissolves, flies and (if there is a B) settles into B. scatter: how wide the cloud opens midway. */
    frame(t, { t0, t1, scatter = 1, alpha = 1 } = {}) {
      g.clearRect(0, 0, 1080, 1920);
      if (!P || t < t0 || t > t1) { cv.style.display = 'none'; return; }
      cv.style.display = 'block';
      g.globalCompositeOperation = sparkle ? 'lighter' : 'source-over';
      g.fillStyle = color;
      const D = t1 - t0, N = P.length / 8;
      for (let i = 0; i < N; i++) {
        const o = i * 8, ax = P[o], ay = P[o + 1], bx = P[o + 2], by = P[o + 3], dl = P[o + 4], cx = P[o + 5] * scatter, cy = P[o + 6] * scatter, rr = P[o + 7];
        const s = clamp((t - t0) / D * (1 + 0.47) - dl);
        const e = s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;   // in-out cubic
        const k = Math.sin(Math.PI * e);                                       // the curve opens up in the middle
        const x = ax + (bx - ax) * e + cx * k + Math.sin((t - t0) * 6 + rr * 40) * 6 * k;
        const y = ay + (by - ay) * e + cy * k;
        const a = alpha * (0.55 + 0.45 * rr) * (B ? 1 : 1 - e);
        if (a <= 0.01) continue;
        g.globalAlpha = a;
        const sz = size * (0.7 + 0.6 * rr) * (1 + 0.6 * k);
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    },
  };
}
export { prog };
