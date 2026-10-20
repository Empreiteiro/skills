// Synthesized instruments and effects on an OfflineAudioContext.
// Each function schedules nodes at absolute film time (seconds). Randomness
// comes only from the seeded PRNG → the same WAV on every render.
import { mulberry32, mtof, noiseBuffer, hallIR, ksBuffer, tanhCurve } from './dsp.js';

export function createSynth(ctx, { seed = 2026, solo = null } = {}) {
  const rnd = mulberry32(seed);
  const white = noiseBuffer(ctx, 8, rnd, false);
  const pinkN = noiseBuffer(ctx, 8, rnd, true);

  // ── utility nodes ────────────────────────────────────────────────────────
  const gain = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const biq = (type, f, q = 0.707, g = 0) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.gain.value = g; return n; };
  const shaper = (drive) => { const n = ctx.createWaveShaper(); n.curve = tanhCurve(drive); n.oversample = '2x'; return n; };
  const osc = (type, f, t0, t1) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t0); o.stop(t1); return o; };
  const noise = (t, dur, pink = false) => {
    const b = pink ? pinkN : white;
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    s.start(t, rnd() * (b.duration - 0.05)); s.stop(t + dur);
    return s;
  };
  /** Envelope: linear attack + exponential decay (time constant tau). */
  const envAD = (p, t, peak, a, tau) => { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.setTargetAtTime(0, t + a, tau); };

  // ── buses ────────────────────────────────────────────────────────────────
  const master = gain(1);
  const shelf = biq('highshelf', 6000, 0.707, 3.5), lowShelf = biq('lowshelf', 110, 0.707, -4);
  // No DynamicsCompressor here: Chromium's has a fixed ~6 ms lookahead and
  // would delay the whole score. Mix compression and the limiter run in Node (zero latency).
  const out = gain(1);
  const subHP = biq('highpass', 36, 0.707);
  const presence = biq('peaking', 2800, 0.8, 2.5);
  master.connect(subHP); subHP.connect(lowShelf); lowShelf.connect(presence); presence.connect(shelf); shelf.connect(out); out.connect(ctx.destination);

  // Base level of each bus (balance measured on stems: the drums used to sit 18 dB above the music).
  const LEVEL = { drums: 0.62, music: 2.6, bass: 0.5, fx: 0.7, sfx: 1.2 };
  const busGain = name => gain(solo && solo !== name ? 0 : LEVEL[name]);
  const drums = busGain('drums'), music = busGain('music'), bassBus = busGain('bass'), fx = busGain('fx'), sfx = busGain('sfx');
  const musicDuck = gain(1), bassDuck = gain(1);
  const musicHP = biq('highpass', 85, 0.7);
  music.connect(musicHP); musicHP.connect(musicDuck); musicDuck.connect(master);
  bassBus.connect(bassDuck); bassDuck.connect(master);
  drums.connect(master); fx.connect(master);
  const sfxHP = biq('highpass', 50); sfx.connect(sfxHP); sfxHP.connect(master);

  // Reverb (convolution hall) and a dotted-eighth ping-pong delay.
  const revIn = gain(solo ? 0 : 1), revHP = biq('highpass', 180), revLP = biq('lowpass', 8500);
  const conv = ctx.createConvolver(); conv.normalize = true; conv.buffer = hallIR(ctx, mulberry32(seed + 1));
  const revOut = gain(0.62);
  revIn.connect(revHP); revHP.connect(revLP); revLP.connect(conv); conv.connect(revOut); revOut.connect(master);

  const dlyIn = gain(solo ? 0 : 1), dHP = biq('highpass', 380), dLP = biq('lowpass', 4800);
  const dL = ctx.createDelay(2), dR = ctx.createDelay(2);
  dL.delayTime.value = 0.375; dR.delayTime.value = 0.375;
  const fbA = gain(0.36), fbB = gain(0.36), merger = ctx.createChannelMerger(2), dOut = gain(0.32);
  dlyIn.connect(dHP); dHP.connect(dLP); dLP.connect(dL);
  dL.connect(fbA); fbA.connect(dR); dR.connect(fbB); fbB.connect(dL);
  dL.connect(merger, 0, 0); dR.connect(merger, 0, 1); merger.connect(dOut); dOut.connect(master);
  const dRev = gain(0.25); dOut.connect(dRev); dRev.connect(revIn);

  /** Connects a node to a bus with pan and reverb/delay sends. */
  function route(node, bus, rev = 0, dly = 0, pan = 0) {
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p); p.connect(bus);
    if (rev) { const s = gain(rev); p.connect(s); s.connect(revIn); }
    if (dly) { const s = gain(dly); p.connect(s); s.connect(dlyIn); }
    return p;
  }
  function send(p, rev = 0, dly = 0) {
    if (rev) { const s = gain(rev); p.connect(s); s.connect(revIn); }
    if (dly) { const s = gain(dly); p.connect(s); s.connect(dlyIn); }
  }

  // ── sidechain (ducking from the kick) ─────────────────────────────────────
  const kicks = [];
  function scheduleDucks() {
    const k = [...new Set(kicks.map(x => Math.round(x * 48000) / 48000))].sort((a, b) => a - b);
    for (const [param, depth, tau] of [[musicDuck.gain, 0.58, 0.075], [bassDuck.gain, 0.3, 0.06]]) {
      let lastT = -1, lastD = 1;
      for (const t of k) {
        const tr = lastT < 0 ? 1 : 1 + (lastD - 1) * Math.exp(-(t - (lastT + 0.006)) / tau);
        param.setValueAtTime(Math.min(1, tr), t);
        param.linearRampToValueAtTime(depth, t + 0.006);
        param.setTargetAtTime(1, t + 0.006, tau);
        lastT = t; lastD = depth;
      }
    }
  }

  // ── drums ────────────────────────────────────────────────────────────────
  function kick(t, v = 0.95) {
    const o = osc('sine', 150, t, t + 1.1);
    o.frequency.setValueAtTime(158, t);
    o.frequency.exponentialRampToValueAtTime(56, t + 0.055);
    o.frequency.exponentialRampToValueAtTime(43, t + 0.38);
    const a = gain(0); envAD(a.gain, t, v, 0.0015, 0.1);
    const sh = shaper(1.6);
    o.connect(a); a.connect(sh);
    const n = noise(t, 0.03), hp = biq('highpass', 3000), ng = gain(0);
    envAD(ng.gain, t, 0.2 * v, 0.0005, 0.004);
    n.connect(hp); hp.connect(ng); ng.connect(sh);
    route(sh, drums, 0.02, 0, 0);
    kicks.push(t);
  }

  function snare(t, v = 0.8, rev = 0.22) {
    const sum = gain(1);
    const o = osc('triangle', 210, t, t + 0.3);
    o.frequency.setValueAtTime(215, t); o.frequency.exponentialRampToValueAtTime(165, t + 0.05);
    const og = gain(0); envAD(og.gain, t, 0.32 * v, 0.001, 0.035); o.connect(og); og.connect(sum);
    const n = noise(t, 0.45), bp = biq('bandpass', 2300, 0.6), hp = biq('highpass', 900), ng = gain(0);
    envAD(ng.gain, t, 0.5 * v, 0.001, 0.07); n.connect(bp); bp.connect(hp); hp.connect(ng); ng.connect(sum);
    const n2 = noise(t, 0.35), bp2 = biq('bandpass', 1300, 1.1), cg = gain(0);
    cg.gain.setValueAtTime(0, t);
    for (const d of [0, 0.009, 0.018]) { cg.gain.setValueAtTime(0.42 * v, t + d); cg.gain.setTargetAtTime(0, t + d + 0.001, 0.003); }
    cg.gain.setValueAtTime(0.36 * v, t + 0.027); cg.gain.setTargetAtTime(0, t + 0.028, 0.06);
    n2.connect(bp2); bp2.connect(cg); cg.connect(sum);
    route(sum, drums, rev, 0, 0.04);
  }

  function hat(t, v = 0.12, open = false, pan = 0.18) {
    const n = noise(t, open ? 0.6 : 0.12), hp = biq('highpass', 7200, 0.7), pk = biq('peaking', 10500, 1, 4), a = gain(0);
    envAD(a.gain, t, v * 1.3, 0.0005, open ? 0.09 : 0.016);
    n.connect(hp); hp.connect(pk); pk.connect(a);
    route(a, drums, 0.04, 0, pan);
  }

  function taiko(t, v = 0.8, f0 = 82, rev = 0.4, pan = 0) {
    const sum = gain(1);
    const o = osc('sine', f0, t, t + 1.7);
    o.frequency.setValueAtTime(f0 * 1.9, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.035); o.frequency.exponentialRampToValueAtTime(f0 * 0.86, t + 0.8);
    const a = gain(0); envAD(a.gain, t, v, 0.001, 0.18); o.connect(a); a.connect(sum);
    const o2 = osc('sine', f0 * 2.31, t, t + 0.6), a2 = gain(0); envAD(a2.gain, t, 0.22 * v, 0.001, 0.06); o2.connect(a2); a2.connect(sum);
    const n = noise(t, 0.2), lp = biq('lowpass', 1400, 0.8), ng = gain(0); envAD(ng.gain, t, 0.42 * v, 0.0008, 0.018);
    n.connect(lp); lp.connect(ng); ng.connect(sum);
    const sh = shaper(1.2); sum.connect(sh);
    route(sh, drums, rev, 0, pan);
  }

  function timpani(t, midi, v = 0.5, rev = 0.35) {
    const f = mtof(midi), sum = gain(1);
    for (const [r, amp, tau] of [[1, 1, 0.9], [1.504, 0.5, 0.55], [1.742, 0.3, 0.45], [2.0, 0.22, 0.35], [2.245, 0.12, 0.3]]) {
      const o = osc('sine', f * r, t, t + tau * 8 + 0.1);
      o.frequency.setValueAtTime(f * r * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * r, t + 0.08);
      const a = gain(0); envAD(a.gain, t, amp * v, 0.002, tau); o.connect(a); a.connect(sum);
    }
    const n = noise(t, 0.1), lp = biq('lowpass', 900), ng = gain(0); envAD(ng.gain, t, 0.3 * v, 0.001, 0.012);
    n.connect(lp); lp.connect(ng); ng.connect(sum);
    route(sum, drums, rev, 0, -0.12);
  }
  function timpRoll(t0, t1, midi, v0, v1) {
    for (let t = t0; t < t1 - 1e-6; t += 0.0625) {
      const k = (t - t0) / (t1 - t0);
      timpani(t, midi, (v0 + (v1 - v0) * k * k) * (0.85 + 0.15 * rnd()), 0.35);
    }
  }
  function snareRoll(t0, t1, v0, v1) {
    // sixteenths that become thirty-seconds in the second half
    let t = t0;
    while (t < t1 - 1e-6) {
      const k = (t - t0) / (t1 - t0);
      snare(t, (v0 + (v1 - v0) * k * k) * (0.9 + 0.1 * rnd()), 0.18);
      t += k < 0.5 ? 0.125 : 0.0625;
    }
  }

  function crash(t, v = 0.3, dur = 2.5) {
    for (const p of [-0.5, 0.5]) {
      const n = noise(t, dur + 0.1), hp = biq('highpass', 3200, 0.7), pk = biq('peaking', 7000, 0.8, 3), lp = biq('lowpass', 12500), a = gain(0);
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.003);
      a.gain.setTargetAtTime(v * 0.45, t + 0.003, 0.08); a.gain.setTargetAtTime(0, t + 0.2, dur / 5);
      n.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(a);
      route(a, drums, 0.35, 0, p);
    }
  }

  // ── impacts and transitions ──────────────────────────────────────────────
  function subBoom(t, v = 0.9, dur = 2.5, f0 = 62, f1 = 29) {
    const o = osc('sine', f0, t, t + dur + 0.6);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    const a = gain(0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.006); a.gain.setTargetAtTime(0, t + 0.05, dur / 4.5);
    const sh = shaper(1.4); o.connect(a); a.connect(sh);
    route(sh, fx, 0.05, 0, 0);
  }

  const SIZES = {
    s: { sub: 0.25, dur: 0.9, slam: 0.25, crash: 0, tk: 0.5 },
    m: { sub: 0.42, dur: 1.6, slam: 0.36, crash: 0.09, tk: 0.66 },
    l: { sub: 0.68, dur: 2.4, slam: 0.55, crash: 0.17, tk: 0.9 },
    xl: { sub: 1.0, dur: 3.8, slam: 0.8, crash: 0.28, tk: 1.05 },
  };
  function impact(t, size = 'm') {
    const s = SIZES[size];
    subBoom(t, s.sub, s.dur);
    taiko(t, s.tk, 60, 0.5, 0);
    const n = noise(t, 0.6), lp = biq('lowpass', 2600, 0.7), a = gain(0);
    envAD(a.gain, t, s.slam, 0.001, 0.06);
    n.connect(lp); lp.connect(a); route(a, fx, 0.7, 0, 0);
    if (s.crash) crash(t, s.crash, s.dur);
  }
  /** Percussion accent (less sub than the impact). */
  function hit(t, size = 'm') {
    const v = size === 's' ? 0.6 : 0.85;
    taiko(t, v, 88, 0.45, 0);
    snare(t, v * 0.8, 0.3);
    subBoom(t, v * 0.35, 0.8, 70, 40);
  }

  function braam(t, midis, dur = 2.5, v = 0.4) {
    const sum = gain(1 / (midis.length * 3)), lp = biq('lowpass', 200, 1.3);
    lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 0.12); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    for (const m of midis) for (const dt of [-9, 0, 8]) { const o = osc('sawtooth', mtof(m), t, t + dur + 1.4); o.detune.value = dt; o.connect(sum); }
    const sh = shaper(2.2), a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.025);
    a.gain.setTargetAtTime(v * 0.6, t + 0.03, 0.4); a.gain.setTargetAtTime(0, t + dur - 0.3, 0.25);
    sum.connect(lp); lp.connect(sh); sh.connect(a);
    route(a, fx, 0.35, 0, 0);
  }

  function revCymbal(tEnd, len, v) {
    const t0 = tEnd - len;
    for (const p of [-0.4, 0.4]) {
      const n = noise(t0, len + 0.05), hp = biq('highpass', 4200), lp = biq('lowpass', 12000), a = gain(0);
      a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(v, tEnd - 0.005); a.gain.linearRampToValueAtTime(0, tEnd + 0.004);
      n.connect(hp); hp.connect(lp); lp.connect(a);
      route(a, fx, 0.2, 0, p);
    }
  }

  function riser(t0, t1, v = 0.45, gap = 0.05) {
    const D = t1 - t0, te = t1 - gap;
    for (const p of [-0.45, 0.45]) {
      const n = noise(t0, D + 0.1), bp = biq('bandpass', 300, 1.4), a = gain(0);
      bp.frequency.setValueAtTime(260 * (p < 0 ? 1 : 1.12), t0); bp.frequency.exponentialRampToValueAtTime(7500, te);
      a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(v * 0.6, te); a.gain.linearRampToValueAtTime(0, te + 0.012);
      n.connect(bp); bp.connect(a); route(a, fx, 0.25, 0, p);
    }
    const lp = biq('lowpass', 600, 2), a2 = gain(0);
    lp.frequency.setValueAtTime(500, t0); lp.frequency.exponentialRampToValueAtTime(5000, te);
    a2.gain.setValueAtTime(0.0001, t0); a2.gain.exponentialRampToValueAtTime(v * 0.16, te); a2.gain.linearRampToValueAtTime(0, te + 0.012);
    for (const [m, dt] of [[45, -6], [52, 6]]) {
      const o = osc('sawtooth', mtof(m), t0, te + 0.05);
      o.frequency.setValueAtTime(mtof(m), t0); o.frequency.exponentialRampToValueAtTime(mtof(m + 12), te); o.detune.value = dt;
      o.connect(lp);
    }
    lp.connect(a2); route(a2, fx, 0.3, 0, 0);
    revCymbal(te, Math.min(D, 1.6), v * 0.45);
  }

  function whoosh(tp, v = 0.35, dur = 0.7, p0 = -0.7, p1 = 0.7) {
    const t0 = tp - dur * 0.65, t1 = tp + dur * 0.35;
    const n = noise(t0, dur + 0.1), bp = biq('bandpass', 400, 2.2), lp = biq('lowpass', 7000), a = gain(0);
    bp.frequency.setValueAtTime(380, t0); bp.frequency.exponentialRampToValueAtTime(2800, tp); bp.frequency.exponentialRampToValueAtTime(600, t1);
    a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(v, tp); a.gain.exponentialRampToValueAtTime(0.0001, t1);
    const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(p0, t0); pn.pan.linearRampToValueAtTime(p1, t1);
    n.connect(bp); bp.connect(lp); lp.connect(a); a.connect(pn); pn.connect(fx); send(pn, 0.3, 0);
    const n2 = noise(t0, dur + 0.1), lp2 = biq('lowpass', 350), a3 = gain(0);
    a3.gain.setValueAtTime(0.0001, t0); a3.gain.exponentialRampToValueAtTime(v * 0.55, tp); a3.gain.exponentialRampToValueAtTime(0.0001, t1);
    n2.connect(lp2); lp2.connect(a3); route(a3, fx, 0.1, 0, 0);
  }

  function sweep(t0, t1, v = 0.16) {
    const n = noise(t0, t1 - t0 + 0.1), bp = biq('bandpass', 450, 7), bp2 = biq('bandpass', 900, 7), a = gain(0);
    bp.frequency.setValueAtTime(450, t0); bp.frequency.exponentialRampToValueAtTime(5200, t1);
    bp2.frequency.setValueAtTime(900, t0); bp2.frequency.exponentialRampToValueAtTime(10400, t1);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + 0.25); a.gain.setValueAtTime(v, t1 - 0.3); a.gain.linearRampToValueAtTime(0, t1);
    const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(-0.6, t0); pn.pan.linearRampToValueAtTime(0.6, t1);
    n.connect(bp); n.connect(bp2); bp.connect(a); bp2.connect(a); a.connect(pn); pn.connect(fx); send(pn, 0.3, 0.15);
  }

  // ── tonal ────────────────────────────────────────────────────────────────
  function bell(t, f, v = 0.2, { dur = 2.4, ratio = 3.5, index = 2.2, pan = 0, rev = 0.45, dly = 0.2, bus = music } = {}) {
    const idx = Math.min(index, 7000 / (f * ratio));
    const car = osc('sine', f, t, t + dur + 0.2), mod = osc('sine', f * ratio, t, t + dur + 0.2), mg = gain(0);
    mg.gain.setValueAtTime(f * ratio * idx, t); mg.gain.exponentialRampToValueAtTime(f * ratio * idx * 0.08, t + dur * 0.35);
    mod.connect(mg); mg.connect(car.frequency);
    const a = gain(0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.002); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(a);
    const o2 = osc('sine', f * 2.005, t, t + dur * 0.6), a2 = gain(0);
    a2.gain.setValueAtTime(0, t); a2.gain.linearRampToValueAtTime(v * 0.22, t + 0.002); a2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);
    o2.connect(a2);
    const sum = gain(1); a.connect(sum); a2.connect(sum);
    route(sum, bus, rev, dly, pan);
  }

  const ksCache = new Map();
  function pluck(t, midi, v = 0.2, { pan = 0, rev = 0.3, dly = 0.15, t60 = 1.6, bright = 0.55, bus = music, bellAmt = 0 } = {}) {
    const key = `${midi}|${t60}|${bright}`;
    if (!ksCache.has(key)) ksCache.set(key, ksBuffer(ctx, mtof(midi), mulberry32(midi * 7919 + Math.round(t60 * 100)), { t60, bright, seconds: Math.min(3.2, t60 * 1.3 + 0.3) }));
    const s = ctx.createBufferSource(); s.buffer = ksCache.get(key); s.start(t);
    const lp = biq('lowpass', 5200, 0.5), a = gain(v);
    s.connect(lp); lp.connect(a); route(a, bus, rev, dly, pan);
    if (bellAmt) bell(t, mtof(midi + 12), v * bellAmt, { dur: 1.3, ratio: 2, index: 1.2, pan, rev, dly, bus });
  }

  function pad(t0, t1, midis, v = 0.1, { attack = 0.5, release = 0.9, cutoff = 1800, rev = 0.5, spread = 0.55, open = 0, bus = music } = {}) {
    const end = t1 + release + 0.6;
    const lfo = osc('sine', 0.18, t0, end), lfoG = gain(cutoff * 0.15); lfo.connect(lfoG);
    const pk = v / Math.sqrt(midis.length);
    midis.forEach((m, i) => {
      const f = mtof(m), lp = biq('lowpass', cutoff, 0.6);
      if (open) { lp.frequency.setValueAtTime(cutoff, t0); lp.frequency.linearRampToValueAtTime(cutoff * (1 + open), t1); }
      lfoG.connect(lp.frequency);
      const sum = gain(1 / 3);
      for (const dt of [-11, 0, 9]) { const o = osc('sawtooth', f, t0, end); o.detune.value = dt + (rnd() - 0.5) * 4; o.connect(sum); }
      sum.connect(lp);
      const a = gain(0);
      a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(pk, t0 + attack); a.gain.setValueAtTime(pk, t1); a.gain.setTargetAtTime(0, t1, release / 4);
      lp.connect(a);
      const pan = midis.length > 1 ? ((i / (midis.length - 1)) * 2 - 1) * spread : 0;
      route(a, bus, rev, 0, pan);
    });
  }

  const FORM = {
    male: [[650, 1, 7], [1080, 0.55, 9], [2650, 0.25, 11]],
    female: [[800, 1, 7], [1150, 0.6, 9], [2900, 0.28, 12]],
  };
  function choir(t0, t1, midis, v = 0.12, { attack = 0.8, release = 1.2, rev = 0.6, spread = 0.6 } = {}) {
    const end = t1 + release + 0.6, pk = v / Math.sqrt(midis.length);
    midis.forEach((m, i) => {
      const f = mtof(m), form = m < 57 ? FORM.male : FORM.female, src = gain(0.5);
      const vib = osc('sine', 5.0 + rnd() * 0.5, t0, end), vibG = gain(0);
      vibG.gain.setValueAtTime(0, t0); vibG.gain.linearRampToValueAtTime(13, t0 + 0.9); vib.connect(vibG);
      for (const dt of [-7, 7]) { const o = osc('sawtooth', f, t0, end); o.detune.value = dt; vibG.connect(o.detune); o.connect(src); }
      const sum = gain(1);
      for (const [ff, amp, q] of form) { const bp = biq('bandpass', ff, q), g2 = gain(amp * 3.2); src.connect(bp); bp.connect(g2); g2.connect(sum); }
      const a = gain(0);
      a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(pk, t0 + attack); a.gain.setValueAtTime(pk, t1); a.gain.setTargetAtTime(0, t1, release / 4);
      sum.connect(a);
      route(a, music, rev, 0, ((i / Math.max(1, midis.length - 1)) * 2 - 1) * spread);
    });
  }

  function bass(t, midi, dur, v = 0.32, rel = 0.025) {
    const f = mtof(midi);
    const o = osc('sawtooth', f, t, t + dur + Math.max(0.25, rel * 8)), o2 = osc('sine', f, t, t + dur + Math.max(0.25, rel * 8));
    const lp = biq('lowpass', 900, 2.2);
    lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.14);
    const sg = gain(0.5), sat = shaper(1.3), a = gain(0);
    o.connect(sg); sg.connect(lp); lp.connect(sat);
    const s2 = gain(0.85); o2.connect(s2); s2.connect(sat);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.004); a.gain.setTargetAtTime(v * 0.72, t + 0.01, 0.2); a.gain.setTargetAtTime(0, t + dur, rel);
    sat.connect(a);
    route(a, bassBus, 0, 0, 0);
  }

  function brass(t, midi, dur, v = 0.2, { pan = 0, bright = 0.7, rev = 0.35, vib = true, attack = 0.03, bus = music, rel = 0.07 } = {}) {
    const f = mtof(midi), lp = biq('lowpass', 400, 1.4), top = 900 + 2600 * bright;
    lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(top, t + 0.06); lp.frequency.exponentialRampToValueAtTime(top * 0.65, t + 0.35);
    const sum = gain(0.4), end = t + dur + Math.max(0.45, rel * 7);
    const vo = osc('sine', 5.4, t, end), vg = gain(0); vo.connect(vg);
    if (vib && dur > 0.6) { vg.gain.setValueAtTime(0, t + 0.3); vg.gain.linearRampToValueAtTime(10, t + 0.8); }
    for (const [type, dt, lvl] of [['sawtooth', -6, 1], ['sawtooth', 6, 1], ['square', 0, 0.35]]) {
      const o = osc(type, f, t, end);
      o.detune.setValueAtTime(dt - 40, t); o.detune.linearRampToValueAtTime(dt, t + 0.05);
      vg.connect(o.detune);
      const og = gain(lvl); o.connect(og); og.connect(sum);
    }
    const a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + attack);
    a.gain.setTargetAtTime(v * 0.75, t + attack, 0.15); a.gain.setTargetAtTime(0, t + dur, rel);
    sum.connect(lp); lp.connect(a);
    return route(a, bus, rev, 0, pan);
  }
  function stab(t, midis, dur = 0.3, v = 0.25, opts = {}) {
    midis.forEach((m, i) => brass(t, m, dur, v / Math.sqrt(midis.length), { pan: ((i / Math.max(1, midis.length - 1)) * 2 - 1) * 0.42, vib: false, rev: 0.4, ...opts }));
  }
  /** Brass chord chopped into thirty-second notes (the montage stutter). */
  function stutter(t, midis, v = 0.28, dur = 0.25) {
    const gate = gain(0);
    midis.forEach((m, i) => brass(t, m, dur + 0.05, v / Math.sqrt(midis.length), { bus: gate, rev: 0, vib: false, pan: ((i / Math.max(1, midis.length - 1)) * 2 - 1) * 0.3 }));
    for (let k = 0; k < Math.round(dur / 0.0625); k++) {
      const a = t + k * 0.0625;
      gate.gain.setValueAtTime(0, a); gate.gain.linearRampToValueAtTime(1, a + 0.001);
      gate.gain.setValueAtTime(1, a + 0.034); gate.gain.linearRampToValueAtTime(0, a + 0.037);
    }
    route(gate, fx, 0.3, 0.1, 0);
  }

  // ── foley / sound design ─────────────────────────────────────────────────
  function key(t, v = 0.3, { pitch = 1, space = false, pan = 0 } = {}) {
    const sum = gain(1);
    const n = noise(t, 0.03), bp = biq('bandpass', 3400 * pitch, 1.3), a = gain(0);
    envAD(a.gain, t, 0.55 * v, 0.0004, 0.0028); n.connect(bp); bp.connect(a); a.connect(sum);
    const o = osc('sine', (space ? 150 : 215) * pitch, t, t + 0.16);
    o.frequency.setValueAtTime((space ? 170 : 240) * pitch, t); o.frequency.exponentialRampToValueAtTime((space ? 118 : 178) * pitch, t + 0.03);
    const og = gain(0); envAD(og.gain, t, (space ? 0.45 : 0.32) * v, 0.0008, space ? 0.03 : 0.017); o.connect(og); og.connect(sum);
    const hi = osc('sine', 6800 * pitch, t, t + 0.02), hg = gain(0); envAD(hg.gain, t, 0.05 * v, 0.0003, 0.0015); hi.connect(hg); hg.connect(sum);
    const tb = t + 0.009 + rnd() * 0.004;
    const n2 = noise(tb, 0.02), bp2 = biq('bandpass', 1500 * pitch, 1.5), a2 = gain(0);
    envAD(a2.gain, tb, 0.22 * v, 0.0004, 0.004); n2.connect(bp2); bp2.connect(a2); a2.connect(sum);
    route(sum, sfx, 0.1, 0, pan);
  }
  function enterKey(t) {
    key(t, 0.6, { pitch: 0.78, space: true, pan: 0.04 });
    const o = osc('sine', 95, t, t + 1.3);
    o.frequency.setValueAtTime(112, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.5);
    const a = gain(0); envAD(a.gain, t, 0.45, 0.004, 0.22); o.connect(a); route(a, fx, 0.25, 0, 0);
    const n = noise(t, 1.3, true), hp = biq('highpass', 2500), ng = gain(0);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.1, t + 0.02); ng.gain.setTargetAtTime(0, t + 0.03, 0.25);
    n.connect(hp); hp.connect(ng); route(ng, fx, 0.4, 0.2, 0);
  }
  function tick(t, v = 0.15, hi = true) {
    const sum = gain(1);
    const o = osc('sine', hi ? 1950 : 1480, t, t + 0.08), a = gain(0); envAD(a.gain, t, v, 0.0005, 0.011); o.connect(a); a.connect(sum);
    const n = noise(t, 0.02), bp = biq('bandpass', 2600, 2), ng = gain(0); envAD(ng.gain, t, v * 0.6, 0.0003, 0.003); n.connect(bp); bp.connect(ng); ng.connect(sum);
    route(sum, sfx, 0.25, 0.05, hi ? 0.25 : -0.25);
  }
  function thump(t, v = 0.25) {
    const sum = gain(1);
    const o = osc('sine', 160, t, t + 0.25); o.frequency.setValueAtTime(175, t); o.frequency.exponentialRampToValueAtTime(105, t + 0.05);
    const a = gain(0); envAD(a.gain, t, v, 0.001, 0.03); o.connect(a); a.connect(sum);
    const n = noise(t, 0.05), lp = biq('lowpass', 900), ng = gain(0); envAD(ng.gain, t, v * 0.5, 0.0005, 0.006); n.connect(lp); lp.connect(ng); ng.connect(sum);
    route(sum, sfx, 0.2, 0, 0);
  }

  const MED = {
    bronze: { f: 470, ratio: 1.41, tau: 0.16, pan: 0.35, thud: 0.4 },
    silver: { f: 830, ratio: 1.73, tau: 0.28, pan: -0.35, thud: 0.4 },
    gold: { f: 640, ratio: 1.41, tau: 0.38, pan: 0, thud: 0.6 },
  };
  function metal(t, kind = 'gold', v = 0.5) {
    const m = MED[kind];
    const one = (tt, amp) => {
      const sum = gain(1);
      const car = osc('sine', m.f, tt, tt + m.tau * 6), mod = osc('sine', m.f * m.ratio, tt, tt + m.tau * 6), mg = gain(0);
      mg.gain.setValueAtTime(m.f * m.ratio * 3.2, tt); mg.gain.exponentialRampToValueAtTime(m.f * m.ratio * 0.2, tt + m.tau * 0.8);
      mod.connect(mg); mg.connect(car.frequency);
      const a = gain(0); envAD(a.gain, tt, amp, 0.0008, m.tau); car.connect(a); a.connect(sum);
      for (const [r, am, tf] of [[2.76, 0.35, 0.45], [5.4, 0.18, 0.25], [8.93, 0.08, 0.15]]) {
        const o = osc('sine', m.f * r, tt, tt + m.tau * 4), g2 = gain(0); envAD(g2.gain, tt, amp * am, 0.0005, m.tau * tf); o.connect(g2); g2.connect(sum);
      }
      const n = noise(tt, 0.05), hp = biq('highpass', 2600), ng = gain(0); envAD(ng.gain, tt, amp * 0.5, 0.0003, 0.005); n.connect(hp); hp.connect(ng); ng.connect(sum);
      const th = osc('sine', 150, tt, tt + 0.4); th.frequency.setValueAtTime(170, tt); th.frequency.exponentialRampToValueAtTime(95, tt + 0.06);
      const tg = gain(0); envAD(tg.gain, tt, amp * m.thud, 0.001, 0.045); th.connect(tg); tg.connect(sum);
      route(sum, fx, 0.3, 0.08, m.pan);
    };
    one(t, v); one(t + 0.085, v * 0.32); one(t + 0.14, v * 0.14); one(t + 0.18, v * 0.06);
  }

  function stamp(t, v = 0.8) {
    const sum = gain(1);
    const o = osc('sine', 90, t, t + 0.6); o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
    const a = gain(0); envAD(a.gain, t, 0.9 * v, 0.001, 0.08); o.connect(a); a.connect(sum);
    const n = noise(t, 0.3), lp = biq('lowpass', 420, 0.8), ng = gain(0); envAD(ng.gain, t, 0.8 * v, 0.0008, 0.028); n.connect(lp); lp.connect(ng); ng.connect(sum);
    const n2 = noise(t + 0.012, 0.3), bp = biq('bandpass', 700, 2), g2 = gain(0); envAD(g2.gain, t + 0.012, 0.22 * v, 0.004, 0.06); n2.connect(bp); bp.connect(g2); g2.connect(sum);
    route(sum, sfx, 0.18, 0, 0);
    subBoom(t, 0.3 * v, 0.8, 58, 34);
  }

  function crack(t, v = 0.6) {
    const sum = gain(1);
    for (const [d, amp] of [[0, 1], [0.0042, 0.55], [0.0093, 0.4], [0.0131, 0.3], [0.0214, 0.22], [0.0302, 0.15], [0.0418, 0.1]]) {
      const tt = t + d + (d ? (rnd() - 0.5) * 0.0015 : 0);
      const n = noise(tt, 0.02), bp = biq('bandpass', 2000 + rnd() * 3500, 1.8), g2 = gain(0);
      envAD(g2.gain, tt, amp * v, 0.0002, 0.0016); n.connect(bp); bp.connect(g2); g2.connect(sum);
    }
    const o = osc('sine', 2400, t, t + 0.05), og = gain(0); envAD(og.gain, t, 0.15 * v, 0.0003, 0.005); o.connect(og); og.connect(sum);
    const hp = biq('highpass', 900); sum.connect(hp);
    route(hp, sfx, 0.08, 0, -0.05);
  }

  function paper(t0, t1, v = 0.32) {
    const D = t1 - t0, steps = Math.ceil(D * 200), curve = new Float32Array(steps), c2 = new Float32Array(steps);
    let sm = 0;
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1), shape = Math.sin(Math.PI * Math.pow(x, 0.8));
      sm += 0.25 * (rnd() - sm);
      curve[i] = v * shape * (0.45 + 0.9 * sm);
      c2[i] = curve[i] * 0.35 * (rnd() < 0.3 ? 1.6 : 0.6);
    }
    curve[0] = 0; curve[steps - 1] = 0; c2[0] = 0; c2[steps - 1] = 0;
    const n = noise(t0, D + 0.1, true), bp = biq('bandpass', 2600, 0.7), hp = biq('highpass', 700), a = gain(0);
    a.gain.setValueCurveAtTime(curve, t0, D);
    n.connect(bp); bp.connect(hp); hp.connect(a);
    const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(0.25, t0); pn.pan.linearRampToValueAtTime(-0.15, t1);
    a.connect(pn); pn.connect(sfx); send(pn, 0.12, 0);
    const n2 = noise(t0, D + 0.1), bp2 = biq('bandpass', 5200, 1.2), a2 = gain(0);
    a2.gain.setValueCurveAtTime(c2, t0, D);
    n2.connect(bp2); bp2.connect(a2); route(a2, sfx, 0.08, 0, 0.1);
    whoosh(t1 - 0.25, v * 0.35, 0.5, -0.2, 0.35);
  }

  function chime(t, v = 0.3) {
    bell(t, mtof(86), v, { dur: 3.6, ratio: 3.5, index: 1.2, pan: -0.1, rev: 0.55, dly: 0.3, bus: fx });
    bell(t + 0.004, mtof(93), v * 0.45, { dur: 2.8, ratio: 2.0, index: 0.9, pan: 0.2, rev: 0.55, dly: 0.3, bus: fx });
    bell(t, mtof(74), v * 0.5, { dur: 3.2, ratio: 1.0, index: 1.5, pan: 0, rev: 0.5, dly: 0.2, bus: fx });
  }

  function shimmer(t0, t1, n = 40, v = 0.12) {
    const pool = [86, 89, 91, 93, 96, 98, 101];
    for (let i = 0; i < n; i++) {
      const x = Math.pow(rnd(), 1.6), t = t0 + x * (t1 - t0);
      bell(t, mtof(pool[Math.floor(rnd() * pool.length)]), v * (0.4 + 0.6 * rnd()) * (1 - 0.6 * x),
        { dur: 0.5 + rnd() * 0.9, ratio: 2 + Math.floor(rnd() * 3) * 0.5, index: 0.8 + rnd(), pan: (rnd() * 2 - 1) * 0.8, rev: 0.5, dly: 0.25, bus: fx });
    }
    const nz = noise(t0, (t1 - t0) * 3, false), hp = biq('highpass', 6000), a = gain(0);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v * 0.45, t0 + 0.15); a.gain.setTargetAtTime(0, t0 + 0.2, (t1 - t0) / 3);
    nz.connect(hp); hp.connect(a); route(a, fx, 0.4, 0, 0);
  }

  function drone(t0, t1, v = 0.22) {
    const sum = gain(1), lp = biq('lowpass', 320, 0.7);
    for (const [m, type, lvl] of [[26, 'sine', 0.35], [38, 'triangle', 0.55], [45, 'sawtooth', 0.16], [50, 'sawtooth', 0.09]]) {
      const o = osc(type, mtof(m), t0, t1 + 0.2); o.detune.value = (rnd() - 0.5) * 6;
      const og = gain(lvl); o.connect(og); og.connect(sum);
    }
    lp.frequency.setValueAtTime(220, t0); lp.frequency.linearRampToValueAtTime(700, t1);
    const a = gain(0);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + 2.0); a.gain.setValueAtTime(v, t1 - 0.06); a.gain.linearRampToValueAtTime(0, t1);
    sum.connect(lp); lp.connect(a); route(a, fx, 0.2, 0, 0);
  }
  function air(t0, t1, v = 0.05) {
    const n = noise(t0, t1 - t0 + 0.1, true), lp = biq('lowpass', 900), hp = biq('highpass', 90), a = gain(0);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + 1.5); a.gain.linearRampToValueAtTime(v * 1.8, t1 - 0.1); a.gain.linearRampToValueAtTime(0, t1);
    n.connect(lp); lp.connect(hp); hp.connect(a); route(a, fx, 0.3, 0, 0);
  }

  // ── editorial: the electric piano, the light percussion and the UI foley (marker, strike, Tab, click) ─────
  /** FM electric piano (DX7-style Rhodes): 1:1 carrier with a falling index (the "bark" of the attack) and the 14:1 tine. */
  function ep(t, midi, dur = 1.0, v = 0.16, { pan = 0, rev = 0.28, dly = 0.1, bright = 1, bus = music } = {}) {
    const f = mtof(midi), end = t + dur + 1.4;
    const car = osc('sine', f, t, end), mod = osc('sine', f, t, end), mg = gain(0);
    const I = f * (1.6 + 1.8 * bright) * (0.8 + 2.0 * v);
    mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(f * (0.35 + 0.3 * bright), t + 0.002, 0.22);
    mod.connect(mg); mg.connect(car.frequency);
    const car2 = osc('sine', f * 1.0035, t, end), a2 = gain(0);   // second, slightly detuned voice: natural chorus
    a2.gain.setValueAtTime(0, t); a2.gain.linearRampToValueAtTime(v * 0.35, t + 0.006); a2.gain.setTargetAtTime(v * 0.18, t + 0.01, 0.5); a2.gain.setTargetAtTime(0, t + dur, 0.2);
    car2.connect(a2);
    const tine = osc('sine', f * 14.03, t, t + 0.25), tg = gain(0); envAD(tg.gain, t, v * 0.12 * bright, 0.0008, 0.022); tine.connect(tg);
    const a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.003); a.gain.setTargetAtTime(v * 0.5, t + 0.004, 0.42); a.gain.setTargetAtTime(0, t + dur, 0.2);
    car.connect(a);
    const sum = gain(1); a.connect(sum); a2.connect(sum); tg.connect(sum);
    const trem = osc('sine', 4.6, t, end), tr = gain(0.12), tb = gain(0.88);
    trem.connect(tr); tr.connect(tb.gain); sum.connect(tb);
    route(tb, bus, rev, dly, pan);
  }
  /** Electric piano chord with a short strum (10 ms per note, low → high). */
  function epChord(t, midis, dur = 1.6, v = 0.12, o = {}) { midis.forEach((m, i) => ep(t + i * (o.strum ?? 0.01), m, dur, v * (1 - i * 0.06), { ...o, pan: (o.pan ?? 0) + (i - (midis.length - 1) / 2) * 0.18 })); }

  function clap(t, v = 0.45, rev = 0.22) {
    const n = noise(t, 0.45), bp = biq('bandpass', 1250, 1.1), hp = biq('highpass', 650), g = gain(0);
    g.gain.setValueAtTime(0, t);
    for (const d of [0, 0.01, 0.021]) { g.gain.setValueAtTime(v, t + d); g.gain.setTargetAtTime(0, t + d + 0.0008, 0.0035); }
    g.gain.setValueAtTime(v * 0.85, t + 0.032); g.gain.setTargetAtTime(0, t + 0.033, 0.075);
    n.connect(bp); bp.connect(hp); hp.connect(g);
    route(g, drums, rev, 0, 0.03);
  }
  function rim(t, v = 0.25, pan = -0.12) {
    const o = osc('triangle', 1650, t, t + 0.06), a = gain(0); envAD(a.gain, t, v, 0.0004, 0.008); o.connect(a);
    const n = noise(t, 0.03), bp = biq('bandpass', 3200, 2), ng = gain(0); envAD(ng.gain, t, v * 0.6, 0.0003, 0.004); n.connect(bp); bp.connect(ng);
    const sum = gain(1); a.connect(sum); ng.connect(sum); route(sum, drums, 0.12, 0, pan);
  }
  function shaker(t, v = 0.05, pan = 0.22) {
    const n = noise(t, 0.09), hp = biq('highpass', 6500), a = gain(0);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.012); a.gain.setTargetAtTime(0, t + 0.014, 0.018);
    n.connect(hp); hp.connect(a); route(a, drums, 0.05, 0, pan);
  }
  /** A felt marker on paper: band-limited friction that rises with the stroke and a short squeak with vibrato. */
  function marker(t0, t1, v = 0.34) {
    const D = Math.max(0.12, t1 - t0);
    t1 = t0 + D;
    const n = noise(t0, D + 0.06, true), bp = biq('bandpass', 2300, 1.2), hp = biq('highpass', 900), a = gain(0);
    bp.frequency.setValueAtTime(2100, t0); bp.frequency.linearRampToValueAtTime(3500, t1);
    a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + 0.025); a.gain.linearRampToValueAtTime(v * 0.8, t1 - 0.03); a.gain.linearRampToValueAtTime(0, t1 + 0.02);
    const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(-0.25, t0); pn.pan.linearRampToValueAtTime(0.25, t1);
    n.connect(bp); bp.connect(hp); hp.connect(a); a.connect(pn); pn.connect(sfx); send(pn, 0.06, 0);
    const s = osc('sine', 1350, t0, t1 + 0.05), sg = gain(0), vib = osc('sine', 31, t0, t1 + 0.05), vg = gain(55);
    s.frequency.setValueAtTime(1300, t0); s.frequency.linearRampToValueAtTime(1720, t1);
    vib.connect(vg); vg.connect(s.frequency);
    sg.gain.setValueAtTime(0, t0); sg.gain.linearRampToValueAtTime(v * 0.1, t0 + 0.04); sg.gain.linearRampToValueAtTime(0, t1);
    s.connect(sg); route(sg, sfx, 0.05, 0, 0);
  }
  /** A pen striking through a line (del): a quick scrape rising in pitch and a tap at the end. */
  function strike(t, v = 0.3, dur = 0.22) {
    const n = noise(t, dur + 0.05), bp = biq('bandpass', 1500, 1.6), a = gain(0);
    bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(4200, t + dur);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.015); a.gain.setTargetAtTime(v * 0.6, t + 0.02, 0.08); a.gain.linearRampToValueAtTime(0, t + dur);
    const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(-0.3, t); pn.pan.linearRampToValueAtTime(0.3, t + dur);
    n.connect(bp); bp.connect(a); a.connect(pn); pn.connect(sfx); send(pn, 0.05, 0);
    tick(t + dur - 0.01, v * 0.35, false);
  }
  /** Tab: the large key (lower than the letters) and a short thud. */
  function tabKey(t, v = 0.75) { key(t, v, { pitch: 0.8, space: true, pan: 0.05 }); thump(t + 0.004, 0.18); }
  /** Interface pop (a card appears): a rising sine and a tiny click. */
  function pop(t, v = 0.16, f = 620) {
    const o = osc('sine', f, t, t + 0.12); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
    const a = gain(0); envAD(a.gain, t, v, 0.001, 0.028); o.connect(a); route(a, sfx, 0.18, 0.05, 0);
  }
  /** Mouse click (press and release). */
  function click(t, v = 0.3) {
    for (const [d, f] of [[0, 3100], [0.055, 3800]]) { const n = noise(t + d, 0.02), bp = biq('bandpass', f, 3), a = gain(0); envAD(a.gain, t + d, v * (d ? 0.6 : 1), 0.0003, 0.0025); n.connect(bp); bp.connect(a); route(a, sfx, 0.06, 0, 0.1); }
  }
  /** Undo: a reversed swell that ends on a click. */
  function undo(t, v = 0.28, dur = 0.42) {
    const t0 = t - dur, n = noise(t0, dur + 0.05), bp = biq('bandpass', 3000, 1.4), a = gain(0);
    bp.frequency.setValueAtTime(3600, t0); bp.frequency.exponentialRampToValueAtTime(700, t);
    a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(v, t - 0.01); a.gain.linearRampToValueAtTime(0, t + 0.01);
    n.connect(bp); bp.connect(a); route(a, fx, 0.25, 0, -0.15);
    tick(t, v * 0.5, true);
  }
  /** Crumpled paper: short crackles in random bands (density falls off toward the end). */
  function crumple(t0, t1, v = 0.3, rate = 70) {
    const N = Math.round((t1 - t0) * rate);
    for (let i = 0; i < N; i++) {
      const x = rnd(), t = t0 + Math.pow(x, 1.25) * (t1 - t0), f = 900 + rnd() * 4800;
      const n = noise(t, 0.03), bp = biq('bandpass', f, 1.8), a = gain(0);
      envAD(a.gain, t, v * (0.3 + 0.7 * rnd()) * (1 - 0.5 * x), 0.0004, 0.003 + rnd() * 0.01);
      n.connect(bp); bp.connect(a); route(a, sfx, 0.08, 0, (rnd() - 0.5) * 0.7);
    }
  }
  /** Character-by-character check: tiny ticks at a fixed rate. */
  function scan(t0, t1, v = 0.05, rate = 22) { for (let t = t0; t < t1; t += 1 / rate) tick(t, v, true); }
  /** The score's motif: C–F–A rising (a 4th then a 3rd in F major) on a soft bell. minor: D–F–A. */
  function motif(t, { v = 0.16, minor = false, transpose = 0 } = {}) {
    (minor ? [74, 77, 81] : [72, 77, 81]).forEach((m, i) => bell(t + i * 0.125, mtof(m + transpose), v * (i === 2 ? 1.15 : 0.9), { dur: i === 2 ? 2.2 : 1.1, ratio: 3.5, index: 1.1, pan: (i - 1) * 0.2, rev: 0.5, dly: 0.22, bus: fx }));
  }
  /** Cut (the editorial montage accent): dry kick, snap and a short sub, no taiko, no braam. */
  function cut(t, size = 's') {
    const k = size === 'm' ? 1 : 0.75;
    kick(t, 0.9 * k);
    const n = noise(t, 0.25), bp = biq('bandpass', 2200, 0.8), a = gain(0); envAD(a.gain, t, 0.22 * k, 0.0006, 0.03);
    n.connect(bp); bp.connect(a); route(a, fx, 0.35, 0, 0);
    subBoom(t, 0.3 * k, size === 'm' ? 1.1 : 0.7, 70, 38);
  }

  /** Final master fade (only in the last moments). */
  function fadeOut(t0, t1) { out.gain.setValueAtTime(1, t0); out.gain.linearRampToValueAtTime(0, t1); }

  return {
    rnd, kick, snare, hat, taiko, timpani, timpRoll, snareRoll, crash, subBoom, impact, hit, braam, revCymbal, riser, whoosh, sweep,
    bell, pluck, pad, choir, bass, brass, stab, stutter, key, enterKey, tick, thump, metal, stamp, crack, paper, chime, shimmer,
    drone, air, fadeOut, scheduleDucks, ep, epChord, clap, rim, shaker, marker, strike, tabKey, pop, click, undo, crumple, scan, motif, cut,
    // Internals, for the doodle/anime arrangements (styles.js) and the character foley (foley.js). Read-only:
    // exposing them creates no node and consumes no PRNG, so the editorial score stays sample-identical.
    _: { ctx, gain, biq, osc, envAD, shaper, route, send, music, bassBus, drums, fx, sfx, white, pinkN, kicks },
  };
}
