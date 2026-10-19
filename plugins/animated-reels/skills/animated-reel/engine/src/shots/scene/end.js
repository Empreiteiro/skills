// End card: the same closing for every reel of a series (change the opts, never copy the module). The brand lockup
// that draws itself, the title (or the reel's signature line), the CTA button, an optional offer line and the
// action line ("Link in the first comment"). Left-aligned, everything within x 90-940 and y 540-1260. It cascades in
// and then HOLDS still for at least 1.5 s. Pair it with the soundtrack's 'final' section and a chime CUE on the
// button (endCardCues does both).
// opts: title (html; <i> paints the second sentence in the muted colour), button ('Learn more →'), free (offer
//       line under the button, '' hides it), action (CTA line: 'Link in the first comment' · 'Save this for later'),
//       brand (lockup name), skin, dur, timing, breathe.
//   skin    'ink' (default, dark) | 'paper' | 'editorial'; the accent stays on the mark and the button in all of
//           them (contrast checked with tools/contrast.mjs).
//   dur     shot duration (a spoken close can run past 3.5 s); only used by `breathe`.
//   timing  { lockup, title, button, free, action } in local seconds (default 0 · 0.24 · 0.62 · 0.78 · 0.9): the
//           cascade can follow the voice (the button lands on the CTA word). The chime CUE goes at start + timing.button.
//   breathe final scale of the card over dur (e.g. 1.02 = a very slow 2% push-in); default none.
// In a reel: SHOTS ... endCard(start, { action, skin, dur, timing }) and CUES ... endCardCues(start, { timing }).
import { el, css } from '../../core/dom.js';
import { prog } from '../../core/math.js';
import * as K from '../lib/ui.js';
import { q } from '../lib/timing.js';

export const T_BUTTON = 0.62;
const TIMING = { lockup: 0, title: 0.24, button: T_BUTTON, free: 0.78, action: 0.9 };

// Light skins: the skin's backdrop, title ink, muted colour for the second sentence and the offer, the action line
// in the accent.
export const END_SKINS = {
  paper: { skin: 'paper', lock: K.COLOR.ink, accent: K.COLOR.accentDeep, ink: K.COLOR.ink, muted: K.COLOR.muted, action: K.COLOR.accentDeep, theme: 'light' },
  editorial: { skin: 'editorial', lock: '#2b2a28', accent: K.COLOR.accentDeep, ink: '#2b2a28', muted: '#57534e', action: '#4b638e', theme: 'light' },
};

export default {
  async init(ctx) {
    const o = this.o = { title: 'Your signature line <i>goes here.</i>', button: 'Learn more →', free: '', action: 'Link in the first comment', brand: 'Your brand', ...ctx.opts };
    this.T = { ...TIMING, ...(o.timing || {}) };
    const L = ctx.layer, endSkin = END_SKINS[o.skin];
    if (!endSkin) {
      // 'ink' (default): dark card
      const P = K.SKINS.ink;
      K.backdrop(L, 'ink');
      this.lock = K.lockup(L, { x: 90, y: 540, h: 78, color: K.COLOR.paperOnInk, accent: K.COLOR.accent, name: o.brand });
      this.tit = K.text(L, o.title, { P, x: 90, y: 700, w: 850, size: 92, lh: 1.04 });
      this.bt = K.button(L, o.button, { x: 90, y: 1000, P, size: 40 });
      this.free = o.free ? K.text(L, o.free, { P, x: 90, y: 1128, w: 850, size: 36, cls: 'serif', color: K.COLOR.mutedOnInk }) : null;
      this.action = o.action ? K.label(L, o.action, { x: 90, y: 1206, size: 26, P, color: K.COLOR.accent }) : null;
      this.theme = 'dark';
    } else {
      const P = { ...K.skin(endSkin.skin), ink: endSkin.ink, muted: endSkin.muted, btnBg: K.COLOR.accentDeep, btnInk: K.COLOR.paper };
      K.backdrop(L, endSkin.skin);
      const R = this.R = o.breathe ? css(el(L, 'abs'), { inset: '0px' }) : null;
      const C = R || L;
      this.lock = K.lockup(C, { x: 90, y: 540, h: 78, color: endSkin.lock, accent: endSkin.accent, name: o.brand });
      this.tit = K.text(C, o.title, { P, x: 90, y: 700, w: 850, size: 92, lh: 1.04 });
      this.bt = K.button(C, o.button, { x: 90, y: 1000, P, size: 40 });
      this.free = o.free ? K.text(C, o.free, { P, x: 90, y: 1128, w: 850, size: 36, cls: 'serif', color: endSkin.muted }) : null;
      this.action = o.action ? K.label(C, o.action, { x: 90, y: 1206, size: 26, P, color: endSkin.action }) : null;
      this.theme = endSkin.theme;
    }
  },
  update(t) {
    const T = this.T;
    this.lock.draw(t, T.lockup);
    K.rise(this.tit.node, t, T.title, { dist: 26 });
    K.rise(this.bt.node, t, T.button, { dist: 20, dur: 0.36 });
    if (this.free) K.rise(this.free.node, t, T.free, { dist: 14 });
    if (this.action) K.rise(this.action, t, T.action, { dist: 12 });
    if (this.R) {
      const k = 1 + (this.o.breathe - 1) * K.EASE_IO(prog(t, 0, this.o.dur ?? 3.5));
      this.R.style.transformOrigin = '90px 900px';
      this.R.style.transform = `scale(${k.toFixed(5)})`;
    }
    return { custom: true, theme: this.theme };
  },
};

/** SHOTS entry for the end card: endCard(17.8, { action: 'Link in the first comment', skin: 'editorial', dur: 4.2 }). */
export function endCard(start, { action = 'Link in the first comment', skin = 'ink', dur = 3.5, timing, breathe, theme, button, free, brand } = {}) {
  const light = skin !== 'ink';
  const opts = { action, skin, dur, timing, breathe };
  if (button != null) opts.button = button;
  if (free != null) opts.free = free;
  if (brand != null) opts.brand = brand;
  return { id: 'end', mod: 'scene/end', start: q(start), end: q(start + dur), theme: theme || (light ? 'light' : 'dark'), opts };
}
/** End card accents: the cut and the chime on the button (timing.button). */
export function endCardCues(start, { timing } = {}) {
  const T = { ...TIMING, ...(timing || {}) };
  return [
    { t: q(start), type: 'hit', size: 's', note: 'cut: end card' },
    { t: q(start + T.button), type: 'chime', note: 'CTA button' },
  ];
}
