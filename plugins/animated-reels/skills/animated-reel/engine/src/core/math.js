// Everything here is a pure function of time: the render can jump to any t and get the same result.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
/** Progress 0→1 of t within [a, b]. */
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export const deg = d => (d * Math.PI) / 180;

export const E = {
  linear: x => x,
  inQuad: x => x * x,
  outQuad: x => 1 - (1 - x) * (1 - x),
  inOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: x => 1 - Math.pow(1 - x, 4),
  inOutQuart: x => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outQuint: x => 1 - Math.pow(1 - x, 5),
  inOutQuint: x => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outSine: x => Math.sin((x * Math.PI) / 2),
  inSine: x => 1 - Math.cos((x * Math.PI) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
  inOutBack: (x, s = 1.70158 * 1.525) =>
    x < 0.5 ? (Math.pow(2 * x, 2) * ((s + 1) * 2 * x - s)) / 2 : (Math.pow(2 * x - 2, 2) * ((s + 1) * (x * 2 - 2) + s) + 2) / 2,
};

/** Analytic damped spring: 0 → 1 with overshoot. t in seconds since the trigger. */
export function spring(t, freq = 2.2, damp = 0.32) {
  if (t <= 0) return 0;
  const w = TAU * freq, z = Math.min(damp, 0.999), wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t));
}

/**
 * Keyframes: [[t0, v0], [t1, v1, ease?], ...]. Each key's ease applies to the
 * segment that ends at it. Values may be numbers or arrays of numbers.
 */
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = E.inOutCubic] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = ease(t1 === t0 ? 1 : (t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], p)) : lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}
export function fbm1(x, oct = 3) {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise1(x + i * 17.13); n += a; x *= 2.03; a *= 0.5; }
  return s / n;
}
/** Camera shake: an [x, y] vector in [-1, 1] that decays from t0. */
export function shake(t, t0, dur = 0.5, freq = 18) {
  const k = clamp(1 - (t - t0) / dur);
  if (t < t0 || k <= 0) return [0, 0];
  const a = k * k;
  return [noise1((t - t0) * freq) * a, noise1((t - t0) * freq + 91.7) * a];
}

/** Musical time (120 BPM): beat and bar in seconds. */
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
