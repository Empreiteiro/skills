// The two alternative arrangements of the score: 'doodle' and 'anime'.
// What does NOT change (it is the identity): F major, 120 BPM with a 2 s bar (the picture cuts on this grid), the
// score's progressions (PROGS), the C–F–A motif rising on a bell at the hook and on the end card, and the dramatic
// role of each SECTION. What changes is the orchestra:
//   doodle  playful. Marimba instead of the electric piano, pizzicato, short bouncy
//           bass, finger snaps + slaps + shaker instead of drums, motif on glockenspiel, slide whistle
//           on the riser. tension = tiptoe pizzicato and woodblock tick-tock.
//   anime   hand-painted animated-film feel, nostalgic and warm. Felt piano in pedalled arpeggios, slow string
//           bed, half-time, no drums (only a soft kick on beat 1 of the groove), motif on celesta, harp on the riser.
//           tension = low tremolo strings and a clock; final = full piano and string chord.
// The 'editorial' arrangement lives entirely in score.js; nothing here runs in it.
import { mulberry32, mtof, ksBuffer } from './dsp.js';

/** Instruments for the doodle and anime arrangements, on the synth's buses (s._). Own PRNG: does not consume the synth's. */
export function createInstruments(s, seed = 3107) {
  const { ctx, gain, biq, osc, envAD, route, music, bassBus, drums, fx, white, pinkN } = s._;
  const rnd = mulberry32(((seed * 7) ^ 0x51ed) >>> 0);
  const noise = (t, dur, pink = false) => {
    const b = pink ? pinkN : white, n = ctx.createBufferSource();
    n.buffer = b; n.loop = true; n.start(t, rnd() * (b.duration - 0.05)); n.stop(t + dur);
    return n;
  };
  /** Sine partials [ratio, amplitude, tau] with linear attack and exponential decay, summed into `sum`. */
  const partials = (t, f, v, list, sum, att = 0.0008) => {
    for (const [k, a, tau] of list) {
      if (f * k > 18000) continue;
      const o = osc('sine', f * k, t, t + tau * 6.5 + 0.03), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + att); g.gain.setTargetAtTime(0, t + att, tau);
      o.connect(g); g.connect(sum);
    }
  };

  // ── doodle ────────────────────────────────────────────────────────────────
  /** Marimba: tuned bar 1 : 3.93 : 9.2 (low notes ring longer), yarn mallet (hard 0–1 = soft → hard). */
  function marimba(t, midi, v = 0.1, { pan = 0, rev = 0.22, dly = 0.05, bus = music, hard = 0.6 } = {}) {
    const f = mtof(midi), tau = Math.max(0.08, 0.62 * Math.pow(2, -(midi - 48) / 14)), sum = gain(1);
    partials(t, f, v, [[1, 1, tau], [3.93, 0.3 * hard, tau * 0.22], [9.2, 0.09 * hard, tau * 0.08]], sum, 0.0012);
    const n = noise(t, 0.03), lp = biq('lowpass', 1500 + 2500 * hard, 0.7), ng = gain(0);
    envAD(ng.gain, t, v * 0.22 * hard, 0.0004, 0.0018); n.connect(lp); lp.connect(ng); ng.connect(sum);
    route(sum, bus, rev, dly, pan);
  }
  function marimbaChord(t, midis, v, o = {}) {
    midis.forEach((m, i) => marimba(t + i * (o.strum ?? 0.018), m, v * (1 - i * 0.05), { ...o, pan: (o.pan ?? 0) + (i - (midis.length - 1) / 2) * 0.16 }));
  }
  const ksC = new Map();
  const ks = (midi, t60, bright) => {
    const k = `${midi}|${t60}|${bright}`;
    if (!ksC.has(k)) ksC.set(k, ksBuffer(ctx, mtof(midi), mulberry32(midi * 7919 + Math.round(t60 * 100) + 101), { t60, bright, seconds: Math.min(3.2, t60 * 1.3 + 0.3) }));
    return ksC.get(k);
  };
  /** Plucked string (Karplus-Strong) damped at t+dur: pizzicato, bass and harp. */
  function pizz(t, midi, dur = 0.3, v = 0.2, { t60 = 0.6, bright = 0.35, lp = 2600, pan = 0, rev = 0.15, dly = 0, bus = music } = {}) {
    const src = ctx.createBufferSource(); src.buffer = ks(midi, t60, bright); src.start(t); src.stop(t + dur + 0.25);
    const f = biq('lowpass', lp, 0.6), a = gain(0);
    a.gain.setValueAtTime(v, t); a.gain.setTargetAtTime(0, t + dur, 0.04);
    src.connect(f); f.connect(a); route(a, bus, rev, dly, pan);
  }
  /** Short bouncy bass: double-bass pizzicato + a sine for weight, with a little pitch "hop" on the attack. */
  function pbass(t, midi, dur = 0.22, v = 0.3) {
    v *= 1.26;
    const f = mtof(midi), o = osc('sine', f, t, t + dur + 0.3);
    o.frequency.setValueAtTime(f * 1.07, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    const a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.005); a.gain.setTargetAtTime(v * 0.5, t + 0.006, 0.09); a.gain.setTargetAtTime(0, t + dur, 0.03);
    o.connect(a); route(a, bassBus, 0, 0, 0);
    pizz(t, midi, dur, v * 0.8, { t60: 0.8, bright: 0.42, lp: 2000, rev: 0.04, bus: bassBus });
  }
  /** Glockenspiel: free bar 1 : 2.756 : 5.404 : 8.933 and the click of the metal mallet. */
  function glock(t, midi, v = 0.1, { pan = 0, rev = 0.5, dly = 0.22, bus = fx, ring = 1 } = {}) {
    const f = mtof(midi), sum = gain(1);
    partials(t, f, v, [[1, 1, 1.0 * ring], [2.756, 0.3, 0.3], [5.404, 0.13, 0.09], [8.933, 0.05, 0.045]], sum, 0.0006);
    const n = noise(t, 0.02), hp = biq('highpass', 5000), ng = gain(0);
    envAD(ng.gain, t, v * 0.25, 0.0002, 0.0008); n.connect(hp); hp.connect(ng); ng.connect(sum);
    route(sum, bus, rev, dly, pan);
  }
  /** Finger snap: the snap at 2.3 kHz, the palm "pop" at 1.15 kHz and the high crest. */
  function snap(t, v = 0.3, pan = 0.1, rev = 0.14) {
    const sum = gain(1);
    for (const [type, f, q, a, tau] of [['bandpass', 2300, 1.4, 1, 0.006], ['bandpass', 1150, 2.2, 0.55, 0.014], ['highpass', 6000, 0.7, 0.4, 0.0012]]) {
      const n = noise(t, 0.08), fl = biq(type, f, q), g = gain(0);
      envAD(g.gain, t, v * a, 0.0003, tau); n.connect(fl); fl.connect(g); g.connect(sum);
    }
    route(sum, drums, rev, 0, pan);
  }
  /** Slap (body percussion, hand on thigh): the soft low hit that stands in for the kick. */
  function pat(t, v = 0.5, pan = 0) {
    v *= 1.19;
    const sum = gain(1), o = osc('sine', 110, t, t + 0.45);
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(74, t + 0.06);
    const a = gain(0); envAD(a.gain, t, v, 0.002, 0.07); o.connect(a); a.connect(sum);
    const n = noise(t, 0.05), lp = biq('lowpass', 900), ng = gain(0);
    envAD(ng.gain, t, v * 0.25, 0.0008, 0.008); n.connect(lp); lp.connect(ng); ng.connect(sum);
    route(sum, drums, 0.05, 0, pan);
  }
  /** Woodblock (high tick, low tock). */
  function wood(t, v = 0.15, hi = true) {
    const f = hi ? 1580 : 1180, sum = gain(1);
    partials(t, f, v, [[1, 1, 0.028], [2.63, 0.3, 0.008]], sum, 0.0004);
    const n = noise(t, 0.02), bp = biq('bandpass', 3000, 1.5), ng = gain(0);
    envAD(ng.gain, t, v * 0.35, 0.0002, 0.0015); n.connect(bp); bp.connect(ng); ng.connect(sum);
    route(sum, drums, 0.18, 0.04, hi ? 0.2 : -0.2);
  }
  /** Slide whistle rising from t0 to t1 (the doodle riser): a sine with growing vibrato plus the breath. */
  function slide(t0, t1, v = 0.06, { from = 72, to = 89 } = {}) {
    if (t1 - t0 < 0.2) return;
    const te = t1 - 0.03, sum = gain(1), f0 = mtof(from), f1 = mtof(to);
    const vib = osc('sine', 5.6, t0, t1 + 0.05), vg = gain(0);
    vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(22, te); vib.connect(vg);
    for (const [k, lvl] of [[1, 1], [2, 0.12]]) {
      const o = osc('sine', f0 * k, t0, t1 + 0.05), g = gain(lvl);
      o.frequency.setValueAtTime(f0 * k, t0); o.frequency.exponentialRampToValueAtTime(f1 * k, te);
      vg.connect(o.detune); o.connect(g); g.connect(sum);
    }
    const n = noise(t0, t1 - t0 + 0.05), bp = biq('bandpass', f0, 7), ng = gain(1.2);
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, te);
    n.connect(bp); bp.connect(ng); ng.connect(sum);
    const a = gain(0);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + 0.14); a.gain.linearRampToValueAtTime(v * 1.2, te - 0.03); a.gain.linearRampToValueAtTime(0, te);
    sum.connect(a); route(a, fx, 0.35, 0.12, 0);
  }

  // ── anime ─────────────────────────────────────────────────────────────────
  const feltW = (() => {
    const N = 14, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) im[n] = Math.pow(n, -1.75) * (n === 2 ? 1.25 : n === 3 ? 1.1 : 1);
    return ctx.createPeriodicWave(re, im);
  })();
  /** Felt piano: two slightly detuned strings (the beating), a low-pass that closes after the hammer,
   *  two-stage decay (the strike and the "after-sound"), the thud of the felt and the key. dur = until the pedal lifts. */
  function felt(t, midi, dur = 1.2, v = 0.1, { pan = null, rev = 0.32, dly = 0, bus = music, hard = 0.5 } = {}) {
    const f = mtof(midi), end = t + dur + 0.9, sum = gain(1), lp = biq('lowpass', 1000, 0.45);
    const c0 = Math.min(9000, f * (3 + 6 * hard) + 700), c1 = Math.min(c0, f * 1.5 + 380);
    lp.frequency.setValueAtTime(c0, t); lp.frequency.setTargetAtTime(c1, t + 0.004, 0.3);
    for (const dt of [-2.2 - rnd(), 2.2 + rnd()]) {
      const o = osc('sine', f, t, end), g = gain(0.5);
      o.setPeriodicWave(feltW); o.detune.value = dt; o.connect(g); g.connect(lp);
    }
    const a = gain(0), tauS = Math.max(0.5, 3.2 * Math.pow(2, -(midi - 40) / 16));
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.005);
    a.gain.setTargetAtTime(v * 0.42, t + 0.006, 0.16);
    if (dur > 0.4) a.gain.setTargetAtTime(0, t + 0.4, tauS);
    a.gain.setTargetAtTime(0, t + dur, 0.14);
    lp.connect(a); a.connect(sum);
    const n = noise(t, 0.04), hl = biq('lowpass', 1400 + 1200 * hard, 0.7), hg = gain(0);
    envAD(hg.gain, t, v * 0.1, 0.0008, 0.006); n.connect(hl); hl.connect(hg); hg.connect(sum);
    const th = osc('sine', 95, t, t + 0.15), tg = gain(0); envAD(tg.gain, t, v * 0.12, 0.001, 0.018); th.connect(tg); tg.connect(sum);
    route(sum, bus, rev, dly, pan ?? Math.max(-0.45, Math.min(0.45, (midi - 60) / 40)));
  }
  function feltChord(t, midis, dur, v, o = {}) {
    const st = o.strum ?? 0.012;
    midis.forEach((m, i) => felt(t + i * st, m, Math.max(0.1, dur - i * st), v * (1 - i * 0.04), o));
  }
  /** One string-section note: three detuned sawtooths, vibrato that comes in after the bow, body at
   *  380 Hz and trimmed highs (warm). trem = bowed tremolo (0–1). */
  function bow(t, midi, dur, v = 0.05, { attack = 0.6, release = 1.0, cutoff = 2200, vib = 8, trem = 0, pan = 0, rev = 0.45, dly = 0, bus = music } = {}) {
    const f = mtof(midi), hold = Math.max(attack, dur), end = t + hold + release * 1.6 + 0.1, sum = gain(1 / 3);
    const lfo = osc('sine', 4.9 + 0.7 * rnd(), t, end), lg = gain(0);
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib, t + Math.min(hold, attack + 0.35)); lfo.connect(lg);
    for (const dt of [-9, 1, 10]) { const o = osc('sawtooth', f, t, end); o.detune.value = dt + (rnd() - 0.5) * 4; lg.connect(o.detune); o.connect(sum); }
    const lp = biq('lowpass', Math.min(cutoff, 12000), 0.5), body = biq('peaking', 380, 1, 2.5), warm = biq('highshelf', 3500, 0.7, -8);
    sum.connect(lp); lp.connect(body); body.connect(warm);
    let last = warm;
    if (trem) {
      const tr = osc('sine', 8.5 + rnd(), t, end), tg = gain(trem * 0.5), am = gain(1 - trem * 0.5);
      tr.connect(tg); tg.connect(am.gain); warm.connect(am); last = am;
    }
    const a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + attack); a.gain.setValueAtTime(v, t + hold); a.gain.setTargetAtTime(0, t + hold, release / 4);
    last.connect(a); route(a, bus, rev, dly, pan);
  }
  /** String bed: one bow per note, spread across the stereo field. */
  function strings(t0, t1, midis, v = 0.05, o = {}) {
    const sp = o.spread ?? 0.55;
    midis.forEach((m, i) => bow(t0, m, t1 - t0, v / Math.sqrt(midis.length), { ...o, pan: midis.length > 1 ? ((i / (midis.length - 1)) * 2 - 1) * sp : 0 }));
  }
  /** Celesta: steel plate with a wooden resonator, almost only the fundamental (with a light chorus) and a short "ting". */
  function celesta(t, midi, v = 0.12, { pan = 0, rev = 0.55, dly = 0.2, bus = fx, ring = 1 } = {}) {
    const f = mtof(midi), tau = 0.95 * Math.pow(2, -(midi - 72) / 24) * ring, sum = gain(1);
    partials(t, f, v, [[1, 1, tau], [1.0021, 0.32, tau * 0.9], [2, 0.13, tau * 0.4], [3.01, 0.05, tau * 0.2], [4.16, 0.06, 0.05], [7.33, 0.03, 0.025]], sum, 0.0015);
    const n = noise(t, 0.02), lp = biq('lowpass', 2600), ng = gain(0);
    envAD(ng.gain, t, v * 0.12, 0.0005, 0.002); n.connect(lp); lp.connect(ng); ng.connect(sum);
    route(sum, bus, rev, dly, pan);
  }
  /** Harp glissando on the F pentatonic (F G A C D), accelerating up to t1. */
  function harp(t0, t1, v = 0.08, { from = 65, to = 89 } = {}) {
    const notes = [];
    for (let m = from; m <= to; m++) if ([0, 2, 4, 7, 9].includes((((m - 65) % 12) + 12) % 12)) notes.push(m);
    const N = notes.length;
    notes.forEach((m, k) => {
      const x = N > 1 ? k / (N - 1) : 1;
      pizz(t0 + (t1 - t0) * Math.pow(x, 0.75), m, 1.4, v * (0.55 + 0.45 * x), { t60: 1.8, bright: 0.55, lp: 5200, pan: -0.4 + 0.8 * x, rev: 0.5, dly: 0.1 });
    });
  }
  /** Wall clock: the escapement (two clicks close together) and the wooden case. tock = the lower sound. */
  function clock(t, v = 0.1, tock = false) {
    const f = tock ? 1850 : 2500, sum = gain(1);
    for (const [d, a] of [[0, 1], [0.0065, 0.5]]) {
      const tt = t + d, n = noise(tt, 0.02), bp = biq('bandpass', f * 1.3, 3), g = gain(0);
      envAD(g.gain, tt, v * a, 0.0002, 0.0012); n.connect(bp); bp.connect(g); g.connect(sum);
      partials(tt, f, v * a * 0.45, [[1, 1, 0.012]], sum, 0.0003);
    }
    partials(t, tock ? 380 : 460, v * 0.25, [[1, 1, 0.02]], sum, 0.0008);
    route(sum, drums, 0.3, 0.05, tock ? -0.15 : 0.15);
  }
  /** Soft kick (felt beater): a sine falling from 98 to 46 Hz, no click. Does not trigger the sidechain. */
  function softKick(t, v = 0.5) {
    const o = osc('sine', 90, t, t + 0.9);
    o.frequency.setValueAtTime(98, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.09); o.frequency.exponentialRampToValueAtTime(46, t + 0.45);
    const a = gain(0), lp = biq('lowpass', 280, 0.7);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.002); a.gain.setTargetAtTime(0, t + 0.003, 0.14);
    o.connect(a); a.connect(lp); route(lp, drums, 0.05, 0, 0);
    const n = noise(t, 0.03), nl = biq('lowpass', 900), ng = gain(0);
    envAD(ng.gain, t, v * 0.1, 0.001, 0.006); n.connect(nl); nl.connect(ng); route(ng, drums, 0.05, 0, 0);
  }
  /** Warm breath for the anime cut: low pink noise with a soft attack, almost all reverb. */
  function bloom(t, v = 0.16) {
    const n = noise(t, 0.9, true), lp = biq('lowpass', 900, 0.6), a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.003); a.gain.setTargetAtTime(0, t + 0.006, 0.09);
    n.connect(lp); lp.connect(a); route(a, fx, 0.6, 0, 0);
  }

  return {
    music, bassBus, fx,
    marimba, marimbaChord, pizz, pbass, glock, snap, pat, wood, slide,
    felt, feltChord, bow, strings, celesta, harp, clock, softKick, bloom,
  };
}

