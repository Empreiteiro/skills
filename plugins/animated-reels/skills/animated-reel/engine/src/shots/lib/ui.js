// UI kit in motion, driven by time: warm paper, ink, a red marker, square corners. The gestures are the ones a
// writing UI makes: the marker block that paints a word, the red strike and green insertion of a diff, the typing
// cursor, the note pinned to a passage, the sweep of an AI pass. Everything here is a function of t: the shot calls
// it from update(), nothing animates on its own.
import { el, css } from '../../core/dom.js';
import { clamp, prog, lerp, mulberry32 } from '../../core/math.js';

// ── tokens ──────────────────────────────────────────────────────────────────
export const COLOR = {
  paper: '#faf6f1', sheet: '#fdfbf8', paper2: '#f4f0ea', paper3: '#ece6df', rule: '#e3ddd8', rule2: '#cac3bc',
  ink: '#201e1d', muted: '#5e5a58', faint: '#736e6a', paperOnInk: '#ede9e3', mutedOnInk: '#a9a49e',
  accent: '#ec3017', accentDeep: '#ae1803', press: '#920e00', glow: '#ff6e50',
  you: '#667ba0', ai: '#3d8d60',
};

const LIGHT_SKIN = {
  ink: COLOR.ink, muted: COLOR.muted, faint: COLOR.faint, accent: COLOR.accentDeep, markBg: COLOR.accentDeep, markInk: COLOR.paper,
  rule: COLOR.rule, sheet: COLOR.sheet, sheetBorder: COLOR.rule,
  del: '#9e1901', delBg: 'rgba(158,25,1,.10)', ins: '#0f7a3d', insBg: 'rgba(61,141,96,.13)', insLine: '#3d8d60',
  sel: 'rgba(102,123,160,.24)', comment: 'rgba(236,48,23,.13)', commentLine: COLOR.accent,
  btnBg: COLOR.accentDeep, btnInk: COLOR.paper, dark: false,
};
const DARK_SKIN = {
  ink: COLOR.paperOnInk, muted: COLOR.mutedOnInk, faint: '#928d88', accent: '#f25a43', markBg: COLOR.accentDeep, markInk: COLOR.paper,
  rule: 'rgba(237,233,227,.16)', sheet: '#2a2726', sheetBorder: 'rgba(237,233,227,.12)',
  del: '#f1735c', delBg: 'rgba(158,25,1,.30)', ins: '#8cd0a8', insBg: 'rgba(61,141,96,.24)', insLine: '#6fb78e',
  sel: 'rgba(169,187,220,.22)', comment: 'rgba(236,48,23,.24)', commentLine: COLOR.accent,
  btnBg: COLOR.accent, btnInk: COLOR.paper, dark: true,
};
/**
 * Skins: the backdrop colour plus the palette every piece reads (ink, muted, faint, accent, the marker block, the
 * diff colours, the comment wash, the button). Optional keys only some skins define: stroke (default colour of the
 * stroke item), sheetShadow, noteBg and shadowColor (contact shadow of the img item). A style kit can extend one with
 * an object: { base: 'editorial', ...overrides }. Check new skins with tools/contrast.mjs (WCAG AA).
 */
export const SKINS = {
  paper: { ...LIGHT_SKIN, backdrop: COLOR.paper },
  ink: { ...DARK_SKIN, backdrop: COLOR.ink },
  editorial: { ...LIGHT_SKIN, backdrop: '#f4eee4', ink: '#2b2a28', muted: '#57534e', faint: '#6e6a63', accent: '#4b638e', rule: '#ddd4c6', sheet: '#fbf8f2', sheetBorder: '#ddd4c6', stroke: '#4b638e', sel: 'rgba(75,99,142,.22)', shadowColor: '#2b2a28' },
};
/** Skin by name, or an object { base: 'editorial', ...keys } (the base with those keys replaced). */
export const skin = n => (n && typeof n === 'object') ? { ...(SKINS[n.base] || SKINS.paper), ...n } : (SKINS[n] || SKINS.paper);

