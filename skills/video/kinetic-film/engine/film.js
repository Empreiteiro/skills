/* ═══════════════════════════════════════════════════════════════════════════
   REMARK — brand film
   One master GSAP timeline. Every visual state is a pure function of t.

   GRID       75 BPM · 1 beat = 24 frames = 800ms at 30fps · 1 bar = 96f = 3.2s
   Subdivisions are all whole frames: 1/2=12f  1/3=8f  1/4=6f  1/6=4f  1/8=3f
   ═══════════════════════════════════════════════════════════════════════════ */

const FPS = 30;
const U   = 24;                 // one beat, in frames
const T   = f => f / FPS;       // frames → seconds
const $   = s => document.querySelector(s);
const $$  = s => [...document.querySelectorAll(s)];

const PAPER = 'oklch(97.48% 0.0079 74)';
const INK   = 'oklch(23.69% 0.0036 49)';
const ON_INK = 'oklch(93.55% 0.0091 78)';

const stage = $('#stage');
const tl = gsap.timeline({ paused: true });
gsap.registerPlugin(SplitText);

/* ── measurement ─────────────────────────────────────────────────────────
   Everything is measured in stage coordinates (1920×1080), independent of
   the preview scale, by dividing out the accumulated transform.            */
function localRect(el, parent) {
  const pr = parent.getBoundingClientRect();
  const r  = el.getBoundingClientRect();
  const k  = pr.width / parent.offsetWidth;
  return { x:(r.left-pr.left)/k, y:(r.top-pr.top)/k, w:r.width/k, h:r.height/k };
}

/* Hero words are measured at build time and sized to span an exact width. */
function fit(el) {
  const target = +el.dataset.fit;
  el.style.fontSize = '200px';
  const w = el.getBoundingClientRect().width;
  const k = stage.getBoundingClientRect().width / 1920;
  el.style.fontSize = (200 * target / (w / k)) + 'px';
}

/* ── the grammar ─────────────────────────────────────────────────────────
   STAMP — arrival is binary. The word is absent, then it is fully there;
   the only motion is ≤3 frames of settle. Never a watchable fade.          */
function stamp(el, f, opt = {}) {
  const d = opt.dur || T(3);
  tl.set(el, { display: opt.display || 'block' }, T(f));
  tl.fromTo(el,
    { scaleY: 1 - (opt.squash ?? 0.022), scaleX: 1 + (opt.squash ?? 0.022) * 0.55 },
    { scaleY: 1, scaleX: 1, duration: d, ease: 'expo.out', transformOrigin: opt.origin || '0% 50%' },
    T(f));
  if (opt.wght) {
    tl.fromTo(el, { '--wg': opt.wght[0] }, { '--wg': opt.wght[1], duration: d * 1.6, ease: 'quint.out' }, T(f));
  }
}
const cut = (el, f) => tl.set(el, { display: 'none' }, T(f));

/* SCENE — a hard cut in, a hard cut out. */
function scene(el, fIn, fOut) {
  tl.set(el, { display: 'block' }, T(fIn));
  tl.set(el, { display: 'none' },  T(fOut));
}

/* PUSH — the slow 2–4% move on every held line. */
function push(el, f, frames, amt = 1.03) {
  tl.fromTo(el, { scale: 1 }, { scale: amt, duration: T(frames), ease: 'power1.out' }, T(f));
}

/* THE MARKER — the site's own gesture, frame-exact:
   the red caret crosses the word drawing a thin underline behind it, then
   the line rises into the full block and the word flips to paper as the
   ink covers it. (site/app/globals.css .mark-sweep)                        */
