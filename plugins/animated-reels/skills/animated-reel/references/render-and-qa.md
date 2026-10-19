# Render and QA

Everything runs in `<workspace>/engine` (made by `tools/setup.sh`).

## Commands

```bash
node tools/still.mjs --reel <id> --t 0.5,2,4.4,7 --sheet --cols 6   # stills + out/<id>/stills/sheet.png (the order is printed)
node tools/cover.mjs --reel <id>                                    # out/<id>/cover.png
node tools/render.mjs --reel <id> --from 2 --to 6 --sub 1 --workers 2 --out out/<id>/preview.mkv
ffmpeg -v error -y -i out/<id>/preview.mkv -vf "fps=6,crop=640:1180:0:740,scale=160:-1,tile=12x1" -frames:v 1 out/<id>/strip.png
sh tools/reel.sh <id> 3 3                                           # voice + soundtrack + render (3 sub, 3 workers) + master + cover + QA + delivery
SKIP_RENDER=1 sh tools/reel.sh <id>                                 # only voice/soundtrack/master/cover over the existing video.mkv
python3 "${CLAUDE_SKILL_DIR}/tools/check.py" <workspace>            # every reel-* folder of the workspace
```

- Render speed: ~10–12 frames/s per worker without sub-frames on a good GPU; a 35 s reel with 3 sub-frames and 3
  workers takes ~4–6 min. On a software renderer (no GPU) it is an order of magnitude slower: run
  `node tools/gputest.mjs` first. Several renders at once share the GPU: queue them.
- The video preview is the ONLY way to see the character's motion: a still cannot show it. Build a 6 fps strip of a
  spoken stretch and compare it with an approved reel of the same character.

## What the render does

`tools/render.mjs` opens the reel in headless Chromium with the GPU (the engine's own Playwright), seeks frame by
frame and captures through CDP; `--sub 3` takes 3 sub-frames per frame (180° shutter) and ffmpeg averages them: that
is the motion blur. Workers render separate stretches, out of order.

⚠️ **Everything must be a pure function of t.** State kept between frames breaks the video silently; so does
`Math.random` (use `mulberry32` with a seed). The engine is deterministic: the same instants rendered in forward and
reverse order give AE 0.

The master (`reel.sh`): film grain on the luma only, x264 `slow` CRF 17 capped at 22 Mb/s (Reels accepts up to 25),
BT.709, AAC 256k at 48 kHz, duration trimmed to `DUR`, `+faststart`. QA at the end: `ffprobe`, `ebur128` and a 1 fps
contact sheet in `out/<id>/qa/`.

## The check before saying "done"

1. `check.py`: 1 MP4 + 1 cover + 1 `.md` per folder; H.264 High yuv420p 1080x1920 30 fps; AAC 48 kHz; 15–45 s;
   ≤ 25 Mb/s; -14 ± 1 LUFS; true peak ≤ -1 dBTP; cover 1080x1920; caption with no blocker.
2. The 1 fps sheet of the FINAL MP4 (not the stills): safe area, legibility, the end card with its CTA.
3. Whisper on the last 5 s of the final MP4: the signature and the CTA must come out whole in the mix.
4. The motion strip: the character still while talking.

## Engine pitfalls (cost hours)

- **z-index leaks.** Without a stacking context a `z-index` rises above EVERYTHING (and above `#fade`). A scene with
  layered items mounts an isolated stage and the `img` box is isolated. Use `z` ≥ 0.
- **blend only sees the scene:** `mix-blend-mode` mixes with what is below INSIDE the scene, never with the GL canvas.
- **`depth` applies at the top level** (or to a whole group). A mark on fixed text (headline) has no `depth`; on the
  character, `depth: 1`; items inside `page.attached` move with the page. Full-frame light, no `depth`.
- **Time:** `E.word(F, 'l2', 'changes')` returns GLOBAL time; convert with `E.loc(t, shotStart)`.
- **Poses from different sources:** `poseAlign: 'feet'` matches feet and body height to the base pose; a sitting pose
  or one with a table changes the measured height: `poseAlign: false` or `scale`/`dx`/`dy` on the pose.
- **Never the engine's `sheet` item in the editorial style:** inside it the palette reverts to the default red accent.
- **Ink panel takes no full-body character** (dark trousers and hair vanish into the black).
- **One card colour per shot** (`SKIN` or `SKIN_AI`).
- **`alpha.mjs --cut` erases semi-transparent effects** (steam, light cones): redo them with `particles` and `light`.
- **Fonts:** without `assets/fonts/*.woff2` the page renders in system fonts and line breaks change. Run
  `node tools/fonts.mjs` and re-check stills.

## Machine pitfalls

- **Run the workspace copy.** `tools/reel.sh` refuses to run inside the skill folder: deliveries and `out/` (GBs)
  would land next to the skill.
- **Playwright belongs to the engine** (`package.json`, pinned); `npx playwright install chromium` once per machine.
- **ImageMagick without Freetype/Ghostscript:** `-label`/`-annotate` and `magick montage` fail on many builds. Contact
  sheets use `+append`/`-append` with no labels (the order is printed); text in an image is rendered as HTML in
  Chromium.
- **Session scratch space can disappear** on a restart: keep briefs and batch scripts in `<workspace>/_brief/`.
- **Disk:** each `out/<id>/` passes 1 GB with segments. Once delivered and checked, delete `out/<id>/.seg-*` and
  `video.mkv`; the script and the art are in the reel's source files.