// ── easing ──────────────────────────────────────────────────────────────────
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) { const e = X(s) - x, d = dX(s); if (Math.abs(e) < 1e-6) return Y(s); if (Math.abs(d) < 1e-6) break; s -= e / d; }
    let a = 0, b = 1; s = x;
    for (let i = 0; i < 30; i++) { const v = X(s); if (Math.abs(v - x) < 1e-6) break; if (v < x) a = s; else b = s; s = (a + b) / 2; }
    return Y(s);
  };
}
export const EASE_OUT = bezier(0.22, 1, 0.36, 1);
export const EASE_IN = bezier(0.55, 0, 1, 0.45);
export const EASE_IO = bezier(0.65, 0, 0.35, 1);
export const EASE = bezier(0.25, 0.1, 0.25, 1);
export const DUR = { fast: 0.14, base: 0.24, slow: 0.48 };

/** Full-frame backdrop in the skin's colour. */
export function backdrop(parent, name = 'paper') {
  const P = skin(name);
  return css(el(parent, 'abs'), { inset: '0px', background: P.backdrop, overflow: 'hidden' });
}

// ── text with the UI gestures ───────────────────────────────────────────────
// html accepts: <em> marked word (the marker block) · <s> cut passage (diff strike) · <ins> inserted passage (typed
// in the diff) · <u> passage with a comment (wash + underline) · <mark> selection · <i> quiet word (muted colour,
// not italic) · <code> mono · <b> strong colour · <br>. Any of them can carry an id (a "part" other items target).
// One marked word per sentence, at most.
const TAG = { EM: 'em', S: 'del', INS: 'ins', U: 'u', MARK: 'sel', I: 'quiet', CODE: 'code', B: 'b' };

export function text(parent, html, o = {}) {
  const P = o.P || skin(o.skin);
  const cls = o.cls || 'disp';
  const size = o.size ?? 96;
  const node = css(el(parent, 'abs ' + cls), {
    left: (o.x ?? 90) + 'px', top: (o.y ?? 700) + 'px', width: (o.w ?? 850) + 'px', fontSize: size + 'px',
    color: o.color || P.ink, textAlign: o.align || 'left', whiteSpace: 'normal',
  });
  if (o.lh) node.style.lineHeight = String(o.lh);
  if (o.ls != null) node.style.letterSpacing = o.ls;
  if (o.weight) node.style.fontWeight = String(o.weight);
  const T = { node, P, size, words: [], chars: [], ems: [], dels: [], inss: [], us: [], sels: [], parts: {} };
  const tmp = document.createElement('template'); tmp.innerHTML = html;
  const walk = (src, dst, ctx) => {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { dst.appendChild(document.createTextNode(' ')); return; }
          const w = el(dst, 'w', null, 'span');
          if (o.chars || ctx.chars) { for (const ch of part) { const c = el(w, 'ch', null, 'span'); c.textContent = ch; T.chars.push(c); (ctx.cs || []).push(c); } }
          else w.textContent = part;
          T.words.push(w); (ctx.ws || []).push(w);
        });
      } else if (n.nodeName === 'BR') dst.appendChild(document.createElement('br'));
      else {
        const kind = TAG[n.nodeName] || 'span';
        const box = el(dst, 'k-' + kind, null, 'span');
        const part = { el: box, ws: [], cs: [], id: n.getAttribute('id') || null, kind };
        if (kind === 'em') styleEm(box);
        if (kind === 'del') css(box, { textDecoration: 'none' });
        if (kind === 'ins') css(box, { textDecoration: 'none', padding: '0 .06em' });
        if (kind === 'quiet') css(box, { color: P.muted });
        if (kind === 'code') { box.className = 'mono'; css(box, { textTransform: 'none', letterSpacing: '0', fontSize: '0.86em' }); }
        if (kind === 'b') css(box, { color: o.strong || P.ink });
        walk(n, box, { chars: ctx.chars || kind === 'ins', ws: part.ws, cs: part.cs });
        ({ em: T.ems, del: T.dels, ins: T.inss, u: T.us, sel: T.sels }[kind] || []).push(part);
        if (part.id) T.parts[part.id] = part;
      }
    }
  };
  walk(tmp.content, node, {});
  // Strike, wash and underline are backgrounds of the inline passage itself: with box-decoration-break: slice the
  // percentage runs through the lines in order, so the gesture crosses line breaks the way an editor does.
  const th = Math.max(3, Math.round(size * 0.07));
  for (const d of T.dels) {
    d.th = th;
    css(d.el, { backgroundRepeat: 'no-repeat', backgroundImage: `linear-gradient(${P.del}, ${P.del}), linear-gradient(${P.delBg}, ${P.delBg})`, backgroundSize: '0% 0px, 0% 100%', backgroundPosition: '0 58%, 0 0' });
  }
  for (const u of [...T.us, ...T.sels]) {
    const wash = u.kind === 'u' ? P.comment : P.sel, uh = Math.max(3, Math.round(size * 0.065));
    u.uh = uh;
    css(u.el, { backgroundRepeat: 'no-repeat', backgroundImage: `linear-gradient(${wash}, ${wash})` + (u.kind === 'u' ? `, linear-gradient(${P.commentLine}, ${P.commentLine})` : ''), backgroundSize: u.kind === 'u' ? '0% 100%, 0% 0px' : '0% 100%', backgroundPosition: u.kind === 'u' ? '0 0, 0 100%' : '0 0' });
  }
  return T;
}

