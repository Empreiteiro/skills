// Scene item 'particles': an ambient field in a 2D canvas: dust in the light, steam rising from a mug, rain,
// sparks, scraps of paper, snow. Each particle is born from a seed and its position is a closed-form function of t
// (nothing is integrated frame by frame), so frame t comes out the same in any worker and in any order. Motion
// trails come from the render's sub-frames, like the rest of the engine.
//
//   shape          dust | vapor | rain | sparks | papers | snow
//   x, y, w, h     area (frame px; default the whole frame) · n · color (string or list) · size (px) · vel (px/s)
//   t0, t1         window in which it shows (fades in and out over `fade` s, default 0.4) · seed · op (0–1) · wind (px/s)
//   source [x, y]  where steam and sparks come from (frame px; default the bottom of the area) · cone (degrees, sparks)
//   gravity        sparks only (px/s², default 900)
//   sparkle        'lighter' compositing (default on dark skins for dust and sparks) · blur (px, CSS blur)
import { el, css } from '../../core/dom.js';
import { mulberry32, noise1, smoothstep, TAU } from '../../core/math.js';

const DEF = {
  dust: { n: 70, size: 3, vel: 8, color: P => (P.dark ? '#ffe6bf' : '#7d7466') },
  vapor: { n: 4, size: 5, vel: 70, color: P => (P.dark ? '#ffffff' : '#9d978f') },
  rain: { n: 140, size: 1.6, vel: 1400, color: P => (P.dark ? '#cfdcf2' : '#6d7c92') },
  sparks: { n: 60, size: 2.2, vel: 520, color: () => '#ffc56e' },
  papers: { n: 26, size: 16, vel: 110, color: () => ['#ffffff', '#f6f1e7', '#ece4d6'] },
  snow: { n: 120, size: 3.5, vel: 70, color: () => '#ffffff' },
};
const mod = (a, m) => ((a % m) + m) % m;
const rgbOf = c => {
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) return m[1].split(',').slice(0, 3).map(v => parseFloat(v));
  return [255, 255, 255];
};
const sprites = new Map();
/** Soft dot (radial gradient), pre-drawn once per colour. */
function sprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), [r, gg, b] = rgbOf(color), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.55)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  sprites.set(color, c);
  return c;
}

