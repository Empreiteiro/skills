// The reel's soundtrack: renders the score (OfflineAudioContext in Chromium), masters it (gain + true-peak limiter),
// normalizes it with two-pass loudnorm and proves it with data: loudness, attack peaks vs CUES, spectrogram, waveform.
//   node tools/audio.mjs --reel <id>                → out/<id>/audio/music.wav (+ report and images)
//   node tools/audio.mjs --reel <id> --solo drums|music|bass|fx|sfx   → that bus alone (diagnostics)
//   node tools/audio.mjs --reel <id> --style anime  → the same reel in another arrangement (MUSIC.style overridden),
//     in out/<id>/audio-anime/, to compare arrangements over the same voice-over without touching the reel
// Env: TP=<dBTP> sets the true-peak target (default -2).
// Needs ffmpeg and ffprobe; ImageMagick (`magick`) only for wave-cues.png, which is skipped without it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { ROOT, launchOptions } from './lib.mjs';
import { chromium } from 'playwright';
const argv = process.argv.slice(2);
const solo = argv.includes('--solo') ? argv[argv.indexOf('--solo') + 1] : null;
const REEL = argv.includes('--reel') ? argv[argv.indexOf('--reel') + 1] : null;
const STYLE = argv.includes('--style') ? argv[argv.indexOf('--style') + 1] : null;
if (!REEL) { console.log('usage: node tools/audio.mjs --reel <id> [--solo drums|music|bass|fx|sfx] [--style <name>]'); process.exit(2); }
process.env.REEL = REEL;
const { CUES, SECTIONS, DUR, MUSIC } = await import('../src/reel.js');
const OUT = path.join(ROOT, `out/${REEL}/audio${STYLE ? '-' + STYLE : ''}`);
fs.mkdirSync(OUT, { recursive: true });
// −2 dBTP: AAC in the master raises the peak by up to ~0.8 dB, so the final file stays ≤ −1. Set TP=-3 for a track whose transients AAC still pushes over.
const TARGET_I = -14, TARGET_TP = process.env.TP ? Number(process.env.TP) : -2.0;

// ── WAV ────────────────────────────────────────────────────────────────────
function writeWav(file, chans, sr, fmt = 'f32') {
  const nc = chans.length, n = chans[0].length, bps = fmt === 'f32' ? 4 : 3;
  const data = Buffer.alloc(n * nc * bps), hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(fmt === 'f32' ? 3 : 1, 20); hdr.writeUInt16LE(nc, 22); hdr.writeUInt32LE(sr, 24);
  hdr.writeUInt32LE(sr * nc * bps, 28); hdr.writeUInt16LE(nc * bps, 32); hdr.writeUInt16LE(bps * 8, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  let o = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = chans[c][i];
    if (fmt === 'f32') { data.writeFloatLE(v, o); o += 4; }
    else { const q = Math.max(-8388608, Math.min(8388607, Math.round(v * 8388607))); data.writeIntLE(q, o, 3); o += 3; }
  }
  fs.writeFileSync(file, Buffer.concat([hdr, data]));
}
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12, fmt = null, sr = 0, nc = 0, bits = 0, data = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { fmt = b.readUInt16LE(p + 8); nc = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); if (fmt === 0xfffe) fmt = b.readUInt16LE(p + 32); }
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + sz); break; }
    p += 8 + sz + (sz % 2);
  }
  const bps = bits / 8, n = Math.floor(data.length / (bps * nc));
  const chans = Array.from({ length: nc }, () => new Float32Array(n));
  for (let i = 0, o = 0; i < n; i++) for (let c = 0; c < nc; c++, o += bps) {
    chans[c][i] = fmt === 3 ? data.readFloatLE(o) : bits === 24 ? data.readIntLE(o, 3) / 8388608 : bits === 16 ? data.readInt16LE(o) / 32768 : data.readInt32LE(o) / 2147483648;
  }
  return { sr, chans };
}

