---
name: animated-reel
description: Turn a topic and a cast of drawn characters into a finished 1080x1920 animated reel for Instagram/TikTok/Shorts — first-person story and voice-over (edge-tts, checked with Whisper), new character poses from an image model, frame-by-frame animation rendered in headless Chromium (three.js + Playwright), synthesized soundtrack, H.264 master at -14 LUFS, cover, post caption and a final QA. Use when asked to make an animated reel or short with characters for a product or creator, to animate a script, to make more reels in an existing series, or to fix one (motion, voice, end card, cover, caption). Not for static carousels, paid-ad uploads or publishing.
---

# Animated reel

A reel is a short magazine-cartoon story: a fictional character tells, in first person, a moment of their day, the
problem they hit, and what the product (or the creator's idea) does about it, with the proof on screen. The engine
renders it frame by frame, so every frame is a pure function of time and two renders are identical.

Read the reference a step asks for, not all of them at once:

| File | When |
|---|---|
| `references/style-editorial.md` | **always, in full, before the script**: the style bible (colours, motion, burned-in captions, product UI, cover, closing, sound, kit API, pitfalls) |
| `references/script.md` | choosing the story: the 7-beat structure, line rules, claims you may and may not make |
| `references/cast.md` | the cast: `engine/cast/cast.json` schema, character profiles, voices, adding a character |
| `references/art.md` | generating a new pose or vignette, and checking art |
| `references/sound.md` | voices, Whisper check, soundtrack, mix and master |
| `references/render-and-qa.md` | preview, render, QA and the engine pitfalls that cost hours |
| `references/cover.md` | delivery: the 1080x1920 cover and the 3:4 grid crop |
| `references/caption.md` | delivery: caption, first comment with the link, alt text, score |
| `references/batch.md` | more than one reel: the producer + art-director pipeline |
| `engine/README.md` | before touching the engine: layout, primitives, contracts |

## What comes out

Per reel, in `<workspace>/reel-NN-<slug>/` (workspace default `./reels-out`):

- `<date>-reel-NN-<slug>.mp4`: 1080x1920, 30 fps, H.264 High yuv420p (CRF 17, 22 Mb/s cap), AAC 48 kHz, -14 LUFS
  integrated, true peak ≤ -1 dBTP, 25–36 s;
- `<date>-reel-NN-<slug>-cover.png` (1080x1920) and `<date>-reel-NN-<slug>.md` (the ready caption).

`python3 "${CLAUDE_SKILL_DIR}/tools/gallery.py" <workspace>` writes `README.md`, `index.html` (a gallery to watch them
together) and `_grid-preview.jpg` (the covers as the profile grid shows them).

## Before you start

```bash
sh "${CLAUDE_SKILL_DIR}/tools/setup.sh" ./reels-out    # idempotent: copies engine/ to ./reels-out/engine and installs
```

It copies the engine over `<workspace>/engine` (never deleting files there), runs `npm install` (three + Playwright)
and `npx playwright install chromium`, fetches the open fonts (`tools/fonts.mjs`), generates the paper texture,
downloads Whisper `base.en` to `<workspace>/models/`, installs edge-tts and runs the GPU check. It needs `ffmpeg`,
`ffprobe`, `magick` (ImageMagick 7) and `whisper-cli` (whisper.cpp) on the PATH; `OPENAI_API_KEY` in the environment
only to generate poses (never print it).

⚠️ **Run the engine from the workspace copy, never from the skill folder.** `tools/reel.sh` refuses to: `out/` holds
GBs of frames. Work with absolute paths; put any logic with loops in a script under `engine/out/<id>/`.

## Steps

1. **Pick.** Number: the next free `NN` in the series (numbers never repeat: the link's `utm_content` is the reel id).
   Character and focus: the request decides; without one, one reel per character, each telling a concept the series
   has not told yet. Keep a one-line log per reel (focus, first line, cover, signature) so the series never repeats.
2. **Script** in `engine/src/reels/<id>.vo.js` (the lines) and a shot plan, following `references/script.md`. Run every
   line, on-screen text and cover title past the project's own copy rules. Do not stop for script approval: show the
   finished video.
3. **Voice:** `node tools/vo.mjs --reel <id>`. Every line ✓ in Whisper; ✗ = rewrite the line (`references/sound.md`).
4. **Art:** reuse existing poses (`cast.json`, `assets/reels/*/`); new poses (up to 3 per reel) with `tools/pose.mjs` +
   `prepare.mjs`, checked one by one (`references/art.md`).
5. **Animation** in `engine/src/reels/<id>.js`, starting from `src/reels/example.js` or the last approved reel of the
   same character. **The character barely moves while talking**: the kit ships `E.MOTION = 0.25`; one hop word per
   sentence, at most one gesture per line, the emotion comes from the pose swap.
6. **Preview:** at least two rounds of still sheets (`tools/still.mjs … --sheet`), the cover (`tools/cover.mjs`) and a
   VIDEO preview of a spoken stretch (a still cannot show motion). Criteria: section 13 of the style bible.
7. **Render:** `sh tools/reel.sh <id> 3 3` (voice + soundtrack + render with 3 sub-frames + master + cover + QA +
   delivery). Then the checks in `references/render-and-qa.md`.
8. **Deliver:** the caption `.md` copied from `templates/caption-template.md` (`references/caption.md`); done only when
   `node "${CLAUDE_SKILL_DIR}/tools/validate-caption.mjs" <md>` has no blocker and
   `python3 "${CLAUDE_SKILL_DIR}/tools/check.py" <workspace>` passes. Then rebuild the gallery.
9. **Report** in terms of what the viewer sees: the folder, what each reel tells, what you decided alone, what is left
   for the user to decide.

## Defaults (do not ask again)

- **Style: editorial** (`src/shots/style/editorial.js`) unless the project defines another kit.
- **Characters move much less while they talk.** At full amplitude the body sways on every word and steals the eye
  from the words; 0.25 is the tested value. What gives life is the cut, the camera, the pose swap and the marks
  drawing themselves. Never raise the factor or stack gestures "to add life".
- **Animated story with a fictional character, never a testimonial:** no character name on screen, in the voice or in
  the caption; no result metrics ("saved 3 hours"); what the product "did" is only what it really does today.
- **The product appears as proof, never as a promise**, in crisp readable type, with the labels the product really uses.
- **Voices** per character (edge-tts, set in `cast.json`), a separate brand voice for the signature and the CTA.
- **CTA, price and claims** come from the project's own copy; never invent a price or an offer.
- **Cover** `E.cover(…)` next to the MP4, essentials inside the 3:4 crop (y 240–1680).
- **Nothing is published or boosted** without an explicit request in that message.

## Ask

- A new character, a new style, or a pose of someone outside the cast: never invent cast members.
- A topic touching claims (price, results, testimonials, naming a competitor).
- Publishing, scheduling or uploading as an ad.

Do not ask about: script before voice, voice, music, cuts, cover, caption, or how much the character moves. Make it
and show it.
