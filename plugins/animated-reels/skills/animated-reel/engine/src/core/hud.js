import { el, css } from './dom.js';
import { clamp, prog, E } from './math.js';
import { FPS, LABELS, HUD } from '../reel.js';
import { V } from './format.js';

// Demo-reel frame: signature, timecode, shot label and site.
export function createHUD(root) {
  css(root, { fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" });
  const base = { position: 'absolute', fontSize: '14px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  // 9:16 (Reels): the top and bottom of the frame belong to the app (header, caption, buttons), so the HUD
  // moves inside the safe area and the site is dropped (the end card already carries the CTA).
  const top = V ? '292px' : '50px', side = V ? '80px' : '64px';
  // In src/reels/<id>.js: HUD = null (no frame) or { sig, timecode, site }. site is the text shown
  // bottom-right, 16:9 only.
  const cfg = HUD || {};
  const tl = css(el(root, '', cfg.sig || ''), { ...base, left: side, top });
  const tc = css(el(root, 'tab'), { ...base, right: side, top, letterSpacing: '0.14em', fontWeight: 600, display: cfg.timecode ? 'block' : 'none' });
  const br = css(el(root), { ...base, right: '64px', bottom: '48px', display: V || !cfg.site ? 'none' : 'block' });
  br.textContent = cfg.site || '';
  const lab = css(el(root), { ...base, left: side, bottom: V ? '452px' : '44px', display: 'flex', alignItems: 'center', gap: '18px' });
  const num = css(el(lab, 'display i'), { fontSize: '30px', letterSpacing: '0', textTransform: 'none', color: '#c19a3d', minWidth: '44px' });
  const rule = css(el(lab), { width: '46px', height: '1px', background: '#c19a3d', transformOrigin: 'left center' });
  const txt = css(el(lab), { overflow: 'hidden' });
  const txtIn = el(txt, '', '', 'span');
  let last = null;
  let hidden = !HUD;
  if (hidden) root.style.display = 'none';

  return {
    /** Hides the whole HUD (e.g. on the end card). */
    set hidden(v) { hidden = v; root.style.display = v ? 'none' : 'block'; },
    update(T, shot) {
      if (hidden) return;
      const f = Math.floor(T * FPS + 1e-6);
      const ff = f % FPS, ss = Math.floor(f / FPS) % 60, mm = Math.floor(f / FPS / 60);
      tc.textContent = `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
      const light = shot.theme === 'light';
      const col = light ? 'rgba(20,33,54,0.78)' : 'rgba(245,239,223,0.82)';
      tl.style.color = tc.style.color = br.style.color = txtIn.style.color = col;
      const L = LABELS.find(l => T >= l.t0 && T < l.t1);
      if (!L) { lab.style.opacity = 0; return; }
      if (L !== last) { num.textContent = L.n; txtIn.textContent = L.txt; last = L; }
      num.style.color = light ? '#7a5d10' : '#c19a3d';
      rule.style.background = light ? '#7a5d10' : '#c19a3d';
      const a = E.outExpo(prog(T, L.t0, L.t0 + 0.7));
      const out = clamp((L.t1 - T) / 0.25);
      lab.style.opacity = Math.min(1, a * 1.4) * out;
      rule.style.transform = `scaleX(${a})`;
      txt.style.clipPath = `inset(0 ${(1 - E.outCubic(prog(T, L.t0 + 0.15, L.t0 + 0.8))) * 100}% 0 0)`;
      num.style.transform = `translateY(${(1 - a) * 14}px)`;
    },
  };
}
