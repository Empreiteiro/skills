// Scene item 'stroke': a hand-drawn SVG gesture that draws itself: the loop around a phrase, the underline, the
// arrow to the margin, the editor's bracket, the lightning bolt of an idea, the sweat drop. It has to look like a
// pen, not an icon: the gesture overshoots, wobbles (tremor by seed: two instances of the same preset never come
// out identical) and the pressure varies along the stroke (starts thin, thickens, thins out at the end).
//
// How it draws: each stroke becomes a dense centre line (centripetal Catmull-Rom over the gesture's points, plus
// a smooth low-frequency tremor) cut into short pieces. Each piece is a <path> with the pressure's thickness for
// that stretch, and the pen advances via stroke-dasharray/dashoffset over each piece's length, measured during
// init. A stroke that crosses itself (the end of the circle over its start) appears in the order the pen passes,
// because each piece only lights up when its turn comes.
//
// Presets (shape): circle · underline · arrow · bracket · x · check · motion-lines · sparkle · sweat-drop ·
// question · exclamation · spiral · scribble · bolt · thought-cloud · heart · caret · strike · wave · lasso
// Or d: 'M…' (paths in a viewBox, default 0 0 100 100; one stroke per string, or several absolute Ms in one string).
import { css } from '../../core/dom.js';
import { prog, clamp, lerp, mulberry32, noise1, smoothstep, TAU } from '../../core/math.js';
import * as K from './ui.js';
import { svgDefs } from './boil.js';

const NS = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;
const EASE_PEN = K.bezier(0.42, 0, 0.2, 1);   // the hand accelerates quickly and brakes at the end of the gesture

// ── presets: (r, W, H, o) → [{ pts: [[x, y]…], straight?, point?, closed? }] in box px (0..W × 0..H) ──────────
const circ = (cx, cy, rx, ry, a0, n = 16, loop = 1.06) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 - (i / n) * loop * TAU; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

