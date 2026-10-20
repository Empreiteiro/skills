# Sound: voices, Whisper and the soundtrack

## Voices (edge-tts: free, with per-word timing)

| who | example voice | rate | why |
|---|---|---|---|
| a calm, ironic character | `en-US-AvaMultilingualNeural` | +4% | slow, clear |
| a fast talker | `en-US-BrianMultilingualNeural` | +12% | speed is character |
| a character from abroad | a multilingual voice of their country speaking English | +4% | an accent, on purpose; check Whisper still transcribes 100% |
| the brand (signature and CTA) | `en-US-AndrewMultilingualNeural` | +10% | one brand voice for the whole series |

In `<id>.vo.js`: `export const VOICE = { voice, rate }` (the brand) and each character line with `...HOST`
(`{ voice, rate }`, from `cast.json`). Line fields: `id`, `text` (what appears), `speech` (what is said, when
different), `t` (fixed start) or `gap` (seconds after the end of the previous line), `after` (the id of the line to
follow, default the previous one), `voice`, `rate`.

`node tools/vo.mjs --reel <id>`:
1. synthesizes each line with edge-tts's Python API (per-word timing needs `WordBoundary`, which the CLI does not
   expose), cached in `out/_tts/`;
2. places the lines and mixes `out/<id>/vo/vo.wav` at -16 LUFS;
3. checks each line with Whisper (`whisper-cli` + `models/ggml-base.en.bin`): ✓ if at most 8% of the words are missing;
4. writes `src/reels/<id>.vo.json` (GLOBAL time of every line and word): cuts, the lit caption word and the hop all read
   from it. Changed a line → run it again and review the cuts.

Environment: `EDGE_TTS_PYTHON` (the Python with `edge_tts`), `WHISPER_CLI`, `WHISPER_MODEL` (see `engine/README.md`).

## What Whisper has caught (and the rule that stayed)

| said | heard | rule |
|---|---|---|
| "didn't mark" | "did mark" (meaning flipped) | "did not", never "didn't" |
| "Not a scroll" | "Now to scroll" | avoid in speech |
| "Notes you keep" | "No two keep" | a sentence never ends on a short loose word |
| "…and hope" (end of sentence) | "…and help" | same |
| a two-word recipe line, in the music mix | a different word | also check the FINAL mix: Whisper on the last seconds and every short line |
| a compound term ("smallholder") | split in two | write it split in `speech` (same sound); on screen it can be two parts lighting up in turn |
| a plural that sticks to the next word | singular | the checker may accept it: ask for a human listen |

A ✗ line is rewritten, never accepted. A hyphenated term goes hyphenated on screen and unhyphenated in `speech`.

## Soundtrack (synthesized in code, no third-party licence)

- `export const MUSIC = E.MUSIC` (`{ style: 'editorial' }`): FM electric piano in ninth chords, a C–F–A bell motif,
  F major, 120 BPM. Two other arrangements share the same grid: `doodle` (playful: marimba, pizzicato, snaps) and
  `anime` (felt piano, slow strings, celesta). Audition another without touching the reel:
  `node tools/audio.mjs --reel <id> --style anime`.
- `SECTIONS` with the kit's names: `intro` (hook; `build: true` raises a riser to the turn) → `tension` (the problem)
  → `soft` with `voice: true` (the product under the voice; `energy` 0.7) → `final` (the end card). `voice: true` ducks
  the music ~19 dB under the voice. Also available: `groove`, `pulse`, `breakdown`, `silence`.
- `CUES`: `{ t: 0.1, type: 'motif' }` on the hook, `...E.sound.scene(shot)` of each shot, `...E.transition.marker.cues(t)`
  and `...E.endCues(C, { timing })`. Never repeat by hand what `sound.scene` makes; `{ skip: ['swish'] }` skips a type.
- Story foley: `clink` (ice in a glass), `page`, `pour`, `bikebell`. `boing` is for cartoon-doodle reels, not this style.

## Mix and master

`node tools/audio.mjs --reel <id>` (`reel.sh` runs it): renders the score in an OfflineAudioContext in Chromium, adds
the voice, masters with a true-peak limiter and a 2-pass loudnorm: **-14 LUFS integrated, -2 dBTP** (AAC encoding adds
up to ~0.8 dB, so the final file lands at ≤ -1 dBTP). The report in `out/<id>/qa/audio.txt` measures attacks against
CUES (aim for ≤ 30 ms). A score with transients that AAC clips: `TP=-3` in the environment.
