// The reels' score, their sound identity: F major, 120 BPM (one 2 s bar), ninth chords
// (Fmaj9 · Dm9 · B♭maj9 · C9sus4) and UI foley (marker, strike, keys, Tab, click). The motif is C–F–A
// rising on a bell: it opens the hook and closes the end card, the same in every reel. Arrangement follows the
// reel's SECTIONS, accents follow its CUES: picture and sound read the same src/reels/<id>.js.
//
// MUSIC (in the reel): { style, seed?, underVoice? }
//   style    the arrangement. Same key, same grid, same progressions, same motif and the same role for each SECTION;
//            only the orchestra changes (instruments in styles.js):
//     editorial  (default, when absent) FM electric piano, light drums of claps and rim,
//                round bass, motif on an FM bell.
//     doodle     playful: marimba instead of the piano, pizzicato, short bouncy
//                bass, finger snaps + slaps + shaker instead of drums, motif on glockenspiel, slide-whistle
//                riser. tension = tiptoe pizzicato and woodblock.
//     anime      hand-painted animated-film feel: felt piano in pedalled arpeggios, slow string bed, half-time,
//                no drums (only a soft kick on beat 1 of the groove), motif on celesta, harp on the riser. tension = low
//                tremolo strings and a clock; final = full piano and string chord.
//   seed     the score's randomness (default 3107) · underVoice  dB of music under the voice (default 19, tools/audio.mjs)
//   An unknown style stops the render and names the valid ones (a silent default is the worst way to fail).
//   Hear another style without touching the reel: node tools/audio.mjs --reel <id> --style anime → out/<id>/audio-anime/
//
// SECTIONS: [{ t0, t1, name, ... }] covering 0 → DUR. name (each role is the same in all three styles):
//   intro     only the lead instrument and the intro air (hook, opening). build: true → riser up to t1
//   soft      long chords, soft low hit on 1, light accent on 3, bass      (a bed for the voice)
//   groove    the beat: low hit on 1 and 3, snap/clap on 2 and 4, hi-hat/shaker, syncopated bass, comping. energy 0–1
//   pulse     four on the floor, sixteenth-note subdivision, eighth-note bass (fast, text-only reels)
//   tension   D minor: ticking, low pulse, no clap (the problem beat)
//   breakdown everything drops out: muffled chord and air (before a drop)
//   final     the signature: cut, open Fmaj9, the motif and the button bell (CUE chime)
//   silence   nothing
//   voice: true on a SECTION → the lead instrument darkens and the shaker/answer phrases drop out (the voice leads)
// CUES (reel time, s). General: hit {size s|m} · impact · drop · whoosh {dur} · swell {len} · riser {until} ·
//   sweep {until} · shimmer {until, n} · paper {until} · crumple {until} · marker {until} · strike · type {text, cps, seed} ·
//   tab · enter · pop · click · undo · scan {until} · motif {minor} · chime · bell {midi} · tick · thump · stamp
//   hit/impact/drop, riser, motif and bell play on the style's orchestra; chime (the CTA button) is the same in all three.
// Character foley (foley.js, all with optional v; the score's seed + the time decide each one's randomness):
//   scribble {dur=0.8, pan}  pen scribbling on paper from t to t+dur (t = the tip touches the paper)
//   swish {dur=0.26, dir}    short cartoon whoosh, peak at t (dir 1 left→right, −1 right→left)
//   boing {midi=53}          squash-and-stretch: the wobbling spring (pitch in midi, default F3)
//   clink                    ice in a glass: three glass taps, the strong one at t
//   pour {dur=1.2}           liquid poured from t to t+dur (the glass fills: pitch rises), two drops after
//   bikebell                 bicycle bell, two rings: t and t+0.17
//   page {dur=0.45}          page turn: grabs the sheet at t, lands at t+dur
import { DUR, CUES, SECTIONS, MUSIC } from '../reel.js';
import { createSynth } from './synth.js';
import { createInstruments, ARRANGEMENTS } from './styles.js';
import { createFoley } from './foley.js';
import { mtof } from './dsp.js';
import { typingTimes } from '../shots/lib/timing.js';

export const SR = 48000;
export const STYLES = ['editorial', 'doodle', 'anime'];

