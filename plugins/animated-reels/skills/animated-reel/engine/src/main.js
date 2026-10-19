import * as THREE from 'three';
import { createGL, W, H } from './core/gl.js';
import { V, ASPECT, SAFE } from './core/format.js';
import { createHUD } from './core/hud.js';
import { load, loadCanvasFonts } from './core/assets.js';
import { el, css } from './core/dom.js';
import { SHOTS as ALL, COVER, REEL } from './reel.js';

// Shot contract (src/shots/<id>.js, export default):
//   async init(ctx)   builds the scene/camera/DOM (ctx.layer is the shot's <div>)
//   update(t, T)      t = the shot's local time, T = global time. Positions EVERYTHING
//                     from the time and returns { scene, camera, ...ctx.gl.render options },
//                     or { custom: true } if it already rendered itself. `fade` (0–1)
//                     darkens the whole screen, `flash` (0–1) brightens it, `theme`
//                     ('dark'|'light') switches the HUD colour for the frame, `hud` (0–1) is its opacity.

const params = new URLSearchParams(location.search);
const stageEl = document.getElementById('stage');
for (const n of [stageEl, document.getElementById('gl')]) { n.style.width = W + 'px'; n.style.height = H + 'px'; }
const only = params.get('only')?.split(',');
const glc = createGL(document.getElementById('gl'));
const domRoot = document.getElementById('dom');
const fade = document.getElementById('fade');
const hud = createHUD(document.getElementById('hud'));
if (params.has('nohud')) hud.hidden = true;

await loadCanvasFonts();

// ?cover=1: the reel's cover is a single shot (COVER.mod at time COVER.t, with opts.cover = true).
const cover = params.has('cover') && COVER;
const SHOTS = cover ? [{ id: 'cover', mod: COVER.mod, start: 0, end: 1e6, at: COVER.t ?? 0, theme: COVER.theme ?? 'dark', opts: { ...(COVER.opts || {}), cover: true } }] : ALL;
if (cover) hud.hidden = true;
const ctx = { THREE, gl: glc, renderer: glc.renderer, W, H, V, ASPECT, SAFE, load, hud, reel: REEL };
const shots = [];
for (const [k, s] of SHOTS.entries()) {
  if (s.use) { shots.push({ ...s }); continue; }
  const layer = el(domRoot, 'layer');
  let mod = null;
  if (!only || only.includes(s.id)) {
    try {
      // `mod` with ?k=: each entry gets its own module instance (the same shot can appear twice)
      mod = (await import(s.mod ? `./shots/${s.mod}.js?k=${k}` : `./shots/${s.id}.js`)).default;
      await mod.init({ ...ctx, layer, shot: s, opts: s.opts || {} });
    } catch (e) {
      console.error(`[shot ${s.id}]`, e && e.stack ? e.stack : e);
      mod = null;
    }
  }
  if (!mod) {
    css(el(layer, 'abs disp', `${s.id}<br><span class="mono" style="font-size:22px">work in progress</span>`), { left: '0px', right: '0px', textAlign: 'center', top: (H / 2 - 100) + 'px', fontSize: '84px', color: '#ae1803' });
  }
  shots.push({ ...s, mod, layer });
}

let current = null;
const stage = stageEl;
window.seek = (T) => {
  let s = shots.find(x => T >= x.start && T < x.end) || shots[shots.length - 1];
  // montage: the segment plays another shot at its local time `at`
  let tl = T - s.start, tg = T, cut = s;
  // at: the shot starts at its local time `at` · origin: the global time it expects at local t 0
  if (!s.use && (s.at != null || s.origin != null)) { tl = (s.at ?? 0) + (T - s.start); tg = (s.origin ?? s.start) + tl; }
  if (s.use) {
    const src = shots.find(x => x.id === s.use);
    tl = s.at + (T - s.start);
    tg = src.start + tl;
    s = { ...src, theme: cut.theme };
  }
  const zk = cut.zoom ? cut.zoom[0] + (cut.zoom[1] - cut.zoom[0]) * ((T - cut.start) / (cut.end - cut.start)) : 1;
  stage.style.transform = zk !== 1 ? `scale(${zk})` : '';
  if (current !== s.layer) {
    if (current) current.classList.remove('on');
    s.layer.classList.add('on');
    current = s.layer;
  }
  let r = {};
  if (s.mod) {
    r = s.mod.update(tl, tg) || {};
    if (r.scene) glc.render(r.scene, r.camera, r);
    else if (!r.custom) glc.clear(r.clearColor ?? 0x201e1d);
  } else glc.clear();
  // montage: a short flash on each cut
  if (cut.use) r = { ...r, flash: Math.max(r.flash || 0, 0.5 * Math.max(0, 1 - (T - cut.start) / 0.1)) };
  fade.style.background = r.flash ? '#faf6f1' : (r.fadeColor || '#000');
  fade.style.opacity = r.flash ? r.flash : (r.fade ?? 0);
  document.getElementById('hud').style.opacity = r.hud ?? 1;
  hud.update(T, r.theme ? { ...s, theme: r.theme } : cut.use ? { ...s, theme: cut.theme } : s);
  return true;
};

// Signal for the capture tool: fonts, textures and shaders are ready.
window.seek(0);
window.reelReady = true;
