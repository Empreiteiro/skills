// Character foley: pen scribbling, cartoon swish, squash-and-stretch boing, ice in a glass,
// liquid being poured, bicycle bell and page turn.
// All synthesized here (noise, sines, filters), no third-party samples. Each event has its OWN PRNG,
// seeded by the score's seed, the CUE's time and its type: the same CUE sounds identical on every render and
// does not disturb the randomness of anything else (not the synth, not the other CUES). Everything goes to the sfx bus.
// Level: at the default v (0.3) each one lands in the range of the synth's foley (paper −20.8 · tab −22.8 · strike −23.7 ·
// marker −24.7 · crumple −25.8 LUFS momentary, rendered without music). Measured: scribble −23.5 · swish −24.1 ·
// boing −22.0 · clink −22.4 · pour −24.9 · bikebell −21.0 · page −23.6. CAL is what brings the reel's v to that
// level; for louder or quieter, change the CUE's v, not this table.
const CAL = { scribble: 0.27, swish: 2.26, boing: 1.35, clink: 0.53, pour: 0.79, bikebell: 0.365, page: 2.66 };
import { mulberry32, mtof } from './dsp.js';

export function createFoley(s, seed = 3107) {
  const { ctx, gain, biq, osc, envAD, route, send, sfx, white, pinkN } = s._;
  const R = (t, salt) => mulberry32(((seed * 2654435761) ^ (Math.round(t * 1000) * 40503) ^ (salt * 97531)) >>> 0);
  const noise = (r, t, dur, pink = false) => {
    const b = pink ? pinkN : white, n = ctx.createBufferSource();
    n.buffer = b; n.loop = true; n.start(t, r() * (b.duration - 0.05)); n.stop(t + dur);
    return n;
  };
  /** Short click of filtered noise, summed into `dest`. */
  function tick(r, t, v, f = 4800, q = 2, tau = 0.0007, dest) {
    const n = noise(r, t, 0.03), bp = biq('bandpass', f, q), g = gain(0);
    envAD(g.gain, t, v, 0.0002, tau); n.connect(bp); bp.connect(g); g.connect(dest);
  }
  /** Bubble: a sine that rises in pitch as it dies (the "blip" of water). */
  function bubble(t, f0, amp, dest) {
    const o = osc('sine', f0, t, t + 0.1);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.06);
    const g = gain(0); envAD(g.gain, t, amp, 0.0015, 0.016); o.connect(g); g.connect(dest);
  }

  /** Pen scribbling on paper from t to t+dur: back-and-forth strokes (8 to 12 per second), friction that follows
   *  the stroke's speed, paper grain, the body of the pad and a tiny click at each turn. t = the tip touches the paper
   *  (already moving: the first stroke starts mid-gesture, so the attack lands on t). */
  function scribble(t, dur = 0.8, v = 0.3, pan = 0) {
    dur = Math.max(0.15, dur); v *= CAL.scribble;
    const r = R(t, 1), N = Math.max(8, Math.round(dur * 1000));
    const strokes = [];
    for (let x = 0; x < dur - 0.01;) { const d = 0.075 + 0.055 * r(); strokes.push([x, Math.min(d, dur - x), 0.7 + 0.5 * r()]); x += d; }
    const amp = new Float32Array(N), fq = new Float32Array(N), pn = new Float32Array(N);
    let k = 0, sm = 0.5;
    for (let i = 0; i < N; i++) {
      const tt = (i / (N - 1)) * dur;
      while (k < strokes.length - 1 && tt >= strokes[k + 1][0]) k++;
      const [s0, d, g] = strokes[k], p0 = k ? 0 : 0.3, ph = p0 + (1 - p0) * Math.min(1, Math.max(0, (tt - s0) / d)), vel = Math.pow(Math.sin(Math.PI * ph), 0.7);
      sm += 0.35 * (r() - sm);
      const edge = Math.max(0, Math.min(1, tt / 0.004, (dur - tt) / 0.03));
      amp[i] = v * g * (0.15 + 0.85 * vel) * (0.7 + 0.6 * sm) * edge;
      fq[i] = 2300 + 2100 * vel;
      pn[i] = Math.max(-1, Math.min(1, pan + (k % 2 ? 0.09 : -0.09) * vel));
    }
    amp[0] = 0; amp[N - 1] = 0;
    const sum = gain(1);
    const n = noise(r, t, dur + 0.05), hp = biq('highpass', 1500, 0.7), bp = biq('bandpass', 3000, 0.9), a = gain(0);
    bp.frequency.setValueCurveAtTime(fq, t, dur); a.gain.setValueCurveAtTime(amp, t, dur);
    n.connect(hp); hp.connect(bp); bp.connect(a); a.connect(sum);
    const n2 = noise(r, t, dur + 0.05), bp2 = biq('bandpass', 6800, 1.4), a2 = gain(0);
    a2.gain.setValueCurveAtTime(amp.map(x => x * 0.5), t, dur); n2.connect(bp2); bp2.connect(a2); a2.connect(sum);
    const n3 = noise(r, t, dur + 0.05, true), lp = biq('lowpass', 700, 0.7), hp3 = biq('highpass', 180), a3 = gain(0);
    a3.gain.setValueCurveAtTime(amp.map(x => x * 0.55), t, dur); n3.connect(lp); lp.connect(hp3); hp3.connect(a3); a3.connect(sum);
    strokes.forEach(([s0], j) => tick(r, t + s0, v * (j ? 0.3 : 0.9), j ? 4800 : 2600, j ? 2 : 1.2, j ? 0.0007 : 0.002, sum));
    const p = ctx.createStereoPanner(); p.pan.setValueCurveAtTime(pn, t, dur);
    sum.connect(p); p.connect(sfx); send(p, 0.06, 0);
  }

  /** Cartoon swish: a short narrow-band breath that rises and falls, peaking at t (the middle of the
   *  gesture). dir 1 goes left to right, −1 the opposite way (default: picked by the seed). */
  function swish(t, v = 0.3, dur = 0.26, dir = null) {
    v *= CAL.swish;
    const r = R(t, 2), t0 = Math.max(0, t - dur * 0.62), t1 = t + dur * 0.38, sg = dir ?? (r() < 0.5 ? -1 : 1);
    const sum = gain(1);
    for (const [k, q, lvl] of [[1, 3.2, 1], [2.1, 6, 0.45]]) {
      const n = noise(r, t0, t1 - t0 + 0.05), bp = biq('bandpass', 700 * k, q), a = gain(0);
      bp.frequency.setValueAtTime(650 * k, t0); bp.frequency.exponentialRampToValueAtTime(3300 * k, t); bp.frequency.exponentialRampToValueAtTime(1300 * k, t1);
      a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * lvl), t); a.gain.exponentialRampToValueAtTime(0.0001, t1);
      n.connect(bp); bp.connect(a); a.connect(sum);
    }
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.55 * sg, t0); p.pan.linearRampToValueAtTime(0.55 * sg, t1);
    sum.connect(p); p.connect(sfx); send(p, 0.18, 0.04);
  }

  /** Squash-and-stretch boing: the spring of a jaw harp. A sawtooth through a resonant low-pass that
   *  wobbles at 13 Hz; the pitch jumps up on the strike and settles with a dying vibrato. midi = pitch (default F3). */
  function boing(t, v = 0.3, midi = 53) {
    v *= CAL.boing;
    const f = mtof(midi), end = t + 1.1, sum = gain(1);
    const o = osc('sawtooth', f, t, end);
    o.frequency.setValueAtTime(f * 0.62, t); o.frequency.exponentialRampToValueAtTime(f * 1.08, t + 0.035); o.frequency.exponentialRampToValueAtTime(f, t + 0.14);
    const lfo = osc('sine', 13, t, end);
    const dPitch = gain(0); dPitch.gain.setValueAtTime(0, t); dPitch.gain.linearRampToValueAtTime(70, t + 0.03); dPitch.gain.setTargetAtTime(0, t + 0.05, 0.25);
    lfo.connect(dPitch); dPitch.connect(o.detune);
    const lp = biq('lowpass', 1150, 6.5), dCut = gain(0);
    lp.frequency.setValueAtTime(1150, t); lp.frequency.setTargetAtTime(700, t + 0.1, 0.4);
    dCut.gain.setValueAtTime(850, t); dCut.gain.setTargetAtTime(120, t + 0.05, 0.3);
    lfo.connect(dCut); dCut.connect(lp.frequency);
    const a = gain(0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v * 0.5, t + 0.004); a.gain.setTargetAtTime(0, t + 0.012, 0.26);
    o.connect(lp); lp.connect(a); a.connect(sum);
    const th = osc('sine', 150, t, t + 0.2); th.frequency.setValueAtTime(170, t); th.frequency.exponentialRampToValueAtTime(90, t + 0.05);
    const tg = gain(0); envAD(tg.gain, t, v * 0.55, 0.001, 0.02); th.connect(tg); tg.connect(sum);
    route(sum, sfx, 0.16, 0.05, 0);
  }

  /** Ice in a glass: three taps (the first one strong) on inharmonic glass modes that die fast. */
  function clink(t, v = 0.3) {
    v *= CAL.clink;
    const r = R(t, 4);
    for (const [d, amp] of [[0, 1], [0.05 + 0.03 * r(), 0.45], [0.12 + 0.05 * r(), 0.24]]) {
      const tt = t + d, f = 2300 * (0.9 + 0.2 * r()), sum = gain(1);
      for (const [k, a, tau] of [[1, 1, 0.16], [2.32, 0.5, 0.09], [4.25, 0.26, 0.05], [6.63, 0.13, 0.03]]) {
        if (f * k > 18000) continue;
        const o = osc('sine', f * k, tt, tt + tau * 7 + 0.02), g = gain(0);
        envAD(g.gain, tt, v * amp * a * 0.5, 0.0003, tau); o.connect(g); g.connect(sum);
      }
      tick(r, tt, v * amp * 0.6, 5200, 1.2, 0.0006, sum);
      route(sum, sfx, 0.2, 0.05, (r() - 0.5) * 0.4);
    }
  }

  /** Liquid poured from t to t+dur: the stream (pink noise in a band that rises as the glass fills), the
   *  gurgle, bubbles rising in pitch and two drops after the stream stops. */
  function pour(t, dur = 1.2, v = 0.3) {
    dur = Math.max(0.3, dur); v *= CAL.pour;
    const r = R(t, 6), t1 = t + dur, sum = gain(1), N = Math.round(dur * 400), glug = new Float32Array(N);
    let sm = 1;
    for (let i = 0; i < N; i++) {
      sm += 0.12 * ((0.55 + 0.9 * r()) - sm);
      const x = i / (N - 1);
      glug[i] = sm * Math.max(0, Math.min(1, (x * dur) / 0.05, ((1 - x) * dur) / 0.08));
    }
    glug[0] = 0; glug[N - 1] = 0;
    const n = noise(r, t, dur + 0.1, true), bp = biq('bandpass', 420, 3.5), gl = gain(0), a = gain(v * 1.4);
    bp.frequency.setValueAtTime(420, t); bp.frequency.exponentialRampToValueAtTime(1500, t1);
    gl.gain.setValueCurveAtTime(glug, t, dur);
    n.connect(bp); bp.connect(gl); gl.connect(a); a.connect(sum);
    const n2 = noise(r, t, dur + 0.1), hp = biq('highpass', 3200), gl2 = gain(0), a2 = gain(v * 0.08);
    gl2.gain.setValueCurveAtTime(glug, t, dur);
    n2.connect(hp); hp.connect(gl2); gl2.connect(a2); a2.connect(sum);
    const nb = Math.round(dur * 42);
    for (let i = 0; i < nb; i++) {
      const x = r(), tb = t + 0.04 + x * (dur - 0.08);
      bubble(tb, (480 + 1000 * x) * (0.75 + 0.5 * r()), v * (0.05 + 0.1 * r()), sum);
    }
    bubble(t1 + 0.09 + 0.03 * r(), 1500 * (0.9 + 0.2 * r()), v * 0.14, sum);
    bubble(t1 + 0.24 + 0.05 * r(), 1700 * (0.9 + 0.2 * r()), v * 0.1, sum);
    route(sum, sfx, 0.12, 0, 0.08);
  }

  /** Bicycle bell, two rings (t and t+0.17): a metal dome on A6 with the beating between the dome's two
   *  halves, the click of the little hammer and the clack of the lever with it. */
  function bikebell(t, v = 0.3) {
    v *= CAL.bikebell;
    const r = R(t, 5);
    for (const [d, amp] of [[0, 1], [0.17, 0.82]]) {
      const tt = t + d, f = 1760 * (1 + (r() - 0.5) * 0.003), sum = gain(1);
      for (const [k, a, tau] of [[1, 1, 0.75], [1.0042, 0.75, 0.7], [2.25, 0.38, 0.28], [3.93, 0.2, 0.13], [5.87, 0.09, 0.07]]) {
        if (f * k > 18000) continue;
        const o = osc('sine', f * k, tt, tt + tau * 6 + 0.05), g = gain(0);
        envAD(g.gain, tt, v * amp * a * 0.4, 0.0004, tau); o.connect(g); g.connect(sum);
      }
      tick(r, tt, v * amp * 0.7, 6500, 0.8, 0.0005, sum);
      tick(r, tt, v * amp * 0.12, 2400, 2.5, 0.003, sum);
      route(sum, sfx, 0.25, 0.08, 0.18);
    }
  }

  /** Page turn: the hand grabs the sheet at t (tiny clicks), the sheet cuts through the air (a paper whoosh from
   *  left to right, with flutter) and lands at t+dur (a soft thud and a dry click). */
  function page(t, v = 0.3, dur = 0.45) {
    dur = Math.max(0.2, dur); v *= CAL.page;
    const r = R(t, 7), sum = gain(1), t1 = t + dur;
    for (let i = 0; i < 6; i++) tick(r, t + i * 0.0065 + r() * 0.003, v * (1 - i / 7) * (0.6 + 0.4 * r()) * 0.7, 2200 + 3000 * r(), 1.6, 0.0012 + r() * 0.0012, sum);
    const N = Math.max(8, Math.round(dur * 500)), fl = new Float32Array(N);
    let sm = 0.5;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      sm += 0.3 * (r() - sm);
      fl[i] = v * 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, x / 0.94)), 1.4) * (0.6 + 0.8 * sm);
    }
    fl[0] = 0; fl[N - 1] = 0;
    const n = noise(r, t, dur + 0.05, true), bp = biq('bandpass', 1000, 0.9), hp = biq('highpass', 500), a = gain(0);
    bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(1300, t1);
    a.gain.setValueCurveAtTime(fl, t, dur);
    n.connect(bp); bp.connect(hp); hp.connect(a);
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.35, t); p.pan.linearRampToValueAtTime(0.35, t1);
    a.connect(p); p.connect(sfx); send(p, 0.1, 0);
    const n2 = noise(r, t1, 0.2, true), lp = biq('lowpass', 650, 0.7), g2 = gain(0);
    envAD(g2.gain, t1, v * 0.7, 0.002, 0.03); n2.connect(lp); lp.connect(g2); g2.connect(sum);
    tick(r, t1 + 0.004, v * 0.35, 1800, 1.4, 0.004, sum);
    route(sum, sfx, 0.1, 0, 0.3);
  }

  return { scribble, swish, boing, clink, pour, bikebell, page };
}
