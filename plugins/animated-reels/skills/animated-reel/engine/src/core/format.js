// Film format: 16:9 (default) or 9:16 for Reels (?fmt=916). Everything that depends on width/height reads it
// from here; without fmt the film is 16:9.
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const V = q.get('fmt') === '916';
export const W = V ? 1080 : 1920;
export const H = V ? 1920 : 1080;
export const ASPECT = W / H;

// Reels safe area (px in the 1080×1920 frame): the top holds the app header, the bottom holds the caption,
// profile and audio row, and the right side of the lower half holds the buttons. Content that must be read
// lives inside SAFE; the background and 3D may bleed to the edge.
// Platform UI zones: top 270, bottom 400, right 130 in the lower half.
export const SAFE = V ? { x0: 80, x1: 1000, y0: 380, y1: 1410, xBtn: 950 } : { x0: 64, x1: 1856, y0: 120, y1: 960, xBtn: 1856 };