// ── render in the browser ──────────────────────────────────────────────────
async function render() {
  const srv = await serve(ROOT);
  const browser = await chromium.launch(launchOptions({ gpu: false }));
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/audio.html${REEL ? '?reel=' + REEL : ''}`);
  await page.waitForFunction(() => window.audioReady === true, null, { timeout: 60000 });
  const t0 = Date.now();
  const info = await page.evaluate(o => window.renderAudio(o), { solo, style: STYLE });
  const secs = (Date.now() - t0) / 1000;
  const CHUNK = 1 << 19, chans = [];
  for (let c = 0; c < info.ch; c++) {
    const arr = new Float32Array(info.len);
    for (let off = 0; off < info.len; off += CHUNK) {
      const n = Math.min(CHUNK, info.len - off);
      const b64 = await page.evaluate(([c, off, n]) => window.getChunk(c, off, n), [c, off, n]);
      const buf = Buffer.from(b64, 'base64'), f = new Float32Array(n);
      new Uint8Array(f.buffer).set(buf);
      arr.set(f, off);
    }
    chans.push(arr);
  }
  await browser.close(); srv.close();
  if (errors.length) console.log(errors.slice(0, 20).join('\n'));
  return { sr: info.sr, chans, secs };
}

// ── measurement (ffmpeg loudnorm, first pass) ──────────────────────────────
function measure(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=20:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.error) throw new Error(`ffmpeg could not run (${r.error.code}): install ffmpeg and put it on the PATH`);
  const t = r.stderr, j = JSON.parse(t.slice(t.lastIndexOf('{'), t.lastIndexOf('}') + 1));
  return { I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra, thresh: +j.input_thresh, offset: +j.target_offset };
}

// ── true-peak limiter with lookahead ───────────────────────────────────────
const lanczos = (x, a = 4) => (x === 0 ? 1 : Math.abs(x) >= a ? 0 : (a * Math.sin(Math.PI * x) * Math.sin((Math.PI * x) / a)) / (Math.PI * Math.PI * x * x));
const TPW = [0.25, 0.5, 0.75].map(f => { const w = []; for (let k = -3; k <= 4; k++) w.push(lanczos(f - k)); return w; });
function truePeakEnv(chans) {
  const N = chans[0].length, pk = new Float32Array(N);
  for (const x of chans) for (let n = 0; n < N; n++) {
    let m = Math.abs(x[n]);
    if (n >= 3 && n + 4 < N) for (const w of TPW) {
      let s = 0; for (let k = -3, j = 0; k <= 4; k++, j++) s += x[n + k] * w[j];
      const a = Math.abs(s); if (a > m) m = a;
    }
    if (m > pk[n]) pk[n] = m;
  }
  return pk;
}
function limiter(chans, sr, ceilDb, { look = 0.004, rel = 0.09 } = {}) {
  const N = chans[0].length, L = Math.max(1, Math.round(look * sr)), c = Math.pow(10, ceilDb / 20);
  const pk = truePeakEnv(chans), gr = new Float32Array(N);
  for (let n = 0; n < N; n++) gr[n] = pk[n] > c ? c / pk[n] : 1;
  // forward minimum over [n, n+L-1] (monotonic deque)
  const m = new Float32Array(N), dq = new Int32Array(N);
  let h = 0, tl = 0;
  for (let i = N - 1; i >= 0; i--) {
    while (tl > h && gr[dq[tl - 1]] >= gr[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + L - 1) h++;
    m[i] = gr[dq[h]];
  }
  // backward box average (a smooth attack that reaches the target before the peak)
  const s = new Float32Array(N);
  let acc = 0;
  for (let n = 0; n < N; n++) { acc += m[n]; if (n >= L) acc -= m[n - L]; s[n] = acc / Math.min(n + 1, L); }
  const rc = 1 - Math.exp(-1 / (rel * sr));
  const g = new Float32Array(N);
  let prev = 1, minG = 1, heavy = 0;
  for (let n = 0; n < N; n++) {
    let v = s[n] < prev ? s[n] : prev + (s[n] - prev) * rc;
    if (v > s[n]) v = s[n];
    g[n] = prev = v;
    if (v < minG) minG = v;
    if (v < 0.708) heavy++; // > 3 dB of reduction
  }
  const out = chans.map(x => { const y = new Float32Array(N); for (let n = 0; n < N; n++) y[n] = x[n] * g[n]; return y; });
  return { out, maxGR: -20 * Math.log10(minG), heavyPct: (100 * heavy) / N };
}
/** Mix-bus glue compressor: stereo-linked RMS, feed-forward, soft knee, zero latency. */
function glueComp(chans, sr, { ratio = 2, knee = 6, att = 0.012, rel = 0.16, pct = 0.9, below = 3 } = {}) {
  const N = chans[0].length, aA = Math.exp(-1 / (att * sr)), aR = Math.exp(-1 / (rel * sr));
  const envDb = new Float32Array(N);
  let e = 0;
  for (let n = 0; n < N; n++) {
    const p = 0.5 * (chans[0][n] * chans[0][n] + chans[1][n] * chans[1][n]);
    e = p > e ? aA * e + (1 - aA) * p : aR * e + (1 - aR) * p;
    envDb[n] = 10 * Math.log10(e + 1e-12);
  }
  const smp = [];
  for (let n = 0; n < N; n += 480) if (envDb[n] > -60) smp.push(envDb[n]);
  smp.sort((a, b) => a - b);
  const T = smp[Math.floor(smp.length * pct)] - below;
  const out = chans.map(() => new Float32Array(N));
  let maxGR = 0, sum = 0;
  for (let n = 0; n < N; n++) {
    const over = envDb[n] - T;
    let gr = 0;
    if (2 * over > knee) gr = (1 / ratio - 1) * over;
    else if (2 * over > -knee) gr = ((1 / ratio - 1) * (over + knee / 2) ** 2) / (2 * knee);
    const g = Math.pow(10, gr / 20);
    out[0][n] = chans[0][n] * g; out[1][n] = chans[1][n] * g;
    if (-gr > maxGR) maxGR = -gr;
    sum -= gr;
  }
  return { out, T, maxGR, avgGR: sum / N };
}
const gainChans = (chans, db) => { const k = Math.pow(10, db / 20); return chans.map(x => x.map(v => v * k)); };

// ── analysis ───────────────────────────────────────────────────────────────
function onsetEnv(chans, sr) {
  const N = chans[0].length, a = Math.exp((-2 * Math.PI * 150) / sr);
  const hp = new Float32Array(N);
  let x1 = 0, y1 = 0;
  for (let n = 0; n < N; n++) { const x = 0.5 * (chans[0][n] + chans[1][n]); const y = a * (y1 + x - x1); x1 = x; y1 = y; hp[n] = y; }
  const hop = Math.round(sr * 0.001), win = Math.round(sr * 0.002), E = [];
  for (let i = 0; i * hop + win < N; i++) { let s = 0; for (let k = 0; k < win; k++) { const v = hp[i * hop + k]; s += v * v; } E.push(10 * Math.log10(s / win + 1e-12)); }
  return { E, hop, win, sr };
}
function onsetNear({ E, hop, win, sr }, t, span = 0.04) {
  const toIdx = x => Math.round((x * sr - win / 2) / hop);
  const i0 = Math.max(16, toIdx(t - span)), i1 = Math.min(E.length - 4, toIdx(t + span));
  let best = -1e9, bi = i0, bpre = 0, bpost = 0;
  for (let i = i0; i <= i1; i++) {
    let pre = 0; for (let k = 6; k <= 15; k++) pre += E[i - k]; pre /= 10;
    const post = Math.max(E[i], E[i + 1], E[i + 2], E[i + 3]);
    if (post - pre > best) { best = post - pre; bi = i; bpre = pre; bpost = post; }
  }
  // attack time = where the rise crosses 50% (in dB), at the centre of the window
  const mid = bpre + 0.5 * (bpost - bpre);
  let j = bi;
  for (let k = bi - 6; k <= bi + 3; k++) if (E[k] >= mid) { j = k; break; }
  return { t: (j * hop + win / 2) / sr, rise: best };
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
function sectionStats(chans, sr, t0, t1) {
  const a = Math.floor(t0 * sr), b = Math.min(chans[0].length, Math.floor(t1 * sr));
  let sl = 0, sr2 = 0, slr = 0, sm = 0, pk = 0, hl = 0, hr = 0, hlr = 0;
  const ah = Math.exp((-2 * Math.PI * 300) / sr);
  let xl1 = 0, yl1 = 0, xr1 = 0, yr1 = 0, zl = 0, zr = 0, wl = 0, wr = 0;
  for (let n = a; n < b; n++) {
    const l = chans[0][n], r = chans[1][n]; sl += l * l; sr2 += r * r; slr += l * r; sm += ((l + r) / 2) ** 2; pk = Math.max(pk, Math.abs(l), Math.abs(r));
    const yl = ah * (yl1 + l - xl1), yr = ah * (yr1 + r - xr1); xl1 = l; yl1 = yl; xr1 = r; yr1 = yr;
    const ul = ah * (zl + yl - wl), ur = ah * (zr + yr - wr); wl = yl; zl = ul; wr = yr; zr = ur;
    hl += ul * ul; hr += ur * ur; hlr += ul * ur;
  }
  const len = b - a, rms = Math.sqrt((sl + sr2) / (2 * len));
  const NF = 8192, band = new Float64Array(BANDS.length), win = new Float32Array(NF).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (NF - 1)));
  for (let o = a; o + NF <= b; o += NF / 2) {
    const re = new Float64Array(NF), im = new Float64Array(NF);
    for (let i = 0; i < NF; i++) re[i] = 0.5 * (chans[0][o + i] + chans[1][o + i]) * win[i];
    fft(re, im);
    for (let k = 1; k < NF / 2; k++) {
      const f = (k * sr) / NF, p = re[k] * re[k] + im[k] * im[k];
      for (let j = 0; j < BANDS.length; j++) if (f >= BANDS[j] / Math.SQRT2 && f < BANDS[j] * Math.SQRT2) band[j] += p;
    }
  }
  const bmax = Math.max(...band);
  return {
    rmsDb: 20 * Math.log10(rms + 1e-12), peakDb: 20 * Math.log10(pk + 1e-12),
    corr: slr / Math.sqrt(sl * sr2 + 1e-20), corrHi: hlr / Math.sqrt(hl * hr + 1e-20),
    monoLossDb: 10 * Math.log10(sm / ((sl + sr2) / 2 + 1e-20)),
    bands: [...band].map(v => Math.round(10 * Math.log10(v / bmax + 1e-12))),
  };
}

// Cues with a dry attack. Left out: those that swell into the accent (whoosh, swish, riser) or run continuously (pour, marker).
const TRANS = new Set(['impact', 'hit', 'drop', 'stamp', 'enter', 'chime', 'tab', 'click', 'scribble', 'boing', 'clink', 'page']);
/** Measured attack near each dry-attack CUE (error in ms, rise in dB); returns the worst error. */
function reportAttacks(chans, sr) {
  const env = onsetEnv(chans, sr);
  const rows = [];
  for (const c of CUES) {
    if (c.type === 'steps') {
      for (let i = 0; i < c.count; i++) { const t = c.t + i * c.every, o = onsetNear(env, t); rows.push({ t, type: `step ${i + 1}`, dt: (o.t - t) * 1000, rise: o.rise }); }
    } else if (c.type === 'bikebell') {
      for (const [d, k] of [[0, 1], [0.17, 2]]) { const t = c.t + d, o = onsetNear(env, t); rows.push({ t, type: `bikebell ${k}`, dt: (o.t - t) * 1000, rise: o.rise, note: c.note }); }
    } else if (TRANS.has(c.type)) {
      const o = onsetNear(env, c.t); rows.push({ t: c.t, type: c.type + (c.size ? ' ' + c.size : ''), dt: (o.t - c.t) * 1000, rise: o.rise, note: c.note });
    }
  }
  say('\nCUE → measured attack (error in ms, rise in dB):');
  for (const x of rows) say(`  ${x.t.toFixed(3).padStart(7)}  ${x.type.padEnd(10)} ${x.dt >= 0 ? '+' : ''}${x.dt.toFixed(1).padStart(5)} ms  ↑${x.rise.toFixed(1)} dB  ${x.note || ''}`);
  const worst = Math.max(...rows.map(x => Math.abs(x.dt)));
  say(`worst error: ${worst.toFixed(1)} ms over ${rows.length} attacks`);
  return worst;
}

// ── pipeline ───────────────────────────────────────────────────────────────
const f = n => path.join(OUT, n);
const log = [];
const say = s => { console.log(s); log.push(s); };

say(`style: ${STYLE || MUSIC.style || 'editorial'}${STYLE ? ' (forced by --style)' : ''}`);
const r = await render();
say(`render: ${r.chans[0].length} samples @ ${r.sr} Hz = ${(r.chans[0].length / r.sr).toFixed(3)} s (offline in ${r.secs.toFixed(1)} s)`);
const rawPk = Math.max(...r.chans.map(x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
say(`raw: sample peak ${(20 * Math.log10(rawPk)).toFixed(2)} dBFS`);
if (solo) {
  writeWav(f(`stem-${solo}.wav`), r.chans, r.sr, 'f32');
  const m = measure(f(`stem-${solo}.wav`));
  say(`stem ${solo}: I ${m.I} LUFS · TP ${m.TP} dBTP`);
  for (const sec of SECTIONS) { const st = sectionStats(r.chans, r.sr, sec.t0, sec.t1); say(`  ${sec.name.padEnd(10)} rms ${st.rmsDb.toFixed(1)} dB · peak ${st.peakDb.toFixed(1)}`); }
  reportAttacks(r.chans, r.sr);   // in the sfx stem: each foley attack without music or voice on top
  process.exit(0);
}
// ── voice: the music ducks to ~19 dB under the speech (envelope from the line timings) and the voice-over is mixed in ──
const SPEECH = path.join(ROOT, `src/reels/${REEL}.vo.json`), VOWAV = path.join(ROOT, `out/${REEL}/vo/vo.wav`);
let voInfo = null;
if (REEL && fs.existsSync(SPEECH) && fs.existsSync(VOWAV)) {
  const speech = JSON.parse(fs.readFileSync(SPEECH, 'utf8')), vo = readWav(VOWAV), N = r.chans[0].length, sr = r.sr;
  const spans = [];
  for (const l of speech.lines) {
    const a = l.w0 - 0.15, b = l.t1 + 0.3;
    if (spans.length && a - spans[spans.length - 1][1] < 0.7) spans[spans.length - 1][1] = b; else spans.push([a, b]);
  }
  const rmsIn = (chans, sp) => { let e = 0, n = 0; for (const [a, b] of sp) for (let i = Math.max(0, Math.floor(a * sr)); i < Math.min(chans[0].length, Math.floor(b * sr)); i++) { e += (chans[0][i] ** 2 + chans[1][i] ** 2) / 2; n++; } return 10 * Math.log10(e / Math.max(1, n) + 1e-12); };
  const Mdb = rmsIn(r.chans, spans), Vdb = rmsIn(vo.chans, spans);
  const duckDb = Math.min(0, Vdb - (MUSIC.underVoice ?? 19) - Mdb), gk = Math.pow(10, duckDb / 20);
  const g = new Float32Array(N).fill(1);
  for (const [a, b] of spans) for (let i = Math.max(0, Math.floor((a - 0.12) * sr)); i < Math.min(N, Math.ceil((b + 0.35) * sr)); i++) {
    const t = i / sr, pin = Math.min(1, Math.max(0, (t - (a - 0.12)) / 0.12)), pout = Math.min(1, Math.max(0, ((b + 0.35) - t) / 0.35));
    g[i] = Math.min(g[i], 1 + (gk - 1) * Math.min(pin, pout));
  }
  for (const x of r.chans) for (let i = 0; i < N; i++) x[i] *= g[i];
  for (let c = 0; c < 2; c++) for (let i = 0; i < Math.min(N, vo.chans[c].length); i++) r.chans[c][i] += vo.chans[c][i];
  voInfo = { spans, duckDb, Mdb, Vdb };
  say(`voice: ${speech.lines.length} lines · music ${Mdb.toFixed(1)} dB and speech ${Vdb.toFixed(1)} dB RMS over the spoken passages → music ducks ${duckDb.toFixed(1)} dB (sits ${(Mdb + duckDb - Vdb).toFixed(1)} dB under the voice)`);
}
writeWav(f('music-raw.wav'), r.chans, r.sr, 'f32');
const m0 = measure(f('music-raw.wav'));
say(`raw: I ${m0.I} LUFS · TP ${m0.TP} dBTP · LRA ${m0.LRA} LU`);

// gain + limiter until −14 LUFS with the true peak under the target (headroom so the loudnorm pass stays linear)
const gc = glueComp(r.chans, r.sr);
say(`glue: threshold ${gc.T.toFixed(1)} dB RMS · 2:1 · max GR ${gc.maxGR.toFixed(1)} dB · mean ${gc.avgGR.toFixed(2)} dB`);
r.chans = gc.out;
writeWav(f('glued.wav'), r.chans, r.sr, 'f32');
const m1 = measure(f('glued.wav'));
let gainDb = TARGET_I - m1.I, ceil = -1.3, pre = null, lim = null;
for (let it = 0; it < 7; it++) {
  lim = limiter(gainChans(r.chans, gainDb), r.sr, ceil);
  writeWav(f('premaster.wav'), lim.out, r.sr, 'f32');
  const m = measure(f('premaster.wav'));
  say(`  iter ${it}: gain ${gainDb.toFixed(2)} dB · ceiling ${ceil.toFixed(2)} → I ${m.I} · TP ${m.TP} · max GR ${lim.maxGR.toFixed(1)} dB · GR>3dB ${lim.heavyPct.toFixed(2)}% of the time`);
  pre = m;
  if (Math.abs(m.I - TARGET_I) <= 0.05 && m.TP <= TARGET_TP - 0.05) break;
  gainDb += TARGET_I - m.I;
  if (m.TP > TARGET_TP - 0.05) ceil -= m.TP - (TARGET_TP - 0.05) + 0.02;
}

// two-pass loudnorm (linear)
const p1 = measure(f('premaster.wav'));
const lra = Math.min(50, Math.max(7, Math.ceil(p1.LRA + 1)));
const ln = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', '-i', f('premaster.wav'), '-af',
  `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${lra}:measured_I=${p1.I}:measured_TP=${p1.TP}:measured_LRA=${p1.LRA}:measured_thresh=${p1.thresh}:offset=${p1.offset}:linear=true:print_format=json`,
  '-ar', '48000', '-c:a', 'pcm_s24le', f('music.wav')], { encoding: 'utf8' });
const lj = JSON.parse(ln.stderr.slice(ln.stderr.lastIndexOf('{'), ln.stderr.lastIndexOf('}') + 1));
say(`loudnorm second pass: type ${lj.normalization_type} · output I ${lj.output_i} · TP ${lj.output_tp} · LRA ${lj.output_lra}`);

// final check
const fin = readWav(f('music.wav'));
const mf = measure(f('music.wav'));
const spk = Math.max(...fin.chans.map(x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,duration', '-of', 'default=nw=1', f('music.wav')], { encoding: 'utf8' }).trim().replace(/\n/g, ' · ');
say(`FINAL music.wav: I ${mf.I} LUFS · LRA ${mf.LRA} LU · TP ${mf.TP} dBTP · sample peak ${(20 * Math.log10(spk)).toFixed(2)} dBFS · ${probe}`);

// attack peaks vs CUES
const worst = reportAttacks(fin.chans, fin.sr);

say('\nsection     rms dBFS  peak   corr L/R (>300Hz)  mono loss   bands 31·63·125·250·500·1k·2k·4k·8k·16k (dB rel.)');
for (const sec of SECTIONS) {
  const st = sectionStats(fin.chans, fin.sr, sec.t0, sec.t1);
  say(`  ${sec.name.padEnd(10)} ${st.rmsDb.toFixed(1).padStart(6)}  ${st.peakDb.toFixed(1).padStart(5)}   ${st.corr.toFixed(2)} (${st.corrHi.toFixed(2)})        ${st.monoLossDb.toFixed(1)} dB    ${st.bands.join(' ')}`);
}

// images
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', f('music.wav'), '-lavfi', 'showspectrumpic=s=1920x600:mode=combined:color=intensity:scale=log:fscale=log:legend=1', f('spectrogram.png')]);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', f('music.wav'), '-lavfi', 'showwavespic=s=1920x400:split_channels=1:colors=0xec3017|0xa9a49e', f('wave.png')]);
// wave-cues.png: the waveform with a line per CUE and the SECTIONS labelled. Labels need an ImageMagick build with
// Freetype and a default font; without them the image gets the lines only, and without ImageMagick it is skipped.
const marks = [], labels = [];
for (const c of CUES) {
  const x = Math.round((c.t / DUR) * 1920);
  marks.push('-stroke', '#e04848', '-draw', `line ${x},0 ${x},399`);
  if (c.until) { const x2 = Math.round((c.until / DUR) * 1920); marks.push('-stroke', '#48a0e0', '-draw', `line ${x2},0 ${x2},399`); }
}
for (const sec of SECTIONS) {
  const x = Math.round((sec.t0 / DUR) * 1920);
  marks.push('-stroke', '#ffffff', '-draw', `line ${x},0 ${x},12`);
  labels.push('-stroke', 'none', '-fill', '#ffffff', '-pointsize', '13', '-annotate', `+${x + 3}+26`, sec.name);
}
const waveCues = extra => execFileSync('magick', [f('wave.png'), '-background', '#101418', '-flatten', ...extra, f('wave-cues.png')], { stdio: 'pipe' });
let cuesPng = f('wave-cues.png');
try {
  try { waveCues([...marks, ...labels]); } catch (e) { if (e.code === 'ENOENT') throw e; waveCues(marks); }
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  say('WARNING: ImageMagick (`magick`) not found: wave-cues.png skipped');
  cuesPng = f('wave.png');
}
fs.writeFileSync(f('report.txt'), log.join('\n') + '\n');
for (const x of ['glued.wav', 'premaster.wav']) fs.rmSync(f(x), { force: true });
say(`\nok: ${f('music.wav')} · ${f('spectrogram.png')} · ${cuesPng}`);