export const PRESETS = {
  circle(r, W, H, o) {
    const a0 = (-100 + (r() - 0.5) * 50) * DEG, loop = (o.loop ?? 1.13) + (r() - 0.5) * 0.08;
    const dir = o.clockwise ? 1 : -1, n = 32, tilt = (r() - 0.5) * 5 * DEG, drift = 0.025 + r() * 0.03, ph = r() * TAU;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n, a = a0 + dir * q * loop * TAU, rr = 1 + 0.03 * Math.sin(2 * a + ph) - drift * q;
      const ex = Math.cos(a) * rr * W / 2, ey = Math.sin(a) * rr * H / 2;
      pts.push([W / 2 + ex * Math.cos(tilt) - ey * Math.sin(tilt), H / 2 + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
    }
    return [{ pts }];
  },
  underline(r, W, H, o) {
    const n = 8, arc = (r() - 0.35) * 0.5, rise = -(0.15 + r() * 0.2), out = [];
    const line = (y0, shorten) => { const pts = []; for (let i = 0; i <= n; i++) { const q = i / n; pts.push([W * (-0.01 + shorten * 0.01 + q * (1.02 - shorten * 0.08)), H * (y0 + rise * (q - 0.5) + arc * Math.sin(Math.PI * q) * 0.6)]); } return pts; };
    out.push({ pts: line(0.5, 0) });
    if (o.twice) out.push({ pts: line(1.25, 1) });
    if (o.hook) { const p = out[0].pts, [x, y] = p[p.length - 1]; p.push([x + H * 0.25, y - H * 0.55], [x - H * 0.05, y - H * 1.1]); }
    return out;
  },
  arrow(r, W, H, o) {
    const A = o.A || [W * 0.06, H * 0.92], B = o.B || [W * 0.94, H * 0.1];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.max(1, Math.hypot(dx, dy)), nx = -dy / len, ny = dx / len;
    const cv = o.curve ?? 0.12, M = [A[0] + dx * 0.5 + nx * len * cv, A[1] + dy * 0.5 + ny * len * cv];
    const shaft = [];
    for (let i = 0; i <= 10; i++) { const q = i / 10; shaft.push([(1 - q) * (1 - q) * A[0] + 2 * (1 - q) * q * M[0] + q * q * B[0], (1 - q) * (1 - q) * A[1] + 2 * (1 - q) * q * M[1] + q * q * B[1]]); }
    const tl = Math.max(1e-6, Math.hypot(B[0] - M[0], B[1] - M[1])), ux = (B[0] - M[0]) / tl, uy = (B[1] - M[1]) / tl;
    const hl = clamp(len * 0.17, 18, 70) * (o.head ?? 1), ang = (27 + (r() - 0.5) * 8) * DEG;
    const wing = (a, k) => [B[0] + (-ux * Math.cos(a) + uy * Math.sin(a)) * hl * k, B[1] + (-uy * Math.cos(a) - ux * Math.sin(a)) * hl * k];
    return [{ pts: shaft }, { pts: [wing(ang, 0.9 + r() * 0.2), [B[0] + ux * 3, B[1] + uy * 3], wing(-ang, 0.9 + r() * 0.2)], straight: true }];
  },
  bracket(r, W, H, o) {
    const X = x => (o.side === 'right' ? W - x : x);
    return [{ pts: [[X(W * 0.95), H * 0.02], [X(W * 0.32), H * 0.005], [X(W * 0.12), H * 0.045], [X(W * 0.1), H * 0.5], [X(W * 0.13), H * 0.955], [X(W * 0.33), H], [X(W * 0.97), H * 0.985]] }];
  },
  x(r, W, H) {
    const j = () => (r() - 0.5) * 0.06;
    return [
      { pts: [[W * (0.08 + j()), H * (0.08 + j())], [W * 0.5, H * (0.5 + j())], [W * (0.95 + j()), H * (0.95 + j())]] },
      { pts: [[W * (0.92 + j()), H * (0.06 + j())], [W * (0.5 + j()), H * 0.5], [W * (0.06 + j()), H * (0.96 + j())]] },
    ];
  },
  check(r, W, H) {
    return [{ pts: [[W * 0.04, H * (0.52 + (r() - 0.5) * 0.08)], [W * 0.2, H * 0.72], [W * 0.36, H * 0.93], [W * 0.62, H * 0.5], [W * 0.98, H * 0.02]] }];
  },
  'motion-lines'(r, W, H, o) {
    const n = o.n ?? 3, out = [];
    for (let i = 0; i < n; i++) {
      const y = H * (n === 1 ? 0.5 : 0.1 + (0.8 * i) / (n - 1)) + (r() - 0.5) * H * 0.08;
      const x0 = W * (0.04 + r() * 0.24), x1 = W * (0.72 + r() * 0.26);
      out.push({ pts: [[x0, y], [(x0 + x1) / 2, y + (r() - 0.5) * H * 0.05], [x1, y + (r() - 0.5) * H * 0.04]] });
    }
    return out;
  },
  sparkle(r, W, H, o) {
    const n = o.n ?? 8, out = [], a0 = (-90 + (r() - 0.5) * 12) * DEG;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * TAU) / n + (r() - 0.5) * 8 * DEG, long = i % 2 === 0;
      const r0 = 0.2 + r() * 0.06, r1 = (long ? 0.5 : 0.35) - r() * 0.04;
      out.push({ pts: [[W / 2 + Math.cos(a) * W * r0, H / 2 + Math.sin(a) * H * r0], [W / 2 + Math.cos(a) * W * r1, H / 2 + Math.sin(a) * H * r1]] });
    }
    return out;
  },
  'sweat-drop'(r, W, H) {
    const pts = [], n = 26, cx = W * 0.5;
    for (let i = 0; i <= n; i++) { const t = TAU * (i / n) * 1.04; pts.push([cx + W * 0.44 * Math.sin(t) * Math.sin(t / 2), H * (0.5 - 0.48 * Math.cos(t))]); }
    return [{ pts, closed: true }];
  },
  question(r, W, H) {
    return [
      { pts: [[W * 0.2, H * 0.3], [W * 0.28, H * 0.1], [W * 0.52, H * 0.02], [W * 0.78, H * 0.14], [W * 0.76, H * 0.36], [W * 0.54, H * 0.5], [W * 0.5, H * 0.68]] },
      { pts: [[W * 0.5, H * 0.9], [W * 0.505, H * 0.906]], point: true },
    ];
  },
  exclamation(r, W, H) {
    return [
      { pts: [[W * 0.53, H * 0.02], [W * 0.5, H * 0.35], [W * 0.49, H * 0.68]] },
      { pts: [[W * 0.49, H * 0.9], [W * 0.495, H * 0.906]], point: true },
    ];
  },
  spiral(r, W, H, o) {
    const turns = o.turns ?? 2.6, n = 64, a0 = r() * TAU, pts = [];
    for (let i = 0; i <= n; i++) { const q = i / n, a = a0 + q * turns * TAU, rr = 0.03 + 0.47 * q; pts.push([W / 2 + Math.cos(a) * rr * W, H / 2 + Math.sin(a) * rr * H]); }
    return [{ pts }];
  },
  scribble(r, W, H, o) {
    const n = o.n ?? 16, pts = [], ph = r() * TAU;
    for (let i = 0; i <= n; i++) { const q = i / n, a = ph + i * 2.2; pts.push([W * (0.05 + 0.9 * q) + Math.cos(a) * W * 0.05, H * (0.5 + 0.4 * Math.sin(a) + (r() - 0.5) * 0.1)]); }
    if (o.loop) for (let i = n - 1; i >= 0; i--) { const q = i / n, a = ph + 1.1 + i * 2.2; pts.push([W * (0.05 + 0.9 * q) + Math.cos(a) * W * 0.05, H * (0.5 + 0.36 * Math.sin(a) + (r() - 0.5) * 0.1)]); }
    return [{ pts }];
  },
  bolt(r, W, H) {
    const j = () => (r() - 0.5) * 0.05;
    return [{ pts: [[W * (0.66 + j()), 0], [W * (0.26 + j()), H * (0.53 + j())], [W * (0.62 + j()), H * (0.47 + j())], [W * (0.32 + j()), H]], straight: true }];
  },
  'thought-cloud'(r, W, H, o) {
    const cx = W * 0.58, cy = H * 0.38, rx = W * 0.4, ry = H * 0.33, nb = o.bubbles ?? 7, n = nb * 10, a0 = (-90 + r() * 30) * DEG, ph = r() * 0.6, pts = [];
    for (let i = 0; i <= n * 1.04; i++) { const a = a0 + (i / n) * TAU, b = Math.abs(Math.sin((a - a0) * nb / 2 + ph)), k = 0.84 + 0.2 * Math.pow(b, 0.6); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return [{ pts, closed: true }, { pts: circ(W * 0.2, H * 0.8, W * 0.06, W * 0.055, r() * TAU), closed: true }, { pts: circ(W * 0.08, H * 0.94, W * 0.034, W * 0.032, r() * TAU, 12), closed: true }];
  },
  heart(r, W, H) {
    const pts = [], n = 44;
    for (let i = 0; i <= n * 1.03; i++) { const t = Math.PI + (i / n) * TAU; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([W * (0.5 + x / 34), H * ((12.5 - y) / 30)]); }
    return [{ pts, closed: true }];
  },
  caret(r, W, H) {
    return [{ pts: [[W * 0.06, H * 0.96], [W * (0.5 + (r() - 0.5) * 0.04), H * 0.04], [W * 0.94, H * 0.98]], straight: true }];
  },
  strike(r, W, H) {
    return [{ pts: [[-W * 0.01, H * (0.56 + (r() - 0.5) * 0.2)], [W * 0.5, H * (0.49 + (r() - 0.5) * 0.2)], [W * 1.01, H * (0.43 + (r() - 0.5) * 0.2)]] }];
  },
  wave(r, W, H, o) {
    const lam = o.lambda ?? Math.max(22, H * 1.8), n = Math.max(8, Math.ceil((W / lam) * 6)), ph = r() * TAU, pts = [];
    for (let i = 0; i <= n; i++) { const x = (W * i) / n; pts.push([x, H * (0.5 + 0.42 * Math.sin(ph + (TAU * x) / lam))]); }
    return [{ pts }];
  },
  lasso(r, W, H) {   // the editor's "delete": runs along the line and closes in a loop
    const R = Math.min(W * 0.09, H * 0.34), cx = W * 0.8, cy = H * 0.34, pts = [[0, H * 0.56], [W * 0.36, H * 0.53], [W * 0.68, H * 0.5]];
    for (let i = 0; i <= 14; i++) { const a = Math.PI * 0.75 - (i / 14) * TAU * 1.08; pts.push([cx + Math.cos(a) * R, cy - Math.sin(a) * R]); }
    pts.push([W * 0.97, H * 0.9]);
    return [{ pts }];
  },
};

