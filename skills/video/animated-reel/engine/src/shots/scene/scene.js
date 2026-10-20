// The scene: a backdrop skin and a list of items, each with its own timeline (LOCAL shot time). Almost every shot of
// a reel is made of this; an effect that does not fit here becomes its own module under src/shots/.
//
// opts:
//   skin    paper | ink | editorial, or { base: 'editorial', ...overridden keys } (lib/ui.js)
//   camera  [{ t, dur, x, y, s, rot, ease }] | { targets: [...], origin: [540, 960], hand: { amp, freq, rot } }
//           the transform the WORLD receives (x -60 = the scene moves 60 px to the left; s 1.08 = 8% push-in around
//           origin); ease 'io' (default) | 'out' | 'in' | 'gentle' | 'linear' (lib/camera.js)
//   leave   { t, dur }  the whole scene fades out
//   breathe n           the whole scene scales by 1 + n over opts.dur (slow push)
//   items   [{ type, id?, ..., enter?, exit? }]  coordinates in px of the 1080x1920 frame
//
// Items (readable text only within x 90-940 and y 380-1410; body >= 34 px, titles >= 56 px):
//   text     html (see lib/ui.js: <em> marked, <s> cut, <ins> insertion, <u> comment, <mark> selection, <i> quiet,
//            <code> mono, <b> strong), x, y, w, size, cls (disp|serif|news|mono|hand), color, align, lh, ls, weight, strong
//            enter { t, fx: rise|slam|fade|words|slamWords|typeOn|none|pop|slide, dur, dist, fromScale, stagger, times, cps, seed, cursor }
//            mark { t, dur } · strike { t, dur, id } · insert { t, cps, seed, id } or [{ t, cps, id }] (each <ins id> at its
//            own time) · wash [{ t, dur, id, kind, under }] · accept [{ t, id }] · undo [{ t, id }]
//            collapse { t, dur } (the struck passage disappears and the text below moves up) · burst { t, seed, dur }
//            (the letters fly off) · exit { t, fx, dur }
//   label    html, x, y, size, color, align, w · enter · exit          (mono eyebrow in caps)
//   hairline x, y, w, h, color, t, dur
//   keycap   label, x, y, size, w · enter · press [t...] · exit
//   lockup   x, y, h, name, center, color, accent, t                   (brand mark + name)
//   button   text, x, y, size, center · enter · press [t...] · exit
//   dust     from 'textId', to 'textId'|null, t0, t1, n, color, seed, size, sparkle, scatter   (text that turns to dust and forms another)
//   sheet    x, y, w, h, title, meta, shadow · enter · exit · items [...] (coordinates relative to the sheet)
//   note     target 'itemId.partId', x, y, w, author, text, size, quote · enter · typeOn { t, cps, seed } · rule (t) · exit
//            (the comment card, pinned to the passage by a 3 px rule that draws itself)
//   bubble   side 'me'|'ai', html, x, y, w, size · enter · exit       (a chat thread: the only rounded corner)
//   speech   line 'l1', html?, x, y, w, size, cls, align, mode 'enter'|'lightUp', mark { t } · exit
//            (each word lights up when it is spoken: timings from src/reels/<reel>.vo.json, written by tools/vo.mjs)
//   sweep    x, y, w, h, t, dur, color                                 (the AI pass sweeping a passage)
//   verify   target 'itemId[.partId]', t, dur, label                   (character-by-character check of untouched text)
//   box      html, x, y, w, h, style {...} · enter · exit              (any static DOM)
//   group    items [...] · enter · move [{ t, dur, x, y, s, rot, ease, origin }] · clip [top, right, bottom, left] · exit
//   img      character or plate (PNG/SVG with alpha, or opaque; lib/image.js). Decoded in init.
//            src | poses { name: src | { src, poseAlign, scale, dx, dy } } + pose (initial)
//            swap [{ t, pose, dissolve (s, 0 = on the frame), mirror }]
//            box: x, y, w, h (w or h alone keeps the ratio) | plate: true (full frame, cover)
//                 | height (px of the BODY, without the transparent margin) + feet: [x, y] (where the feet stand)
//            fit contain (default) | cover | fill · pos '50% 100%' (cover: '50% 50%') · mirror
//            anchor '50% 100%' (default) | 'feet' (feet measured in the alpha) | 'Xpx Ypx': origin of pop, idle and move
//            poseAlign 'feet' (default: every pose gets the base pose's feet and body height) | false
//            enter { t, fx: pop (default) | rise | slam | fade | slide | none, dur } · exit { t, fx: pop | slide | rise | (fade) }
//            move [{ t, dur, x, y, s, rot, ease, origin }] (from the box; default origin = anchor)
//            idle true | { breathe 0.008 (scaleY amplitude), period 3.4, sway 0 (deg), float 0 (px), phase 0 }, from enter.t
//                 with a 0.6 s ramp
//            accents [t...] | { t: [...], line: 'l3', words: ['note'], height 9, squash 0.035, dur 0.34, before -0.02 }
//                 the little hop that makes a mouthless character "talk". With line, times come from the .vo.json
//                 (without words: every word of 4+ letters, at least 0.28 s apart)
//            boil { amp 2 (px), fps 10, freq 0.03, octaves 2, seed, cycle }: line boil (lib/boil.js)
//            shadow true | { w, h, op, color, dx, dy, blur }: contact ellipse at the measured feet (shrinks on a hop)
//            filter (CSS filter) · opacity | op · crop { x, y, w, h, r } (frame px; moves with move)
//   stroke   hand-drawn SVG gesture that draws itself (lib/stroke.js)
//            shape circle|underline|arrow|bracket|x|check|motion-lines|sparkle|sweat-drop|question|exclamation|spiral|
//                  scribble|bolt|thought-cloud|heart|caret|strike|wave|lasso | d 'M...' (or a list) + viewBox '0 0 100 100'
//            box x, y, w, h | target 'itemId.partId' (+ margin): circles/underlines/strikes the passage (one stroke per
//                  text line for underline, wave and strike) | from: [x, y], to: [x, y] (arrow)
//            t, dur (default from the length, ~2400 px/s), color (default P.stroke), thickness 6, rot, mirror, op
//            seed (default from position and order: two instances never match), tremor 1, pressure 0.22, tip 0.38,
//            doublePass (a second thin pass, felt-tip pen), boil { amp 1.4, fps 10, n 3 }
//            fill color | { color, t, dur, op, offset: [dx, dy], all } (closed shapes: heart, sweat-drop, thought-cloud)
//            erase { t, dur, fx: retract (default) | fade } · exit
//            preset options: curve, head (arrow) · side 'right' (bracket) · twice, hook (underline) · n (sparkle,
//            motion-lines) · turns (spiral) · loop (scribble, circle) · bubbles (thought-cloud) · lambda (wave) · clockwise (circle)
//   particles shape dust|vapor|rain|sparks|papers|snow · x, y, w, h (default the frame) · n, color (or a list), size,
//            vel, wind, source [x, y] (vapor, sparks), cone, gravity, t0, t1, fade 0.4, seed, op, sparkle, blur (lib/particles.js)
//   light    shape radial|blinds|vignette|ink|grain · op, blend, t0, t1, fade, flicker { amp 0.22, freq 6 } | true
//            radial x, y, r | rx, ry, color, falloff 2 · blinds x, y, w, h, origin [x, y], ang 24, n 3, breadth 150, gap 90,
//            soften 36, reach 0.9, color · vignette strength 0.55, radius 0.45, color · ink color | [c1, c2] + ang ·
//            grain size 1.5, fps 24 (default blend overlay, op 0.07). Dithered gradients (lib/light.js)
//
// On any item:
//   depth  n: moves with the camera scaled by n (0 pinned to the screen · 1 with it · > 1 foreground · 0.5 background);
//          WITHOUT depth the item stays on screen (captions, speech). Applies to top-level items (or a whole group)
//   z      n >= 0: above items without z (the scene is isolated: it never goes above #fade)
//   blend  mix-blend-mode ('screen', 'multiply', 'soft-light'...) against what is below INSIDE the scene
//          (depth, z or blend put the item in a full-frame wrapper, so its own transform never fights the camera)
//   style  {...} CSS on the root node of text, speech, label, box, note, sheet, bubble and button. Never set transform
//          or opacity there (the engine animates both); to center use translate: '-50% 0' with left: '540px' and
//          width: 'max-content'
import { el, css } from '../../core/dom.js';
import { prog, clamp } from '../../core/math.js';
import * as K from '../lib/ui.js';
import { typingTimes, plain } from '../lib/timing.js';
import { dust } from '../lib/dust.js';
import { REEL } from '../../reel.js';
import { mountImage } from '../lib/image.js';
import { mountStroke } from '../lib/stroke.js';
import { mountParticles } from '../lib/particles.js';
import { mountLight, defaultBlend } from '../lib/light.js';
import { normalizeCamera, cameraAt, transformDepth, originCss } from '../lib/camera.js';