// ── the arrangements ────────────────────────────────────────────────────────
// Each one returns section(sec) (the form, by SECTION name) and the CUE voices that depend on the style:
// hit/impact/drop (the cut), riser, motif and bell. H = { bars, chordAt, chordName, CH } from the score.

function doodle(s, I, H) {
  const { bars, chordAt, CH } = H;
  const motif = (t, { v = 0.15, minor = false, transpose = 0 } = {}) =>
    (minor ? [74, 77, 81] : [72, 77, 81]).forEach((m, i) => I.glock(t + i * 0.125, m + 12 + transpose, v * 0.48 * (i === 2 ? 1.15 : 0.9), { pan: (i - 1) * 0.2, rev: 0.5, dly: 0.22, bus: I.fx, ring: i === 2 ? 1.3 : 0.8 }));
  const hit = (t, size = 's') => {
    const k = size === 'm' ? 1 : 0.75;
    I.pat(t, 0.9 * k); I.snap(t, 0.3 * k, 0.04); s.subBoom(t, 0.18 * k, size === 'm' ? 0.9 : 0.6, 70, 40);
  };
  const riser = (t0, t1, v = 0.3) => {
    I.slide(t0, t1, v * 0.3, { from: 72, to: 89 });
    const r0 = Math.max(t0, t1 - 0.5);
    for (let x = r0; x < t1 - 0.03; x += 0.0625) s.shaker(x, (0.02 + 0.06 * ((x - r0) / Math.max(0.1, t1 - r0))) * (v / 0.3), 0.2);
  };

  function section(sec) {
    const E = sec.energy ?? 1, voice = !!sec.voice, bright = voice ? 0.55 : 1;
    if (sec.name === 'intro') {
      // only the marimba and the intro air: chord on 1 and a four-note doodle in the second half
      bars(sec, (b, len, i) => {
        const c = chordAt(b + 0.01), up = [...c.ep, c.ep[1] + 12];
        I.marimbaChord(b + 0.02, c.ep, 0.075 * bright, { strum: 0.02, hard: 0.4, rev: 0.3, dly: 0.12 });
        const line = i % 2 ? [4, 3, 2, 1] : [1, 2, 3, 4];
        line.forEach((j, k) => { if (1.0 + k * 0.25 < len - 0.05) I.marimba(b + 1.0 + k * 0.25, up[j], (0.035 + 0.006 * k) * bright, { hard: 0.45, rev: 0.3, dly: 0.12, pan: -0.2 + 0.13 * k }); });
      });
      s.air(sec.t0, sec.t1, 0.03);
      if (sec.build) riser(Math.max(sec.t0, sec.t1 - 1.6), sec.t1, 0.28);
    } else if (sec.name === 'soft') {
      // a bed for the voice: marimba on 1 and on the "and" of 3, short bass (root on 1, jumps to the fifth on 3),
      // slap on 1 and snap on 3
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        I.marimbaChord(b, c.ep, 0.085 * bright, { strum: 0.02, hard: 0.45, rev: 0.25, dly: 0.08 });
        if (len > 1.3) I.marimbaChord(b + 1.25, c.ep.slice(1), 0.05 * bright, { strum: 0.012, hard: 0.35, rev: 0.22 });
        I.pbass(b, c.bass + 12, 0.28, 0.22 * E);
        if (len > 1.05) I.pbass(b + 1.0, c.bass + 7, 0.2, 0.16 * E);
        I.pat(b, 0.42 * E);
        if (len > 1.05) I.snap(b + 1.0, 0.2 * E);
        if (!voice) for (let k = 0; k < len / 0.25 - 0.01; k++) s.shaker(b + k * 0.25, (k % 2 ? 0.05 : 0.03) * E);
      });
    } else if (sec.name === 'groove' || sec.name === 'pulse') {
      const pulse = sec.name === 'pulse';
      bars(sec, (b, len, i) => {
        const c = chordAt(b + 0.01), at = x => b + x < b + len - 1e-6;
        // body percussion instead of drums: slap on 1 and 3 (pulse: on every beat), snap on 2 and 4
        for (const x of pulse ? [0, 0.5, 1, 1.5] : [0, 1]) if (at(x)) I.pat(b + x, (x === 0 ? 0.7 : 0.55) * (0.6 + 0.4 * E));
        for (const x of [0.5, 1.5]) if (at(x)) I.snap(b + x, 0.3 * (0.55 + 0.45 * E), 0.1);
        const step = pulse ? 0.125 : 0.25;
        for (let k = 0; k < len / step - 0.01; k++) {
          const x = k * step, off = Math.abs(((x / 0.25) % 2) - 1) < 0.01;
          s.shaker(b + x, (pulse ? (k % 2 ? 0.045 : 0.07) : off ? 0.075 : 0.04) * (0.5 + 0.5 * E) * (voice ? 0.6 : 1), 0.22);
        }
        // short bouncy bass: root on 1, octave on the "and" of 2, fifth on 3, octave on the "and" of 4
        if (pulse) for (let k = 0; k < len / 0.25 - 0.01; k++) I.pbass(b + k * 0.25, c.bass + (k % 2 ? 12 : 0), 0.12, 0.26 * (0.6 + 0.4 * E));
        else for (const [x, iv, d, g] of [[0, 0, 0.2, 1], [0.75, 12, 0.1, 0.6], [1.0, 7, 0.18, 0.85], [1.5, 12, 0.1, 0.6], [1.75, 0, 0.1, 0.5]]) {
          if (at(x) && (g > 0.55 || E > 0.5)) I.pbass(b + x, c.bass + iv, d, 0.3 * g * (0.6 + 0.4 * E));
        }
        // marimba instead of the electric piano, with the same syncopated comping
        const v = (pulse ? 0.07 : 0.08) * bright;
        for (const [x, h] of pulse ? [[0.25, 0.4], [0.75, 0.4], [1.25, 0.4], [1.75, 0.4]] : [[0, 0.55], [0.75, 0.45], [1.25, 0.5]]) {
          if (at(x)) I.marimbaChord(b + x, c.ep, v, { strum: 0.012, hard: h, rev: 0.2, dly: 0.08 });
        }
        // glockenspiel answer at the end of every second bar (only without voice)
        if (!voice && i % 2 === 1 && at(1.5)) {
          I.glock(b + 1.5, c.ep[3] + 24, 0.04, { bus: I.music, rev: 0.4, dly: 0.2 });
          if (at(1.75)) I.glock(b + 1.75, c.ep[2] + 24, 0.035, { bus: I.music, rev: 0.4, dly: 0.2 });
        }
      });
    } else if (sec.name === 'tension') {
      // tiptoe D minor: low pizzicato in eighth notes, woodblock tick-tock, two heartbeat
      // slaps on 1 and a distant glockenspiel on 3
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01), p = c.pad.map(m => m - 12);
        const seq = [p[0], p[1], p[0], p[2], p[0], p[1], p[3], p[1]];
        for (let k = 0; k < 8 && k * 0.25 < len - 0.05; k++) I.pizz(b + k * 0.25, seq[k], 0.14, k % 2 ? 0.1 : 0.14, { t60: 0.35, bright: 0.3, lp: 1800, rev: 0.08 });
        for (let k = 0; k < len / 0.25 - 0.01; k++) I.wood(b + k * 0.25, k % 4 === 0 ? 0.07 : 0.045, k % 2 === 0);
        I.pat(b, 0.5); if (len > 0.3) I.pat(b + 0.25, 0.3);
        if (len > 1.05) I.glock(b + 1.0, c.ep[2] + 24, 0.03, { bus: I.music, rev: 0.5, dly: 0.35 });
      });
    } else if (sec.name === 'breakdown') {
      // everything drops out: soft-mallet marimba, a dying tremolo and the air
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        I.marimbaChord(b, c.ep, 0.055, { strum: 0.03, hard: 0.15, rev: 0.6, dly: 0.25 });
        for (let k = 1; k * 0.125 < len - 0.1; k++) I.marimba(b + k * 0.125, c.ep[(k % 2) + 2], 0.022 * (1 - (k * 0.125) / len), { hard: 0.1, rev: 0.5 });
        s.pad(b, b + len, c.pad, 0.025, { attack: 0.4, release: 0.8, cutoff: 800, rev: 0.6 });
      });
      s.air(sec.t0, sec.t1, 0.04);
    } else if (sec.name === 'final') {
      // the signature: cut, open Fmaj9 on marimba (with tremolo on top), the bass, the motif on glockenspiel
      const t = sec.t0, T = sec.t1, c = CH.F;
      hit(t, 'm');
      I.marimbaChord(t + 0.01, [53, 57, 60, 64, 67, 72], 0.1, { strum: 0.03, hard: 0.5, rev: 0.5, dly: 0.2 });
      for (let k = 0; 0.5 + k * 0.125 < Math.min(2.2, T - t - 0.4); k++) I.marimba(t + 0.5 + k * 0.125, [67, 72][k % 2], 0.03 * (1 - (0.5 + k * 0.125) / 2.4), { hard: 0.2, rev: 0.5, dly: 0.1 });
      I.pbass(t, c.bass, 0.9, 0.3);
      s.pad(t, T - 0.3, c.pad, 0.022, { attack: 0.3, release: 0.5, cutoff: 1200, rev: 0.6 });
      motif(t + 0.14, { v: 0.14 });
      s.fadeOut(T - 0.35, T - 0.02);
    }
  }

  return {
    section, hit, riser, motif,
    impact: t => { hit(t, 'm'); s.subBoom(t, 0.35, 1.2, 64, 30); },
    drop: t => { hit(t, 'm'); I.snap(t, 0.35, -0.1); I.glock(t, 89, 0.05, { bus: I.music }); I.glock(t + 0.004, 84, 0.04, { bus: I.music }); },
    bell: (t, midi, v) => I.glock(t, midi, v * 0.74, { bus: I.music, rev: 0.5, dly: 0.2 }),
  };
}

