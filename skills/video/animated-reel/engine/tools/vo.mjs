// A reel's voice-over: edge-tts with per-word timing, checked by whisper.cpp.
//   node tools/vo.mjs --reel <id>
// Reads src/reels/<id>.vo.js:
//   export const VOICE = { voice: 'en-US-AndrewMultilingualNeural', rate: '+10%' };
//   export const LINES = [{ id, text, speech?, voice?, rate?, t? | after?: '<previous id>', gap? }]
//     voice/rate on a line = a different voice for that line only (a character speaks, the closing line uses VOICE)
//     text = what appears on screen · speech = what is said, when different (pronunciation: "character for character")
//     t = fixed start of the line's audio · after/gap = starts `gap` s after the end of that line (default: the previous one)
// Writes src/reels/<id>.vo.json (global timing of every line and word: the reel and its scenes read it),
// out/<id>/vo/vo.wav (48 kHz stereo, −16 LUFS on the speech) and out/<id>/vo/whisper.txt (the check).
//
// edge-tts runs in Python (tools/py/tts.py, for the WordBoundary timing the CLI does not expose). Interpreter:
// EDGE_TTS_PYTHON, else the `uv tool install edge-tts` environment, else python3 / python with edge_tts importable.
// whisper.cpp: WHISPER_CLI (default whisper-cli) with WHISPER_MODEL (default <engine>/../models/ggml-base.en.bin).
// Without whisper the check is skipped with a warning and the timing is still written.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const ID = argv.includes('--reel') ? argv[argv.indexOf('--reel') + 1] : null;
if (!ID) { console.log('usage: node tools/vo.mjs --reel <id>'); process.exit(2); }
const WHISPER_CLI = process.env.WHISPER_CLI || 'whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.resolve(ROOT, '../models/ggml-base.en.bin');
const FPS = 30, q = t => Math.round(t * FPS) / FPS;

const { VOICE = {}, LINES } = await import(new URL(`../src/reels/${ID}.vo.js`, import.meta.url));
const voice = VOICE.voice || 'en-US-AndrewMultilingualNeural', rate = VOICE.rate || '+10%';
const OUT = path.join(ROOT, `out/${ID}/vo`), CACHE = path.join(ROOT, 'out/_tts');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });

/** The Python that can import edge_tts (resolved once, only when a line is not cached yet). */
let PY = null;
function edgePython() {
  if (PY) return PY;
  if (process.env.EDGE_TTS_PYTHON) return (PY = process.env.EDGE_TTS_PYTHON);
  const win = process.platform === 'win32';
  const toolDirs = [
    process.env.UV_TOOL_DIR,
    win ? process.env.APPDATA && path.join(process.env.APPDATA, 'uv', 'tools') : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'uv', 'tools'),
  ].filter(Boolean);
  for (const d of toolDirs) {
    const py = win ? path.join(d, 'edge-tts', 'Scripts', 'python.exe') : path.join(d, 'edge-tts', 'bin', 'python');
    if (fs.existsSync(py)) return (PY = py);
  }
  for (const py of win ? ['python', 'python3'] : ['python3', 'python']) {
    if (spawnSync(py, ['-c', 'import edge_tts'], { stdio: 'ignore' }).status === 0) return (PY = py);
  }
  throw new Error('edge-tts not found: run `uv tool install edge-tts` (or `python3 -m pip install --user edge-tts`), or set EDGE_TTS_PYTHON');
}

function tts(text, vz = voice, rt = rate) {
  const h = crypto.createHash('sha1').update(`${vz}|${rt}|${text}`).digest('hex').slice(0, 16), base = path.join(CACHE, h);
  const cached = () => fs.existsSync(base + '.mp3') && fs.existsSync(base + '.json');
  for (let k = 0; k < 4 && !cached(); k++) {
    const r = spawnSync(edgePython(), [path.join(ROOT, 'tools/py/tts.py'), text, vz, rt, base], { encoding: 'utf8' });
    if (r.status !== 0) console.log(`tts failed (attempt ${k + 1}): ${(r.stderr || String(r.error || '')).slice(-200)}`);
  }
  if (!cached()) throw new Error(`edge-tts gave up on: "${text}"`);
  const words = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', base + '.mp3'], { encoding: 'utf8' });
  return { mp3: base + '.mp3', words, dur };
}

