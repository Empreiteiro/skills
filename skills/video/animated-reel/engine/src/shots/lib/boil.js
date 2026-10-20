// Boil: the hand-drawn line "boiling", each drawing redrawn with a slightly different wobble, as in hand-made
// animation (8 to 12 drawings per second). It is an SVG filter (feTurbulence + feDisplacementMap) applied ONLY to
// the <img> (or any node) through `filter: url(#…)`, with the seed changing every floor(t × fps).
//
// The filters live in a global <svg> of defs, created the first time one is requested, outside #stage (0 × 0, no
// effect on screen). One filter per (amp, freq, octaves, seed): callers asking for the same combination reuse the
// same node, and a node never changes after it is created, so frame t draws the same in any worker and any order.
//
//   boilAt(t, { amp: 2.5, fps: 10, freq: 0.03, octaves: 2, seed: 7 })   → 'url(#boil-…)' or '' (no boil)
//   boilFilter({ amp, freq, octaves, seed })                            → 'url(#boil-…)' (one fixed drawing)
//   svgDefs()                                                           → the global <defs> (other uses)
//
// amp = maximum displacement of the node in px (the feDisplacementMap scale is 2 × amp) · freq = noise frequency
// in cycles/px (0.02 undulates broadly, 0.06 jitters finely) · octaves = noise detail (1 or 2 is enough; more costs).
const NS = 'http://www.w3.org/2000/svg';
let DEFS = null;
const built = new Set();

export function svgDefs() {
  if (DEFS) return DEFS;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  // display:none disables filters in some engines: 0 × 0 out of the flow is the safe way
  svg.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
  DEFS = document.createElementNS(NS, 'defs');
  svg.appendChild(DEFS);
  document.body.appendChild(svg);
  return DEFS;
}

const r4 = x => Math.round(x * 1e4) / 1e4;
export function boilFilter({ amp = 2, freq = 0.03, octaves = 2, seed = 1 } = {}) {
  const A = r4(amp), F = r4(freq), O = Math.max(1, Math.round(octaves)), S = Math.round(seed);
  const id = `boil-${String(A).replace('.', '_')}-${String(F).replace('.', '_')}-${O}-${S}`;
  if (!built.has(id)) {
    const defs = svgDefs();
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    // generous region: the displacement must not clip the edge of the drawing
    f.setAttribute('x', '-8%'); f.setAttribute('y', '-8%'); f.setAttribute('width', '116%'); f.setAttribute('height', '116%');
    // sRGB: the noise stays centred on 0.5, so the drawing does not slide to one side (in linearRGB it shifts)
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const tb = document.createElementNS(NS, 'feTurbulence');
    tb.setAttribute('type', 'fractalNoise'); tb.setAttribute('baseFrequency', String(F)); tb.setAttribute('numOctaves', String(O));
    tb.setAttribute('seed', String(S)); tb.setAttribute('result', 'noiseOut');
    const dm = document.createElementNS(NS, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'noiseOut'); dm.setAttribute('scale', String(r4(A * 2)));
    dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G');
    f.append(tb, dm);
    defs.appendChild(f);
    built.add(id);
  }
  return `url(#${id})`;
}

/** The boil filter at instant t (LOCAL time): seed = base + floor(t × fps), or the position in a cycle of n
 *  drawings (b.cycle), the classic boil of 3 drawings that repeat. Without b (or with amp 0) returns ''. */
export function boilAt(t, b, base = 0) {
  if (!b || !(b.amp ?? 2)) return '';
  const k = Math.floor(t * (b.fps ?? 10) + 1e-6);
  const n = b.cycle ? ((k % b.cycle) + b.cycle) % b.cycle : k;
  return boilFilter({ amp: b.amp ?? 2, freq: b.freq ?? 0.03, octaves: b.octaves ?? 2, seed: 1 + (b.seed ?? 0) + base + n });
}