function styleEm(box) {
  css(box, { position: 'relative', fontStyle: 'normal', whiteSpace: 'nowrap', display: 'inline-block', padding: '0 .09em', margin: '0 -.09em' });
}

/** The marker: the block paints the word from left to right (the text turns paper where the block passes). ~0.34 s. */
export function mark(T, t, t0, { dur = 0.34, i = null } = {}) {
  T.ems.forEach((m, k) => {
    if (i != null && k !== i) return;
    const p = EASE_OUT(prog(t, t0 + k * 0.12, t0 + k * 0.12 + dur));
    if (!m.over) {
      m.over = css(el(m.el, 'abs'), { left: '0px', top: '0.02em', bottom: '0px', right: '0px', background: T.P.markBg, color: T.P.markInk, padding: '0 .09em', whiteSpace: 'nowrap', overflow: 'hidden' });
      m.over.style.lineHeight = 'inherit';
      m.over.innerHTML = m.el.firstChild ? [...m.el.childNodes].filter(n => n !== m.over).map(n => n.textContent).join('') : '';
      m.over.style.top = '0px';
    }
    // slanted leading edge, like the chisel tip of a marker
    const x = (p * 112 - 6).toFixed(2);
    m.over.style.clipPath = p <= 0 ? 'inset(0 100% 0 0)' : p >= 1 ? 'none' : `polygon(0 0, calc(${x}% + 10px) 0, ${x}% 100%, 0 100%)`;
  });
}
/** Removes the marker (exit): the block retracts to the right. */
export function unmark(T, t, t0, dur = 0.24) {
  const p = EASE_IN(prog(t, t0, t0 + dur));
  for (const m of T.ems) if (m.over && p > 0) m.over.style.clipPath = `inset(0 0 0 ${(p * 100).toFixed(2)}%)`;
}

