// DSP building blocks generated in JS (deterministic): noise, the hall impulse
// response and plucked strings (Karplus-Strong). No Math.random.

export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/** White or pink noise (Paul Kellet's filter), decorrelated stereo. */
export function noiseBuffer(ctx, seconds, rnd, pink = false) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    if (!pink) { for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1; continue; }
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

/**
 * Synthetic hall: pre-delay, sparse early reflections and a diffuse tail with
 * exponential decay (RT60), the highs dying out before the lows.
 */
export function hallIR(ctx, rnd, { seconds = 3.4, rt60 = 2.9, predelay = 0.024, damp = 0.55 } = {}) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds), pre = Math.floor(sr * predelay);
  const buf = ctx.createBuffer(2, len, sr);
  const er = [0.0, 0.0071, 0.0113, 0.0167, 0.0229, 0.0311, 0.0409, 0.0523];
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    er.forEach((e, k) => {
      const i = pre + Math.floor((e + (c ? 0.0019 * k : 0.0007 * k)) * sr);
      if (i < len) d[i] += (rnd() < 0.5 ? -1 : 1) * 0.5 * Math.pow(0.78, k);
    });
    let lp = 0, lp2 = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const amp = Math.exp((-6.9078 * t) / rt60);
      const a = 0.72 * Math.exp(-t * damp * 2.4) + 0.06;
      lp += a * (rnd() * 2 - 1 - lp);
      lp2 += 0.5 * (lp - lp2);
      const build = Math.min(1, t / 0.035);
      d[i] += lp2 * amp * build * 1.6;
    }
    const fade = Math.floor(0.08 * sr);
    for (let i = len - fade; i < len; i++) d[i] *= (len - i) / fade;
  }
  return buf;
}

/**
 * Karplus-Strong plucked string with fractional tuning (allpass):
 * sounds somewhere between harp and harpsichord, the "golden pluck" of the score.
 */
export function ksBuffer(ctx, freq, rnd, { t60 = 1.8, bright = 0.55, seconds = 2.6 } = {}) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr), out = buf.getChannelData(0);
  const P = sr / freq;
  const N = Math.max(2, Math.floor(P - 0.5));
  const frac = P - 0.5 - N;
  const C = (1 - frac) / (1 + frac);
  const g = Math.pow(10, (-3 * P) / (sr * t60));
  const dl = new Float32Array(N);
  let lp = 0, mean = 0;
  for (let i = 0; i < N; i++) { lp += bright * (rnd() * 2 - 1 - lp); dl[i] = lp; mean += lp; }
  mean /= N;
  for (let i = 0; i < N; i++) dl[i] -= mean;
  let idx = 0, prev = 0, apx = 0, apy = 0, pk = 0;
  for (let n = 0; n < len; n++) {
    const s0 = dl[idx];
    const avg = 0.5 * (s0 + prev); prev = s0;
    const ap = C * avg + apx - C * apy; apx = avg; apy = ap;
    dl[idx] = ap * g;
    if (++idx >= N) idx = 0;
    out[n] = s0;
    const a = Math.abs(s0); if (a > pk) pk = a;
  }
  const fade = Math.floor(0.06 * sr);
  for (let n = 0; n < len; n++) { out[n] /= pk || 1; if (n > len - fade) out[n] *= (len - n) / fade; }
  return buf;
}

/** Soft saturation curve (tanh) for a WaveShaper. */
export function tanhCurve(drive = 1.5, n = 2048) {
  const c = new Float32Array(n), k = Math.tanh(drive);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(drive * x) / k; }
  return c;
}