const ent = (node, t, e) => {
  node.style.opacity = '';
  if (!e || e.fx === 'none') return;
  if (e.fx === 'slam') K.slam(node, t, e.t, e);
  else if (e.fx === 'fade') K.fade(node, t, e.t, e);
  else if (e.fx === 'pop') K.pop(node, t, e.t ?? 0, { ...e, origin: e.origin || '50% 50%' });
  else if (e.fx === 'slide') K.slide(node, t, e.t ?? 0, e);
  else K.rise(node, t, e.t, e);
};
const exit = (node, t, s) => {
  if (s == null) return;
  const S = typeof s === 'number' ? { t: s } : s;
  if (t < S.t) return;
  if (S.fx === 'rise') K.riseOut(node, t, S.t, S);
  else if (S.fx === 'pop') K.popOut(node, t, S.t, { ...S, origin: S.origin || '50% 50%' });
  else if (S.fx === 'slide') K.slideOut(node, t, S.t, S);
  else { const p = prog(t, S.t, S.t + (S.dur ?? 0.24)); node.style.opacity = (parseFloat(node.style.opacity || '1') * (1 - K.EASE(p))).toFixed(4); }
};
const T0 = x => (typeof x === 'number' ? { t: x } : x);
/** move [{ t, dur, x, y, s, rot, ease, origin }]: absolute targets in sequence, each starting where the previous one
 *  is (a simple FLIP). A single move is the common case: from (0, 0, 1) to (x, y, s). rot in degrees; ease
 *  'io' (default) | 'out' | 'in' | 'gentle' | 'linear'. */