/** The diff strike: the red line runs over the passage (across line breaks) and it becomes cut text. */
export function strike(T, t, t0, { dur = 0.32, id = null } = {}) {
  T.dels.forEach(d => {
    if (id != null && d.id !== id) return;
    const p = EASE_IO(prog(t, t0, t0 + dur)), c = prog(t, t0 + dur * 0.6, t0 + dur + 0.18);
    d.el.style.backgroundSize = `${(p * 100).toFixed(2)}% ${p > 0 ? d.th : 0}px, ${(c * 100).toFixed(2)}% 100%`;
    d.el.style.color = c > 0 ? mixHex(T.P.ink, T.P.del, c) : '';
  });
}
/** The accepted cut: the struck passage shrinks away and the text below moves up (reflow every frame). */
export function collapse(T, t, t0, { dur = 0.35, id = null } = {}) {
  for (const d of T.dels) {
    if (id != null && d.id !== id) continue;
    const p = EASE_IO(prog(t, t0, t0 + dur));
    d.el.style.fontSize = p > 0 ? `${(1 - p).toFixed(4)}em` : '';
    d.el.style.opacity = p > 0 ? (1 - Math.min(1, p * 1.6)).toFixed(3) : '';
    d.el.style.display = p >= 1 ? 'none' : '';
  }
}
/** The diff insertion: the new passage is typed letter by letter with a green wash and underline.
 *  times: array (all insertions in sequence) or { id: array } (each insertion at its own time). */
export function insert(T, t, times, { id = null } = {}) {
  let k = 0;
  T.inss.forEach((s, j) => {
    const tt = Array.isArray(times) ? times.slice(k, k + s.cs.length) : (times[s.id ?? j] || []);
    k += s.cs.length;
    if (id != null && s.id !== id) return;
    let shown = 0;
    s.cs.forEach((c, i) => { const on = tt[i] != null && t >= tt[i]; c.style.display = on ? '' : 'none'; if (on) shown++; });
    s.el.style.color = T.P.ins;
    s.el.style.background = shown ? T.P.insBg : 'transparent';
    s.el.style.boxShadow = shown ? `inset 0 -2px 0 ${T.P.insLine}` : 'none';
    s.el.style.display = shown ? '' : 'none';
  });
}
/** Undo (put the original back): the insertion erases from the end to the start and the cut loses its strike. */
export function undo(T, t, t0, { dur = 0.35, id = null } = {}) {
  const p = EASE_IO(prog(t, t0, t0 + dur));
  if (p <= 0) return;
  T.inss.forEach((s, j) => {
    if (id != null && (s.id ?? String(j)) !== id) return;
    const n = s.cs.length, keep = Math.round(n * (1 - p));
    s.cs.forEach((c, i) => { c.style.display = i < keep ? '' : 'none'; });
    s.el.style.display = keep ? '' : 'none';
  });
  T.dels.forEach((d, j) => {
    if (id != null && (d.id ?? String(j)) !== id) return;
    d.el.style.backgroundSize = `${((1 - p) * 100).toFixed(2)}% ${d.th}px, ${((1 - p) * 100).toFixed(2)}% 100%`;
    d.el.style.color = p < 1 ? mixHex(T.P.del, T.P.ink, p) : '';
  });
}
/** Accept (keep the new version): the cut disappears and the insertion becomes plain text. */
export function accept(T, t, t0, { dur = 0.3, id = null } = {}) {
  const p = EASE_IO(prog(t, t0, t0 + dur));
  if (p <= 0) return;
  T.dels.forEach((d, j) => {
    if (id != null && (d.id ?? String(j)) !== id) return;
    d.el.style.fontSize = `${(1 - p).toFixed(4)}em`; d.el.style.opacity = (1 - Math.min(1, p * 1.6)).toFixed(3);
    d.el.style.display = p >= 1 ? 'none' : '';
  });
  T.inss.forEach((s, j) => {
    if (id != null && (s.id ?? String(j)) !== id) return;
    s.cs.forEach(c => { c.style.display = ''; });
    s.el.style.display = '';
    s.el.style.color = mixHex(T.P.ins, T.P.ink, p);
    s.el.style.background = p < 1 ? T.P.insBg.replace(/[\d.]+\)$/, m => (parseFloat(m) * (1 - p)).toFixed(3) + ')') : 'transparent';
    s.el.style.boxShadow = p < 1 ? `inset 0 -${(2 * (1 - p)).toFixed(2)}px 0 ${T.P.insLine}` : 'none';
  });
}
/** The comment (or selection) wash running over the passage, with the 3 px underline on comments. */
export function wash(T, t, t0, { dur = 0.4, id = null, kind = null, under = true, until = null } = {}) {
  for (const u of [...T.us, ...T.sels]) {
    if (id != null && u.id !== id) continue;
    if (kind && u.kind !== kind) continue;
    const p = (until != null && t >= until ? 0 : EASE_OUT(prog(t, t0, t0 + dur)) * 100).toFixed(2);
    u.el.style.backgroundSize = u.kind === 'u' ? `${p}% 100%, ${under ? p : 0}% ${u.uh}px` : `${p}% 100%`;
  }
}

