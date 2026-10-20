// Scene item 'img': a character or a background plate (PNG with alpha, or opaque), with poses that swap on a
// frame, a pop entrance (squash-and-stretch), breathing, speech accents (the little hop that makes the figure
// "talk" without a mouth), a boiling line (boil), a contact shadow and a crop. Everything is a function of t
// (the shot's LOCAL time).
//
// Layers (each transform on its own node, so nothing fights):
//   box     left/top/width/height · opacity · crop (clip-path) · move [{ t, dur, x, y, s, rot }]
//   └ ent   enter/exit (pop, rise, slam, fade, slide, none)
//     ├ shadow  contact ellipse at the feet (shrinks when the figure rises)
//     └ anim    idle (breathe, sway, float) + accents (hops)
//       └ pic   CSS filter · mirror
//         └ <img> per pose (boil only here)
//
// Every image is decoded during init (await img.decode(), decoding=sync), so the capture never grabs a frame
// with a half-loaded image. The alpha analysis (the box of the opaque content and the feet line) comes from the
// image itself, so `feet: [x, y]` and `height` place the figure by its body, not by the PNG's transparent margin.
import { el, css } from '../../core/dom.js';
import { prog, kf, E, smoothstep, TAU } from '../../core/math.js';
import * as K from './ui.js';
import { boilAt } from './boil.js';

const EASES = { io: K.EASE_IO, out: K.EASE_OUT, in: K.EASE_IN, gentle: K.EASE, linear: x => x };
const analyses = new Map();

/** Loads and decodes an image (a new <img> per use; the browser cache shares the bytes). */
export async function loadImage(src) {
  const im = new Image();
  im.decoding = 'sync';
  im.draggable = false;
  im.src = src;
  try { await im.decode(); } catch (e) { throw new Error(`img: failed to load ${src}`); }
  return im;
}

/** Box of the opaque content (alpha > 50%) and the feet (middle of the bottom strip), in natural px. Cached by URL. */
export function analyzeImage(im) {
  const key = im.currentSrc || im.src;
  if (analyses.has(key)) return analyses.get(key);
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const k = Math.min(1, 384 / Math.max(iw, ih));
  const cw = Math.max(1, Math.round(iw * k)), ch = Math.max(1, Math.round(ih * k));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, cw, ch);
  const d = g.getImageData(0, 0, cw, ch).data;
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (d[(y * cw + x) * 4 + 3] > 127) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  let r;
  if (x1 < 0) r = { iw, ih, opaque: 0, box: [0, 0, iw, ih], feet: [iw / 2, ih], feetBreadth: iw * 0.3 };
  else {
    const fy0 = Math.max(y0, y1 - Math.max(1, Math.round((y1 - y0 + 1) * 0.04)));
    let fx0 = cw, fx1 = -1;
    for (let y = fy0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (d[(y * cw + x) * 4 + 3] > 127) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; }
    r = { iw, ih, opaque: n / (cw * ch), box: [x0 / k, y0 / k, (x1 + 1) / k, (y1 + 1) / k], feet: [((fx0 + fx1 + 1) / 2) / k, (y1 + 1) / k], feetBreadth: (fx1 - fx0 + 1) / k };
  }
  analyses.set(key, r);
  return r;
}

const pct = s => { const m = String(s).trim().split(/\s+/).map(v => parseFloat(v) / 100); return [isFinite(m[0]) ? m[0] : 0.5, isFinite(m[1]) ? m[1] : (isFinite(m[0]) ? m[0] : 0.5)]; };
const rgb = c => {
  const h = String(c).replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return [0, 0, 0];
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};

/** Poses: { name: src | { src, poseAlign, scale, dx, dy } } or a single src (pose 'base'). */
function poses(it) {
  const P = it.poses ? it.poses : { base: it.src };
  const names = Object.keys(P);
  return names.map(n => ({ name: n, ...(typeof P[n] === 'string' ? { src: P[n] } : P[n]) }));
}

/** The item's box in the frame, and how the base pose fits inside it. */
function layout(it, A) {
  const { iw, ih } = A;
  let x = it.x ?? 0, y = it.y ?? 0, w = it.w, h = it.h, fit = it.fit;
  if (it.plate) { x = it.x ?? 0; y = it.y ?? 0; w = w ?? 1080; h = h ?? 1920; fit = fit || 'cover'; }
  if (it.height) { const kk = it.height / Math.max(1, A.box[3] - A.box[1]); w = iw * kk; h = ih * kk; }
  else if (w && !h) h = w * ih / iw;
  else if (h && !w) w = h * iw / ih;
  else if (!w && !h) { w = iw; h = ih; }
  fit = fit || 'contain';
  const [px, py] = pct(it.pos ?? (fit === 'cover' ? '50% 50%' : '50% 100%'));
  return { x, y, w, h, fit, px, py };
}
function fitBox(L, A) {
  const k = L.fit === 'cover' ? Math.max(L.w / A.iw, L.h / A.ih) : L.fit === 'fill' ? null : Math.min(L.w / A.iw, L.h / A.ih);
  if (k == null) return { k: L.w / A.iw, ky: L.h / A.ih, ox: 0, oy: 0 };
  return { k, ky: k, ox: (L.w - A.iw * k) * L.px, oy: (L.h - A.ih * k) * L.py };
}

