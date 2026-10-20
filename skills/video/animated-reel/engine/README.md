# Animated reel engine

three.js + DOM in headless Chromium (GPU), captured frame by frame through Playwright/CDP, sub-frames for motion
blur, a soundtrack synthesized in an OfflineAudioContext, and an ffmpeg master. Every frame is a pure function of t.

**Do not run it from the skill folder.** `tools/setup.sh` (skill level) copies this folder to `<workspace>/engine`
and installs the rest; `tools/reel.sh` refuses to run inside the skill.

## Where things live

| path | what |
|---|---|
| `src/reels/<id>.js` | a reel: `META { num, slug, date }`, `DUR`, `SHOTS`, `CUES`, `SECTIONS`, `COVER`, `MUSIC` (contract in `src/reel.js`) |
| `src/reels/<id>.vo.js` | the voice-over lines; `tools/vo.mjs` writes `<id>.vo.json` (global time of every word), which the reel imports |
| `src/reels/example.js` | the style kit's demo and template, with a catalogue of pieces after the end (not a deliverable) |
| `src/shots/style/editorial.js` | the style kit: pure factories (`E.character`, `E.panel`, `E.mark.*`, `E.product.*`, `E.caption.*`, `E.cover`, `E.end`, `E.MOTION`…) |
| `src/shots/scene/scene.js` | the item-based scene (catalogue of item types in its header); `src/shots/scene/end.js` the end card |
| `src/shots/lib/` | `image` (characters: poses, idle, accents, swap, shadow), `stroke` (hand-drawn gestures), `particles`, `light`, `camera`, `ui` (tokens, skins, UI gestures, lockup), `dust`, `boil`, `timing` |
| `src/audio/` | `score.js` + `synth.js` + `styles.js` + `foley.js` + `dsp.js`: the soundtrack and the foley |
| `src/core/` | GL compositor, DOM helpers, format and safe area, fonts, math, HUD |
| `cast/` | `cast.json` (characters: anchors, refs, voice, poses, profile) and `style.json` (the full image-style prompt) |
| `assets/cast/<id>/` | character poses (the shipped `example` is two placeholder SVGs) |
| `assets/reels/<id>/` | each reel's own art |
| `assets/style/editorial/` | `paper.mjs` (makes `paper.png`, deterministic) and `prepare.mjs` (cleans generated images) |
| `assets/fonts/` | the open fonts, fetched by `tools/fonts.mjs` (git-ignored) |
| `tools/` | `vo.mjs`, `audio.mjs`, `render.mjs`, `still.mjs`, `cover.mjs`, `reel.sh`, `pose.mjs`, `plate.mjs`, `alpha.mjs`, `contrast.mjs`, `gputest.mjs`, `fonts.mjs` |

## Scene primitives (full catalogue in the header of `src/shots/scene/scene.js`)

| piece | what it does | where |
|---|---|---|
| `img` | character or plate: poses swapped on the frame or dissolved, `feet` + `height` from the body measured in the alpha, pop, idle, speech accents, contact shadow, crop | `lib/image.js` |
| `stroke` | a hand gesture that draws itself: presets or `d`, pinned to a text part (`target`) or from/to, seeded tremor, pressure, fill | `lib/stroke.js` |
| `particles` · `light` | dust, vapor, papers · radial, blinds, vignette, grain (closed-form functions of t, dithered) | `lib/particles.js`, `lib/light.js` |
| `opts.camera` + `depth` | per-shot camera and parallax (an item without `depth` stays on screen) | `lib/camera.js` |
| text, label, sheet, note, keycap, button, bubble, speech, sweep, verify, dust, group | typography and product UI | `scene/scene.js` |
| `z`, `blend`, `style` | order, mix-blend-mode and CSS on the root node | `scene/scene.js` |
| `pop`, `slide`, `popOut`, `slideOut` | entrances and exits | `lib/ui.js` |

All character motion goes through `E.character` and the `E.MOTION` factor (0.25).

## Tools

```bash
node tools/vo.mjs --reel <id>                       # voice + Whisper → src/reels/<id>.vo.json
node tools/still.mjs --reel <id> --t 0.5,2,6 --sheet --cols 6
node tools/cover.mjs --reel <id>
sh tools/reel.sh <id> 3 3                           # voice + soundtrack + render + master + cover + QA + delivery
node tools/pose.mjs --character <id> --scene "<English>" --out <abs>/assets/reels/<reel>/raw/<pose>.png --n 2
node assets/style/editorial/prepare.mjs <raw.png> assets/reels/<reel>/<name>.png [--ring] [--paper]
node tools/plate.mjs --style editorial --scene "<English>" --out <abs.png> --style-ref <png flattened on the paper>
node tools/alpha.mjs in.png out.png [--cut]         # removes haze/halo
node tools/contrast.mjs                             # WCAG AA of the skins and end cards
node tools/gputest.mjs                              # prints the WebGL renderer; warns on a software renderer
node tools/fonts.mjs                                # fetches the open fonts into assets/fonts/
node assets/style/editorial/paper.mjs               # regenerates assets/style/editorial/paper.png
```

## Environment

| variable | used by | default |
|---|---|---|
| `OPENAI_API_KEY` | `pose.mjs`, `plate.mjs` | required for image generation (never printed) |
| `OPENAI_IMAGE_MODEL` | `pose.mjs`, `plate.mjs` | the tool's default model (`--model` overrides) |
| `EDGE_TTS_PYTHON` | `vo.mjs` | the uv tool env of edge-tts, else `python3`/`python` |
| `WHISPER_CLI` · `WHISPER_MODEL` | `vo.mjs` | `whisper-cli` · `../models/ggml-base.en.bin` |
| `ANGLE_BACKEND` | Chromium launch | `metal` (macOS), `d3d11` (Windows), none (Linux); empty = no flag |
| `CHROMIUM_PATH` | Chromium launch | Playwright's own Chromium |
| `REELS_OUT` | `reel.sh` | the folder above the engine (the workspace) |
| `SKIP_RENDER` | `reel.sh` | re-master over the existing `video.mkv` |
| `TP` | `audio.mjs` | true-peak target of the master (-2) |

## Fonts

The editorial style uses five open-licensed (SIL OFL 1.1) families, fetched by `tools/fonts.mjs` from the Fontsource
packages: Archivo (display), Source Serif 4 (body), JetBrains Mono (labels), Newsreader (draft text, captions) and
Caveat (handwriting). Without them the page falls back to system fonts (each CSS class has a fallback stack) and
`loadCanvasFonts()` logs a warning; line breaks will differ from the reference.

## Performance and determinism

On a good GPU, one worker without sub-frames renders a shot with a character, strokes, papers and camera at ~25 fps;
the static PNG paper instead of a live `feTurbulence` cut ~40% of render time. Determinism: the same instants rendered
in forward and reverse order give AE 0. Pitfalls: `references/render-and-qa.md` of the skill.