// ── entrances and exits (a block or a word) ─────────────────────────────────
/** Short rise: opacity and translateY over 0.48 s with an ease-out. */
export function rise(node, t, t0, { dist = 34, dur = DUR.slow } = {}) {
  const p = prog(t, t0, t0 + dur);
  node.style.opacity = EASE(Math.min(1, p * 1.6)).toFixed(4);
  node.style.transform = p < 1 ? `translateY(${((1 - EASE_OUT(p)) * dist).toFixed(2)}px)` : 'none';
}
/** Slam: the word drops from scale `fromScale` to 1 in 0.26 s (sub-frame blur makes the trail). */
export function slam(node, t, t0, { fromScale = 1.5, dur = 0.26, origin = '50% 60%' } = {}) {
  const p = prog(t, t0, t0 + dur);
  node.style.transformOrigin = origin;
  node.style.opacity = p <= 0 ? '0' : clamp(p * 3.5).toFixed(4);
  const k = 1 - Math.pow(1 - p, 3);
  const s = lerp(fromScale, 1, k) + (p > 0.75 && p < 1 ? Math.sin((p - 0.75) * 4 * Math.PI) * -0.012 : 0);
  node.style.transform = p < 1 ? `scale(${s.toFixed(4)})` : 'none';
}
export function fade(node, t, t0, { dur = DUR.base, exit = false } = {}) {
  const a = EASE(prog(t, t0, t0 + dur));
  node.style.opacity = (exit ? 1 - a : a).toFixed(4);
}
/** Exit upwards (the next thought pushes the previous one out). */
export function riseOut(node, t, t0, { dist = 40, dur = DUR.base } = {}) {
  const p = prog(t, t0, t0 + dur);
  if (p <= 0) return;
  node.style.opacity = (1 - EASE_IN(p)).toFixed(4);
  node.style.transform = `translateY(${(-EASE_IN(p) * dist).toFixed(2)}px)`;
}
/**
 * Pop: grows from the origin (the feet, for a character) with squash-and-stretch and a spring overshoot. It grows
 * stretched upwards, passes its size, comes back squashed and settles; the deformation comes from the spring's
 * velocity, so it never snaps. dur ~0.5 s; fromScale = starting scale; stretch = max deformation (0.16 = 16%).
 */