export function mountParticles(parent, it, P) {
  const shape = DEF[it.shape] ? it.shape : 'dust', D = DEF[shape];
  const X = it.x ?? 0, Y = it.y ?? 0, W = Math.ceil(it.w ?? 1080), H = Math.ceil(it.h ?? 1920);
  const cv = css(el(parent, 'abs', null, 'canvas'), { left: X + 'px', top: Y + 'px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const blur = it.blur ?? (shape === 'vapor' ? 2 : 0);
  if (blur) cv.style.filter = `blur(${blur}px)`;
  const r = mulberry32(it.seed ?? 7);
  const n = it.n ?? D.n, size = it.size ?? D.size, vel = it.vel ?? D.vel, wind = it.wind ?? 0, op = it.op ?? 1;
  const colors = [].concat(it.color || D.color(P));
  const sparkle = it.sparkle ?? (P.dark && (shape === 'dust' || shape === 'sparks'));
  const F = it.source ? [it.source[0] - X, it.source[1] - Y] : [W / 2, H * 0.92];
  const ps = Array.from({ length: n }, () => ({ u: r(), v: r(), a: r(), b: r(), c: r(), d: r(), color: colors[Math.floor(r() * colors.length)] }));
  const t0 = it.t0 ?? -1e9, t1 = it.t1 ?? 1e9, fade = it.fade ?? 0.4;
  const edgeFade = (x, y, m = 36) => smoothstep(0, m, x) * smoothstep(0, m, W - x) * smoothstep(0, m, y) * smoothstep(0, m, H - y);

  const draw = {
    dust(t, env) {
      for (const p of ps) {
        const sp = vel * (0.4 + 0.8 * p.c);
        const x = mod(p.u * W + 26 * noise1(t * 0.23 + p.a * 50) + wind * t, W);
        const y = mod(p.v * H + 26 * noise1(t * 0.19 + p.b * 50) - sp * t, H);
        const tw = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.8 + 2.2 * p.d) + p.a * 40), 2);
        const s = size * (0.5 + p.c);
        g.globalAlpha = Math.min(1, op * env * tw * edgeFade(x, y));
        g.drawImage(sprite(p.color), x - s * 2, y - s * 2, s * 4, s * 4);
      }
    },
    snow(t, env) {
      for (const p of ps) {
        const sp = vel * (0.5 + 0.9 * p.c), s = size * (0.45 + 0.9 * p.c);
        const y = mod(p.v * (H + 40) + sp * t, H + 40) - 20;
        const x = mod(p.u * W + 30 * Math.sin(t * (0.6 + 0.9 * p.a) + p.b * TAU) + wind * t, W);
        g.globalAlpha = Math.min(1, op * env * (0.55 + 0.45 * p.d) * edgeFade(x, y, 20));
        g.drawImage(sprite(p.color), x - s * 2, y - s * 2, s * 4, s * 4);
      }
    },
    rain(t, env) {
      g.lineCap = 'round';
      for (const p of ps) {
        const sp = vel * (0.8 + 0.4 * p.c), len = size * 22 * (0.7 + 0.6 * p.c), dx = (wind / sp) * len;
        const y = mod(p.v * (H + len) + sp * t, H + len) - len;
        const x = mod(p.u * W + wind * t * (0.8 + 0.4 * p.c), W);
        g.globalAlpha = op * env * (0.3 + 0.4 * p.d);
        g.strokeStyle = p.color; g.lineWidth = Math.max(0.8, size * (0.6 + 0.5 * p.a));
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + len); g.stroke();
      }
    },
    sparks(t, env) {
      g.lineCap = 'round';
      const cone = (it.cone ?? 70) * Math.PI / 180, grav = it.gravity ?? 900;
      for (const p of ps) {
        const Tp = 0.9 + 0.8 * p.a, age = mod(t + p.b * Tp, Tp), life = 0.45 + 0.4 * p.c;
        if (age > life) continue;
        const a = -Math.PI / 2 + (p.u - 0.5) * 2 * cone, sp = vel * (0.6 + 0.8 * p.d);
        const x = F[0] + Math.cos(a) * sp * age + wind * age, y = F[1] + Math.sin(a) * sp * age + 0.5 * grav * age * age;
        const vx = Math.cos(a) * sp + wind, vy = Math.sin(a) * sp + grav * age, k = 1 - age / life;
        g.globalAlpha = op * env * Math.pow(k, 1.5);
        g.strokeStyle = p.color; g.lineWidth = size * (0.5 + 0.5 * k);
        g.beginPath(); g.moveTo(x - vx * 0.022, y - vy * 0.022); g.lineTo(x, y); g.stroke();
      }
    },
    papers(t, env) {
      const edgeColor = P.dark ? 'rgba(0,0,0,.35)' : 'rgba(32,30,29,.35)';
      for (const p of ps) {
        const sp = vel * (0.6 + 0.8 * p.c);
        const y = mod(p.v * (H + 60) + sp * t, H + 60) - 30;
        const x = mod(p.u * W + 40 * Math.sin(t * (0.8 + 0.8 * p.a) + p.b * TAU) + wind * t, W);
        const rot = p.d * TAU + t * (1 + 2 * p.a) * (p.b < 0.5 ? -1 : 1), flip = Math.cos(t * (2 + 3 * p.c) + p.a * TAU);
        const w = size * (0.8 + 0.6 * p.d), h = w * 0.72;
        g.save(); g.globalAlpha = op * env; g.translate(x, y); g.rotate(rot); g.scale(1, Math.abs(flip) < 0.06 ? 0.06 * Math.sign(flip || 1) : flip);
        g.fillStyle = p.color; g.fillRect(-w / 2, -h / 2, w, h);
        g.strokeStyle = edgeColor; g.lineWidth = 1; g.strokeRect(-w / 2, -h / 2, w, h);
        g.restore();
      }
    },
    vapor(t, env) {
      g.lineCap = 'round';
      const m = 28;
      for (const p of ps) {
        const Tp = 2.4 + 1.6 * p.a, life = mod(t + p.b * Tp, Tp) / Tp;
        const plumeH = (it.h ?? H) * (0.5 + 0.4 * p.c) * Math.min(1, (vel * Tp) / Math.max(1, H));
        const zHi = Math.min(1, life * 1.7), zLo = Math.max(0, (life - 0.42) * 1.75);
        if (zHi - zLo < 0.02) continue;
        const x0 = F[0] + (p.u - 0.5) * 26, amp = 14 + 22 * p.d, k = 1.2 + p.a;
        const pt = z => [x0 + amp * z * Math.sin(k * z * TAU - t * (1.6 + p.c) + p.b * TAU) + 10 * z * (p.u - 0.5), F[1] - z * plumeH];
        for (let i = 0; i < m; i++) {
          const za = zLo + ((zHi - zLo) * i) / m, zb = zLo + ((zHi - zLo) * (i + 1)) / m, zm = (za + zb) / 2;
          const q = (zm - zLo) / (zHi - zLo), a = Math.sin(Math.PI * q) * Math.pow(1 - zm, 0.6);
          const [xa, ya] = pt(za), [xb, yb] = pt(zb);
          g.globalAlpha = op * env * 0.5 * a;
          g.strokeStyle = p.color; g.lineWidth = size * (1 + 2.2 * zm);
          g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
        }
      }
    },
  };

  return {
    node: cv,
    upd(t) {
      const env = Math.min(smoothstep(t0, t0 + fade, t), 1 - smoothstep(t1 - fade, t1, t));
      if (env <= 0) { cv.style.display = 'none'; return; }
      cv.style.display = 'block';
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = sparkle ? 'lighter' : 'source-over';
      draw[shape](t, env);
      g.globalAlpha = 1;
    },
  };
}
