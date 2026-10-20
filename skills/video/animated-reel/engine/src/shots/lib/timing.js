// Pure timing (no DOM): the shot and the soundtrack both read from here, so the key that appears on screen and
// the click that is heard land on the same instant by construction. Importable in Node and in the browser.

export const FPS = 30;
/** Rounds to the frame (cuts only happen on frame-aligned times). */
export const q = t => Math.round(t * FPS) / FPS;
export const BEAT = 0.5;            // 120 BPM
export const BAR = 2;               // a bar of 4 beats

const h = (i, s) => { const x = Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Instants at which each character of `text` appears, typed at `cps` characters per second from t0.
 * Humanized (±35%) by a deterministic hash; spaces and punctuation hold a little longer. Returns one number per
 * character, the first exactly at t0.
 */
export function typingTimes(text, t0, cps = 16, seed = 1) {
  const out = [];
  let t = t0;
  for (let i = 0; i < text.length; i++) {
    out.push(+t.toFixed(4));
    const ch = text[i];
    let d = (1 / cps) * (0.65 + 0.7 * h(i, seed));
    if (ch === ' ') d *= 1.25;
    if (/[.,;:!?]/.test(ch)) d *= 2.2;
    t += d;
  }
  return out;
}
/** End of typing (the instant of the last character). */
export const typingEnd = (text, t0, cps, seed) => { const a = typingTimes(text, t0, cps, seed); return a[a.length - 1]; };

/** Plain text of a kit HTML string (tags removed, whitespace collapsed): what the typing and the soundtrack count. */
export const plain = html => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