function anime(s, I, H) {
  const { bars, chordAt, chordName, CH } = H;
  // piano arpeggio (intervals above the chord's bass) and the top line (the two-notes-per-bar melody)
  const ARP = { F: [0, 7, 14, 16, 19, 16, 14, 7], Dm: [0, 7, 14, 15, 19, 15, 14, 7], Bb: [0, 7, 14, 16, 19, 16, 14, 7], C: [0, 7, 14, 17, 22, 17, 14, 7], Am: [0, 7, 14, 15, 19, 15, 14, 7], Gm: [0, 7, 14, 15, 19, 15, 14, 7] };
  const TOP = { F: [69, 67], Dm: [65, 64], Bb: [62, 60], C: [65, 67], Am: [64, 67], Gm: [62, 65] };
  const motif = (t, { v = 0.15, minor = false, transpose = 0 } = {}) =>
    (minor ? [74, 77, 81] : [72, 77, 81]).forEach((m, i) => I.celesta(t + i * 0.125, m + transpose, v * 0.65 * (i === 2 ? 1.15 : 0.9), { pan: (i - 1) * 0.2, rev: 0.55, dly: 0.22, ring: i === 2 ? 1.5 : 1 }));
  const hit = (t, size = 's') => {
    const k = size === 'm' ? 1 : 0.75;
    I.softKick(t, 0.9 * k);
    s.subBoom(t, 0.22 * k, size === 'm' ? 1.5 : 1.0, 62, 34);
    I.bloom(t, 0.2 * k);
    if (size === 'm' && t > 0.5) s.revCymbal(t, 0.45, 0.04);
  };
  const riser = (t0, t1, v = 0.3) => {
    const c = chordAt(Math.max(t0, t1 - 0.1));
    I.harp(Math.max(t0, t1 - 1.1), t1 - 0.04, v * 0.36, { from: 65, to: 89 });
    I.strings(t0, t1 - 0.05, c.pad, v * 0.14, { attack: Math.max(0.2, t1 - t0 - 0.1), release: 0.25, cutoff: 2600, rev: 0.5 });
    s.revCymbal(t1, Math.min(1.4, t1 - t0), v * 0.14);
  };
  const arp = (b, len, c, name, { step = 0.25, base = 0, v = 0.05, hard = 0.4, n = 8 } = {}) => {
    const iv = ARP[name] || ARP.F;
    for (let k = 0; k < n && k * step < len - 0.05; k++) I.felt(b + k * step, c.bass + base + iv[k % iv.length], Math.max(0.3, len - k * step), v * (k === 0 ? 1.15 : 1), { hard, rev: 0.34 });
  };

  function section(sec) {
    const E = sec.energy ?? 1, voice = !!sec.voice, bright = voice ? 0.55 : 1;
    if (sec.name === 'intro') {
      // the felt piano alone, pedalled quarter notes, and strings fading in slowly; the intro air
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        arp(b + 0.02, len, c, chordName(b + 0.01), { step: 0.5, base: 12, v: 0.075 * bright, n: 4, hard: 0.35 });
        I.strings(b, b + len, c.pad, 0.02, { attack: 1.2, release: 1.2, cutoff: 1600, rev: 0.55 });
      });
      s.air(sec.t0, sec.t1, 0.03);
      if (sec.build) riser(Math.max(sec.t0, sec.t1 - 1.6), sec.t1, 0.28);
    } else if (sec.name === 'soft') {
      // a bed for the voice: quarter-note arpeggio (half-time), slow strings and cellos on the root
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        arp(b, len, c, chordName(b + 0.01), { step: 0.5, base: 12, v: 0.08 * bright, n: 4, hard: 0.35 });
        I.strings(b, b + len, c.pad, 0.035 * E, { attack: 0.9, release: 1.1, cutoff: 1800, rev: 0.5 });
        I.bow(b, c.bass, len, 0.15 * E, { attack: 0.5, release: 0.8, cutoff: 700, vib: 5, rev: 0.3, bus: I.bassBus });
      });
    } else if (sec.name === 'groove' || sec.name === 'pulse') {
      const pulse = sec.name === 'pulse';
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01), nm = chordName(b + 0.01), at = x => b + x < b + len - 1e-6;
        if (pulse) {
          // piano eighth notes (short chord) and spiccato strings on the root: the pulse without drums
          for (let k = 0; k < len / 0.25 - 0.01; k++) {
            I.feltChord(b + k * 0.25, c.ep, 0.18, (k % 2 ? 0.03 : 0.04) * bright, { strum: 0.006, hard: 0.5 });
            I.bow(b + k * 0.25, c.bass + 12, 0.12, 0.045 * (0.6 + 0.4 * E), { attack: 0.012, release: 0.1, cutoff: 1400, vib: 0, rev: 0.2 });
          }
        } else {
          // the pedalled eighth-note arpeggio; without voice, the right hand sings the top line
          arp(b, len, c, nm, { step: 0.25, base: 0, v: 0.065 * bright, n: 8, hard: 0.4 });
          if (!voice) for (const [x, j] of [[0, 0], [1.0, 1]]) if (at(x)) I.felt(b + x, (TOP[nm] || TOP.F)[j], 0.95, 0.07, { hard: 0.45, rev: 0.4, dly: 0.1 });
          if (E > 0.3) I.softKick(b, 0.45 * (0.5 + 0.5 * E));   // the only kick: soft, on 1 only (half-time)
        }
        I.strings(b, b + len, c.pad, 0.03 + 0.02 * E, { attack: 0.6, release: 1.0, cutoff: 2000 + 800 * E, rev: 0.5 });
        I.bow(b, c.bass, len, 0.18 * (0.6 + 0.4 * E), { attack: 0.3, release: 0.6, cutoff: 800, vib: 5, rev: 0.3, bus: I.bassBus });
        if (E > 0.6 && !voice) I.bow(b, (TOP[nm] || TOP.F)[0] + 12, len, 0.018, { attack: 0.8, release: 1.0, cutoff: 3200, vib: 9, rev: 0.6 });
      });
    } else if (sec.name === 'tension') {
      // low tremolo strings, double bass, the clock on the beat and a high echoing piano note
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        I.strings(b, b + len, c.pad.map(m => m - 12), 0.05, { attack: 0.25, release: 0.5, cutoff: 750, trem: 0.6, vib: 3, rev: 0.4 });
        I.bow(b, c.bass - 12, len, 0.2, { attack: 0.2, release: 0.5, cutoff: 400, vib: 0, rev: 0.2, bus: I.bassBus });
        for (let k = 0; k < len / 0.5 - 0.01; k++) I.clock(b + k * 0.5, k % 2 ? 0.07 : 0.09, k % 2 === 1);
        if (len > 1.05) I.felt(b + 1.0, c.ep[2] + 12, 0.9, 0.035, { hard: 0.3, rev: 0.5, dly: 0.35 });
      });
    } else if (sec.name === 'breakdown') {
      // everything drops out: muffled piano chord, very quiet strings and the air
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        I.feltChord(b, c.ep, len, 0.045, { strum: 0.03, hard: 0.15, rev: 0.6 });
        I.strings(b, b + len, c.pad, 0.03, { attack: 0.5, release: 0.8, cutoff: 900, rev: 0.6 });
      });
      s.air(sec.t0, sec.t1, 0.04);
    } else if (sec.name === 'final') {
      // opens on a full chord: Fmaj9 over four octaves on piano, the full strings, the low end and the motif on celesta
      const t = sec.t0, T = sec.t1;
      hit(t, 'm');
      I.feltChord(t + 0.01, [29, 41, 48, 53, 57, 60, 64, 67, 72], T - t - 0.25, 0.085, { strum: 0.022, hard: 0.5, rev: 0.45 });
      I.strings(t, T - 0.3, [41, 48, 57, 64, 67, 72, 76], 0.075, { attack: 0.35, release: 0.5, cutoff: 3000, rev: 0.6, spread: 0.7 });
      I.bow(t, CH.F.bass - 12, T - t - 0.3, 0.22, { attack: 0.2, release: 0.5, cutoff: 350, vib: 0, rev: 0.3, bus: I.bassBus });
      motif(t + 0.14, { v: 0.14 });
      s.fadeOut(T - 0.35, T - 0.02);
    }
  }

  return {
    section, hit, riser, motif,
    impact: t => { hit(t, 'm'); s.subBoom(t, 0.4, 1.6, 64, 30); },
    drop: t => { hit(t, 'm'); s.crash(t, 0.035, 2.2); },
    bell: (t, midi, v) => I.celesta(t, midi, v * 0.78, { bus: I.music, rev: 0.5, dly: 0.2 }),
  };
}

export const ARRANGEMENTS = { doodle, anime };