/** Accents from the speech (GLOBAL times in the .vo.json → the shot's LOCAL times): { line, words?, before? }.
 *  Without words: every word of 4+ letters, with at least 0.28 s between one hop and the next. */
function speechAccents(AC, vo, t0) {
  const L = (vo?.lines || []).find(l => l.id === AC.line);
  if (!L) return [];
  const norm = x => x.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');
  const target = AC.words ? new Set(AC.words.map(norm)) : null;
  const out = [];
  for (const w of L.words || []) {
    const k = norm(w.w);
    if (target ? !target.has(k) : k.replace(/'/g, '').length < 4) continue;
    const t = w.t0 - t0 + (AC.before ?? -0.02);
    if (!target && out.length && t - out[out.length - 1] < 0.28) continue;
    out.push(t);
  }
  return out;
}

export async function mountImage(parent, it, P, { vo = null, t0: tShot = 0 } = {}) {
  const PS = poses(it);
  let ims;
  try { ims = await Promise.all(PS.map(p => loadImage(p.src))); } catch (e) {
    // a missing full-frame plate (e.g. the paper texture before paper.mjs ran) must not take the whole shot down
    if (!it.plate) throw e;
    console.warn(`${e.message} (plate skipped)`);
    return { node: el(parent, 'abs'), layout: null, upd() {} };
  }
  const an = ims.map(analyzeImage);
  const L = layout(it, an[0]);
  const G0 = fitBox(L, an[0]);
  // feet of the base pose, in the box (unmirrored)
  const feet0 = [G0.ox + an[0].feet[0] * G0.k, G0.oy + an[0].feet[1] * G0.ky];
  const bodyH = (an[0].box[3] - an[0].box[1]) * G0.ky;
  if (it.feet) { L.x = it.feet[0] - (it.mirror ? L.w - feet0[0] : feet0[0]); L.y = it.feet[1] - feet0[1]; }

  // isolation: the poses' z-index (a dissolve puts the new one on top) stays inside the box and does not leak into the scene
  const box = css(el(parent, 'abs'), { left: L.x.toFixed(2) + 'px', top: L.y.toFixed(2) + 'px', width: L.w.toFixed(2) + 'px', height: L.h.toFixed(2) + 'px', pointerEvents: 'none', isolation: 'isolate' });
  const op0 = it.opacity ?? it.op;
  if (op0 != null) box.style.opacity = String(op0);
  if (it.crop) {
    const R = it.crop, top = R.y - L.y, left = R.x - L.x, right = L.x + L.w - (R.x + R.w), bottom = L.y + L.h - (R.y + R.h);
    box.style.clipPath = `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px${R.r ? ` round ${R.r}px` : ''})`;
  }
  const ent = css(el(box, 'abs'), { left: '0px', top: '0px', width: '100%', height: '100%' });
  let shadow = null, SB = null;
  if (it.shadow) {
    const S = it.shadow === true ? {} : it.shadow;
    const breadth = S.w ?? Math.max(60, (an[0].feetBreadth * G0.k) * 1.35 + 0.08 * (an[0].box[2] - an[0].box[0]) * G0.k);
    const height = S.h ?? Math.max(14, breadth * 0.13);
    const [r, g, b] = rgb(S.color || P.shadowColor || (P.dark ? '#000000' : '#201e1d'));
    const o = S.op ?? (P.dark ? 0.4 : 0.24);
    shadow = css(el(ent, 'abs'), {
      width: breadth.toFixed(1) + 'px', height: height.toFixed(1) + 'px',
      background: `radial-gradient(closest-side, rgba(${r},${g},${b},${o}) 0%, rgba(${r},${g},${b},${(o * 0.62).toFixed(3)}) 45%, rgba(${r},${g},${b},0) 100%)`,
      filter: S.blur ? `blur(${S.blur}px)` : '',
    });
    SB = { breadth, height, dx: S.dx ?? 0, dy: S.dy ?? 0 };
  }
  const anim = css(el(ent, 'abs'), { left: '0px', top: '0px', width: '100%', height: '100%' });
  const pic = css(el(anim, 'abs'), { left: '0px', top: '0px', width: '100%', height: '100%', overflow: L.fit === 'cover' ? 'hidden' : 'visible' });
  if (it.filter) pic.style.filter = it.filter;

  // each pose in its place: poseAlign 'feet' (default) puts the feet and the body height where the base pose has them
  const poseAlignAll = it.poseAlign ?? 'feet';
  PS.forEach((ps, j) => {
    const im = ims[j], A = an[j];
    let k, ky, left, top;
    const al = ps.poseAlign ?? poseAlignAll;
    if (j > 0 && al === 'feet') {
      k = ky = bodyH / Math.max(1, A.box[3] - A.box[1]);
      left = feet0[0] - A.feet[0] * k; top = feet0[1] - A.feet[1] * k;
    } else {
      const G = j === 0 ? G0 : fitBox(L, A);
      k = G.k; ky = G.ky; left = G.ox; top = G.oy;
    }
    if (ps.scale) { const e = ps.scale; left = feet0[0] + (left - feet0[0]) * e; top = feet0[1] + (top - feet0[1]) * e; k *= e; ky *= e; }
    left += ps.dx ?? 0; top += ps.dy ?? 0;
    css(im, { position: 'absolute', left: left.toFixed(2) + 'px', top: top.toFixed(2) + 'px', width: (A.iw * k).toFixed(2) + 'px', height: (A.ih * ky).toFixed(2) + 'px', maxWidth: 'none', display: j === 0 ? 'block' : 'none', userSelect: 'none' });
    pic.appendChild(im);
  });

  // pose timeline: [{ t, pose, dissolve, mirror }]
  const idx = n => Math.max(0, PS.findIndex(p => p.name === n));
  const swaps = [{ t: -1e9, j: idx(it.pose ?? PS[0].name), dissolve: 0, mirror: !!it.mirror },
    ...[].concat(it.swap || []).map(x => ({ t: x.t, j: x.pose != null ? idx(x.pose) : null, dissolve: x.dissolve ?? 0, mirror: x.mirror })).sort((a, b) => a.t - b.t)];
  for (let i = 1; i < swaps.length; i++) { if (swaps[i].j == null) swaps[i].j = swaps[i - 1].j; if (swaps[i].mirror == null) swaps[i].mirror = swaps[i - 1].mirror; }

  const E0 = it.enter ? (typeof it.enter === 'number' ? { t: it.enter } : it.enter) : null;
  const t0 = E0?.t ?? 0;
  const I = it.idle ? { breathe: 0.008, period: 3.4, sway: 0, float: 0, phase: 0, ...(it.idle === true ? {} : it.idle) } : null;
  const AC = it.accents ? (Array.isArray(it.accents) ? { t: it.accents } : it.accents) : null;
  const acT = AC ? [...(AC.t || []), ...(AC.line ? speechAccents(AC, vo, tShot) : [])].sort((a, b) => a - b) : [];
  const seedBase = it.boil ? (it.boil.base ?? (Math.abs(Math.round((it.x ?? L.x) * 7 + (it.y ?? L.y) * 13)) % 997)) : 0;

  return {
    node: box, layout: { x: L.x, y: L.y, w: L.w, h: L.h, feet: [L.x + feet0[0], L.y + feet0[1]], bodyHeight: bodyH },
    upd(t) {
      // pose and mirror state
      let c = 0;
      for (let i = 1; i < swaps.length; i++) if (t >= swaps[i].t) c = i;
      const T = swaps[c], mirrored = !!T.mirror;
      const feetX = mirrored ? L.w - feet0[0] : feet0[0];
      const anc = (it.anchor ?? '50% 100%') === 'feet' ? `${feetX.toFixed(1)}px ${feet0[1].toFixed(1)}px` : (it.anchor ?? '50% 100%');

      // move (box)
      if (it.move) {
        let x = 0, y = 0, s = 1, rot = 0, o = anc;
        for (const k of [].concat(it.move)) {
          if (t < k.t) break;
          const p = (EASES[k.ease] || K.EASE_IO)(prog(t, k.t, k.t + Math.max(1e-6, k.dur ?? 0.6)));
          x += ((k.x ?? x) - x) * p; y += ((k.y ?? y) - y) * p; s += ((k.s ?? s) - s) * p; rot += ((k.rot ?? rot) - rot) * p;
          if (k.origin) o = k.origin;
        }
        box.style.transformOrigin = o;
        box.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      }

      // enter / exit (ent)
      ent.style.transformOrigin = anc;
      enter(ent, t, E0, anc);
      leave(ent, t, it.exit, anc);

      // idle + accents (anim)
      let ty = 0, rot = 0, sx = 1, sy = 1, lift = 0;
      if (I && t > t0) {
        const tt = t - t0, env = smoothstep(0, 0.6, tt), ph = (I.phase || 0) * TAU, Pd = I.period || 3.4;
        const b = Math.sin(TAU * tt / Pd + ph);
        sy *= 1 + I.breathe * b * env; sx *= 1 - I.breathe * 0.4 * b * env;
        rot += (I.sway || 0) * Math.sin(TAU * tt / (Pd * 1.618) + ph * 1.3) * env;
        const fl = (I.float || 0) * (0.5 - 0.5 * Math.cos(TAU * tt / (Pd * 0.9) + ph)) * env;
        ty -= fl; lift += fl;
      }
      if (AC) for (const a of acT) {
        const u = t - a, D = AC.dur ?? 0.34;
        if (u < 0) break;
        if (u >= D) continue;
        const h = hop(u / D, AC.height ?? 9, AC.squash ?? 0.035);
        ty -= h.lift; lift += h.lift; sx *= h.sx; sy *= h.sy;
      }
      if (I || AC) {
        anim.style.transformOrigin = anc;
        anim.style.transform = (ty || rot || sx !== 1 || sy !== 1)
          ? `translate(0px, ${ty.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})` : 'none';
      }

      // poses: swap on the frame or dissolve; mirror on pic
      const prev = c > 0 ? swaps[c - 1].j : T.j;
      const dp = T.dissolve > 0 ? prog(t, T.t, T.t + T.dissolve) : 1;
      const fb = boilAt(t, it.boil, seedBase);
      ims.forEach((im, j) => {
        let o = 0;
        if (j === T.j) o = dp;
        if (j === prev && prev !== T.j && dp < 1) o = Math.max(o, 1 - smoothstep(0.5, 1, dp));
        if (j === T.j && prev === T.j) o = 1;
        im.style.display = o > 0 ? 'block' : 'none';
        im.style.opacity = o > 0 && o < 1 ? o.toFixed(3) : '';
        im.style.zIndex = j === T.j ? '1' : '0';
        im.style.filter = o > 0 ? fb : '';
      });
      pic.style.transform = mirrored ? 'scaleX(-1)' : 'none';

      // contact shadow: at the feet, it shrinks and fades when the figure rises
      if (shadow) {
        const k = 1 - Math.min(0.4, lift / 150), a = 1 - Math.min(0.6, lift / 100);
        css(shadow, {
          left: (feetX - SB.breadth / 2 + SB.dx).toFixed(1) + 'px', top: (feet0[1] - SB.height * 0.62 + SB.dy).toFixed(1) + 'px',
          transform: k !== 1 ? `scale(${k.toFixed(4)})` : 'none', opacity: a !== 1 ? a.toFixed(3) : '',
        });
      }
    },
  };
}

/** Accent hop (q = fraction of the accent): anticipates by squashing, rises stretching, lands squashing, settles. */
function hop(q, height, sq) {
  const lift = kf(q, [[0, 0], [0.16, 0], [0.45, 1, E.outQuad], [0.72, 0, E.inQuad], [1, 0]]) * height;
  const sy = kf(q, [[0, 1], [0.16, 1 - sq * 0.7, E.outQuad], [0.4, 1 + sq, E.outQuad], [0.66, 1, E.inOutQuad], [0.8, 1 - sq, E.outQuad], [1, 1, E.inOutQuad]]);
  return { lift, sy, sx: 1 - (sy - 1) * 0.6 };
}

function enter(node, t, e, origin) {
  node.style.opacity = '';
  if (!e) { node.style.transform = 'none'; return; }
  const fx = e.fx ?? 'pop', t0 = e.t ?? 0;
  if (fx === 'none') { node.style.transform = 'none'; return; }
  if (fx === 'pop') K.pop(node, t, t0, { ...e, origin: e.origin ?? origin });
  else if (fx === 'slam') K.slam(node, t, t0, { ...e, origin: e.origin ?? origin });
  else if (fx === 'fade') { node.style.transform = 'none'; K.fade(node, t, t0, e); }
  else if (fx === 'slide') K.slide(node, t, t0, e);
  else K.rise(node, t, t0, e);
}
function leave(node, t, s, origin) {
  if (s == null) return;
  const S = typeof s === 'number' ? { t: s } : s;
  if (t < S.t) return;
  if (S.fx === 'pop') K.popOut(node, t, S.t, { ...S, origin: S.origin ?? origin });
  else if (S.fx === 'slide') K.slideOut(node, t, S.t, S);
  else if (S.fx === 'rise') K.riseOut(node, t, S.t, S);
  else { const p = prog(t, S.t, S.t + (S.dur ?? 0.24)); node.style.opacity = (parseFloat(node.style.opacity || '1') * (1 - K.EASE(p))).toFixed(4); }
}
