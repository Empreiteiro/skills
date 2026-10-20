// Style kit "editorial": a magazine page in three colours (ink, paper, slate blue), the character as a printed paper
// cut-out, proofreader's marks that draw themselves, and the product UI as crisp type on a sheet of paper.
// The style bible (why each choice, the image recipe and the pitfalls) is references/style-editorial.md of the skill.
// Only PURE FACTORIES live here: each function returns scene items (scene/scene), camera options, CUES or the
// COVER/SHOT object, with no state and no DOM. Coordinates in px of the 1080x1920 frame; LOCAL shot time unless a
// comment says "global".
//
//   import * as E from '../shots/style/editorial.js';
//   export const MUSIC = E.MUSIC;
//   { id: 'a', mod: 'scene/scene', start: A, end: B, opts: { skin: E.SKIN, camera: E.camera.reader({ dur: B - A }), items: [
//       ...E.backdrop(),
//       E.character({ id: 'host', poses: { base: E.CAST.example.stand, point: E.CAST.example.point },
//                     feet: [360, 1720], height: 1080, enter: { t: 0.1 }, speech: { line: 'l1', words: ['one'] },
//                     swap: [{ t: 1.6, pose: 'point' }], gestures: [{ t: 2.2, type: 'recoil' }] }),
//       ...E.caption.cartoon({ F, line: 'l1', start: A, highlight: 'one' }),
//   ] } }
//   CUES: [...E.sound.scene(shot), ...]  (pen, paper, pop and typing sounds come out in sync with the items)
//
// WHAT IS HERE
//   COLOR, SKIN, SKIN_AI, SKIN_INK, MUSIC, AREA, IMG, CAST, CHARACTERS, BRAND, loc, word
//   backdrop()                    the paper: static fibre (the paper does not boil)
//   character(o)                  img item with the style's motion language (enter, breathe, talk, hard pose swap, gestures, exit)
//   vignette(o)                   ambient spot illustration (a desk, a kitchen corner) resting on the page, no rectangle
//   panel(o)                      the magazine cartoon: a pen-drawn frame with a clip, zoom inside and a border that draws itself
//   mark.*                        proofreader's marks in slate blue: circle, underline, strike, lasso, caret, bracket,
//                                 arrow, check, x, query, note (handwritten, in the margin), tally (IIII: the same note again)
//   reaction.*                    startle, doubt, relief, tired, idea, frustrated: proofreader's emanata around the head
//   title(o)                      headline in Archivo 700 with ONE marked word (a hook readable in 0.5 s)
//   caption.cartoon(o)            the character's line as a cartoon caption (Newsreader italic, in quotes, on a paper strip)
//   caption.headline(o)           the narrator's line at the top, in Archivo, with the marked word when it is said
//   product.*                     a generic writing UI dressed in the style: page, comment, suggestion, button, sweep,
//                                 unchanged, versions, rules, chat, laptop (labels are options: use your product's words)
//   transition.marker             the slate marker block sweeps the whole frame on the cut (the marking gesture as a transition)
//   camera.*                      reader, pushIn, pan
//   sound.*                       scene(shot) → CUES for pen, paper, pop, typing, strike, sweep and check
//   cover(o)                      the COVER object of the reel contract
//   end(start, o) / endCues       the 'editorial' end card with the signature line as its title
import { q } from '../lib/timing.js';
import { endCard, endCardCues } from '../scene/end.js';
import CAST_JSON from '../../../cast/cast.json' with { type: 'json' };

export const ID = 'editorial';
/** Where the kit's ready-made art lives (served by the engine). A reel's own art goes in /assets/reels/<id>/. */
export const IMG = '/assets/style/editorial';
/** Brand name on the cover lockup and the end card. Set it once per project (or pass `brand` to cover()/end()). */
export const BRAND = 'Your brand';

// ── tokens ──────────────────────────────────────────────────────────────────────────────────────────────────
// Three colours in the world: ink, paper, slate. Slate is the colour of everything the WRITER leaves on the page.
// Inside the product UI only meaning colours enter: green when the AI proposes (and the inserted text), red for the
// cut. The accent red appears ONCE per reel, on the end card: the mark of the lockup and the CTA button.
export const COLOR = {
  ink: '#2b2a28', paper: '#f4eee4', slate: '#4b638e',
  sheet: '#fbf8f2',                    // the draft sheet, one step lighter than the paper
  rule: '#ddd4c6', muted: '#57534e', faint: '#6e6a63',
  slateOnInk: '#92a5c9',               // slate on the ink panel
  wash: 'rgba(75,99,142,.16)', selection: 'rgba(75,99,142,.22)',
  ai: '#0a7646', aiWash: 'rgba(10,118,70,.13)',
  cut: '#9e1901', insert: '#0f7a3d',
  accent: '#ae1803',                   // end card only
};

/** The scene skin: paper #f4eee4 with fibre, ink text, the marker block and the comment in slate, the product button
 *  in charcoal. Inside the engine's `sheet` item the palette goes back to the default paper skin (red accent): that
 *  is why this kit's product page is `product.page` (top-level items), never the sheet item. */
export const SKIN = {
  base: 'editorial',
  ink: COLOR.ink, muted: COLOR.muted, faint: COLOR.faint, accent: COLOR.slate, stroke: COLOR.slate,
  markBg: COLOR.slate, markInk: COLOR.sheet,
  comment: COLOR.wash, commentLine: COLOR.slate, sel: COLOR.selection,
  sheet: COLOR.sheet, sheetBorder: COLOR.rule, rule: COLOR.rule, noteBg: COLOR.sheet, shadowColor: COLOR.ink,
  btnBg: COLOR.ink, btnInk: COLOR.sheet,
};
/** The shot where the AI SUGGESTS: cards and suggested passages in the AI green. The writer's pen (mark.*) stays
 *  slate: the blue decides over the green. One card colour per shot. */
export const SKIN_AI = { ...SKIN, comment: COLOR.aiWash, commentLine: COLOR.ai };
/** Ink panel (the problem, the generic chat): #2b2a28 ground, paper text, marks in light slate. No full-body
 *  character on top of it: dark trousers and hair vanish into the black (put the character in a paper panel). */
export const SKIN_INK = {
  base: 'ink', backdrop: COLOR.ink, ink: COLOR.paper, muted: '#cfc6b8', faint: '#a9a197', accent: COLOR.slateOnInk,
  stroke: COLOR.slateOnInk, markBg: COLOR.slate, markInk: COLOR.sheet, commentLine: COLOR.slateOnInk,
  comment: 'rgba(146,165,201,.22)', sel: 'rgba(146,165,201,.22)', rule: 'rgba(244,238,228,.18)',
};
/** The soundtrack (FM electric piano, a C–F–A bell motif). In a reel: export const MUSIC = E.MUSIC. */
export const MUSIC = { style: 'editorial' };
/** Readable text area of a Reel (everything else may bleed: backdrop, character, vignette). */
export const AREA = { x0: 90, x1: 940, y0: 380, y1: 1410 };
/** Global time → shot-local time, on the frame. */
export const loc = (t, start) => q(t - start);

/** The cast, from cast/cast.json: CAST.<id>.<pose> = served URL of that pose (transparent PNG or SVG). */
const servedPath = p => '/' + String(p).replace(/\\/g, '/').replace(/^\/+/, '');
export const CHARACTERS = Object.fromEntries((CAST_JSON.characters || []).map(c => [c.id, c]));
export const CAST = Object.fromEntries((CAST_JSON.characters || []).map(c => [c.id, Object.fromEntries(Object.entries(c.poses || {}).map(([k, p]) => [k, servedPath(p)]))]));