function marker(mk, f, sweepF = 18, riseF = 12) {
  const bg = mk.querySelector('.mk-bg');
  const cr = mk.querySelector('.mk-caret');
  const tx = mk.querySelector('.mk-tx');
  tl.set(cr, { opacity: 1, left: '0%' }, T(f));
  tl.to(cr, { left: '100%', duration: T(sweepF), ease: 'quint.out' }, T(f));
  tl.to(bg, { width: '100%', duration: T(sweepF), ease: 'quint.out' }, T(f));
  tl.set(cr, { opacity: 0 }, T(f + sweepF));
  tl.to(bg, { height: '112%', duration: T(riseF), ease: 'expo.out' }, T(f + sweepF));
  tl.set(tx, { color: ON_INK }, T(f + sweepF + 4));
  return f + sweepF + riseF;
}

/* THE FLOOD — the marker block keeps going and takes the whole frame.
   Three times in the film, and only ever on a marker landing.              */
function flood(floodEl, mk, f, frames = 12) {
  const r = localRect(mk, stage);
  const start = `inset(${r.y}px ${1920-(r.x+r.w)}px ${1080-(r.y+r.h)}px ${r.x}px)`;
  tl.set(floodEl, { display: 'block', clipPath: start }, T(f));
  tl.to(floodEl, { clipPath: 'inset(0px 0px 0px 0px)', duration: T(frames), ease: 'expo.out' }, T(f));
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD
   ═══════════════════════════════════════════════════════════════════════════ */
function build() {
  /* --- fit every hero word, with its scene momentarily displayed --- */
  $$('.scene').forEach(s => { s.style.display = 'block'; });
  $$('#mockwrap,#instrwrap,#m-cta,#m-comp,#m-cards,#d-heroWrap,#mark,#markword')
    .forEach(e => { e.style.display = 'block'; });
  $$('[data-fit]').forEach(fit);

  /* --- geometry that the timeline needs, measured now --- */
  const app     = $('#mock');
  const selRects = [...$('#m-sel').getClientRects()];
  const appR    = app.getBoundingClientRect();
  const kApp    = appR.width / app.offsetWidth;
  const selA    = { x:(selRects[0].left-appR.left)/kApp, y:(selRects[0].top-appR.top)/kApp,
                    h:selRects[0].height/kApp };
  const lastR   = selRects[selRects.length-1];
  const selB    = { x:(lastR.right-appR.left)/kApp, y:(lastR.top-appR.top)/kApp };

  /* the review brackets sit against the two rewritten passages */
  const doc = $('.a-doc');
  $('#m-p1').style.display = 'none'; $('#m-p1b').style.display = 'inline';
  $('#m-p2').style.display = 'none'; $('#m-p2b').style.display = 'inline';
  const b1 = localRect($('#m-p1b'), doc), b2 = localRect($('#m-p2b'), doc);
  const kDoc = doc.getBoundingClientRect().width / doc.offsetWidth;
  const place = (el, r, rects) => {
    const rs = rects; const top = rs[0].top, bot = rs[rs.length-1].bottom;
    const dr = doc.getBoundingClientRect();
    el.style.top    = ((top - dr.top)/kDoc - 2) + 'px';
    el.style.height = ((bot - top)/kDoc + 4) + 'px';
  };
  place($('#m-brk1'), b1, [...$('#m-p1b').getClientRects()]);
  place($('#m-brk2'), b2, [...$('#m-p2b').getClientRects()]);
  $('#m-p1b').style.display = 'none'; $('#m-p2b').style.display = 'none';
  $('#m-p1').style.display = 'inline'; $('#m-p2').style.display = 'inline';

  /* --- per-char splits, for the three moments that earn one --- */
  const splitRemark = new SplitText('#f-remark', { type: 'chars' });
  const splitRemarkable = new SplitText('#i-mk .mk-tx', { type: 'chars' });
  splitRemarkable.chars.forEach(c => { c.style.display = 'inline-block'; });
  splitRemark.chars.forEach(c => { c.style.display = 'inline-block'; });

  /* --- everything off, at t=0, so every seek is deterministic --- */
  $$('.scene').forEach(s => tl.set(s, { display: 'none' }, 0));
  ['#mockwrap','#instrwrap','#m-cta','#m-comp','#m-cards','#d-heroWrap','#mark',
   '#markword','#m-rev','#m-brk1','#m-brk2','#m-ghost','#m-ghosthint','#m-aihint',
   '#m-thread','#cursor','#m-p1b','#m-p2b','#g-h1','#g-h2','#g-h3','#g-h4a','#g-h4b',
   '#g-h5','#g-h6','#a-flood','#f-flood','#i-flood']
    .forEach(s => tl.set($(s), { display: 'none' }, 0));
  $$('.mk').forEach(mk => {
    tl.set(mk.querySelector('.mk-bg'), { width: '0%', height: '0.09em' }, 0);
    tl.set(mk.querySelector('.mk-caret'), { opacity: 0, left: '0%' }, 0);
    tl.set(mk.querySelector('.mk-tx'), { color: 'var(--ink)' }, 0);
  });
  tl.set('#sB', { backgroundColor: PAPER }, 0);
  tl.set('.bw', { color: 'var(--ink)', display: 'none' }, 0);
  tl.set('#m-sel', { backgroundSize: '0% 100%' }, 0);
  tl.set('#m-sw', { backgroundColor: 'var(--s-surface-3)' }, 0);
  tl.set('#m-sw i', { left: 2 }, 0);
  tl.set('#m-swlab', { color: 'var(--s-tx-3)' }, 0);
  tl.set('#m-wand', { backgroundColor: 'transparent', boxShadow: 'none' }, 0);
  tl.set('#r1,#r2,#r3', { width: 0 }, 0);
  tl.set('#e-caret', { opacity: 0 }, 0);
  tl.set('#a-l1,#a-l2,#c-l1,#c-l3,#f-l1,#f-l3,#i-l1,#d-l1,#d-l2,#d-l3,#e-p1,#e-p2,' +
         '#h1,#h2,#h3,#h4,#hs1,#hs2', { display: 'none' }, 0);
  tl.set('#a-mk,#c-mk,#f-mk,#i-mk,#d-mk', { display: 'none' }, 0);
  tl.set('#e-sud,#f-remark', { display: 'none' }, 0);
  tl.set(splitRemark.chars, { visibility: 'hidden' }, 0);
  tl.set(splitRemarkable.chars, { visibility: 'hidden' }, 0);
  tl.set('#jstem', { scaleY: 0, transformOrigin: '50% 100%' }, 0);
  tl.set('#jb1,#jb2,#jb3', { scaleX: 0, transformOrigin: '0% 50%' }, 0);

  /* ═════ A · “An AI Chat was never made for [writing].” ═════ bars 1–2 ═══ */
  let f = 0;
  scene($('#sA1'), 0, 96);
  stamp($('#a-l1'), 12);
  stamp($('#a-l2'), 36);
  push($('#sA1 .frame'), 12, 84, 1.025);

  scene($('#sA2'), 96, 180);
  stamp($('#a-mk'), 96, { display: 'inline-block', origin: '0% 100%' });
  push($('#sA2 .frame'), 96, 84, 1.017);
  marker($('#a-mk'), 102, 18, 12);          // caret → block, 30f
  flood($('#a-flood'), $('#a-mk'), 144, 12); // ── FULL-FRAME RED · 1 of 3
  tl.set($('#a-mk .mk-bg'), { opacity: 0 }, T(150));

  /* ═════ B · “You copy / paste / explain / again” ════ the acceleration ══ */
  const W = ['#bw0','#bw1','#bw2','#bw3'].map($);
  scene($('#sB'), 180, 348);
  const beatAt = (i, at, dur) => { tl.set(W[i], { display:'block' }, T(at));
                                   tl.set(W[i], { display:'none'  }, T(at+dur)); };
  // pass 1 — on the beat (24f). Paper ground.
  [0,1,2,3].forEach(i => beatAt(i, 180 + i*24, 24));
  [0,1,2,3].forEach(i => tl.fromTo(W[i], { scaleY: .97, scaleX: 1.012 },
      { scaleY:1, scaleX:1, duration:T(3), ease:'expo.out', transformOrigin:'0% 50%' }, T(180+i*24)));
  // pass 2 — half beat (12f). The ground inverts on the downbeat.
  tl.set($('#sB'), { backgroundColor: INK }, T(276));
  tl.set('.bw', { color: ON_INK }, T(276));
  [0,1,2,3].forEach(i => beatAt(i, 276 + i*12, 12));
  // pass 3 — quarter beat (6f), the floor of legibility. The trap closes.
  [0,1,2,3].forEach(i => beatAt(i, 324 + i*6, 6));

  /* ═════ C · “It’s never [obvious] what changed” ════════════════════════ */
  scene($('#sC'), 348, 444);
  tl.set($('#sB'), { backgroundColor: PAPER }, T(348));
  stamp($('#c-l1'), 348);
  stamp($('#c-mk'), 360, { display: 'inline-block', origin: '0% 100%' });
  stamp($('#c-l3'), 372);
  push($('#sC .frame'), 348, 96, 1.028);
  marker($('#c-mk'), 390, 18, 12);

  /* ═════ D · “parts you loved lost in the [scroll]” ═════════════════════ */
  scene($('#sD'), 444, 552);
  stamp($('#d-l1'), 444);
  stamp($('#d-l2'), 456);
  stamp($('#d-l3'), 468);
  cut($('#d-l1'), 480);                       // they go, one by one — lost
  cut($('#d-l2'), 486);
  cut($('#d-l3'), 492);
  stamp($('#d-heroWrap'), 492);
  stamp($('#d-mk'), 492, { display: 'inline-block', origin: '0% 100%' });
  push($('#sD .frame'), 492, 60, 1.017);
  marker($('#d-mk'), 498, 18, 12);

  /* ═════ E · “Suddenly / you’re prompting, not reviewing” + THE STOP ════ */
  scene($('#sE1'), 552, 576);
  stamp($('#e-sud'), 552, { squash: 0.03, origin: '0% 50%' });

  scene($('#sE2'), 576, 636);
  stamp($('#e-p1'), 576, { wght: [700, 900] });
  stamp($('#e-p2'), 588, { wght: [400, 220] });
  push($('#sE2 .frame'), 576, 60, 1.022);

  // ── a full bar of genuine stillness. The punctuation of the whole film.
  scene($('#sE3'), 636, 732);
  for (let i = 0; i < 4; i++) {               // the caret arrives in its last beat
    tl.set($('#e-caret'), { opacity: 1 }, T(708 + i*12));
    tl.set($('#e-caret'), { opacity: 0 }, T(708 + i*12 + 6));
  }
  tl.set($('#e-caret'), { opacity: 1 }, T(726));

  /* ═════ F · REMARK / “makes your writing [human] again!” ═══════════════ */
  scene($('#sF1'), 732, 792);
  splitRemark.chars.forEach((c, i) => {        // per-char cascade · 25ms/char
    tl.set(c, { visibility: 'visible' }, T(732) + i * 0.025);
    tl.fromTo(c, { '--wg': 300, scaleY: 0.94 },
      { '--wg': 900, scaleY: 1, duration: 0.13, ease: 'expo.out', transformOrigin: '50% 100%' },
      T(732) + i * 0.025);
  });
  tl.set($('#f-remark'), { display: 'block' }, T(732));
  push($('#sF1 .frame'), 732, 60, 1.017);

  scene($('#sF2'), 792, 924);
  stamp($('#f-l1'), 792);
  stamp($('#f-mk'), 804, { display: 'inline-block', origin: '0% 100%' });
  stamp($('#f-l3'), 816);
  push($('#sF2 .frame'), 792, 84, 1.025);
  marker($('#f-mk'), 828, 18, 12);
  flood($('#f-flood'), $('#f-mk'), 864, 12);   // ── FULL-FRAME RED · 2 of 3
  tl.set($('#f-mk .mk-bg'), { opacity: 0 }, T(870));
  tl.set($('#f-l1'), { color: ON_INK }, T(864));
  tl.set($('#f-l3'), { color: ON_INK }, T(864));

  /* ═════ G · THE DEMO — locked camera, one action per beat ══════════════ */
  const G = 924;
  scene($('#sG'), G, G + 444);
  /* the screen changes on the same frame as the headline that narrates it */
  scene($('#mockwrap'), G, G + 216);           // beats 1–3 in the editor
  scene($('#instrwrap'), G + 216, G + 288);    // beat 4 on Instructions
  tl.set($('#mockwrap'), { display: 'block' }, T(G + 288));   // back to the editor
  tl.set($('#mockwrap'), { display: 'none' },  T(G + 444));

  /* g1 · “point what’s [wrong]” — the drag, and the rail answers */
  stamp($('#g-h1'), G);
  marker($('#g-mk1'), G + 12, 14, 8);
  tl.set($('#cursor'), { display: 'block', x: selA.x - 4, y: selA.y + selA.h * 0.5 }, T(G + 6));
  tl.to($('#cursor'), { x: selB.x, y: selB.y + selA.h * 0.5, duration: T(24), ease: 'power2.inOut' }, T(G + 12));
  tl.to($('#m-sel'), { backgroundSize: '100% 100%', duration: T(24), ease: 'power2.inOut' }, T(G + 12));
  stamp($('#m-cta'), G + 40);
  tl.set($('#cursor'), { display: 'none' }, T(G + 66));

  /* g2 · “and it changes [only] that!” — the note is saved, the sentence swaps */
  cut($('#g-h1'), G + 72);  cut($('#m-cta'), G + 72);
  stamp($('#g-h2'), G + 72);
  marker($('#g-mk2'), G + 84, 14, 8);
  stamp($('#m-comp'), G + 78);
  tl.set($('#m-save'), { backgroundColor: 'var(--s-btn)', scale: 0.94 }, T(G + 108));
  tl.set($('#m-save'), { scale: 1 }, T(G + 112));
  cut($('#m-comp'), G + 114);
  tl.set($('#m-cards'), { display: 'block' }, T(G + 114));
  // only the marked sentence changes; every other character is identical
  tl.set($('#m-p1'),  { display: 'none' },   T(G + 114));
  tl.set($('#m-p1b'), { display: 'inline' }, T(G + 114));
  tl.set($('#m-p2'),  { display: 'none' },   T(G + 120));
  tl.set($('#m-p2b'), { display: 'inline' }, T(G + 120));
  tl.fromTo($('#m-p1b'), { opacity: 0 }, { opacity: 1, duration: T(2) }, T(G + 114));
  tl.fromTo($('#m-p2b'), { opacity: 0 }, { opacity: 1, duration: T(2) }, T(G + 120));

  /* g3 · “AND SHOWS WHERE!” — the review, the count, the margin brackets */
  cut($('#g-h2'), G + 144);
  stamp($('#g-h3'), G + 144, { squash: 0.03 });
  tl.set($('#m-rev'), { display: 'flex' }, T(G + 150));
  tl.set($('#m-p1b'), { className: 'aiwash' }, T(G + 156));
  tl.set($('#m-p2b'), { className: 'aiwash' }, T(G + 156));
  tl.set($('#m-brk1'), { display: 'block' }, T(G + 156));
  tl.set($('#m-brk2'), { display: 'block' }, T(G + 162));
  tl.fromTo($('#m-p1b'), { backgroundSize: '0% 100%' },
    { backgroundSize: '100% 100%', duration: T(10), ease: 'quint.out' }, T(G + 156));
  tl.fromTo($('#m-p2b'), { backgroundSize: '0% 100%' },
    { backgroundSize: '100% 100%', duration: T(10), ease: 'quint.out' }, T(G + 162));

  /* g4 · “It learns from your feedback / and it creates principles!” */
  cut($('#g-h3'), G + 216);
  stamp($('#g-h4a'), G + 216);
  cut($('#g-h4a'), G + 252);
  stamp($('#g-h4b'), G + 252);
  tl.to($('#r1'), { width: 72, duration: T(8), ease: 'quint.out' }, T(G + 228));
  tl.to($('#r2'), { width: 36, duration: T(8), ease: 'quint.out' }, T(G + 234));
  tl.to($('#r3'), { width: 18, duration: T(8), ease: 'quint.out' }, T(G + 240));

  /* g5 · “it auto-completes and even suggests!” — ghost text, then the switch */
  cut($('#g-h4b'), G + 288);
  stamp($('#g-h5'), G + 288);
  tl.set($('#m-rev'), { display: 'none' }, T(G + 282));
  tl.set($$('#m-brk1,#m-brk2'), { display: 'none' }, T(G + 282));
  tl.set($('#m-p1b'), { className: '' }, T(G + 282));
  tl.set($('#m-p2b'), { className: '' }, T(G + 282));
  tl.set($('#m-wand'), { backgroundColor: 'var(--s-ai-wash)',
    boxShadow: 'inset 0 0 0 1px var(--s-ai-line)' }, T(G + 294));
  tl.set($('#m-ghost'), { display: 'inline' }, T(G + 300));
  tl.set($('#m-ghosthint'), { display: 'block' }, T(G + 306));
  // then the switch flips on — the second action, on the next beat
  tl.set($('#m-ghost'), { display: 'none' }, T(G + 336));
  tl.set($('#m-ghosthint'), { display: 'none' }, T(G + 336));
  tl.set($('#m-sw'), { backgroundColor: 'var(--s-ai)' }, T(G + 342));
  tl.set($('#m-sw i'), { left: 13 }, T(G + 342));
  tl.set($('#m-swlab'), { color: 'var(--s-ai-text)' }, T(G + 342));

  /* g6 · “have a question? ask INLINE!” — @ai inside the note */
  cut($('#g-h5'), G + 372);
  stamp($('#g-h6'), G + 372);
  tl.set($('#m-note2'), { innerHTML: 'hedging — end it harder <span class="mention">@ai</span>' }, T(G + 384));
  tl.set($('#m-aihint'), { display: 'flex' }, T(G + 390));
  tl.set($('#m-aihint'), { display: 'none' }, T(G + 414));
  // once it is saved the mention renders as the chip, exactly as the app does
  tl.set($('#m-note2'), { innerHTML: 'hedging — end it harder <span class="aichip">Ask AI</span>' }, T(G + 414));
  tl.set($('#m-thread'), { display: 'block' }, T(G + 414));
  cut($('#g-h6'), G + 444);

  /* ═════ H · “it finally / sounds / like / you” ═════════════════════════ */
  const H = G + 444;                                   // 1368
  scene($('#sH'), H, H + 120);
  stamp($('#h1'), H);
  stamp($('#h2'), H + 24);
  stamp($('#h3'), H + 48);
  stamp($('#h4'), H + 72, { squash: 0.03 });
  push($('#sH .frame'), H + 72, 48, 1.02);

  scene($('#sH2'), H + 120, H + 192);
  stamp($('#hs1'), H + 120);
  stamp($('#hs2'), H + 132);
  push($('#sH2 .frame'), H + 120, 72, 1.017);

  /* ═════ I · “write something [remarkable]” ═════════════════════════════ */
  const I = H + 192;                                   // 1560
  scene($('#sI'), I, I + 114);   /* hands off to the sting, mid-red */
  stamp($('#i-l1'), I);
  tl.set($('#i-mk'), { display: 'inline-block' }, T(I + 12));
  splitRemarkable.chars.forEach((c, i) => {            // per-char cascade · 22ms
    tl.set(c, { visibility: 'visible' }, T(I + 12) + i * 0.022);
    tl.fromTo(c, { scaleY: 0.94 }, { scaleY: 1, duration: 0.11, ease: 'expo.out',
      transformOrigin: '50% 100%' }, T(I + 12) + i * 0.022);
  });
  push($('#sI .frame'), I + 12, 60, 1.017);
  marker($('#i-mk'), I + 36, 18, 12);
  flood($('#i-flood'), $('#i-mk'), I + 72, 12);        // ── FULL-FRAME RED · 3 of 3
  tl.set($('#i-mk .mk-bg'), { opacity: 0 }, T(I + 78));
  tl.set($('#i-l1'), { color: ON_INK }, T(I + 72));

  /* ═════ J · THE MARK — the red collapses into the stem, the bars write ══ */
  const J = I + 126;                                   // 1686
  scene($('#sJ'), J - 12, J + 84);
  /* The red is one object for the whole film, and this is where it lands: the
     full-frame flood collapses to exactly the stem of the official mark. sI
     hands over mid-red at J−12, so the cut is invisible — the same red pixels
     carry on shrinking. Its own scene owns it, or a sibling scene's ground
     would paint over it. */
  tl.set($('#mark'), { display: 'block' }, T(J - 12));
  $('#jstem').style.transform = 'scaleY(1)';
  const r = localRect($('#jstem'), stage);
  const stemInset = `inset(${r.y}px ${1920-(r.x+r.w)}px ${1080-(r.y+r.h)}px ${r.x}px)`;
  $('#jstem').style.transform = '';
  tl.set($('#j-flood'), { display: 'block', clipPath: 'inset(0px 0px 0px 0px)' }, T(J - 12));
  tl.to($('#j-flood'), { clipPath: stemInset, duration: T(12), ease: 'power2.inOut' }, T(J - 12));
  tl.set($('#j-flood'), { display: 'none' }, T(J));
  tl.set($('#jstem'), { scaleY: 1 }, T(J));
  // three ruled bars, written left to right
  [['#jb1', 0], ['#jb2', 6], ['#jb3', 12]].forEach(([sel, d]) => {
    tl.to($(sel), { scaleX: 1, duration: T(7), ease: 'expo.out' }, T(J + d));
  });
  stamp($('#markword'), J + 42, { origin: '50% 50%' });
  push($('#mark'), J, 84, 1.015);

  const END = J + 84;                                  // 1770 frames · 59.0s
  tl.set({}, {}, T(END));
  return END;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HARNESS — frame-exact contract
   ═══════════════════════════════════════════════════════════════════════════ */
function layout() {
  const k = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${k})`;
  document.body.style.width = innerWidth + 'px';
}
addEventListener('resize', layout);

let seeking = false, raf = 0, t0 = 0;

function loop(now) {
  if (seeking) return;
  if (!t0) t0 = now;
  const t = ((now - t0) / 1000) % tl.duration();
  tl.seek(t, false);
  raf = requestAnimationFrame(loop);
}

window.__seek = function (ms) {
  seeking = true;
  cancelAnimationFrame(raf);
  tl.pause();
  tl.seek(Math.min(ms, window.__duration) / 1000, false);
};

document.fonts.ready.then(async () => {
  await Promise.all([
    document.fonts.load('800 200px Archivo'),
    document.fonts.load('300 200px Archivo'),
    document.fonts.load('400 20px Newsreader'),
    document.fonts.load('italic 400 20px Newsreader'),
    document.fonts.load('400 22px "JetBrains Mono"'),
    document.fonts.load('400 16px "Hanken Grotesk"'),
    document.fonts.load('400 11px "Geist Mono"'),
  ]);
  await document.fonts.ready;   /* the explicit loads above can flip status back */
  layout();
  const endFrames = build();
  window.__duration = Math.round(endFrames / FPS * 1000);
  window.__frames = endFrames;
  window.__bpm = 75;
  tl.pause(0);
  tl.seek(0, false);

  if (new URLSearchParams(location.search).has('guides')) document.body.classList.add('guides-on');
  const q = new URLSearchParams(location.search).get('t');
  if (q !== null) { window.__seek(parseFloat(q)); }
  else { raf = requestAnimationFrame(loop); }

  window.__ready = true;
});
