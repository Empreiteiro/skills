// Which reel is loaded. Browser: ?reel=<id>. Node: REEL=<id>. Default: example.
//
// A reel (src/reels/<id>.js) exports:
//   META     { num: '01', slug: 'my-reel', date: 'YYYY-MM-DD' }  (names the delivered files)
//   DUR      duration in s (a multiple of 1/30)
//   SHOTS    [{ id, mod?, start, end, theme, at?, origin?, opts?, use?, zoom? }]
//            mod = path under src/shots/ without .js (default: id) · at = local time at the start
//            origin = global time the module receives at its local t 0 (demo shots)
//            opts = shot parameters (they arrive as ctx.opts)
//   CUES     picture ↔ sound accents (reel time) · SECTIONS the soundtrack's form (see src/audio/score.js)
//   COVER    { mod, t?, opts? } — the shot that draws the cover (rendered with opts.cover = true)
//   HUD      null (the default for reels) or { sig, timecode, site } — demo-reel frame
//   LABELS   HUD labels (only with HUD)
const id = typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('reel')
  : (globalThis.process?.env?.REEL || null);
const m = await import(`./reels/${id || 'example'}.js`);

export const REEL = id;
export const META = m.META ?? null;
export const FPS = m.FPS ?? 30;
export const DUR = m.DUR;
export const SHOTS = m.SHOTS;
export const LABELS = m.LABELS ?? [];
export const CUES = m.CUES ?? [];
export const SECTIONS = m.SECTIONS ?? [];
export const PROMPT = m.PROMPT ?? null;
export const COVER = m.COVER ?? null;
export const MUSIC = m.MUSIC ?? {};
export const HUD = m.HUD ?? null;
export const VO = m.VO ?? null;