// ── geometry: spline, tremor, resampling, pieces ────────────────────────────────────────────────────────────
function spline(pts, step) {
  if (pts.length < 2) return pts.map(p => [...p]);
  const n = pts.length, P = [[2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]], ...pts, [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]]];
  const out = [[...pts[0]]];
  const d = (a, b) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const t0 = 0, t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= m; k++) {
      const t = t1 + ((t2 - t1) * k) / m, L = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}
function straightLine(pts, step) {
  const out = [[...pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= m; k++) out.push([lerp(a[0], b[0], k / m), lerp(a[1], b[1], k / m)]);
  }
  return out;
}
/** Hand tremor: a smooth offset (low-frequency noise along the length), not a jagged one. */
function jitter(pts, amp, sx, sy, lam = 55) {
  if (!amp) return pts;
  let s = 0;
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    return [p[0] + amp * noise1(s / lam + sx), p[1] + amp * noise1(s / lam + sy)];
  });
}
function lengths(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return s;
}
const f2 = v => (Math.round(v * 100) / 100).toString();
const dPts = (pts, i0 = 0, i1 = pts.length - 1) => { let d = `M${f2(pts[i0][0])} ${f2(pts[i0][1])}`; for (let i = i0 + 1; i <= i1; i++) d += `L${f2(pts[i][0])} ${f2(pts[i][1])}`; return d; };