export function pop(node, t, t0, { dur = 0.5, fromScale = 0, stretch = 0.16, freq = 2.4, damp = 0.52, origin = null } = {}) {
  if (origin) node.style.transformOrigin = origin;
  const u = t - t0;
  if (u < 0) { node.style.opacity = '0'; node.style.transform = `scale(${Math.max(fromScale, 0.0001)})`; return; }
  if (u >= dur) { node.style.opacity = ''; node.style.transform = 'none'; return; }
  const S = x => springPop(x, freq, damp);
  const settle = smooth01(clamp((u - dur * 0.55) / (dur * 0.45)));            // what is left of the spring fades out by the end
  const s = S(u) + (1 - S(u)) * settle;
  const h = 1 / 480, v = (S(u + h) - S(Math.max(0, u - h))) / (u > h ? 2 * h : h + u);
  const k = Math.max(-1, Math.min(1, v / (freq * 2.4))) * stretch * (1 - settle);
  const e = fromScale + (1 - fromScale) * s;
  node.style.opacity = clamp(u / 0.05).toFixed(3);
  node.style.transform = `scale(${(e * (1 - 0.6 * k)).toFixed(4)}, ${(e * (1 + k)).toFixed(4)})`;
}
/** Pop exit: shrinks to the origin after a short anticipation (grows 6% before vanishing). */
export function popOut(node, t, t0, { dur = 0.26, origin = null } = {}) {
  const p = prog(t, t0, t0 + dur);
  if (p <= 0) return;
  if (origin) node.style.transformOrigin = origin;
  const a = p < 0.3 ? 1 + 0.06 * Math.sin((p / 0.3) * Math.PI / 2) : 1.06 * (1 - EASE_IN((p - 0.3) / 0.7));
  node.style.transform = `scale(${Math.max(0.0001, a).toFixed(4)}, ${Math.max(0.0001, a * (p < 0.3 ? 0.97 : 1)).toFixed(4)})`;
  node.style.opacity = (parseFloat(node.style.opacity || '1') * (1 - prog(p, 0.75, 1))).toFixed(4);
}
/** Slide in from off-place (from: 'left'|'right'|'bottom'|'top', dist px) with a slight overshoot. */
export function slide(node, t, t0, { dur = 0.6, from = 'left', dist = 700 } = {}) {
  const p = prog(t, t0, t0 + dur), e = p >= 1 ? 1 : 1 + 1.9 * Math.pow(p - 1, 3) + 0.9 * Math.pow(p - 1, 2);   // gentle back-out (~3%)
  const [dx, dy] = { left: [-dist, 0], right: [dist, 0], bottom: [0, dist], top: [0, -dist] }[from] || [-dist, 0];
  node.style.opacity = p <= 0 ? '0' : '';
  node.style.transform = p < 1 ? `translate(${(dx * (1 - e)).toFixed(2)}px, ${(dy * (1 - e)).toFixed(2)}px)` : 'none';
}
/** Slide out to a side (to: 'left'|'right'|'bottom'|'top'). */
export function slideOut(node, t, t0, { dur = 0.4, to = 'right', dist = 700 } = {}) {
  const p = prog(t, t0, t0 + dur);
  if (p <= 0) return;
  const e = EASE_IN(p), [dx, dy] = { left: [-dist, 0], right: [dist, 0], bottom: [0, dist], top: [0, -dist] }[to] || [dist, 0];
  node.style.transform = `translate(${(dx * e).toFixed(2)}px, ${(dy * e).toFixed(2)}px)`;
  if (p >= 1) node.style.opacity = '0';
}
const smooth01 = x => x * x * (3 - 2 * x);
function springPop(t, freq, damp) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq, z = Math.min(damp, 0.999), wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t));
}