const CH = {
  F: { bass: 41, ep: [57, 60, 64, 67], pad: [53, 60, 64, 69] },
  Dm: { bass: 38, ep: [53, 57, 60, 64], pad: [50, 57, 60, 65] },
  Bb: { bass: 34, ep: [57, 60, 62, 65], pad: [46, 57, 62, 65] },
  C: { bass: 36, ep: [58, 62, 65, 67], pad: [48, 58, 62, 67] },
  Am: { bass: 33, ep: [55, 60, 64, 67], pad: [45, 55, 60, 64] },
  Gm: { bass: 31, ep: [53, 58, 62, 65], pad: [43, 53, 58, 62] },
};
const PROGS = {
  intro: ['F', 'Dm', 'Bb', 'C'], soft: ['F', 'Dm', 'Bb', 'C'], groove: ['F', 'Dm', 'Bb', 'C'], pulse: ['Dm', 'Bb', 'F', 'C'],
  tension: ['Dm', 'Dm', 'Bb', 'C'], breakdown: ['Bb', 'C'], final: ['F'], silence: ['F'],
};
const secAt = t => SECTIONS.find(x => t >= x.t0 - 1e-6 && t < x.t1 - 1e-6) || SECTIONS[SECTIONS.length - 1];
const nextOf = sec => SECTIONS[SECTIONS.indexOf(sec) + 1] || null;
function chordName(t) {
  const sec = secAt(t), nx = nextOf(sec);
  if (nx && nx.name === 'final' && t >= sec.t1 - 1 && sec.name !== 'final') return 'C';
  const p = PROGS[sec.name] || PROGS.groove;
  return p[Math.floor((t - sec.t0 + 1e-6) / 2 + (sec.shift || 0)) % p.length];
}
const chordAt = t => CH[chordName(t)];

