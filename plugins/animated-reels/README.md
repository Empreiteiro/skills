# Animated reels

One skill and the engine behind it: a fictional drawn character tells, in first person, a moment of their day, the
problem they hit and what the product does about it, with the proof on screen. Every frame is a pure function of
time, so two renders of the same reel are identical.

| Skill | Use it when a task… |
|---|---|
| `animated-reel` | Makes an animated reel or short with characters for a product or creator, animates a script, adds reels to a series, or fixes one (motion, voice, end card, cover, caption) |

What comes out per reel: a 1080x1920 H.264 video at 30 fps, mastered to -14 LUFS, 25 to 36 seconds; a 1080x1920
cover; and the post caption as a `.md` file.

## What ships and what you bring

- `engine/`: the renderer (DOM + three.js in headless Chromium, through Playwright), the synthesized soundtrack, the
  voice and pose tools, and a neutral "editorial" style.
- One example character (`engine/cast/cast.json`, two flat SVG poses) and one example reel (`engine/src/reels/example.js`),
  so a fresh setup has something to render.
- No brand art and no font binaries. Your characters, poses and brand name are yours to add; the open fonts the style
  uses (Archivo, Source Serif 4, JetBrains Mono, Newsreader, Caveat) are downloaded by `engine/tools/fonts.mjs`, and
  the page falls back to system fonts without them.

## Requirements

- Node 18+, Python 3.9+
- `ffmpeg` and `ffprobe`, ImageMagick 7 (`magick`) and `whisper-cli` ([whisper.cpp](https://github.com/ggerganov/whisper.cpp)) on the PATH
- `OPENAI_API_KEY` in the environment, only to generate new poses

`skills/animated-reel/tools/setup.sh <workspace>` copies the engine to the workspace and installs the rest: the npm
packages, Playwright's Chromium, the fonts, the Whisper model and edge-tts. Run the engine from that copy, never from
the plugin folder: renders write gigabytes of frames.

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install animated-reels@empreiteiro-skills
```

The skill is then available as `/animated-reels:animated-reel`, and Claude loads it on its own when a task matches.