// ── util ─────────────────────────────────────────────────────────────────────────────────────────────────────
const norm = s => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');
const lineOf = (F, id) => { const l = F?.lines?.find(x => x.id === id); if (!l) throw new Error(`speech: line ${id} is not in the .vo.json`); return l; };
/** GLOBAL time of a spoken word (n-th occurrence). */
export function word(F, line, w, n = 0) {
  const L = lineOf(F, line), hits = L.words.filter(x => norm(x.w) === norm(w));
  if (!hits.length) throw new Error(`speech: "${w}" is not in ${line}`);
  return hits[Math.min(n, hits.length - 1)].t0;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── backdrop ─────────────────────────────────────────────────────────────────────────────────────────────────
// The paper: the pulp (broad cloud) and the fibre (fine grain) in a static PNG, BLACK with alpha only in the valleys
// (assets/style/editorial/paper.png, made by paper.mjs). Over the #f4eee4 ground it darkens 1–4%. Why a PNG: a live
// feTurbulence was re-rasterized every frame and cost ~40% of render time; static on purpose, it is the magazine's
// paper, and the master already adds moving film grain to the luma.
/** Paper backdrop items (they go FIRST in the list). paper: false = flat ground (only the skin colour). */
export function backdrop({ paper = true } = {}) {
  return paper ? [{ type: 'img', src: `${IMG}/paper.png`, plate: true }] : [];
}

// ── character ────────────────────────────────────────────────────────────────────────────────────────────────
// Magazine motion: the character is a paper cut-out. It slides in like paper on a desk (or is already there on the
// cut), breathes slowly, barely moves while talking, swaps pose HARD on the frame (the cut-out replaced), reacts with
// a short gesture that returns to rest, and slides out. No boil: the line is printed, what moves is the paper. What
// brings the frame to life is the cut, the camera, the pose swap and the marks drawing themselves, not a swaying body.
const GESTURES = {
  // d = +1 when the character faces LEFT (the base image), -1 when it faces right
  hop: t => [{ t, dur: 0.1, y: -24, ease: 'out' }, { t: t + 0.1, dur: 0.2, y: 0, ease: 'in' }],
  startle: (t, d) => [{ t, dur: 0.08, y: -40, x: 16 * d, rot: 3 * d, ease: 'out' }, { t: t + 0.08, dur: 0.46, y: 0, x: 0, rot: 0, ease: 'io' }],
  recoil: (t, d, s = 0.9) => [{ t, dur: 0.35, x: 12 * d, rot: 2.4 * d, ease: 'io' }, { t: t + 0.35 + s, dur: 0.45, x: 0, rot: 0, ease: 'io' }],
  lean: (t, d, s = 0.9) => [{ t, dur: 0.35, x: -12 * d, rot: -2.2 * d, ease: 'io' }, { t: t + 0.35 + s, dur: 0.45, x: 0, rot: 0, ease: 'io' }],
  sigh: t => [{ t, dur: 0.45, y: 8, s: 0.988, ease: 'io' }, { t: t + 0.55, dur: 0.7, y: 0, s: 1, ease: 'io' }],
  headShake: t => [{ t, dur: 0.08, x: -8, ease: 'io' }, { t: t + 0.08, dur: 0.12, x: 8, ease: 'io' }, { t: t + 0.2, dur: 0.12, x: -6, ease: 'io' }, { t: t + 0.32, dur: 0.14, x: 0, ease: 'io' }],
  nod: t => [{ t, dur: 0.12, y: 6, rot: 0.8, ease: 'io' }, { t: t + 0.12, dur: 0.14, y: 0, rot: 0, ease: 'io' }, { t: t + 0.3, dur: 0.12, y: 5, rot: 0.6, ease: 'io' }, { t: t + 0.42, dur: 0.16, y: 0, rot: 0, ease: 'io' }],
  shrug: t => [{ t, dur: 0.12, y: -10, ease: 'out' }, { t: t + 0.4, dur: 0.25, y: 0, ease: 'io' }],
  jolt: t => [{ t, dur: 0.05, s: 1.02, ease: 'out' }, { t: t + 0.05, dur: 0.16, s: 1, ease: 'io' }],
};
export const GESTURE_NAMES = Object.keys(GESTURES);

/** How much the character moves: 1 is a lively cartoon, 0 is still. Characters move much less while they talk:
 *  0.25 is the tested default (at 1 the body sways on every word and the eye goes to it instead of the words).
 *  It scales breathing, the speech hop, gestures and the pose-swap jolt; sliding in and out does not change, nor a
 *  hand-written `move` (position, not motion). A character asks for another value with `motion` (e.g. 0.6 for a
 *  startle in a hook). */
export const MOTION = 0.25;
/** Shrinks a gesture's keys by factor k: offset and rotation proportional, scale around 1. */
const dampen = (keys, k) => keys.map(c => ({
  ...c,
  ...(c.x != null ? { x: c.x * k } : {}), ...(c.y != null ? { y: c.y * k } : {}),
  ...(c.rot != null ? { rot: c.rot * k } : {}), ...(c.s != null ? { s: 1 + (c.s - 1) * k } : {}),
}));

/**
 * Character (img item). o:
 *   id · src | poses { name: src | { src, poseAlign, scale, dx, dy } } + pose (initial)
 *   feet [x, y] (where the feet stand, frame px) + height (px of the BODY measured in the alpha) | x, y, w, h
 *   facing 'left' | 'right' (where the BASE pose looks; decides the side of gestures; default 'left')
 *   enter { t = 0, from = 'right' | 'left' | 'bottom', fx = 'slide' | 'cut' | 'pop', dur = 0.5 }
 *        'cut' = already there on the first frame (use on a hard cut) · 'pop' = restrained pop (stretch 0.07)
 *   speech { line, words: [...] }: hop on the strong words (7 px × MOTION; without words: every 4+ letter word, 0.28 s
 *        apart; say which: 1, at most 2, per sentence). accents [t...] adds loose local instants.
 *   swap [{ t, pose, mirror, dissolve = 0 }]: hard on the frame, with a 2% jolt (jolt: false turns it off)
 *   gestures [{ t, type: hop|startle|recoil|lean|sigh|headShake|nod|shrug|jolt, hold }]: short, return to rest
 *   move [...] (own offset, merged with the gestures by t) · exit { t, to = 'left', fx = 'slide' }
 *   motion (default MOTION) · idle (default { breathe 0.007, period 3.2, sway 0.15 } × motion; a hand-written idle is
 *   used as is) · shadow (light by default; false turns it off) · mirror
 *   depth (default 1) · z · crop · filter · boil (default none; 'soft' = amp 0.7, 8 fps) · anchor
 */
export function character(o = {}) {
  const d = (o.facing ?? 'left') === 'left' ? 1 : -1;
  const k = o.motion ?? MOTION;
  const E = o.enter === false ? null : { t: 0, from: 'right', fx: 'slide', dur: 0.5, ...(typeof o.enter === 'number' ? { t: o.enter } : o.enter || {}) };
  const enter = !E ? undefined
    : E.fx === 'cut' ? { t: E.t, fx: 'none' }
      : E.fx === 'pop' ? { t: E.t, fx: 'pop', dur: E.dur ?? 0.5, stretch: 0.07 }
        : { t: E.t, fx: 'slide', from: E.from, dist: E.dist ?? (E.from === 'bottom' ? 900 : 760), dur: E.dur };
  const swaps = [].concat(o.swap || []).map(x => ({ dissolve: 0, ...x }));
  const keys = [];
  for (const g of [].concat(o.gestures || [])) {
    const f = GESTURES[g.type];
    if (!f) throw new Error(`character: gesture "${g.type}" does not exist (${GESTURE_NAMES.join(', ')})`);
    keys.push(...dampen(f(g.t, d, g.hold), k));
  }
  if (o.jolt !== false) for (const x of swaps) keys.push(...dampen(GESTURES.jolt(x.t), k));
  keys.push(...[].concat(o.move || []));
  keys.sort((a, b) => a.t - b.t);
  const accents = o.speech
    ? { line: o.speech.line, words: o.speech.words, height: o.speech.height ?? 7 * k, squash: 0.025 * k, dur: 0.32, t: [].concat(o.accents || []) }
    : (o.accents ? { t: [].concat(o.accents), height: 7 * k, squash: 0.025 * k, dur: 0.32 } : undefined);
  const S = o.exit ? { t: 0, to: 'left', fx: 'slide', dur: 0.4, dist: 900, ...(typeof o.exit === 'number' ? { t: o.exit } : o.exit) } : undefined;
  const it = {
    type: 'img', id: o.id,
    ...(o.poses ? { poses: o.poses, pose: o.pose } : { src: o.src }),
    ...(o.feet ? { feet: o.feet, height: o.height } : { x: o.x, y: o.y, w: o.w, h: o.h }),
    depth: o.depth ?? 1,
    enter,
    idle: o.idle === false ? undefined : { breathe: 0.007 * k, period: 3.2, sway: 0.15 * k, phase: 0, ...(o.idle || {}) },
    accents,
    swap: swaps.length ? swaps : undefined,
    move: keys.length ? keys : undefined,
    exit: S ? (S.fx === 'slide' ? { t: S.t, fx: 'slide', to: S.to, dist: S.dist, dur: S.dur } : { t: S.t, fx: S.fx, dur: S.dur }) : undefined,
    shadow: o.shadow === false ? undefined : { op: 0.11, color: COLOR.ink, ...(o.shadow === true || !o.shadow ? {} : o.shadow) },
    boil: o.boil === 'soft' ? { amp: 0.7, fps: 8, freq: 0.025 } : o.boil || undefined,
  };
  for (const key of ['z', 'crop', 'filter', 'mirror', 'anchor', 'poseAlign', 'opacity', 'blend']) if (o[key] != null) it[key] = o[key];
  return it;
}

/** Ambient vignette (a magazine spot illustration already cleaned by prepare.mjs --paper): rests on the page with no
 *  rectangle. o: src, feet [x, y] + height | x, y, w, depth (default 0.85: moves a little less than the character),
 *  enter { t, from }, mirror, exit. */
export function vignette(o = {}) {
  const E = o.enter ? { t: 0, from: 'right', ...(typeof o.enter === 'number' ? { t: o.enter } : o.enter) } : null;
  return {
    type: 'img', id: o.id, src: o.src,
    ...(o.feet ? { feet: o.feet, height: o.height, poseAlign: false } : { x: o.x ?? 0, y: o.y ?? 0, w: o.w, h: o.h }),
    depth: o.depth ?? 0.85,
    enter: E ? { t: E.t, fx: 'slide', from: E.from, dist: E.dist ?? 700, dur: E.dur ?? 0.55 } : undefined,
    ...(o.mirror ? { mirror: true } : {}),
    ...(o.exit ? { exit: o.exit } : {}),
  };
}

// ── the cartoon: a magazine panel ────────────────────────────────────────────────────────────────────────────
/**
 * Cartoon panel: everything in items is clipped to the frame (a group with clip), the zoom moves INSIDE (the frame
 * stays still, as on a printed page) and the pen border draws itself. o:
 *   x 90, y 470, w 900, h 760 · items [...] (frame coordinates) · zoom { t 0, dur, s 1.05, x 0, y 0, origin [x, y] }
 *   outline { t 0, dur 0.45 (0.01 = already drawn), thickness 4 } | false · enter { t, from } (the frame slides in like paper) · exit
 */
export function panel(o = {}) {
  const x = o.x ?? 90, y = o.y ?? 470, w = o.w ?? 900, h = o.h ?? 760;
  const Z = o.zoom ? { t: 0, dur: 3, s: 1.05, ...o.zoom } : null;
  const origin = Z?.origin ? `${Z.origin[0]}px ${Z.origin[1]}px` : `${x + w / 2}px ${y + h * 0.4}px`;
  const B = o.outline === false ? null : { t: 0, dur: 0.45, thickness: 4, ...(o.outline || {}) };
  const E = o.enter ? { t: 0, from: 'bottom', ...(typeof o.enter === 'number' ? { t: o.enter } : o.enter) } : null;
  const group = {
    type: 'group', id: o.id, clip: [y, 1080 - x - w, 1920 - y - h, x],
    enter: E ? { t: E.t, fx: 'slide', from: E.from, dist: E.dist ?? 1000, dur: E.dur ?? 0.55 } : undefined,
    move: Z ? [{ t: Z.t, dur: Z.dur, s: Z.s, x: Z.x ?? 0, y: Z.y ?? 0, ease: Z.ease ?? 'gentle', origin }] : undefined,
    exit: o.exit, items: o.items || [],
  };
  const outline = B ? {
    type: 'stroke', d: 'M0 0 L100 0 L100 100 L0 100 Z', viewBox: '0 0 100 100', x, y, w, h, color: COLOR.ink, thickness: B.thickness,
    t: (E ? E.t + (E.dur ?? 0.55) : 0) + B.t, dur: B.dur, tremor: 0.45, pressure: 0.12, tip: 0.8, mute: B.dur < 0.1,
  } : null;
  // the border moves with the frame when it slides in: it goes inside a group with the same entrance
  const frame = outline ? (E ? { type: 'group', enter: group.enter, exit: o.exit, items: [outline] } : { ...outline, exit: o.exit }) : null;
  return frame ? [group, frame] : [group];
}

// ── proofreader's marks ──────────────────────────────────────────────────────────────────────────────────────
// Slate blue, a copy editor's firm pen: low tremor (a precise hand), pressure that thickens and thins, a fine tip.
// Every mark has an EXPLICIT dur (the pen sound, sound.scene, comes out with the same t and dur). Position: target
// 'textId.partId' (measures the part in init) or x, y, w, h. Pass the same depth as the text when it moves with the camera.
const PEN = { tremor: 0.7, pressure: 0.3, tip: 0.28 };
const tr = (shape, dur, thickness, o) => {
  const { t = 0, ...r } = o;
  return { type: 'stroke', shape, ...PEN, thickness, dur, t, ...r };
};
export const mark = {
  /** Circle around the passage (the proofreader's "look at this"). */
  circle: (o = {}) => tr('circle', o.dur ?? 0.42, o.thickness ?? 6, { margin: 4, ...o }),
  /** Hand underline (one stroke per text line). twice: true = double. */
  underline: (o = {}) => tr('underline', o.dur ?? 0.3, o.thickness ?? 6, o),
  /** The proofreader's strike over a passage (delete). The PRODUCT's cut is the red <s> of the diff, not this. */
  strike: (o = {}) => tr('strike', o.dur ?? 0.22, o.thickness ?? 6, o),
  /** The delete lasso: runs along the line and closes in a loop. */
  lasso: (o = {}) => tr('lasso', o.dur ?? 0.5, o.thickness ?? 6, o),
  /** Insertion caret (^), below the line. */
  caret: (o = {}) => tr('caret', o.dur ?? 0.16, o.thickness ?? 6, { w: 44, h: 38, ...o }),
  /** Bracket in the margin. target: sits to the left of the passage (side: 'right' flips it). */
  bracket: (o = {}) => tr('bracket', o.dur ?? 0.3, o.thickness ?? 6, o),
  /** Arrow from/to [x, y] (curve 0.18; head 1). */
  arrow: (o = {}) => tr('arrow', o.dur ?? 0.38, o.thickness ?? 6, { curve: 0.18, ...o }),
  check: (o = {}) => tr('check', o.dur ?? 0.22, o.thickness ?? 8, { w: 90, h: 80, ...o }),
  x: (o = {}) => tr('x', o.dur ?? 0.3, o.thickness ?? 8, { w: 80, h: 80, ...o }),
  /** Proofreader's tally in the margin (IIII, the 5th crosses the four): the SAME note left again. One stroke at a
   *  time, each with its pen scratch. o: x, y (top of the 1st stroke), n 4, h 96, gap 28, t, step 0.32, thickness 7, depth, z, exit. */
  tally: (o = {}) => {
    const n = o.n ?? 4, x = o.x ?? 90, y = o.y ?? 400, h = o.h ?? 96, gap = o.gap ?? 28, t0 = o.t ?? 0, step = o.step ?? 0.32, out = [];
    const base = { type: 'stroke', viewBox: '0 0 100 100', color: o.color, thickness: o.thickness ?? 7, ...PEN, depth: o.depth, z: o.z, exit: o.exit };
    for (let i = 0; i < n; i++) {
      const g = Math.floor(i / 5), k = i % 5, gx = x + g * (4 * gap + 44), ti = q(t0 + i * step);
      if (k < 4) out.push({ ...base, d: `M${48 + (k % 2) * 6} 2 L${50 - (k % 2) * 4} 98`, x: gx + k * gap - 10, y, w: 20, h, t: ti, dur: 0.12, seed: 40 + i });
      else out.push({ ...base, d: 'M0 78 L100 22', x: gx - 16, y, w: 3 * gap + 32, h, t: ti, dur: 0.16, seed: 40 + i });
    }
    return out;
  },
  /** "?" in the margin, inside a circle (the proofreader's query). x, y = corner of the circle; size 110. */
  query: (o = {}) => {
    const s = o.size ?? 110, t = o.t ?? 0, x = o.x ?? 90, y = o.y ?? 400;
    return [
      tr('question', 0.36, o.thickness ?? 7, { x: x + s * 0.3, y: y + s * 0.18, w: s * 0.4, h: s * 0.64, t, depth: o.depth, z: o.z, color: o.color, exit: o.exit }),
      tr('circle', 0.34, o.thickness ?? 6, { x, y, w: s, h: s, t: t + 0.4, depth: o.depth, z: o.z, color: o.color, exit: o.exit }),
    ];
  },
  /**
   * Handwritten note in the margin, in slate Caveat, written letter by letter (2 to 4 words: "stet", "keep this",
   * "too long?"), circled. It NEVER carries the main message (captions and UI do). o: text, x, y, size 56, t, cps 11,
   * circle (default true), rot -4, depth, z, exit.
   */
  note: (o = {}) => {
    const size = o.size ?? 56, t = o.t ?? 0, cps = o.cps ?? 11, txt = o.text ?? '', x = o.x ?? 90, y = o.y ?? 400;
    const id = o.id ?? `hand-${Math.round(x)}-${Math.round(y)}`, end = t + txt.length / cps;
    const text = { type: 'text', id, html: `<span id="c">${esc(txt)}</span>`, cls: 'hand', size, x, y, w: 850, color: o.color ?? COLOR.slate, lh: 1,
      enter: { t, fx: 'typeOn', cps, seed: o.seed ?? 5, cursor: false }, depth: o.depth, z: o.z, exit: o.exit,
      style: { whiteSpace: 'nowrap', width: 'max-content', rotate: `${o.rot ?? -4}deg`, transformOrigin: '0 50%' } };
    const out = [text];
    if (o.circle !== false) out.push(tr('circle', 0.36, o.thickness ?? 5, { target: `${id}.c`, margin: 10, t: end + 0.05, depth: o.depth, z: o.z, color: o.color, exit: o.exit }));
    return out;
  },
};

// ── reactions (proofreader's emanata around the head) ────────────────────────────────────────────────────────
// x, y = the point of the head where the reaction starts (frame px); t; stay (default false: gone after ~1.1 s); depth 1.
// ⚠ In this skin the headline lives at the top (y 400–600) and the head of a big character sits right below it: a
// reaction that rises ABOVE the head hits the headline (and the reader camera lifts the world ~50 px). Anchor it on
// the free side of the head.
const fades = (o, t) => (o.stay ? {} : { erase: { t: t + (o.hold ?? 1.1), dur: 0.22, fx: 'fade' } });
export const reaction = {
  /** Startle: "!" and three impact lines. */
  startle: (o = {}) => { const { x = 540, y = 600, t = 0 } = o; return [
    tr('exclamation', 0.24, o.thickness ?? 9, { x: x - 22, y: y - 190, w: 44, h: 140, t, depth: o.depth ?? 1, ...fades(o, t) }),
    tr('motion-lines', 0.2, o.thickness ?? 7, { x: x + 50, y: y - 160, w: 140, h: 110, rot: -35, n: 3, t: t + 0.08, depth: o.depth ?? 1, ...fades(o, t) }),
  ]; },
  /** Doubt: "?" beside the head. */
  doubt: (o = {}) => { const { x = 540, y = 600, t = 0 } = o; return [
    tr('question', 0.36, o.thickness ?? 8, { x: x + 40, y: y - 200, w: 84, h: 136, t, depth: o.depth ?? 1, ...fades(o, t) }),
  ]; },
  /** Relief: short rays opening (a 6-point sparkle). */
  relief: (o = {}) => { const { x = 540, y = 600, t = 0 } = o; return [
    tr('sparkle', 0.3, o.thickness ?? 6, { x: x - 120, y: y - 250, w: 240, h: 240, n: 6, t, depth: o.depth ?? 1, ...fades(o, t) }),
  ]; },
  /** Tired (late night, tired eyes): spiral and a sweat drop, both on the SAME side of the head. HERE x, y is the
   *  temple on the free side (the drop starts there, the spiral rises beside it): side 'right' (default) | 'left'. */
  tired: (o = {}) => { const { x = 540, y = 600, t = 0 } = o, right = o.side !== 'left'; return [
    tr('spiral', 0.45, o.thickness ?? 7, { x: right ? x + 30 : x - 160, y: y - 220, w: 130, h: 130, turns: 2.4, t, depth: o.depth ?? 1, ...fades(o, t) }),
    tr('sweat-drop', 0.26, o.thickness ?? 6, { x: right ? x - 4 : x - 44, y: y - 64, w: 48, h: 70, t: t + 0.3, depth: o.depth ?? 1, fill: { color: COLOR.sheet }, ...fades(o, t) }),
  ]; },
  /** Idea: a bigger sparkle. */
  idea: (o = {}) => { const { x = 540, y = 600, t = 0 } = o; return [
    tr('sparkle', 0.3, o.thickness ?? 7, { x: x - 140, y: y - 300, w: 280, h: 280, n: 8, t, depth: o.depth ?? 1, ...fades(o, t) }),
  ]; },
  /** Frustration: the tangled scribble over the head. */
  frustrated: (o = {}) => { const { x = 540, y = 600, t = 0 } = o; return [
    tr('scribble', 0.5, o.thickness ?? 7, { x: x - 100, y: y - 230, w: 200, h: 100, loop: true, n: 14, t, depth: o.depth ?? 1, ...fades(o, t) }),
  ]; },
};

// ── text on screen ───────────────────────────────────────────────────────────────────────────────────────────
/** Headline (hook, idea card): Archivo 700, sentence case, full stop, ONE marked word (<em>, slate block). Readable in
 *  0.5 s: it slams in at t 0.02. o: html, x 90, y 420, w 850 (text up to x 940, the safe edge), size 96, lh 1.02, t,
 *  fx 'slam' | 'rise' | 'none', mark (local t of the block: when the word is said), exit, depth, id. */
export function title(o = {}) {
  const fx = o.fx ?? 'slam';
  return {
    type: 'text', id: o.id, html: o.html, cls: 'disp', x: o.x ?? 90, y: o.y ?? 420, w: o.w ?? 850, size: o.size ?? 96, lh: o.lh ?? 1.02,
    enter: fx === 'slam' ? { t: o.t ?? 0.02, fx: 'slam', fromScale: 1.18 } : { t: o.t ?? 0.02, fx },
    ...(o.mark != null ? { mark: { t: o.mark, dur: 0.34 } } : {}),
    ...(o.exit != null ? { exit: o.exit } : {}), ...(o.depth != null ? { depth: o.depth } : {}), ...(o.color ? { color: o.color } : {}),
  };
}

export const caption = {
  /**
   * The CHARACTER's line as a magazine cartoon caption: Newsreader italic in curly quotes, on a paper strip with an
   * ink rule, centered in the safe band (x 90–940, center 515; up to 850 px wide, ≤ ~60 characters = 2 lines), with
   * its BOTTOM fixed at y 1398 (1 or 2 lines grow upwards; never past 1410). The spoken word lights up (words not yet
   * said stay at dim 0.32; in the hook use hook: true = 0.8, readable in 0.5 s). highlight: one word that gets the
   * proofreader's hand underline when it is said. o: F, line, start (shot start), highlight, n (occurrence),
   * baseline (y of the bottom edge, 1398), size 54 (the minimum), atTop: true (strip at the top, y 400), enter (local t;
   * default 0.15 s before the line), exit (local t), hook, dim, id.
   */
  cartoon(o = {}) {
    const L = lineOf(o.F, o.line), start = o.start ?? 0, id = o.id ?? `cap-${o.line}`, size = o.size ?? 54;
    let html = esc(L.text), dt = null;
    if (o.highlight) {
      const k = norm(o.highlight), ws = html.split(/(\s+)/);
      let n = o.n ?? 0, done = false;
      html = ws.map(w => { if (!done && norm(w) === k) { if (n-- === 0) { done = true; const m = w.match(/^([^A-Za-z0-9’']*)(.*?)([^A-Za-z0-9’']*)$/); return `${m[1]}<span id="d">${m[2]}</span>${m[3]}`; } } return w; }).join('');
      dt = word(o.F, o.line, o.highlight, o.n ?? 0) - start;
    }
    html = `“${html}”`;
    const box = o.atTop
      ? { top: `${o.y ?? 400}px` }
      : { top: 'auto', bottom: `${1920 - (o.baseline ?? 1398)}px` };
    const speech = {
      type: 'speech', id, line: o.line, html, cls: 'news', x: 90, y: o.y ?? 1200, w: 900, size, lh: 1.2, align: 'center', mode: 'lightUp', base: o.dim ?? (o.hook ? 0.8 : 0.32),
      style: { width: 'max-content', maxWidth: '850px', left: '515px', translate: '-50% 0', ...box, fontStyle: 'italic', fontWeight: '500',
        background: COLOR.sheet, border: `2px solid ${COLOR.ink}`, padding: '14px 30px 18px', boxSizing: 'border-box', letterSpacing: '-0.005em' },
    };
    const items = [speech];
    if (o.highlight) items.push(tr('underline', 0.26, 5, { target: `${id}.d`, t: q(dt + 0.08) }));
    const t0 = o.enter ?? Math.max(0, q(L.w0 - start - 0.15));
    return [{ type: 'group', enter: { t: t0, fx: 'fade', dur: 0.12 }, exit: o.exit != null ? { t: o.exit, dur: 0.14 } : undefined, items }];
  },
  /** The NARRATOR's line (or a brand line) as a headline at the top: Archivo 700, 64 px, words come in as they are
   *  said and the mark word (one) gets the slate block when it is said. o: F, line, start, mark, y 400, size 64,
   *  mode 'enter' | 'lightUp', exit, id. */
  headline(o = {}) {
    const L = lineOf(o.F, o.line), start = o.start ?? 0;
    let html = esc(L.text);
    if (o.mark) {
      const k = norm(o.mark); let done = false;
      html = html.split(/(\s+)/).map(w => { if (!done && norm(w) === k) { done = true; return `<em>${w}</em>`; } return w; }).join('');
    }
    const t0 = o.enter ?? Math.max(0, q(L.w0 - start - 0.1));
    return [{ type: 'group', enter: { t: t0, fx: 'fade', dur: 0.1 }, exit: o.exit != null ? { t: o.exit, dur: 0.14 } : undefined, items: [
      { type: 'speech', id: o.id ?? `head-${o.line}`, line: o.line, html, cls: 'disp', x: 90, y: o.y ?? 400, w: 850, size: o.size ?? 64, lh: 1.06, mode: o.mode ?? 'enter' },
    ] }];
  },
};

// ── the product UI, dressed in the style ─────────────────────────────────────────────────────────────────────
// Crisp and readable ALWAYS (it is the proof of the story): the draft sheet in Newsreader, the comment pinned to the
// passage by a 3 px rule, the AI pass that sweeps only the marked passage, the red strike and green insertion, the
// "unchanged" check. The style dresses it from the outside: paper on the desk (tilt and shadow), the proofreader's pen
// on top, the pen-drawn laptop. Every label is an option: use the words your product uses.
const SHEET_SHADOW = '0 1px 0 rgba(43,42,40,.10), 0 26px 50px -30px rgba(43,42,40,.42)';
export const product = {
  /**
   * The draft page (a group: sheet, title, meta and the body as one text). The body is ONE text item with id `id`:
   * paragraphs separated by <br><br>, parts with ids (<u id="q"> comment, <s id> cut, <ins id> insertion, <span id>
   * as a target). Text gestures pass straight through: strike, insert, wash, mark, collapse, accept, undo, burst.
   * The TITLE is also a text with an id (tid, default `${id}-t`) and accepts the same gestures in titleGestures
   * { wash, strike, insert, mark }: a comment can pin to it (target 'doc-t.h') and an edit can strike and rewrite only
   * the title. It has ONE reserved line (tsize 44): a title that grows to 2 lines during strike + insert needs an
   * empty meta or a smaller tsize.
   * o: id 'doc', x 90, y 600, w 900, h 760, title, tid, tsize 44, titleGestures, meta, body, size 38, lh 1.5,
   *    enter { t, from 'bottom' } | false, lean (degrees), attached [...] (items that move WITH it: note, marks, sweep,
   *    unchanged), depth, exit.
   */
  page(o = {}) {
    const id = o.id ?? 'doc', x = o.x ?? 90, y = o.y ?? 600, w = o.w ?? 900, h = o.h ?? 760, size = o.size ?? 38;
    const E = o.enter === false ? null : { t: 0, from: 'bottom', ...(typeof o.enter === 'number' ? { t: o.enter } : o.enter || {}) };
    const top = o.title ? (o.meta ? 176 : 130) : (o.meta ? 100 : 56);
    const body = { type: 'text', id, html: o.body ?? '', cls: 'news', size, x: x + 52, y: y + top, w: w - 104, lh: o.lh ?? 1.5 };
    for (const k of ['strike', 'insert', 'wash', 'mark', 'collapse', 'accept', 'undo', 'burst']) if (o[k] != null) body[k] = o[k];
    return {
      type: 'group', id: o.gid, depth: o.depth,
      enter: E ? { t: E.t, fx: 'slide', from: E.from, dist: E.dist ?? 1100, dur: E.dur ?? 0.55 } : undefined,
      move: o.lean ? [{ t: -1, dur: 0.001, rot: o.lean, origin: `${x + w / 2}px ${y + h / 2}px` }, ...(o.move || [])] : o.move,
      exit: o.exit,
      items: [
        { type: 'box', x, y, w, h, style: { background: COLOR.sheet, border: `1px solid ${COLOR.rule}`, boxShadow: SHEET_SHADOW, boxSizing: 'border-box' } },
        ...(o.title ? [{ type: 'text', id: o.tid ?? `${id}-t`, html: o.title, cls: 'disp', x: x + 52, y: y + 46, w: w - 104, size: o.tsize ?? 44, lh: 1.1, ...(o.titleGestures || {}) }] : []),
        ...(o.meta ? [{ type: 'label', html: o.meta, x: x + 52, y: y + (o.title ? 46 + 44 * 1.25 + 14 : 44), size: 22, color: COLOR.faint }] : []),
        body,
        ...(o.attached || []),
      ],
    };
  },
  /** The writer's comment: the card pinned to the passage by the 3 px rule (which runs down the page margin), typed.
   *  o: target 'doc.q', x 150, y, w 790, text, author 'Comment', t, cps 40, seed, rule (t), margin (px beyond x 60:
   *  use page.x − 36 so the rule runs in the sheet's margin), quote, compact, size 36, exit. */
  comment(o = {}) {
    const t = o.t ?? 0;
    return {
      type: 'note', target: o.target, x: o.x ?? 150, y: o.y ?? 1180, w: o.w ?? 790, author: o.author ?? 'Comment', text: o.text ?? '', size: o.size ?? 36,
      enter: { t }, typeOn: { t: t + 0.08, cps: o.cps ?? 40, seed: o.seed ?? 3 }, rule: o.rule ?? t - 0.1, margin: o.margin ?? 54,
      ...(o.quote ? { quote: o.quote } : {}), ...(o.compact ? { compact: true } : {}), ...(o.exit != null ? { exit: o.exit } : {}),
      ...(o.cursorUntil != null ? { cursorUntil: o.cursorUntil } : {}),
    };
  },
  /** The AI's suggestion in the margin: the same card labelled "Suggestion"; the green comes from a shot with
   *  skin: SKIN_AI. The writer decides with the pen: mark.check next to the one they accept, mark.strike/x on the one they skip. */
  suggestion(o = {}) { return product.comment({ author: 'Suggestion', cps: 60, ...o }); },
  /** The product's main button: charcoal with paper letters, square corners (the accent red belongs to the end card).
   *  o: x, y, t (enters), press [t...], label 'Apply', size 38. */
  button(o = {}) {
    return { type: 'button', text: o.label ?? 'Apply', x: o.x ?? 90, y: o.y ?? 1250, size: o.size ?? 38, enter: o.t != null ? { t: o.t, dist: 18, dur: 0.3 } : undefined, press: [].concat(o.press ?? []), ...(o.exit != null ? { exit: o.exit } : {}) };
  },
  /** The AI pass (the green band sweeps ONLY the marked passage; measure it). o: x, y, w, h, t, dur 0.9. */
  sweep(o = {}) { return { type: 'sweep', x: o.x ?? 90, y: o.y ?? 700, w: o.w ?? 900, h: o.h ?? 200, t: o.t ?? 0, dur: o.dur ?? 0.9 }; },
  /** Character-by-character check of what nobody marked, in slate (the one who checks is the writer).
   *  o: target 'doc.p2', t, dur 1.0, label '✓ Unchanged' (short on purpose: it goes right of the last checked line if
   *  it fits before x 960, otherwise below it, where it may fall on a card). */
  unchanged(o = {}) { return { type: 'verify', target: o.target, t: o.t ?? 0, dur: o.dur ?? 1.0, label: o.label ?? '✓ Unchanged', color: o.color ?? COLOR.slate, size: o.size ?? 30 }; },
  /**
   * Named versions: a LIST, not a scroll. o: x 90, y 600, w 880, title 'Versions', items [{ name, when }], active
   * (index already selected), t, step 0.12 (between rows), click { t, i } (the chosen row gets the slate wash and the
   * bar; the sound is a click). 96 px rows.
   */
  versions(o = {}) {
    const x = o.x ?? 90, y = o.y ?? 600, w = o.w ?? 880, t = o.t ?? 0, step = o.step ?? 0.12, items = o.items || [], LH = 96;
    const h = 96 + items.length * LH + 24, out = [];
    out.push({ type: 'box', x, y, w, h, style: { background: COLOR.sheet, border: `1px solid ${COLOR.rule}`, boxShadow: SHEET_SHADOW, boxSizing: 'border-box' }, enter: { t, fx: 'fade', dur: 0.14 } });
    out.push({ type: 'label', html: o.title ?? 'Versions', x: x + 44, y: y + 38, size: 22, color: COLOR.slate, enter: { t: t + 0.05, dist: 10, dur: 0.3 } });
    items.forEach((v, i) => {
      const yy = y + 96 + i * LH, ti = t + 0.12 + i * step, chosen = o.click && o.click.i === i, alreadyActive = o.active === i;
      if (chosen || alreadyActive) {
        const tm = alreadyActive ? ti : o.click.t;
        out.push({ type: 'box', x: x + 1, y: yy - 12, w: w - 2, h: LH - 4, style: { background: COLOR.selection, borderLeft: `6px solid ${COLOR.slate}`, boxSizing: 'border-box' }, enter: { t: tm, fx: 'fade', dur: 0.12 } });
      }
      out.push({ type: 'hairline', x: x + 44, y: yy - 14, w: w - 88, h: 1, color: COLOR.rule, t: ti, dur: 0.3 });
      out.push({ type: 'text', html: v.name, cls: 'news', size: 40, x: x + 44, y: yy, w: w * 0.62, lh: 1.2, enter: { t: ti, dist: 14, dur: 0.3 } });
      if (v.when) out.push({ type: 'label', html: v.when, x: x + w * 0.62, y: yy + 12, w: w * 0.38 - 44, size: 22, align: 'right', color: COLOR.faint, enter: { t: ti + 0.04, dist: 10, dur: 0.3 } });
    });
    return out;
  },
  /**
   * A numbered list of rules (house rules, principles, a checklist): mono index in slate, Source Serif text. added
   * { html, t, mark } comes in at the end, sliding from the right, with the proofreader's bracket in the margin.
   * o: x 90, y 600, w 880, title 'Rules', items [html], t, step 0.12. Row: 2 lines of 36 px fit in 112 px.
   */
  rules(o = {}) {
    const x = o.x ?? 90, y = o.y ?? 600, w = o.w ?? 880, t = o.t ?? 0, step = o.step ?? 0.12, items = o.items || [], LH = o.line ?? 118;
    const n = items.length + (o.added ? 1 : 0), h = 100 + n * LH + 20, out = [];
    out.push({ type: 'box', x, y, w, h, style: { background: COLOR.sheet, border: `1px solid ${COLOR.rule}`, boxShadow: SHEET_SHADOW, boxSizing: 'border-box' }, enter: { t, fx: 'fade', dur: 0.14 } });
    out.push({ type: 'label', html: o.title ?? 'Rules', x: x + 44, y: y + 38, size: 22, color: COLOR.slate, enter: { t: t + 0.05, dist: 10, dur: 0.3 } });
    const row = (html, i, ti, added) => {
      const yy = y + 100 + i * LH;
      out.push({ type: 'hairline', x: x + 44, y: yy - 16, w: w - 88, h: 1, color: COLOR.rule, t: ti, dur: 0.3 });
      out.push({ type: 'label', html: String(i + 1).padStart(2, '0'), x: x + 44, y: yy + 6, w: 80, size: 24, color: COLOR.slate, enter: added ? { t: ti, fx: 'slide', from: 'right', dist: 600, dur: 0.45 } : { t: ti, dist: 10, dur: 0.3 } });
      out.push({ type: 'text', id: added ? (o.added.id ?? 'added') : undefined, html, cls: 'serif', weight: 400, size: 36, x: x + 128, y: yy, w: w - 172, lh: 1.28,
        enter: added ? { t: ti, fx: 'slide', from: 'right', dist: 600, dur: 0.45 } : { t: ti, dist: 12, dur: 0.3 },
        ...(added && o.added.mark != null ? { mark: { t: o.added.mark } } : {}) });
    };
    items.forEach((html, i) => row(html, i, t + 0.12 + i * step, false));
    if (o.added) {
      row(o.added.html, items.length, o.added.t, true);
      out.push(tr('bracket', 0.3, 6, { target: `${o.added.id ?? 'added'}`, t: o.added.t + 0.5, margin: 72 }));
    }
    return out;
  },
  /**
   * A generic chat (the only rounded corners of the style). messages [{ side 'me'|'ai', html, y, t, id, size 34, w,
   * exit, style }] (each bubble's y is yours: the height depends on the text). o: x 90, w 850 (the whole bubble stays
   * between x and x + w: 90–940 by default; 'me' hugs the right), label 'Chat' (label y: y0 − 54), dark (dark
   * bubbles; the default, light with ink letters, reads well on paper AND on the ink panel).
   * Each bubble is a TEXT item dressed as a bubble (not the engine's bubble item): with an `id` on the message, the pen
   * reaches a part inside it: { side: 'ai', id: 'ai1', html: 'Sure! <b id="g">two cups</b> it is…' } + mark.circle({ target: 'ai1.g' }).
   * Inside the bubble use <b id> or <span id>; not <i> (it paints the part in the skin's muted colour, lost on a light bubble).
   */
  chat(o = {}) {
    const ms = o.messages || [], out = [], x = o.x ?? 90;
    if (o.label !== false && ms.length) out.push({ type: 'label', html: o.label ?? 'Chat', x, y: (o.y0 ?? ms[0].y) - 54, size: 22, color: COLOR.faint, enter: { t: ms[0].t ?? 0, dist: 8, dur: 0.25 } });
    for (const m of ms) {
      const me = m.side === 'me', dark = !!o.dark, w = m.w ?? o.w ?? 850;
      // the letter colour is explicit: on a dark skin (SKIN_INK) the text would inherit paper ink on a light bubble
      out.push({ type: 'text', id: m.id, html: m.html, cls: 'serif', size: m.size ?? 34, lh: 1.36, x, y: m.y, w, strong: dark ? COLOR.paper : COLOR.ink,
        enter: { t: m.t ?? 0, dist: 20, dur: 0.3 },
        style: {
          width: 'max-content', maxWidth: `${w}px`, boxSizing: 'border-box', padding: '24px 30px', fontWeight: '400',
          borderRadius: me ? '26px 26px 6px 26px' : '26px 26px 26px 6px',
          background: dark ? (me ? '#46423d' : '#3a3632') : (me ? '#ddd6cb' : '#ebe5db'), color: dark ? COLOR.paper : COLOR.ink,
          border: `1px solid ${dark ? 'rgba(244,238,228,.14)' : (me ? '#cdc4b6' : '#d8d0c3')}`,
          ...(me ? { left: 'auto', right: `${1080 - x - w}px` } : {}), ...(m.style || {}),
        },
        ...(m.exit != null ? { exit: m.exit } : {}) });
    }
    return out;
  },
  /**
   * A laptop drawn in pen around a screen (the UI goes INSIDE, in screen px: x, y, w, h). The lid and the base draw
   * themselves in ink; the screen stays sheet-coloured. o: x, y, w, h (the screen), t 0, dur 0.5, thickness 5.
   */
  laptop(o = {}) {
    const x = o.x ?? 110, y = o.y ?? 620, w = o.w ?? 860, h = o.h ?? 560, t = o.t ?? 0, thickness = o.thickness ?? 5, m = 26;
    return [
      { type: 'box', x, y, w, h, style: { background: COLOR.sheet }, enter: { t, fx: 'fade', dur: 0.12 } },
      { type: 'stroke', d: 'M0 0 L100 0 L100 100 L0 100 Z', viewBox: '0 0 100 100', x: x - m, y: y - m, w: w + 2 * m, h: h + 2 * m, color: COLOR.ink, thickness, t, dur: o.dur ?? 0.5, tremor: 0.4, pressure: 0.15, tip: 0.8 },
      { type: 'stroke', d: 'M0 0 L100 0 L92 100 L8 100 Z', viewBox: '0 0 100 100', x: x - m - 40, y: y + h + m, w: w + 2 * m + 80, h: 44, color: COLOR.ink, thickness, t: t + (o.dur ?? 0.5), dur: 0.3, tremor: 0.4, pressure: 0.15, tip: 0.8, fill: { color: COLOR.slate, all: true } },
    ];
  },
};

// ── transition ───────────────────────────────────────────────────────────────────────────────────────────────
// The slate marker block crosses the whole frame on the cut: the marking gesture at frame scale. Use it once or twice
// per reel, at the turn of the story (problem → product). Chiselled leading edge, like a marker tip.
const MARKER_BLOCK = { type: 'box', x: -160, y: 0, w: 1500, h: 1920, style: { background: COLOR.slate, clipPath: 'polygon(140px 0, 100% 0, calc(100% - 140px) 100%, 0 100%)' } };
export const transition = {
  marker: {
    /** In the OUTGOING shot: the block comes in from the left and covers everything at the end. t = LOCAL time of the cut (the shot's end). */
    wipeIn: (t, dur = 0.3) => ({ ...MARKER_BLOCK, z: 20, enter: { t: q(t - dur), fx: 'slide', from: 'left', dist: 1560, dur } }),
    /** In the INCOMING shot: starts covered and the block leaves to the right. */
    wipeOut: (dur = 0.32) => ({ ...MARKER_BLOCK, z: 20, exit: { t: 0.02, fx: 'slide', to: 'right', dist: 1560, dur } }),
    /** CUES (GLOBAL time of the cut): the marker painting and the whoosh. */
    cues: (tCut, dur = 0.3) => [
      { t: q(tCut - dur), type: 'marker', until: q(tCut), v: 0.3, note: 'transition: the marker covers' },
      { t: q(tCut - 0.08), type: 'swish', dir: 1, v: 0.22 },
      { t: q(tCut + 0.04), type: 'swish', dir: 1, v: 0.16 },
    ],
  },
};

// ── camera ───────────────────────────────────────────────────────────────────────────────────────────────────
// A reader skimming the page: slow, no shake (an almost still hand), never fully still.
export const camera = {
  /** Moves down the page like someone reading (the world rises y px) and pushes in s. o: dur, y −50, s 1.03, origin [540, 960], t 0. */
  reader: (o = {}) => ({ targets: [{ t: o.t ?? 0, dur: o.dur ?? 3, y: o.y ?? -50, x: o.x ?? 0, s: o.s ?? 1.03, ease: 'gentle' }], origin: o.origin ?? [540, 960], hand: { amp: 1.2, freq: 0.22 } }),
  /** Pushes in on a point (the face, the passage). o: t 0, dur, s 1.08, target [x, y]. */
  pushIn: (o = {}) => ({ targets: [{ t: o.t ?? 0, dur: o.dur ?? 2.5, s: o.s ?? 1.08, ease: 'gentle' }], origin: o.target ?? [540, 900], hand: { amp: 1, freq: 0.2 } }),
  /** Reframes in sequence (the eye crossing a double page): [{ t, dur 0.5, x, y, s, ease 'io' }]. */
  pan: (targets, o = {}) => ({ targets: targets.map(a => ({ dur: 0.5, ease: 'io', ...a })), origin: o.origin ?? [540, 960], hand: { amp: 1, freq: 0.2 } }),
};

// ── sound (CUES from the scene items) ────────────────────────────────────────────────────────────────────────
/**
 * CUES of a scene/scene shot, in GLOBAL time, taken from its own items (what is seen and what is heard at the same t):
 *   stroke with dur        → scribble (pen on paper from t to t+dur; panned by position)   [mute: true skips it]
 *   img slides in          → swish (dir from the side)   · group/page/panel slides in → page
 *   note                   → pop on entry + type of the typed text
 *   text strike            → strike · text insert → type of the inserted passage · text typeOn (hand note) → scribble
 *   sweep                  → sweep + shimmer · verify → scan + bell at the end · button press → click
 * o: { v (volume multiplier, 1), skip: ['swish', ...] (types to skip) }.
 */
export function sceneCues(shot, o = {}) {
  const s0 = shot.start ?? 0, out = [], skip = new Set(o.skip || []), V = o.v ?? 1;
  const push = c => { if (!skip.has(c.type)) out.push({ ...c, t: q(c.t), ...(c.until != null ? { until: q(c.until) } : {}), ...(c.v != null ? { v: +(c.v * V).toFixed(3) } : {}) }); };
  const plain = h => String(h ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
  const T0 = x => (typeof x === 'number' ? { t: x } : x);
  const walk = its => {
    for (const it of its || []) {
      if (!it) continue;
      const type = it.type || 'text';
      if (type === 'stroke' && it.dur != null && it.t != null && !it.mute) {
        const cx = it.target ? 540 : (it.from ? (it.from[0] + it.to[0]) / 2 : (it.x ?? 540) + (it.w ?? 0) / 2);
        push({ t: s0 + it.t, type: 'scribble', dur: Math.max(0.12, it.dur), v: 0.22, pan: +Math.max(-0.5, Math.min(0.5, (cx - 540) / 1080)).toFixed(2) });
      }
      if (type === 'img' && it.enter?.fx === 'slide') push({ t: s0 + it.enter.t + (it.enter.dur ?? 0.6) * 0.35, type: 'swish', dir: it.enter.from === 'right' ? -1 : 1, v: 0.2 });
      if (type === 'img' && it.exit?.fx === 'slide') push({ t: s0 + it.exit.t + 0.12, type: 'swish', dir: it.exit.to === 'right' ? 1 : -1, v: 0.16 });
      if (type === 'group' && it.enter?.fx === 'slide') push({ t: s0 + it.enter.t, type: 'page', dur: Math.min(0.5, it.enter.dur ?? 0.55), v: 0.24 });
      if (type === 'note') {
        const e = T0(it.enter) || { t: 0 }, d = it.typeOn || { t: e.t + 0.3 };
        push({ t: s0 + e.t, type: 'pop', v: 0.13 });
        push({ t: s0 + d.t, type: 'type', text: plain(it.text), cps: d.cps ?? 17, seed: d.seed ?? 3, v: 0.13 });
      }
      if (type === 'text') {
        for (const r of [].concat(it.strike ?? [])) { const R = T0(r); if (R) push({ t: s0 + R.t, type: 'strike', dur: R.dur ?? 0.32, v: 0.22 }); }
        if (it.insert) {
          const ins = [...String(it.html).matchAll(/<ins([^>]*)>(.*?)<\/ins>/gi)].map((m, j) => ({ id: (m[1].match(/id="([^"]+)"/) || [])[1] ?? String(j), txt: plain(m[2]) }));
          if (Array.isArray(it.insert)) for (const I of it.insert) { const target = ins.find(x => x.id === I.id) || ins[it.insert.indexOf(I)]; if (target) push({ t: s0 + I.t, type: 'type', text: target.txt, cps: I.cps ?? 18, seed: I.seed ?? 2, v: 0.12 }); }
          else push({ t: s0 + it.insert.t, type: 'type', text: ins.map(x => x.txt).join(' '), cps: it.insert.cps ?? 18, seed: it.insert.seed ?? 2, v: 0.12 });
        }
        if (it.enter?.fx === 'typeOn' && it.cls === 'hand') push({ t: s0 + it.enter.t, type: 'scribble', dur: plain(it.html).length / (it.enter.cps ?? 11), v: 0.18 });
      }
      if (type === 'sweep') { push({ t: s0 + it.t, type: 'sweep', until: s0 + it.t + (it.dur ?? 1.2), v: 0.1 }); push({ t: s0 + it.t, type: 'shimmer', until: s0 + it.t + (it.dur ?? 1.2) - 0.05, n: 12, v: 0.05 }); }
      if (type === 'verify') { push({ t: s0 + it.t, type: 'scan', until: s0 + it.t + (it.dur ?? 1.6) }); push({ t: s0 + it.t + (it.dur ?? 1.6) + 0.02, type: 'bell', midi: 84, v: 0.1 }); }
      if (type === 'button') for (const a of [].concat(it.press || [])) push({ t: s0 + a, type: 'click', v: 0.3 });
      if (it.items) walk(it.items);
    }
  };
  walk(shot.opts?.items);
  return out.sort((a, b) => a.t - b.t);
}
export const sound = { scene: sceneCues };

// ── cover ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * COVER (1080x1920; the profile grid shows the central 3:4, y 240–1680): slate mono label, the Archivo title with ONE
 * marked word (slate block) and a passage circled in pen, the big character on the right bleeding off the bottom, the
 * lockup at the bottom left (y 1560, inside the 3:4). o:
 *   label · title (html; <em> = the marked word; <span id="c"> = the passage the pen circles) · size 104
 *   character { src | poses + pose, feet [700, 1880], height 1200, mirror } · arrow { from, to } (from their pen to the passage)
 *   marks (extra items) · circle (default true when there is a <span id="c">) · y 340 (top of the title) · lockup true · brand
 */
export function cover(o = {}) {
  const size = o.size ?? 104, y = o.y ?? 340, P = o.character || {};
  const items = [
    ...backdrop(),
    ...(P.src || P.poses ? [{ type: 'img', ...(P.poses ? { poses: P.poses, pose: P.pose } : { src: P.src }), feet: P.feet ?? [700, 1880], height: P.height ?? 1200, ...(P.mirror ? { mirror: true } : {}), shadow: { op: 0.11, color: COLOR.ink } }] : []),
    { type: 'label', html: o.label ?? '', x: 90, y: y - 96, size: 28, color: COLOR.slate },
    { type: 'text', id: 'tc', html: o.title ?? '', cls: 'disp', x: 90, y, w: 900, size, lh: 1.02, mark: { t: 0 } },
    ...((o.circle ?? /id="c"/.test(o.title ?? '')) ? [tr('circle', 0.4, 7, { target: 'tc.c', t: 0.1, margin: 0 })] : []),
    ...(o.arrow ? [tr('arrow', 0.38, 7, { curve: 0.2, ...o.arrow, t: 0.5 })] : []),
    ...(o.marks || []),
    ...(o.lockup === false ? [] : [{ type: 'lockup', x: 90, y: 1560, h: 50, t: 0, name: o.brand ?? BRAND }]),
  ];
  return { mod: 'scene/scene', t: 60, theme: 'light', opts: { skin: SKIN, items } };
}

// ── closing ──────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * The end card on the 'editorial' skin (paper; the accent red only here: the lockup mark and the button). With
 * `signature`, the reel's signature line BECOMES the card title (what the voice says is what is written; <i> paints
 * the second sentence muted): 'Small fixes.<br><i>Nothing else moves.</i>'. Fits in 2 lines of 92 px (≤ ~17
 * characters per line). o: signature, action 'Link in the first comment', button 'Learn more →', free (offer line,
 * omitted by default), brand, dur 4.2 (extend until the voice ends + 1.2 s), timing { title, button (on the CTA word),
 * free, action }, breathe 1.015.
 */
export function end(start, o = {}) {
  const c = endCard(start, { action: o.action ?? 'Link in the first comment', skin: 'editorial', dur: o.dur ?? 4.2, timing: o.timing, breathe: o.breathe ?? 1.015, button: o.button, free: o.free, brand: o.brand ?? BRAND });
  if (o.signature) c.opts.title = o.signature;
  return c;
}
/** End card CUES: the cut and the chime on the button (timing.button). */
export const endCues = (start, o = {}) => endCardCues(start, { timing: o.timing });