/** A finished stroke: dense line + pieces { i0, i1, a, b, len, w }. */
function denseStroke(st, o) {
  const step = 2;
  let pts = st.straight || st.dense ? straightLine(st.pts, step) : spline(st.pts, step);
  pts = jitter(pts, o.tremor, o.sx, o.sy);
  if (o.boilAmp) pts = jitter(pts, o.boilAmp, o.bx, o.by, 34);
  const s = lengths(pts), L = s[s.length - 1];
  const cl = clamp(L / 36, 8, 22), pieces = [];
  let i0 = 0;
  for (let i = 1; i < pts.length; i++) {
    if (s[i] - s[i0] >= cl || i === pts.length - 1) { pieces.push({ i0, i1: i, a: s[i0], b: s[i], len: s[i] - s[i0] }); i0 = i; }
  }
  for (const c of pieces) {
    const q = (c.a + c.b) / 2 / Math.max(1e-6, L);
    const taper = st.point ? 1.3 : (0.5 + 0.5 * smoothstep(0, 0.1, q)) * (1 - (1 - (o.tip ?? 0.38)) * smoothstep(0.8, 1, q));
    c.w = Math.max(0.6, o.thickness * taper * (1 + (st.point ? 0 : o.pressure * noise1((c.a + c.b) / 90 + o.sp))));
  }
  return { pts, L, pieces, closed: !!st.closed };
}

/** Points of an SVG path (d in a viewBox), sampled and mapped into the W × H box. */
function samplePath(d, vb, W, H) {
  const [vx, vy, vw, vh] = typeof vb === 'string' ? vb.trim().split(/[\s,]+/).map(Number) : (vb || [0, 0, 100, 100]);
  const defs = svgDefs(), p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d); defs.appendChild(p);
  const L = p.getTotalLength(), out = [];
  const n = Math.max(8, Math.ceil((L / Math.max(vw, vh)) * Math.max(W, H) / 3));
  for (let i = 0; i <= n; i++) { const q = p.getPointAtLength((L * i) / n); out.push([((q.x - vx) / vw) * W, ((q.y - vy) / vh) * H]); }
  p.remove();
  return out;
}

