// example · demo reel of the "editorial" style kit (not a deliverable): a template for real reels, built only from
// src/shots/style/editorial.js and the placeholder character in cast/cast.json.
//   A (0–4.1)    the problem: the character slides in, breathes, hops on the strong words, sighs, swaps pose hard
//                (points), the hook headline with the marked word in slate, the proofreader's circle on time, a doubt
//                reaction; reader camera. Closes with the marker block covering the frame.
//   B (4.1–8.8)  the product: the cartoon caption at the top, the draft page rises, a suggestion (green) pinned to the
//                passage, the character decides with the pen (slate check), Apply, the sweep only over that passage,
//                the red strike and green insertion, the check of the untouched paragraph.
//   C (8.8–end)  the editorial end card with the signature line as its title and the CTA in the brand voice.
//   node tools/still.mjs --reel example --t 0.5,1.2,2.4,3.0,3.9,4.5,5.7,6.9,7.6,8.5,9.9,12.7 --sheet --cols 6
import F from './example.vo.json' with { type: 'json' };
import * as E from '../shots/style/editorial.js';

export const META = { num: '00', slug: 'example', date: '2026-01-01' };
export const MUSIC = E.MUSIC;
const w = (id, k, n) => E.word(F, id, k, n);
const A = 0, B = 4.1, C = 8.8;
export const DUR = E.loc(F.end + 1.25, 0);
const HOST = E.CAST.example;

const BODY = '<u id="q"><s id="c">Add two cups of sugar.</s></u> <ins id="i">Add one cup of sugar.</ins> Fold in the zest of two lemons.'
  + '<br><br><span id="p2">Bake for 50 minutes, until a skewer comes out clean.</span>';

const shotA = { id: 'problem', mod: 'scene/scene', start: A, end: B, opts: {
  skin: E.SKIN,
  camera: E.camera.reader({ dur: B - A, y: -30, s: 1.04, origin: [540, 1150] }),
  items: [
    ...E.backdrop(),
    E.character({
      id: 'host', poses: { base: HOST.stand, point: HOST.point }, feet: [320, 1900], height: 1160,
      enter: { t: 0, from: 'left' }, speech: { line: 'l1', words: ['recipe', 'one'] },
      gestures: [{ t: E.loc(w('l1', 'cups'), A) + 0.05, type: 'sigh' }],
      swap: [{ t: E.loc(w('l1', 'one'), A) + 0.04, pose: 'point' }],
    }),
    ...E.reaction.doubt({ x: 360, y: 880, t: E.loc(w('l1', 'cups'), A) }),
    E.title({ id: 'hook', html: 'My recipe says<br><span id="h">two cups.</span><br>It means <em>one.</em>', y: 400, size: 88, mark: E.loc(w('l1', 'one'), A) + 0.02 }),
    E.mark.circle({ target: 'hook.h', t: E.loc(w('l1', 'two'), A) + 0.15, dur: 0.42 }),
    E.transition.marker.wipeIn(B - A),
  ],
} };

const shotB = { id: 'product', mod: 'scene/scene', start: B, end: C, opts: {
  skin: E.SKIN_AI,   // the suggestion is the AI's: card and passage in green; the writer's pen stays slate
  camera: E.camera.pushIn({ dur: C - B, s: 1.025, target: [540, 900] }),
  items: [
    ...E.backdrop(),
    E.product.page({
      id: 'doc', y: 600, h: 540, title: 'Lemon loaf', meta: 'Draft · newsletter', body: BODY, depth: 1,
      enter: { t: 0.05 },
      wash: { t: E.loc(w('l2', 'note'), B) - 0.1, dur: 0.5, kind: 'u' },
      strike: { t: 3.0, dur: 0.4, id: 'c' },
      insert: [{ t: 3.35, cps: 14, id: 'i' }],
      attached: [
        E.product.suggestion({ target: 'doc.q', x: 330, y: 1172, w: 610, text: 'Two cups is double the tested batch.', t: E.loc(w('l2', 'note'), B) - 0.05 }),
        E.mark.check({ x: 842, y: 1182, w: 72, h: 62, t: E.loc(w('l2', 'tap'), B) - 0.02 }),
        E.product.button({ x: 730, y: 628, t: 2.45, press: [2.8] }),
        E.product.sweep({ x: 142, y: 770, w: 796, h: 120, t: 2.85, dur: 0.65 }),
        E.product.unchanged({ target: 'doc.p2', t: 3.55, dur: 0.5 }),
      ],
    }),
    // small at the foot of the giant page (the style's play of scale), mirrored so the spoon points at the card
    E.character({
      id: 'host-b', src: HOST.point, mirror: true, facing: 'right', feet: [215, 1905], height: 620,
      enter: { t: 0.9, from: 'left' }, speech: { line: 'l2', words: ['note', 'changes'] },
      // nods on "tap" and hops when the check of the untouched paragraph closes (the bell), never on a spoken word
      gestures: [{ t: E.loc(w('l2', 'tap'), B) + 0.05, type: 'nod' }, { t: 4.08, type: 'hop' }],
    }),
    ...E.caption.cartoon({ F, line: 'l2', start: B, atTop: true, y: 396, highlight: 'only' }),
    E.transition.marker.wipeOut(),
  ],
} };