const EASES = { io: K.EASE_IO, out: K.EASE_OUT, in: K.EASE_IN, gentle: K.EASE, linear: x => x };
const applyMove = (node, t, m) => {
  if (!m) return;
  let x = 0, y = 0, sc = 1, rot = 0, origin = '50% 50%';
  for (const k of [].concat(m)) {
    if (t < k.t) break;
    const p = (EASES[k.ease] || K.EASE_IO)(prog(t, k.t, k.t + Math.max(1e-6, k.dur ?? 0.6)));
    x += ((k.x ?? x) - x) * p; y += ((k.y ?? y) - y) * p; sc += ((k.s ?? sc) - sc) * p;
    if (k.rot != null || rot) rot += ((k.rot ?? rot) - rot) * p;
    if (k.origin) origin = k.origin;
  }
  node.style.transformOrigin = origin;
  node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})` + (rot ? ` rotate(${rot.toFixed(3)}deg)` : '');
};
/** Does the scene use a layered item (img, stroke, particles, light, depth, z or blend)? Then it mounts an isolated stage. */
const NEW_TYPES = new Set(['img', 'stroke', 'particles', 'light']);
const usesNew = items => (items || []).some(it => it && (NEW_TYPES.has(it.type) || typeof it.depth === 'number' || it.z != null || it.blend != null || usesNew(it.items)));

export default {
  async init(ctx) {
    const o = this.o = { skin: 'paper', items: [], ...ctx.opts };
    this.P = K.skin(o.skin);
    this.L = ctx.layer;
    this.t0 = ctx.shot?.start ?? 0;   // speech timings are global; the shot runs in local time
    // camera, and the isolated stage (z-index and blend stay inside the scene, never above #fade)
    this.cam = normalizeCamera(o.camera);
    this.camNow = null;
    this.nStroke = 0;
    const base = this.cam || usesNew(o.items) ? css(el(this.L, 'abs'), { inset: '0px', isolation: 'isolate', overflow: 'hidden' }) : this.L;
    K.backdrop(base, o.skin);
    this.root = css(el(base, 'abs'), { inset: '0px' });
    this.byId = {};
    if (JSON.stringify(o.items).includes('"speech"') || JSON.stringify(o.items).includes('"line"')) {   // "line": speech accents of an img
      try { this.vo = await (await fetch(`/src/reels/${REEL}.vo.json`)).json(); } catch { this.vo = { lines: [] }; }
    }
    this.items = [];
    for (const it of o.items) this.items.push(await this.build(it, this.root, this.P));
    this.L.classList.add('on');
    for (const it of this.items) it.measure?.();
    this.L.classList.remove('on');
  },

  /** An item with depth, z or blend gets a full-frame wrapper: the camera, the z-index and the blend live on it and never
   *  fight the item's own enter/move transform. Without any of those the item is mounted directly. */
  async build(it, parent, P) {
    const type = it.type || 'text';
    const blend = it.blend ?? (type === 'light' ? defaultBlend(it) : null);
    const depth = typeof it.depth === 'number' ? it.depth : null;
    if (depth == null && it.z == null && !blend) return this.build1(it, parent, P);
    const w = css(el(parent, 'abs'), { left: '0px', top: '0px', width: '1080px', height: '1920px', pointerEvents: 'none' });
    if (it.z != null) w.style.zIndex = String(it.z);
    if (blend) w.style.mixBlendMode = blend;
    if (depth != null) w.style.transformOrigin = originCss(this.cam);
    const b = await this.build1(it, w, P);
    const u = b.upd;
    b.wrap = w;
    b.upd = t => { u(t); if (depth != null) w.style.transform = this.camNow ? transformDepth(this.camNow, depth) : 'none'; };
    return b;
  },

  /** A part of a text item (or the whole item): 'itemId.partId' | 'itemId' → DOM node. */
  locate(a) {
    const [iid, pid] = String(a).split('.');
    const b = this.byId[iid];
    if (!b) return null;
    if (pid) return b.T?.parts[pid]?.el || null;
    return b.T?.node || b.node || null;
  },

  async build1(it, parent, P) {
    const self = this;
    const b = { it, upd: () => {} };
    if (it.id) this.byId[it.id] = b;
    const type = it.type || 'text';

    if (type === 'text') {
      const e = it.enter;
      const T = b.T = K.text(parent, it.html, { ...it, P, chars: it.chars || e?.fx === 'typeOn' || !!it.burst });
      if (it.style) css(T.node, it.style);
      if (e?.fx === 'typeOn') {
        const full = plain(it.html), times = typingTimes(full, e.t, e.cps ?? 16, e.seed ?? 1);
        b.times = []; [...full].forEach((ch, i) => { if (ch !== ' ') b.times.push(times[i]); });
        if (e.cursor !== false) b.cur = K.cursor(parent, { color: e.cursorColor || P.commentLine });
      }
      if (it.insert) {
        if (Array.isArray(it.insert)) {
          // each insertion at its own time: [{ t, cps, seed, id }], id of the <ins id="..."> (or its index)
          b.insTimes = {};
          T.inss.forEach((s, j) => { const I = it.insert.find(x => x.id === (s.id ?? String(j))) || it.insert[j]; if (I) b.insTimes[s.id ?? j] = typingTimes(s.cs.map(c => c.textContent).join(''), I.t, I.cps ?? 18, I.seed ?? j + 2); });
        } else {
          const I = it.insert, txt = T.inss.map(s => s.cs.map(c => c.textContent).join('')).join('');
          b.insTimes = typingTimes(txt, I.t, I.cps ?? 18, I.seed ?? 2);
        }
      }
      b.upd = t => {
        T.node.style.opacity = '';
        if (e?.fx === 'typeOn') { T.node.style.opacity = '1'; K.typeOn(T, t, b.times, b.cur, { end: e.end ?? Infinity }); }
        else if (e?.fx === 'words') K.staggerWords(T.words, t, e.t, e);
        else if (e?.fx === 'slamWords') T.words.forEach((w, i) => K.slam(w, t, e.times ? e.times[i] : e.t + i * (e.stagger ?? 0.25), e));
        else ent(T.node, t, e);
        if (it.wash) for (const l of [].concat(it.wash)) K.wash(T, t, l.t, l);
        if (it.mark != null) K.mark(T, t, T0(it.mark).t, T0(it.mark));
        if (it.strike != null) for (const r of [].concat(it.strike)) K.strike(T, t, T0(r).t, T0(r));
        if (it.insert) K.insert(T, t, b.insTimes, { caret: null });
        if (it.collapse != null) K.collapse(T, t, T0(it.collapse).t, T0(it.collapse));
        for (const a of [].concat(it.accept || [])) K.accept(T, t, a.t, a);
        for (const a of [].concat(it.undo || [])) K.undo(T, t, a.t, a);
        if (it.burst) K.burst(T.chars, t, it.burst.t, it.burst);
        exit(T.node, t, it.exit);
      };
      return b;
    }

    if (type === 'label') {
      const n = b.node = K.label(parent, it.html, { ...it, P });
      if (it.style) css(n, it.style);
      b.upd = t => { ent(n, t, it.enter); exit(n, t, it.exit); };
      return b;
    }
    if (type === 'hairline') {
      const f = K.hairline(parent, { ...it, color: it.color || P.rule });
      b.upd = t => { f.draw(t, it.t ?? 0, it.dur ?? 0.5); exit(f.node, t, it.exit); };
      return b;
    }
    if (type === 'keycap') {
      const k = K.keycap(parent, it.label, { ...it, P });
      b.upd = t => { ent(k.node, t, it.enter); for (const a of [].concat(it.press || [])) if (t >= a - 0.01) k.press(t, a); exit(k.node, t, it.exit); };
      return b;
    }
    if (type === 'lockup') {
      const l = K.lockup(parent, { ...it, color: it.color || P.ink, accent: it.accent || K.COLOR.accentDeep });
      b.upd = t => { l.draw(t, it.t ?? 0); exit(l.node, t, it.exit); };
      return b;
    }
    if (type === 'button') {
      const bt = K.button(parent, it.text, { ...it, P });
      if (it.style) css(bt.b, it.style);
      b.upd = t => {
        ent(bt.node, t, it.enter);
        let d = 0; for (const a of [].concat(it.press || [])) d = Math.max(d, prog(t, a, a + 0.06) - K.EASE_OUT(prog(t, a + 0.12, a + 0.3)));
        bt.b.style.transform = d > 0 ? `scale(${(1 - 0.05 * d).toFixed(4)})` : 'none';
        bt.b.style.filter = d > 0 ? `brightness(${(1 - 0.18 * d).toFixed(3)})` : 'none';
        exit(bt.node, t, it.exit);
      };
      return b;
    }
    if (type === 'box') {
      const n = css(el(parent, 'abs', it.html || ''), { left: (it.x ?? 0) + 'px', top: (it.y ?? 0) + 'px', width: it.w ? it.w + 'px' : undefined, height: it.h ? it.h + 'px' : undefined, ...(it.style || {}) });
      b.upd = t => { ent(n, t, it.enter); exit(n, t, it.exit); };
      return b;
    }
    if (type === 'bubble') {
      const me = it.side === 'me';
      const n = css(el(parent, 'abs serif', it.html), {
        left: me ? undefined : (it.x ?? 90) + 'px', right: me ? (1080 - (it.x ?? 90) - (it.w ?? 850)) + 'px' : undefined, top: it.y + 'px',
        maxWidth: (it.w ?? 700) + 'px', fontSize: (it.size ?? 36) + 'px', lineHeight: '1.36', padding: '24px 30px', borderRadius: '26px',
        background: me ? (P.dark ? '#3a3634' : '#e6e0d8') : (P.dark ? '#2b2826' : '#f1ece5'), color: P.ink,
        borderBottomRightRadius: me ? '6px' : '26px', borderBottomLeftRadius: me ? '26px' : '6px',
      });
      if (it.style) css(n, it.style);
      b.node = n;
      b.upd = t => { ent(n, t, it.enter); exit(n, t, it.exit); };
      return b;
    }
    if (type === 'group') {
      const outer = css(el(parent, 'abs'), { left: '0px', top: '0px', width: '1080px', height: '1920px' });
      if (it.clip) outer.style.clipPath = `inset(${it.clip.map(v => v + 'px').join(' ')})`;   // [top, right, bottom, left]
      const inner = css(el(outer, 'abs'), { left: '0px', top: '0px', width: '1080px', height: '1920px' });
      b.node = outer; b.subs = [];
      for (const s of it.items || []) b.subs.push(await this.build(s, inner, P));
      b.measure = () => b.subs.forEach(s => s.measure?.());
      b.upd = t => { ent(outer, t, it.enter); for (const s of b.subs) s.upd(t); applyMove(inner, t, it.move); exit(outer, t, it.exit); };
      return b;
    }
    if (type === 'sheet') {
      const w = it.w ?? 900, x = it.x ?? 90;
      const f = css(el(parent, 'abs'), {
        left: x + 'px', top: it.y + 'px', width: w + 'px', height: it.h ? it.h + 'px' : undefined, background: it.backdrop === false ? 'transparent' : P.sheet,
        boxShadow: it.shadow === false || it.backdrop === false ? 'none' : (P.sheetShadow ?? (P.dark ? '0 30px 80px -30px rgba(0,0,0,.6)' : '0 1px 0 rgba(32,30,29,.07), 0 40px 90px -40px rgba(32,30,29,.30)')),
        border: it.backdrop === false ? 'none' : `1px solid ${P.sheetBorder}`, boxSizing: 'border-box',
      });
      if (it.style) css(f, it.style);
      const FP = P.dark ? P : { ...K.SKINS.paper, sheet: P.sheet };   // inside a light sheet the palette is always the paper skin's
      if (it.title) css(el(f, 'abs disp', it.title), { left: '52px', top: '46px', fontSize: (it.tsize ?? 44) + 'px', color: FP.ink, width: (w - 104) + 'px' });
      if (it.meta) css(el(f, 'abs mono', it.meta), { left: '52px', top: (it.title ? 46 + (it.tsize ?? 44) * 1.25 + 14 : 40) + 'px', fontSize: '22px', color: FP.faint });
      b.node = f;
      b.subs = [];
      for (const s of it.items || []) b.subs.push(await this.build(s, f, FP));
      b.measure = () => b.subs.forEach(s => s.measure?.());
      b.upd = t => { ent(f, t, it.enter); for (const s of b.subs) s.upd(t); exit(f, t, it.exit); };
      return b;
    }
    if (type === 'note') {
      const w = it.w ?? 760, size = it.size ?? 36;
      const card = css(el(parent, 'abs'), { left: it.x + 'px', top: it.y + 'px', width: w + 'px', background: P.noteBg ?? (P.dark ? 'rgba(237,233,227,.06)' : K.COLOR.sheet), borderLeft: `4px solid ${P.commentLine}`, padding: it.compact ? '14px 26px 16px' : '22px 30px 26px', boxSizing: 'border-box', boxShadow: P.dark ? 'none' : '0 1px 2px rgba(32,30,29,.07), 0 18px 40px -24px rgba(32,30,29,.28)' });
      if (it.style) css(card, it.style);
      b.node = card;
      if (!it.compact) css(el(card, 'mono', it.author || 'Comment'), { fontSize: '24px', color: P.commentLine, marginBottom: '10px' });
      if (it.quote) css(el(card, 'news', it.quote), { fontSize: (it.csize ?? 30) + 'px', lineHeight: '1.4', fontStyle: 'italic', color: P.muted, marginBottom: '12px' });
      const T = b.T = K.text(card, it.text, { P, cls: 'serif', size, chars: true, x: 0, y: 0, w: w - 64, weight: 400 });
      css(T.node, { position: 'relative', left: '0px', top: '0px', lineHeight: '1.32' });
      const d = it.typeOn || { t: (T0(it.enter)?.t ?? 0) + 0.3 };
      const full = plain(it.text), times = typingTimes(full, d.t, d.cps ?? 17, d.seed ?? 3);
      b.times = []; [...full].forEach((ch, i) => { if (ch !== ' ') b.times.push(times[i]); });
      b.cur = K.cursor(card, { color: P.commentLine });
      b.typedEnd = times[times.length - 1];
      // 3 px rule from the passage to the card
      const svg = el(parent, 'abs', '<svg width="1080" height="1920" style="display:block;overflow:visible"><path fill="none" stroke-width="3" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>');
      css(svg, { left: '0px', top: '0px' });
      const path = svg.querySelector('path'); path.setAttribute('stroke', P.commentLine);
      b.measure = () => {
        const [iid, pid] = (it.target || '').split('.');
        const tb = self.byId[iid], tgt = tb?.T?.parts[pid]?.el;
        if (!tgt) return;
        // the rule runs down the sheet's left margin: out of the start of the passage, down the margin, into the card
        const pr = parent.getBoundingClientRect(), r0 = tgt.getClientRects()[0], c = K.rectIn(card, parent);
        const sheet = tb.T.node.parentElement, fx = (sheet === parent ? 60 : sheet.getBoundingClientRect().left - pr.left + 24) + (it.margin ?? 0);
        // it starts at the left edge of the text column (it never crosses the words before the passage)
        const x0 = Math.min(r0.left, tb.T.node.getBoundingClientRect().left) - pr.left - 8, y0 = r0.top - pr.top + r0.height * 0.55, yc = c.y + (it.compact ? 30 : 36);
        path.setAttribute('d', `M${x0} ${y0} L${fx} ${y0} L${fx} ${yc} L${c.x} ${yc}`);
      };
      b.upd = t => {
        const e = T0(it.enter) || { t: 0 };
        K.rise(card, t, e.t, { dist: 22, dur: 0.36 });
        const tr = it.rule ?? e.t - 0.2;
        path.setAttribute('stroke-dashoffset', (1 - K.EASE_OUT(prog(t, tr, tr + 0.4))).toFixed(4));
        K.typeOn(T, t, b.times, b.cur, { end: it.cursorUntil ?? b.typedEnd + 1.2 });
        if (it.exit != null) { exit(card, t, it.exit); svg.style.opacity = card.style.opacity; }
      };
      return b;
    }
    if (type === 'speech') {
      const L = (this.vo?.lines || []).find(l => l.id === it.line) || { words: [], w0: 0, t1: 0, text: '' };
      const html = it.html || L.text || '';
      const T = b.T = K.text(parent, html, { ...it, P, cls: it.cls || 'disp', size: it.size ?? 72 });
      if (it.style) css(T.node, it.style);
      // match each on-screen word with the spoken word (normalized); a word with no match inherits the previous time
      const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');
      const ws = L.words || [];
      let j = 0, last = L.w0;
      b.wt = T.words.map(w => {
        const k = norm(w.textContent);
        for (let a = j; a < Math.min(ws.length, j + 4); a++) if (norm(ws[a].w) === k || (k && norm(ws[a].w).startsWith(k))) { j = a + 1; last = ws[a].t0; return last - self.t0; }
        return last - self.t0;
      });
      b.upd = t => {
        const mode = it.mode || 'enter';
        T.words.forEach((w, i) => {
          const a = b.wt[i] - 0.04, p = prog(t, a, a + 0.22);
          if (mode === 'lightUp') { const b0 = it.base ?? 0.3; w.style.opacity = (b0 + (1 - b0) * K.EASE(p)).toFixed(3); }
          else { w.style.opacity = K.EASE(Math.min(1, p * 1.6)).toFixed(3); w.style.transform = p < 1 ? `translateY(${((1 - K.EASE_OUT(p)) * 14).toFixed(2)}px)` : 'none'; }
        });
        if (T.ems.length) {
          const iw = T.words.indexOf(T.ems[0].ws[0]);
          K.mark(T, t, it.mark?.t ?? (b.wt[iw] ?? L.w0 - self.t0) + 0.02, { dur: it.mark?.dur ?? 0.3 });
        }
        exit(T.node, t, it.exit);
      };
      return b;
    }
    if (type === 'dust') {
      // from/to: ids of text items mounted earlier in the list. The shot hides/shows those texts with their own enter/exit.
      const p = dust(parent, { n: it.n ?? 5000, color: it.color || P.ink, seed: it.seed ?? 3, size: it.size ?? 2.2, sparkle: it.sparkle ?? !!P.glow });
      b.measure = () => { const a = self.byId[it.from]?.T?.node || self.byId[it.from]?.node; const z = it.to ? (self.byId[it.to]?.T?.node || self.byId[it.to]?.node) : null; if (a) { const o = a.style.opacity; a.style.opacity = '1'; p.from(a, self.L); a.style.opacity = o; } if (z) { const o = z.style.opacity; z.style.opacity = '1'; p.to(z, self.L); z.style.opacity = o; } };
      b.upd = t => p.frame(t, { t0: it.t0, t1: it.t1, scatter: it.scatter ?? 1 });
      return b;
    }
    if (type === 'sweep') {
      const n = css(el(parent, 'abs'), { left: (it.x ?? 90) + 'px', top: it.y + 'px', width: (it.w ?? 900) + 'px', height: (it.h ?? 600) + 'px', overflow: 'hidden', pointerEvents: 'none' });
      const band = css(el(n, 'abs'), { left: '0px', right: '0px', height: '180px', background: `linear-gradient(180deg, rgba(61,141,96,0) 0%, rgba(61,141,96,.10) 70%, rgba(61,141,96,.28) 100%)` });
      const edge = css(el(band, 'abs'), { left: '0px', right: '0px', bottom: '0px', height: '3px', background: it.color || '#3d8d60', boxShadow: '0 0 18px rgba(61,141,96,.55)' });
      b.upd = t => {
        const p = prog(t, it.t, it.t + (it.dur ?? 1.2)), H = it.h ?? 600;
        n.style.display = p > 0 && p < 1 ? 'block' : 'none';
        band.style.top = (-180 + K.EASE_IO(p) * (H + 180)) + 'px';
      };
      return b;
    }
    if (type === 'verify') {
      b.lines = [];
      const color = it.color || (P.dark ? '#8cd0a8' : '#3d8d60');
      const box = css(el(parent, 'abs'), { left: '0px', top: '0px', width: '1080px', height: '1920px', pointerEvents: 'none' });
      b.measure = () => {
        const [iid, pid] = it.target.split('.');
        const T = self.byId[iid]?.T;
        if (!T) return;
        const rows = new Map();
        for (const w of pid ? T.parts[pid].ws : T.words) { const r = K.rectIn(w, parent); const k = Math.round(r.y / 8); const row = rows.get(k) || { x0: 1e9, x1: -1e9, y: r.y, h: r.h }; row.x0 = Math.min(row.x0, r.x); row.x1 = Math.max(row.x1, r.x + r.w); rows.set(k, row); }
        b.lines = [...rows.values()].sort((a, c) => a.y - c.y).map(r => ({ ...r,
          scan: css(el(box, 'abs'), { top: (r.y + 2) + 'px', height: (r.h - 4) + 'px', width: '46px', background: `linear-gradient(90deg, ${color}00, ${color}66)`, display: 'none' }),
          ok: css(el(box, 'abs'), { top: (r.y + r.h - 3) + 'px', left: r.x0 + 'px', height: '3px', width: '0px', background: color }),
        }));
        const lastRow = b.lines[b.lines.length - 1];
        if (lastRow && it.label) {
          // label at the end of the last checked line; if there is no room before x 940 it goes below it
          b.tag = css(el(box, 'abs mono', it.label), { fontSize: (it.size ?? 24) + 'px', color: color, opacity: '0', whiteSpace: 'nowrap' });
          const wTag = b.tag.getBoundingClientRect().width || it.label.length * 16;
          if (lastRow.x1 + 26 + wTag <= 960) css(b.tag, { left: (lastRow.x1 + 26) + 'px', top: (lastRow.y + (lastRow.h - 30) / 2) + 'px' });
          else css(b.tag, { left: lastRow.x0 + 'px', top: (lastRow.y + lastRow.h + 14) + 'px' });
        }
      };
      b.upd = t => {
        const n = b.lines.length, D = it.dur ?? 1.6;
        b.lines.forEach((r, i) => {
          const p = prog(t, it.t + (i * D) / n, it.t + ((i + 1) * D) / n), x = r.x0 + (r.x1 - r.x0) * p;
          r.scan.style.display = p > 0 && p < 1 ? 'block' : 'none';
          r.scan.style.left = (x - 46) + 'px';
          r.ok.style.width = ((r.x1 - r.x0) * p) + 'px';
        });
        if (b.tag) K.rise(b.tag, t, it.t + D + 0.05, { dist: 10, dur: 0.3 });
      };
      return b;
    }
    // ── layered items ────────────────────────────────────────────────────────────────────────────────────────
    if (type === 'img') {
      const m = await mountImage(parent, it, P, { vo: this.vo, t0: this.t0 });
      b.node = m.node; b.layout = m.layout;
      b.upd = t => m.upd(t);
      return b;
    }
    if (type === 'stroke') {
      const m = mountStroke(parent, it, P, { idx: this.nStroke++, locate: a => self.locate(a) });
      b.node = m.node;
      b.measure = () => m.measure();
      b.upd = t => m.upd(t);
      return b;
    }
    if (type === 'particles') {
      const m = mountParticles(parent, it, P);
      b.node = m.node;
      b.upd = t => m.upd(t);
      return b;
    }
    if (type === 'light') {
      const m = mountLight(parent, it, P);
      b.node = m.node;
      b.upd = t => m.upd(t);
      return b;
    }
    throw new Error('unknown scene item type: ' + type);
  },

  update(t) {
    if (this.cam) this.camNow = cameraAt(t, this.cam);
    for (const it of this.items) it.upd(t);
    if (this.o.breathe) { const k = 1 + this.o.breathe * K.EASE_IO(prog(t, 0, (this.o.dur ?? 4))); this.root.style.transform = `scale(${k.toFixed(5)})`; this.root.style.transformOrigin = this.o.origin || '50% 45%'; }
    if (this.o.leave) { const s = T0(this.o.leave); const p = prog(t, s.t, s.t + (s.dur ?? 0.3)); this.root.style.opacity = (1 - K.EASE(p)).toFixed(4); }
    return { custom: true, theme: this.P.dark ? 'dark' : 'light' };
  },
};
