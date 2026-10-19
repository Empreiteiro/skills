// Scene camera and parallax. The camera is the transform the WORLD receives, like a group's move:
// x −60 = the scene moves 60 px to the left (the camera "goes" right), s 1.1 = zooms in 10% around the
// origin, rot in degrees. An item with depth p gets that transform scaled: translate × p, rot × p and scale s^p.
// depth 0 stays pinned to the screen (captions), 1 moves with the camera, above 1 is foreground (moves more),
// between 0 and 1 is distant background (moves less). An item WITHOUT depth does not move: text and captions stay put.
//
//   opts.camera = [{ t, dur, x, y, s, rot, ease }]                 targets in sequence (each starts where the previous one stopped)
//   opts.camera = { targets: [...], origin: [540, 960], hand: { amp: 3, freq: 0.3, rot: 0.15 } }
//                 origin = fixed zoom point (frame px) · hand = handheld camera (smooth, deterministic drift)
//   ease: 'io' (default, the kit's --ease-in-out) | 'out' | 'in' | 'gentle' | 'linear'
import { prog, noise1 } from '../../core/math.js';
import { EASE_IO, EASE_OUT, EASE_IN, EASE } from './ui.js';

const EASES = { io: EASE_IO, out: EASE_OUT, in: EASE_IN, gentle: EASE, linear: x => x };

export function normalizeCamera(c) {
  if (!c) return null;
  if (Array.isArray(c)) return { targets: c, origin: [540, 960], hand: null };
  return { targets: c.targets || [], origin: c.origin || [540, 960], hand: c.hand || null };
}

/** Camera state at instant t (the shot's LOCAL time): { x, y, s, rot }. */
export function cameraAt(t, C) {
  let x = 0, y = 0, s = 1, rot = 0;
  if (!C) return { x, y, s, rot };
  for (const k of C.targets) {
    if (t < k.t) break;
    const e = EASES[k.ease] || EASE_IO;
    const p = e(prog(t, k.t, k.t + Math.max(1e-6, k.dur ?? 0.6)));
    x += ((k.x ?? x) - x) * p; y += ((k.y ?? y) - y) * p; s += ((k.s ?? s) - s) * p; rot += ((k.rot ?? rot) - rot) * p;
  }
  if (C.hand) {
    const m = C.hand, f = m.freq ?? 0.3, a = m.amp ?? 3;
    x += a * noise1(t * f + 11.3); y += a * noise1(t * f + 47.9); rot += (m.rot ?? 0) * noise1(t * f * 0.8 + 83.1);
  }
  return { x, y, s, rot };
}

/** CSS transform for a layer at depth p (the origin lives on the wrapper: originCss). */
export function transformDepth(c, p) {
  if (!c) return 'none';
  const tx = c.x * p, ty = c.y * p, r = c.rot * p, sc = Math.pow(Math.max(1e-4, c.s), p);
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${sc.toFixed(5)})`;
}
export const originCss = C => `${(C?.origin?.[0] ?? 540)}px ${(C?.origin?.[1] ?? 960)}px`;