/** style: forces an arrangement without touching the reel (tools/audio.mjs --style); the default is the reel's MUSIC.style. */
export async function renderScore({ solo = null, style = null } = {}) {
  const arrangement = style || MUSIC.style || 'editorial';
  if (!STYLES.includes(arrangement)) throw new Error(`MUSIC.style "${arrangement}" does not exist: use ${STYLES.join(' | ')}`);
  const ctx = new OfflineAudioContext(2, Math.round(SR * DUR), SR);
  const s = createSynth(ctx, { seed: MUSIC.seed ?? 3107, solo });

  const bars = (sec, fn) => { for (let b = sec.t0; b < sec.t1 - 1e-6; b += 2) fn(b, Math.min(2, sec.t1 - b), Math.round((b - sec.t0) / 2)); };
  const inSec = (sec, t) => t >= sec.t0 - 1e-6 && t < sec.t1 - 1e-6;

  // doodle/anime: the whole form comes from styles.js. editorial: the loop below.
  const A = arrangement === 'editorial' ? null : ARRANGEMENTS[arrangement](s, createInstruments(s, MUSIC.seed ?? 3107), { bars, chordAt, chordName, CH });
  const F = createFoley(s, MUSIC.seed ?? 3107);
  if (A) for (const sec of SECTIONS) A.section(sec);
  else for (const sec of SECTIONS) {
    const E = sec.energy ?? 1, voice = !!sec.voice;
    const bright = voice ? 0.55 : 1;
    if (sec.name === 'intro') {
      bars(sec, (b, len, i) => {
        const c = chordAt(b + 0.01);
        s.epChord(b + 0.02, c.ep, len - 0.1, 0.085 * bright, { rev: 0.45, dly: 0.18, bright: 0.7 * bright });
        if (len > 1.2) s.ep(b + 1.0, c.ep[3] + 12, 0.8, 0.05, { rev: 0.5, dly: 0.3, bright: 0.6 });
      });
      s.air(sec.t0, sec.t1, 0.03);
      if (sec.build) s.riser(Math.max(sec.t0, sec.t1 - 1.6), sec.t1, 0.28);
    } else if (sec.name === 'soft') {
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        s.epChord(b, c.ep, Math.min(len, 1.7), 0.09 * bright, { rev: 0.35, dly: 0.12, bright: 0.8 * bright });
        if (len > 1.3) s.epChord(b + 1.25, c.ep.slice(1), 0.5, 0.05 * bright, { rev: 0.3, bright: 0.6 * bright });
        s.bass(b, c.bass + 12, Math.min(len, 1.8) - 0.1, 0.16 * E);
        s.kick(b, 0.5 * E);
        if (len > 1.05) s.rim(b + 1.0, 0.16 * E);
        if (!voice) for (let k = 0; k < len / 0.25 - 0.01; k++) s.shaker(b + k * 0.25, (k % 2 ? 0.06 : 0.035) * E);
      });
    } else if (sec.name === 'groove' || sec.name === 'pulse') {
      const pulse = sec.name === 'pulse';
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01), at = x => b + x < b + len - 1e-6;
        // drums
        for (const x of pulse ? [0, 0.5, 1, 1.5] : [0, 1]) if (at(x)) s.kick(b + x, (x === 0 ? 0.85 : 0.72) * (0.6 + 0.4 * E));
        if (!pulse && E > 0.6 && at(0.875)) s.kick(b + 0.875, 0.42 * E);
        if (!pulse && E > 0.85 && at(1.75)) s.kick(b + 1.75, 0.5);
        for (const x of [0.5, 1.5]) if (at(x)) s.clap(b + x, 0.42 * (0.55 + 0.45 * E), 0.2);
        const step = pulse ? 0.125 : 0.25;
        for (let k = 0; k < len / step - 0.01; k++) {
          const x = k * step, off = Math.abs((x / 0.25) % 2 - 1) < 0.01;
          s.hat(b + x, (pulse ? (k % 2 ? 0.08 : 0.14) : off ? 0.16 : 0.08) * (0.5 + 0.5 * E) * (voice ? 0.6 : 1), false, 0.2);
        }
        if (E > 0.5 && !voice && !pulse) for (let k = 0; k < len / 0.125 - 0.01; k++) s.shaker(b + k * 0.125, (k % 2 ? 0.05 : 0.03) * E);
        if (E > 0.8 && at(1.75)) s.hat(b + 1.75, 0.07, true, -0.2);
        // bass
        if (pulse) { for (let k = 0; k < len / 0.25 - 0.01; k++) s.bass(b + k * 0.25, c.bass + (k % 4 === 3 ? 12 : 0), 0.2, 0.26 * (0.6 + 0.4 * E)); }
        else {
          s.bass(b, c.bass, 0.6, 0.3 * (0.6 + 0.4 * E));
          if (at(0.75)) s.bass(b + 0.75, c.bass + 12, 0.18, 0.16 * E);
          if (at(1.0)) s.bass(b + 1.0, c.bass, 0.4, 0.24 * E);
          if (at(1.5)) s.bass(b + 1.5, c.bass + 7, 0.4, 0.2 * E);
        }
        // electric piano (syncopated comping)
        const v = (pulse ? 0.075 : 0.085) * bright;
        for (const [x, d] of pulse ? [[0.25, 0.2], [0.75, 0.2], [1.25, 0.2], [1.75, 0.2]] : [[0, 0.45], [0.75, 0.3], [1.25, 0.6]]) if (at(x)) s.epChord(b + x, c.ep, d, v, { rev: 0.25, dly: 0.1, bright: 0.9 * bright });
        s.pad(b, b + len, c.pad, 0.02 * E, { attack: 0.3, release: 0.6, cutoff: 1200, rev: 0.4 });
      });
    } else if (sec.name === 'tension') {
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        for (let k = 0; k < len / 0.125 - 0.01; k++) s.tick(b + k * 0.125, k % 4 === 0 ? 0.05 : 0.025, k % 2 === 0);
        s.kick(b, 0.55); if (len > 0.3) s.kick(b + 0.25, 0.32);
        s.pad(b, b + len, c.pad.map(m => m - 12), 0.05, { attack: 0.2, release: 0.5, cutoff: 700, rev: 0.4 });
        s.bass(b, c.bass - 12, len - 0.1, 0.22);
        s.ep(b + 1.0, c.ep[2] + 12, 0.9, 0.04, { rev: 0.5, dly: 0.35, bright: 0.5 });
      });
    } else if (sec.name === 'breakdown') {
      bars(sec, (b, len) => {
        const c = chordAt(b + 0.01);
        s.epChord(b, c.ep, len, 0.06, { rev: 0.6, dly: 0.25, bright: 0.35 });
        s.pad(b, b + len, c.pad, 0.035, { attack: 0.4, release: 0.8, cutoff: 800, rev: 0.6 });
      });
      s.air(sec.t0, sec.t1, 0.04);
    } else if (sec.name === 'final') {
      const t = sec.t0, c = CH.F;
      s.cut(t, 'm');
      s.epChord(t + 0.01, [...c.ep, 72], sec.t1 - t - 0.2, 0.1, { rev: 0.5, dly: 0.2, bright: 0.9 });
      s.bass(t, c.bass, Math.min(2.6, sec.t1 - t - 0.3), 0.3);
      s.pad(t, sec.t1 - 0.3, c.pad, 0.03, { attack: 0.2, release: 0.5, cutoff: 1400, rev: 0.6 });
      s.motif(t + 0.14, { v: 0.14 });
      s.fadeOut(sec.t1 - 0.35, sec.t1 - 0.02);
    }
  }

  // ── accents ────────────────────────────────────────────────────────────────
  // The voices that depend on the style. Editorial calls the synth's own voices directly.
  const V = A || {
    hit: (t, size) => s.cut(t, size),
    impact: t => { s.cut(t, 'm'); s.subBoom(t, 0.5, 1.6, 64, 30); },
    drop: t => { s.cut(t, 'm'); s.clap(t, 0.35, 0.4); s.crash(t, 0.06, 1.8); },
    riser: (t0, t1, v) => s.riser(t0, t1, v),
    motif: (t, o) => s.motif(t, o),
    bell: (t, midi, v) => s.bell(t, mtof(midi), v, { dur: 1.6, ratio: 3.5, index: 1.2, rev: 0.5, dly: 0.2 }),
  };
  for (const c of CUES) {
    const t = c.t, v = c.v;
    switch (c.type) {
      case 'hit': V.hit(t, c.size || 's'); break;
      case 'impact': V.impact(t); break;
      case 'drop': V.drop(t); break;
      case 'whoosh': s.whoosh(t, v ?? 0.3, c.dur ?? 0.6); break;
      case 'swell': s.revCymbal(t, c.len ?? 1.0, v ?? 0.22); break;
      case 'riser': V.riser(t, c.until, v ?? 0.3); break;
      case 'sweep': s.sweep(t, c.until, v ?? 0.14); break;
      case 'shimmer': s.shimmer(t, c.until ?? t + 1, c.n ?? 24, v ?? 0.1); break;
      case 'paper': s.paper(t, c.until ?? t + 0.8, v ?? 0.28); break;
      case 'crumple': s.crumple(t, c.until ?? t + 0.6, v ?? 0.3); break;
      case 'marker': s.marker(t, c.until ?? t + 0.34, v ?? 0.34); break;
      case 'strike': s.strike(t, v ?? 0.3, c.dur ?? 0.22); break;
      case 'type': {
        const times = typingTimes(c.text, t, c.cps ?? 16, c.seed ?? 1);
        [...c.text].forEach((ch, i) => s.key(times[i], (v ?? 0.26) * (0.8 + 0.4 * ((i * 7919) % 13) / 13), { pitch: 0.94 + ((i * 104729) % 17) / 100, space: ch === ' ', pan: ((i % 5) - 2) * 0.05 }));
        break;
      }
      case 'tab': s.tabKey(t, v ?? 0.75); break;
      case 'enter': s.enterKey(t); break;
      case 'pop': s.pop(t, v ?? 0.16, c.f ?? 620); break;
      case 'click': s.click(t, v ?? 0.3); break;
      case 'undo': s.undo(t, v ?? 0.28); break;
      case 'scan': s.scan(t, c.until ?? t + 1, v ?? 0.045, c.rate ?? 22); break;
      case 'motif': V.motif(t, { v: v ?? 0.15, minor: !!c.minor, transpose: c.transpose ?? 0 }); break;
      case 'chime': s.chime(t, v ?? 0.26); break;
      case 'bell': V.bell(t, c.midi ?? 84, v ?? 0.16); break;
      case 'tick': s.tick(t, v ?? 0.12); break;
      case 'thump': s.thump(t, v ?? 0.25); break;
      case 'stamp': s.stamp(t, v ?? 0.6); break;
      // character foley
      case 'scribble': F.scribble(t, c.dur ?? 0.8, v ?? 0.3, c.pan ?? 0); break;
      case 'swish': F.swish(t, v ?? 0.3, c.dur ?? 0.26, c.dir ?? null); break;
      case 'boing': F.boing(t, v ?? 0.3, c.midi ?? 53); break;
      case 'clink': F.clink(t, v ?? 0.3); break;
      case 'pour': F.pour(t, c.dur ?? 1.2, v ?? 0.3); break;
      case 'bikebell': F.bikebell(t, v ?? 0.3); break;
      case 'page': F.page(t, v ?? 0.3, c.dur ?? 0.45); break;
      default: break;
    }
  }
  s.scheduleDucks();
  return ctx.startRendering();
}