const TIMING = { lockup: 0, title: 0.05, button: E.loc(w('l4', 'Learn'), C), free: E.loc(w('l4', 'Learn'), C) + 0.3, action: E.loc(w('l4', 'link'), C) };

export const SHOTS = [
  shotA,
  shotB,
  E.end(C, { signature: 'Small fixes.<br><i>Nothing else moves.</i>', dur: DUR - C, timing: TIMING }),
];

export const CUES = [
  { t: 0.1, type: 'motif', note: 'the motif opens the hook' },
  ...E.sound.scene(shotA),
  ...E.transition.marker.cues(B),
  ...E.sound.scene(shotB),
  ...E.endCues(C, { timing: TIMING }),
].sort((a, b) => a.t - b.t);

export const SECTIONS = [
  { t0: 0, t1: B, name: 'intro' },
  { t0: B, t1: C, name: 'soft', voice: true, energy: 0.7 },
  { t0: C, t1: DUR, name: 'final' },
];

export const COVER = E.cover({
  label: 'Recipes · the margin',
  title: 'Only <span id="c">one line</span> <em>changes.</em>',
  character: { src: HOST.point, feet: [720, 1880], height: 1200 },
  arrow: { from: [470, 800], to: [360, 600] },
});

// ── catalogue (AFTER DUR: render and soundtrack never reach it; only still.mjs, to review the pieces) ────────────
//   node tools/still.mjs --reel example --t 21.9,23.9,25.9,27.9,29.9,31.9 --sheet --cols 6 --out out/example/catalogue
const K = 20;
SHOTS.push(
  { id: 'cat-panel', mod: 'scene/scene', start: K, end: K + 2, opts: { skin: E.SKIN, items: [
    ...E.backdrop(),
    ...E.caption.headline({ F, line: 'l3', start: K, mark: 'fixes', enter: 0 }),
    ...E.panel({ y: 560, h: 640, outline: { t: 0, dur: 0.45 }, zoom: { s: 1.06, dur: 2 }, items: [
      E.character({ src: HOST.stand, feet: [520, 1560], height: 1150, enter: { fx: 'cut' } }),
    ] }),
    ...E.mark.note({ text: 'stet', x: 760, y: 610, t: 0.3 }),
    ...E.mark.query({ x: 110, y: 610, t: 0.6 }),
    ...E.caption.cartoon({ F, line: 'l1', start: K, highlight: 'one', enter: 0 }),
  ] } },
  { id: 'cat-lists', mod: 'scene/scene', start: K + 2, end: K + 4, opts: { skin: E.SKIN, items: [
    ...E.backdrop(),
    ...E.product.rules({ y: 420, items: ['Method first, story after.', 'Grams, not cups.'], added: { html: 'Never change a quantity <em>silently</em>.', t: 0.5, mark: 0.95 } }),
    ...E.product.versions({ y: 980, items: [{ name: 'first draft', when: 'Sat' }, { name: 'tested batch', when: 'Sun' }, { name: 'sent', when: 'today' }], t: 0.2, click: { t: 1.2, i: 1 } }),
  ] } },
  { id: 'cat-chat', mod: 'scene/scene', start: K + 4, end: K + 6, opts: { skin: E.SKIN_INK, items: [
    ...E.product.chat({ messages: [
      { side: 'me', html: 'Can you fix the sugar line? Keep everything else.', y: 520, t: 0.1 },
      { side: 'ai', id: 'ai1', html: 'Sure! Here is a cleaner recipe: <b id="g">a generous cup</b> of sugar, and <b id="n">bake until golden</b>.', y: 760, t: 0.4 },
    ] }),
    // the pen reaches a word INSIDE the bubble; on the light bubble use full slate (the light slate is for the ink ground)
    E.mark.circle({ target: 'ai1.g', t: 0.8, color: E.COLOR.slate }),
    E.mark.underline({ target: 'ai1.n', t: 1.3, color: E.COLOR.slate }),
    E.title({ html: 'The chat rewrote the <em>whole</em> recipe.', y: 1120, size: 64, t: 0.05, mark: 0.6 }),
  ] } },
  { id: 'cat-laptop', mod: 'scene/scene', start: K + 6, end: K + 8, opts: { skin: E.SKIN, items: [
    ...E.backdrop(),
    ...E.product.laptop({ x: 150, y: 470, w: 780, h: 470, t: 0 }),
    { type: 'text', id: 'tl', html: 'Lemon loaf', cls: 'disp', size: 56, x: 200, y: 520, w: 680 },
    { type: 'text', id: 'tb', html: 'I tested it three times. <u id="h">One cup of sugar</u> was plenty.', cls: 'news', size: 36, x: 200, y: 610, w: 680, lh: 1.45, wash: { t: 0.3 } },
    E.mark.circle({ target: 'tl', t: 0.4 }),
    E.mark.arrow({ from: [860, 1180], to: [800, 560], t: 0.9 }),
    E.character({ src: HOST.stand, mirror: true, facing: 'right', feet: [760, 1900], height: 880, enter: { fx: 'cut' } }),
    ...E.reaction.startle({ x: 740, y: 1080, t: 0.2, stay: true }),
    ...E.reaction.doubt({ x: 300, y: 1300, t: 0.3, stay: true }),
    ...E.reaction.idea({ x: 180, y: 1640, t: 0.4, stay: true }),
    ...E.reaction.frustrated({ x: 470, y: 1640, t: 0.5, stay: true }),
    ...E.reaction.relief({ x: 300, y: 1850, t: 0.6, stay: true }),
  ] } },
  { ...E.end(K + 8, { signature: 'Your line here.<br><i>Two short sentences.</i>', dur: 2 }), id: 'cat-end' },
  // a page that only changes its title: two old pages leaned behind, the marked title, the comment, the IIII tally in
  // the margin (the same note for the 4th time) and the edit that strikes and rewrites ONLY the title (titleGestures)
  { id: 'cat-title', mod: 'scene/scene', start: K + 10, end: K + 12, opts: { skin: E.SKIN, items: [
    ...E.backdrop(),
    E.product.page({ id: 'old2', x: 170, y: 520, w: 800, h: 520, title: 'Banana bread', meta: 'Post · last month', body: '', lean: -5, enter: false }),
    E.product.page({ id: 'old1', x: 130, y: 560, w: 820, h: 520, title: 'Rye starter', meta: 'Post · last week', body: '', lean: 3, enter: false }),
    E.product.page({
      id: 'post', x: 120, y: 620, w: 860, h: 520, title: '<u id="h"><s id="x">Sugar</s></u> <ins id="n">One cup, not two</ins>',
      meta: 'Post · today', body: 'I tested the loaf three times this week. One cup of sugar was plenty.', enter: { t: 0 },
      titleGestures: { wash: { t: 0.3, dur: 0.4, kind: 'u' }, strike: { t: 1.0, dur: 0.3, id: 'x' }, insert: [{ t: 1.2, cps: 40, id: 'n' }] },
      attached: [E.product.comment({ target: 'post-t.h', x: 170, y: 1180, w: 770, text: 'This names a topic. Make it say what changed.', t: 0.35, cps: 70, margin: 84 })],
    }),
    ...E.mark.tally({ x: 34, y: 640, n: 4, t: 0.5, step: 0.14 }),
  ] } },
);