// 1. synthesis and position of every line
const out = [];
for (const L of LINES) {
  const s = tts(L.speech || L.text, L.voice || voice, L.rate || rate);
  let t0;
  if (L.t != null) t0 = L.t;
  else { const prev = out.find(x => x.id === L.after) || out[out.length - 1]; t0 = prev.t1 + (L.gap ?? 0.25) - (s.words[0]?.t0 ?? 0); }
  t0 = q(t0);
  const words = s.words.map(w => ({ w: w.w, t0: +(t0 + w.t0).toFixed(3), t1: +(t0 + w.t1).toFixed(3) }));
  out.push({ id: L.id, text: L.text, speech: L.speech || null, voice: L.voice || voice, rate: L.rate || rate, mp3: s.mp3, t0, dur: +s.dur.toFixed(3), w0: words[0]?.t0 ?? t0, t1: words[words.length - 1]?.t1 ?? t0 + s.dur, words });
}
for (let i = 1; i < out.length; i++) if (out[i].w0 < out[i - 1].t1 + 0.12) console.log(`WARNING: ${out[i].id} starts ${(out[i - 1].t1 - out[i].w0).toFixed(2)} s before the end of ${out[i - 1].id}`);

// 2. the track: every line at its t0, mixed into a 48 kHz wav
const total = Math.max(...out.map(x => x.t0 + x.dur)) + 0.5;
const inputs = out.flatMap(x => ['-i', x.mp3]);
const delays = out.map((x, i) => `[${i}:a]aresample=48000,adelay=${Math.round(x.t0 * 1000)}|${Math.round(x.t0 * 1000)}[a${i}]`).join(';');
const mix = `${delays};${out.map((_, i) => `[a${i}]`).join('')}amix=inputs=${out.length}:normalize=0:dropout_transition=0,apad=whole_dur=${total.toFixed(3)},aformat=channel_layouts=stereo[m]`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', mix, '-map', '[m]', '-ar', '48000', '-c:a', 'pcm_f32le', path.join(OUT, 'vo-raw.wav')]);
const meas = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(OUT, 'vo-raw.wav'), '-af', 'loudnorm=I=-16:TP=-2:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const mj = JSON.parse(meas.slice(meas.lastIndexOf('{'), meas.lastIndexOf('}') + 1));
const gainDb = -16 - +mj.input_i;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(OUT, 'vo-raw.wav'), '-af', `volume=${gainDb.toFixed(2)}dB`, '-ar', '48000', '-c:a', 'pcm_f32le', path.join(OUT, 'vo.wav')]);

// 3. whisper: does what was said match the text?
let whisperOff = null;
if (!fs.existsSync(WHISPER_MODEL)) whisperOff = `model not found at ${WHISPER_MODEL} (set WHISPER_MODEL)`;
else if (spawnSync(WHISPER_CLI, ['--help'], { stdio: 'ignore' }).error) whisperOff = `${WHISPER_CLI} not found (install whisper.cpp or set WHISPER_CLI)`;
const NUM = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', twenty: '20' };
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(w => NUM[w] ?? w).join(' ');
const rep = [];
let failed = 0;
if (whisperOff) {
  console.log(`WARNING: whisper check skipped: ${whisperOff}`);
  rep.push(`whisper check skipped: ${whisperOff}`);
} else {
  for (const x of out) {
    const wav = path.join(OUT, `${x.id}.wav`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', x.mp3, '-ar', '16000', '-ac', '1', wav]);
    const heard = (spawnSync(WHISPER_CLI, ['-m', WHISPER_MODEL, '-f', wav, '-l', 'en', '-nt', '-np'], { encoding: 'utf8' }).stdout || '').replace(/\s+/g, ' ').trim();
    const a = norm(x.speech || x.text).split(' '), b = norm(heard).split(' ');
    const setB = new Set(b), miss = a.filter(w => !setB.has(w));
    const ok = miss.length <= Math.max(0, Math.floor(a.length * 0.08));
    if (!ok) failed++;
    rep.push(`${ok ? '✓' : '✗'} ${x.id} [${x.w0.toFixed(2)}–${x.t1.toFixed(2)} s]\n   script:  ${x.speech || x.text}\n   whisper: ${heard}${miss.length ? `\n   missing: ${miss.join(', ')}` : ''}`);
    fs.rmSync(wav, { force: true });
  }
  console.log(rep.join('\n'));
}
fs.writeFileSync(path.join(OUT, 'whisper.txt'), rep.join('\n') + '\n');

// 4. timing for the reel and its scenes
const json = { voice, rate, lufs: -16, lines: out.map(({ mp3, ...x }) => x), end: +Math.max(...out.map(x => x.t1)).toFixed(3) };
fs.writeFileSync(path.join(ROOT, `src/reels/${ID}.vo.json`), JSON.stringify(json, null, 1));
const verdict = whisperOff ? 'skipped' : failed ? `${failed} line(s) to check` : 'all lines match';
console.log(`\nvoice-over: ${out.length} lines · speech ends at ${json.end.toFixed(2)} s · voice ${voice} ${rate} · gain ${gainDb.toFixed(1)} dB → −16 LUFS · whisper: ${verdict}`);
for (const x of out) console.log(`  ${x.id.padEnd(4)} audio ${x.t0.toFixed(2)} · speech ${x.w0.toFixed(2)} → ${x.t1.toFixed(2)} s  "${x.text}"`);
