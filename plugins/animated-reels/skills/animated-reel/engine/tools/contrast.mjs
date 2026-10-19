// WCAG contrast of every skin and every end-card skin: node tools/contrast.mjs
// Normal text needs 4.5:1 (AA); large text (>= 24 px, or >= 18.66 px bold) needs 3:1. Everything here is held to 4.5
// except the button (bold, 38-40 px: large text, 3:1). Exits with code 1 if any pair falls below.
// Keys a skin does not define, or that are not #rrggbb, are skipped.
import { SKINS, COLOR } from '../src/shots/lib/ui.js';
import { END_SKINS } from '../src/shots/scene/end.js';

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = hex => { const h = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const HEX = /^#[0-9a-f]{6}$/i;
let failed = 0;
const line = (name, fg, bg, min = 4.5) => {
  if (!HEX.test(fg || '') || !HEX.test(bg || '')) return;
  const r = cr(fg, bg), ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(34)} ${fg} on ${bg}  ${r.toFixed(2)}:1${min !== 4.5 ? ` (min ${min})` : ''}`);
};
for (const [n, P] of Object.entries(SKINS || {})) {
  console.log(`\n── skin ${n}`);
  for (const k of ['ink', 'muted', 'faint', 'accent', 'stroke']) line(`${k} / backdrop`, P[k], P.backdrop);
  line('markInk / markBg (marker)', P.markInk, P.markBg);
  line('btnInk / btnBg (button, 38 px)', P.btnInk, P.btnBg, 3);   // large text
  const FP = P.dark ? P : { ...(SKINS.paper || P), sheet: P.sheet };   // light skins draw the sheet with the paper palette
  for (const k of ['ink', 'muted', 'del', 'ins']) line(`sheet: ${k} / sheet`, FP[k], P.sheet);
}
for (const [n, p] of Object.entries(END_SKINS || {})) {
  console.log(`\n── end card ${n}`);
  const base = SKINS[p.skin];
  if (!base) { console.log(`  skin "${p.skin}" is not in SKINS: skipped`); continue; }
  line('title / backdrop', p.ink, base.backdrop);
  line('secondary lines / backdrop', p.muted, base.backdrop);
  line('CTA line / backdrop', p.action, base.backdrop);
  line('button (38-40 px)', COLOR.paper, COLOR.accentDeep, 3);
}
console.log(failed ? `\n${failed} pair(s) below AA` : '\nall pass AA');
process.exit(failed ? 1 : 0);