/** Words coming in one by one: each rises 18 px in 0.3 s. */
export function staggerWords(words, t, t0, { stagger = 0.07, dur = 0.3, dist = 18, times = null } = {}) {
  words.forEach((w, i) => {
    const a = times ? times[i] : t0 + i * stagger;
    const p = prog(t, a, a + dur);
    w.style.opacity = EASE(Math.min(1, p * 1.8)).toFixed(4);
    w.style.transform = p < 1 ? `translateY(${((1 - EASE_OUT(p)) * dist).toFixed(2)}px)` : 'none';
  });
}
/** Letters that break loose and fly off. Fixed trajectory per seed. */
export function burst(chars, t, t0, { seed = 7, dur = 0.9, spread = 900, rot = 260, stagger = 0.012, grav = 700 } = {}) {
  const r = mulberry32(seed);
  chars.forEach((c, i) => {
    const vx = (r() - 0.5) * spread, vy = -(0.3 + r() * 0.8) * spread * 0.6, vr = (r() - 0.5) * rot;
    const tt = Math.max(0, t - t0 - i * stagger);
    if (tt <= 0) { c.style.transform = 'none'; c.style.opacity = ''; return; }
    const x = vx * tt, y = vy * tt + 0.5 * grav * 2.2 * tt * tt;
    c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(vr * tt).toFixed(1)}deg)`;
    c.style.opacity = (1 - prog(tt, dur * 0.55, dur)).toFixed(3);
  });
}

// ── cursor ──────────────────────────────────────────────────────────────────
/** Text cursor: a 4 px bar. Blinks at ~1 Hz when idle, stays lit while typing. */
export function cursor(parent, { color = COLOR.accent, h = 1.05, w = 4 } = {}) {
  const c = css(el(parent, 'abs'), { width: w + 'px', background: color, display: 'none' });
  return {
    node: c,
    /** Places the cursor after node `ref` (a letter or word). live = typing (no blink). */
    after(ref, t, live = false, visible = true) {
      if (!ref || !visible) { c.style.display = 'none'; return; }
      const pr = parent.getBoundingClientRect(), r = ref.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(ref).fontSize);
      c.style.display = live || Math.floor(t / 0.53) % 2 === 0 ? 'block' : 'none';
      c.style.left = (r.right - pr.left + 3) + 'px';
      c.style.top = (r.top - pr.top + (r.height - fs * h) / 2) + 'px';
      c.style.height = (fs * h) + 'px';
    },
    at(x, y, hpx, t, live = false) {
      c.style.display = live || Math.floor(t / 0.53) % 2 === 0 ? 'block' : 'none';
      css(c, { left: x + 'px', top: y + 'px', height: hpx + 'px' });
    },
    hide() { c.style.display = 'none'; },
  };
}
/** Typing of a block made with text(..., { chars: true }): shows the letters up to t and moves the cursor. */
export function typeOn(T, t, times, cur = null, { end = Infinity } = {}) {
  let shown = 0;
  T.chars.forEach((c, i) => { const on = t >= times[i]; c.style.visibility = on ? 'visible' : 'hidden'; if (on) shown++; });
  if (cur) cur.after(T.chars[Math.max(0, shown - 1)], t, shown > 0 && shown < T.chars.length, shown > 0 && t < end);
  return shown;
}

// ── brand lockup ────────────────────────────────────────────────────────────
/** A neutral placeholder mark: a solid square in the accent colour. Replace it with your own SVG if you have one. */
export function markSvg(h, accent = COLOR.accentDeep) {
  return `<svg width="${h}" height="${h}" viewBox="0 0 100 100" fill="none" style="display:block;overflow:visible">
    <rect class="sq" x="0" y="0" width="100" height="100" rx="12" fill="${accent}"/></svg>`;
}
/** Lockup: mark + brand name in the display face. draw(t, t0) animates it: the square grows, the name rises. */
export function lockup(parent, { x, y, h = 72, color = COLOR.ink, accent = COLOR.accentDeep, name = 'Your brand', center = false } = {}) {
  const box = css(el(parent, 'abs'), { left: (x ?? 0) + 'px', top: (y ?? 0) + 'px', display: 'flex', alignItems: 'center', gap: (h * 0.42) + 'px' });
  if (center) css(box, { left: '0px', right: '0px', justifyContent: 'center' });
  const m = el(box, '', markSvg(h, accent));
  const word = css(el(box, 'disp', name), { fontSize: (h * 1.18) + 'px', color, lineHeight: '1', letterSpacing: '-0.045em' });
  const sq = m.querySelector('.sq');
  return {
    node: box, word,
    draw(t, t0 = 0) {
      const p = EASE_OUT(prog(t, t0, t0 + 0.36));
      sq.setAttribute('transform', `translate(${(50 * (1 - p)).toFixed(2)} ${(50 * (1 - p)).toFixed(2)}) scale(${Math.max(0.0001, p).toFixed(4)})`);
      rise(word, t, t0 + 0.24, { dist: 16, dur: 0.4 });
    },
    ready() { this.draw(99, 0); },
  };
}

// ── interface pieces ────────────────────────────────────────────────────────
/** Button with square corners (the CTA of the end card, the product's main button). */
export function button(parent, text, { x = 90, y, P = SKINS.paper, size = 38, center = false } = {}) {
  const wrap = css(el(parent, 'abs'), { left: x + 'px', top: y + 'px' });
  if (center) css(wrap, { left: '0px', right: '0px', textAlign: 'center' });
  const b = css(el(wrap, 'disp', text, 'span'), {
    display: 'inline-block', fontSize: size + 'px', letterSpacing: '-0.02em', padding: '28px 46px', lineHeight: '1',
    background: P.btnBg, color: P.btnInk,
  });
  return { node: wrap, b };
}
/** Keycap (Tab): mono, ink border and a step at the bottom; press(t, t0) sinks it for 0.16 s. */
export function keycap(parent, label, { x, y, P = SKINS.paper, size = 64, w = null } = {}) {
  const wrap = css(el(parent, 'abs'), { left: x + 'px', top: y + 'px' });
  const k = css(el(wrap, 'mono', label), {
    fontSize: size + 'px', letterSpacing: '0.04em', textTransform: 'none', fontWeight: '600', color: COLOR.ink,
    background: P.dark ? COLOR.paperOnInk : COLOR.sheet, border: `3px solid ${COLOR.ink}`, borderBottomWidth: '11px', padding: '22px 34px 16px',
    minWidth: w ? w + 'px' : undefined, textAlign: 'center', boxSizing: 'border-box',
  });
  return {
    node: wrap, k,
    press(t, t0) {
      const p = prog(t, t0, t0 + 0.07), r = prog(t, t0 + 0.16, t0 + 0.3), d = p - EASE_OUT(r);
      k.style.transform = d > 0 ? `translateY(${(8 * d).toFixed(2)}px)` : 'none';
      k.style.borderBottomWidth = (11 - 8 * d).toFixed(2) + 'px';
      k.style.background = d > 0.3 ? COLOR.paper3 : (P.dark ? COLOR.paperOnInk : COLOR.sheet);
    },
  };
}
/** Mono label (eyebrow): caps, 0.18em tracking, in the skin's accent colour. */
export function label(parent, html, { x = 90, y, P = SKINS.paper, size = 26, color, w = 850, align = 'left' } = {}) {
  return css(el(parent, 'abs mono', html), { left: x + 'px', top: y + 'px', width: w + 'px', fontSize: size + 'px', color: color || P.accent, textAlign: align });
}
/** Hairline that grows from the left (a page rule). */
export function hairline(parent, { x = 90, y, w = 850, h = 2, color }) {
  const n = css(el(parent, 'abs'), { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: color, transformOrigin: '0 50%' });
  return { node: n, draw(t, t0, dur = 0.5) { const p = EASE_OUT(prog(t, t0, t0 + dur)); n.style.transform = `scaleX(${p.toFixed(4)})`; n.style.opacity = p > 0 ? '1' : '0'; } };
}

// ── util ────────────────────────────────────────────────────────────────────
const hex = c => { const m = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)); };
export function mixHex(a, b, p) {
  if (!a.startsWith('#') || !b.startsWith('#')) return p < 0.5 ? a : b;
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`;
}
/** Rectangle of a node relative to another (frame px when `base` is the layer). */
export function rectIn(node, base) {
  const r = node.getBoundingClientRect(), b = base.getBoundingClientRect();
  return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
}
