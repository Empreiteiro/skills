# Video and motion skills

Videos made by code, where every frame is a pure function of time: two renders of the same film are identical, and
any frame can be rendered alone to check it.

| Skill | Use it when a task… |
|---|---|
| `animated-reel` | Makes an animated reel or short with characters for a product or creator, animates a script, adds reels to a series, or fixes one (motion, voice, end card, cover, caption) |
| `kinetic-film` | Makes a kinetic-typography brand film, typographic ad or product film for a SaaS, cut to the BPM of a real music track |

The square posts and short reels of a meme page live in [`memes/`](../memes/README.md) (`meme-reel`, `meme-game`).

## `animated-reel`

A fictional drawn character tells, in first person, a moment of their day, the problem they hit and what the
product does about it, with the proof on screen. What comes out per reel: a 1080x1920 H.264 video at 30 fps,
mastered to -14 LUFS, 25 to 36 seconds; a 1080x1920 cover; and the post caption as a `.md` file.

What ships and what you bring:

- `animated-reel/engine/`: the renderer (DOM + three.js in headless Chromium, through Playwright), the synthesized
  soundtrack, the voice and pose tools, and a neutral "editorial" style.
- One example character (`engine/cast/cast.json`, two flat SVG poses) and one example reel
  (`engine/src/reels/example.js`), so a fresh setup has something to render.
- No brand art and no font binaries. Your characters, poses and brand name are yours to add; the open fonts the style
  uses (Archivo, Source Serif 4, JetBrains Mono, Newsreader, Caveat) are downloaded by `engine/tools/fonts.mjs`, and
  the page falls back to system fonts without them.

Requirements:

- Node 18+, Python 3.9+
- `ffmpeg` and `ffprobe`, ImageMagick 7 (`magick`) and `whisper-cli` ([whisper.cpp](https://github.com/ggerganov/whisper.cpp)) on the PATH
- `OPENAI_API_KEY` in the environment, only to generate new poses

`animated-reel/tools/setup.sh <workspace>` copies the engine to the workspace and installs the rest: the npm
packages, Playwright's Chromium, the fonts, the Whisper model and edge-tts. Run the engine from that copy, never from
the plugin folder: renders write gigabytes of frames.

## `kinetic-film`

A 1920x1080 brand film in the "the site stood up and started talking" style: the product's own fonts, tokens and
logo, the real interface vocabulary, a script the owner approves and a real track chosen by the owner, with every cut
on the BPM grid. The process runs in six phases: brief, a first build from scratch, N parallel versions (one
physics/camera idea each, blind to one another), the owner picking moments frame by frame on a contact sheet, a
final cut that ports the code of the chosen moments, and music and delivery. The skill's instructions are in
Portuguese.

What ships:

- `kinetic-film/engine/`: `index.html` (the 1920x1080 stage), `film.js` (a reference choreography with the helpers to
  port), `export/render.mjs` (steps the timeline frame by frame through `__seek(ms)` in headless Chromium, writes
  PNGs and encodes H.264; `--stills-only`, `--range`, `--audio`), GSAP 3.13 with SplitText in `vendor/` (GSAP
  standard license), and variable fonts in `fonts/` (Archivo, Newsreader, JetBrains Mono, Hanken Grotesk, Geist
  Mono) to replace with the brand's.
- `kinetic-film/references/`: `GUIDELINE.md` (the catalog of devices, semantic animation, transitions, the banned
  checklist), `prompt-templates.md` (the prompts of the three agent phases) and `reveal-recipes.md`.
- `kinetic-film/tools/contact-sheet.mjs`: the moment picker, an HTML page with one tab per version that exports the
  chosen `version @ M:SS.s` list.

Requirements: Node 18+, Playwright with a Chromium (`npx playwright install chromium`), and `ffmpeg` on the PATH (or
in `FFMPEG`). Copy the engine to a build folder per film and run it there, never from the plugin folder.

Skills are available as `/empreiteiro:animated-reel` and `/empreiteiro:kinetic-film`, and Claude loads them on its
own when a task matches.