// ── the item ────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * it: shape | d (+ viewBox), x, y, w, h, rot, color, thickness, t, dur, seed, tremor, pressure, tip, doublePass, boil
 *     { amp, fps, n }, fill (color | { color, t, dur, op, offset }), erase { t, dur, fx }, exit, op,
 *     target 'itemId.spanId' (circles/underlines a span of a text item), from/to [x, y] (arrow), + preset options.
 * idx: the item's order in the scene (part of the default seed, so two identical instances come out different).
 */
export function mountStroke(parent, it, P, { idx = 0, locate = null } = {}) {
  const color = it.color || P.stroke || P.ink, thickness = it.thickness ?? 6;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'abs');
  svg.style.overflow = 'visible'; svg.style.pointerEvents = 'none';
  parent.appendChild(svg);
  const base = Math.abs(Math.round((it.x ?? 0) * 3.1 + (it.y ?? 0) * 7.7 + (it.w ?? 0) * 1.3 + (it.h ?? 0) * 0.7)) + 131 * idx + [...String(it.shape || 'd')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = it.seed ?? base;
  let G = null;

  function mount(X, Y, W, H, extra = {}) {
    const pad = thickness * 2 + 0.15 * Math.max(W, H) + 8;
    css(svg, { left: f2(X - pad) + 'px', top: f2(Y - pad) + 'px', width: f2(W + 2 * pad) + 'px', height: f2(H + 2 * pad) + 'px' });
    svg.setAttribute('viewBox', `${f2(-pad)} ${f2(-pad)} ${f2(W + 2 * pad)} ${f2(H + 2 * pad)}`);
    if (it.rot || it.mirror) {
      svg.style.transformOrigin = `${f2(pad + W / 2)}px ${f2(pad + H / 2)}px`;
      svg.style.transform = `${it.rot ? `rotate(${it.rot}deg)` : ''}${it.mirror ? ' scaleX(-1)' : ''}`.trim();
    }
    // the gesture (shapes by seed) and the tremor
    const r = mulberry32(seed);
    let strokes;
    if (it.d) {
      const ds = [].concat(it.d).flatMap(s => s.split(/(?=M)/).filter(x => x.trim()));
      strokes = ds.map(d => ({ pts: samplePath(d, it.viewBox, W, H), dense: true }));
    } else {
      const fn = PRESETS[it.shape || 'circle'];
      if (!fn) throw new Error('stroke: unknown shape ' + it.shape);
      strokes = extra.lines
        ? extra.lines.flatMap(b => fn(r, b.w, b.h, { ...it, ...extra }).map(s => ({ ...s, pts: s.pts.map(([x, y]) => [x + b.x - X, y + b.y - Y]) })))
        : fn(r, W, H, { ...it, ...extra });
    }
    const tremor = clamp(0.008 * Math.min(W, H) + 0.8, 0.8, 5) * (it.tremor ?? 1);
    const nV = it.boil ? Math.max(2, it.boil.n ?? 3) : 1;
    const echo = !!it.doublePass;
    const variants = [];
    for (let v = 0; v < nV; v++) {
      const rv = mulberry32(seed * 7 + 1);
      const sx = rv() * 500, sy = rv() * 500 + 500, sp = rv() * 500;
      const bamp = it.boil ? (it.boil.amp ?? 1.4) : 0;
      const ls = [];
      strokes.forEach((st, j) => {
        const o = { thickness, tremor, sx: sx + j * 13.1, sy: sy + j * 7.3, sp: sp + j * 3.7, pressure: it.pressure ?? 0.22, tip: it.tip, boilAmp: v ? bamp : 0, bx: 900 + v * 37.7 + j, by: 1300 + v * 53.3 + j };
        ls.push({ ...denseStroke(st, o), j, echo: false });
        if (echo) ls.push({ ...denseStroke(st, { ...o, thickness: thickness * 0.55, tremor: tremor * 1.8, sx: o.sx + 211, sy: o.sy + 97 }), j, echo: true });
      });
      variants.push(ls);
    }
    // timing: one stroke after another (the pen lifts between them); each one's duration follows its length
    const mainStrokes = variants[0].filter(s => !s.echo);
    const lift = mainStrokes.length > 1 ? 0.045 : 0;
    const Ltot = mainStrokes.reduce((a, s) => a + s.L, 0);
    const dur = it.dur ?? clamp(Ltot / 2400 + lift * (mainStrokes.length - 1), 0.16, 1.1);
    const util = Math.max(0.05, dur - lift * (mainStrokes.length - 1)), weightTotal = mainStrokes.reduce((a, s) => a + s.L + 24, 0);
    let acc = it.t ?? 0;
    const timing = mainStrokes.map(s => { const d = (util * (s.L + 24)) / weightTotal, o = { t0: acc, d }; acc += d + lift; return o; });
    // DOM: the fill (behind) and the pieces of each variant
    const PF = it.fill ? (typeof it.fill === 'string' ? { color: it.fill } : it.fill) : null;
    const groups = variants.map((ls, v) => {
      const g = document.createElementNS(NS, 'g');
      if (v) g.style.display = 'none';
      svg.appendChild(g);
      let fill = null;
      if (PF) {
        const closedOnes = ls.filter(s => !s.echo && (s.closed || PF.all));
        if (closedOnes.length) {
          fill = document.createElementNS(NS, 'path');
          fill.setAttribute('d', closedOnes.map(s => dPts(s.pts) + 'Z').join(''));
          fill.setAttribute('fill', PF.color || color); fill.setAttribute('stroke', 'none'); fill.setAttribute('opacity', '0');
          if (PF.offset) fill.setAttribute('transform', `translate(${PF.offset[0]} ${PF.offset[1]})`);
          g.appendChild(fill);
        }
      }
      for (const s of ls) for (const c of s.pieces) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', dPts(s.pts, c.i0, c.i1));
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', s.echo ? (it.echoColor || color) : color); p.setAttribute('stroke-width', f2(c.w));
        p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
        p.style.visibility = 'hidden';
        g.appendChild(p);
        c.el = p; c.st = '';
      }
      return { g, fill, ls };
    });
    const drawEnd = acc - lift;
    G = { groups, timing, drawEnd, PF, nV };
  }

  // box: fixed, from from/to (arrow), or from the target (measured during init, with the layer visible)
  const fixedBox = () => {
    if (it.from && it.to) {
      const m = 40, X = Math.min(it.from[0], it.to[0]) - m, Y = Math.min(it.from[1], it.to[1]) - m;
      const W = Math.abs(it.to[0] - it.from[0]) + 2 * m, H = Math.abs(it.to[1] - it.from[1]) + 2 * m;
      mount(X, Y, W, H, { A: [it.from[0] - X, it.from[1] - Y], B: [it.to[0] - X, it.to[1] - Y] });
    } else mount(it.x ?? 90, it.y ?? 700, it.w ?? 300, it.h ?? 120);
  };
  if (!it.target) fixedBox();

  const show = (c, a, b) => {
    const lo = Math.max(a, c.a), hi = Math.min(b, c.b);
    let st;
    if (hi - lo <= 0.05) st = 'h';
    else if (lo <= c.a + 1e-3 && hi >= c.b - 1e-3) st = 'f';
    else st = `${f2(hi - lo)}|${f2(-(lo - c.a))}`;
    if (st === c.st) return;
    c.st = st;
    if (st === 'h') { c.el.style.visibility = 'hidden'; return; }
    c.el.style.visibility = 'visible';
    if (st === 'f') { c.el.removeAttribute('stroke-dasharray'); c.el.removeAttribute('stroke-dashoffset'); return; }
    c.el.setAttribute('stroke-dasharray', `${f2(hi - lo)} ${f2(c.len * 2 + 40)}`);
    c.el.setAttribute('stroke-dashoffset', f2(-(lo - c.a)));
  };

  return {
    node: svg,
    measure() {
      if (!it.target || G) return;
      const target = locate ? locate(it.target) : null;
      if (!target) { fixedBox(); return; }
      const pr = parent.getBoundingClientRect();
      // the span's lines (one rectangle per line of text)
      const rows = new Map();
      for (const q of target.getClientRects()) {
        if (q.width < 1) continue;
        const k = Math.round((q.top - pr.top) / 8);
        const r0 = rows.get(k) || { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
        r0.x0 = Math.min(r0.x0, q.left - pr.left); r0.x1 = Math.max(r0.x1, q.right - pr.left); r0.y0 = Math.min(r0.y0, q.top - pr.top); r0.y1 = Math.max(r0.y1, q.bottom - pr.top);
        rows.set(k, r0);
      }
      const L = [...rows.values()].sort((a, b) => a.y0 - b.y0);
      if (!L.length) { fixedBox(); return; }
      const U = { x0: Math.min(...L.map(r => r.x0)), x1: Math.max(...L.map(r => r.x1)), y0: L[0].y0, y1: L[L.length - 1].y1 };
      const f = it.shape || 'circle', mg = it.margin ?? 0;
      if (f === 'underline' || f === 'wave' || f === 'strike') {
        const lines = L.map(r => { const h = r.y1 - r.y0; return f === 'strike' ? { x: r.x0 - 4, y: r.y0 + h * 0.4, w: r.x1 - r.x0 + 8, h: h * 0.2 } : { x: r.x0 - 4, y: r.y0 + h * 0.86 + mg, w: r.x1 - r.x0 + 8, h: Math.max(10, h * (f === 'wave' ? 0.26 : 0.2)) }; });
        const X = Math.min(...lines.map(b => b.x)), Y = Math.min(...lines.map(b => b.y)), X1 = Math.max(...lines.map(b => b.x + b.w)), Y1 = Math.max(...lines.map(b => b.y + b.h));
        mount(X, Y, X1 - X, Y1 - Y, { lines });
      } else if (f === 'bracket') {
        const h = U.y1 - U.y0;
        mount(U.x0 - 40 - mg, U.y0 - 6, 24, h + 12);
      } else if (f === 'circle') {
        // the line's layout box is already taller than the ink (ascender/descender slack): tight ellipse
        const w = U.x1 - U.x0, h = U.y1 - U.y0, lh = L[0].y1 - L[0].y0;
        const W = w * 1.08 + lh * 0.3 + 2 * mg, H = h + lh * 0.4 + 2 * mg;
        mount(U.x0 + w / 2 - W / 2, U.y0 + h / 2 - H / 2, W, H);
      } else {
        const p = 10 + mg;
        mount(U.x0 - p, U.y0 - p, U.x1 - U.x0 + 2 * p, U.y1 - U.y0 + 2 * p);
      }
    },
    upd(t) {
      if (!G) return;
      const v = G.nV > 1 ? ((Math.floor(t * (it.boil.fps ?? 10) + 1e-6) % G.nV) + G.nV) % G.nV : 0;
      G.groups.forEach((g, k) => { g.g.style.display = k === v ? '' : 'none'; });
      const { ls, fill } = G.groups[v];
      const A = it.erase ? (typeof it.erase === 'number' ? { t: it.erase } : it.erase) : null;
      const pa = A ? K.EASE_IO(prog(t, A.t, A.t + (A.dur ?? 0.26))) : 0;
      for (const s of ls) {
        const T = G.timing[s.j], lag = s.echo ? 0.035 : 0;
        const q = EASE_PEN(prog(t, T.t0 + lag, T.t0 + lag + T.d));
        const sd = q * s.L, se = A && A.fx !== 'fade' ? pa * s.L : 0;
        for (const c of s.pieces) show(c, se, sd);
      }
      if (fill) {
        const PF = G.PF, tf = PF.t ?? G.drawEnd - 0.04, of = (PF.op ?? 1) * K.EASE_OUT(prog(t, tf, tf + (PF.dur ?? 0.18))) * (A && A.fx !== 'fade' ? 1 - pa : 1);
        fill.setAttribute('opacity', of.toFixed(3));
      }
      let op = it.op ?? 1;
      if (A && A.fx === 'fade') op *= 1 - pa;
      if (it.exit != null) { const S = typeof it.exit === 'number' ? { t: it.exit } : it.exit; op *= 1 - K.EASE(prog(t, S.t, S.t + (S.dur ?? 0.24))); }
      svg.style.opacity = op < 1 ? op.toFixed(4) : '';
    },
  };
}
