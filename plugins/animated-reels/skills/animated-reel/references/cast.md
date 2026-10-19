# Cast

The cast lives in `engine/cast/`: `cast.json` (the characters) and `style.json` (the image-model prompt of the
style). The kit reads `cast.json` at load time: `E.CAST.<id>.<pose>` is the served URL of a pose and
`E.CHARACTERS.<id>` the whole entry. `tools/pose.mjs` reads both files to generate new poses.

Never invent a cast member: a new character is a question for the user. The engine ships ONE placeholder character
(`example`, two flat SVG poses) so the demo renders; replace it with your own.

## `cast.json`

```json
{
  "style": "editorial",
  "characters": [
    {
      "id": "example",
      "role": "A home baker who writes a weekly recipe newsletter",
      "voice": { "voice": "en-US-AvaMultilingualNeural", "rate": "+4%" },
      "facing": "left",
      "anchors": "short dark curly hair tied back with a slate-blue scarf, round glasses, a cream apron over a slate-blue shirt…",
      "skin": "",
      "noLogo": "Plain flat shoes and plain kitchen tools with no logo.",
      "refs": [],
      "poses": { "stand": "assets/cast/example/stand.svg", "point": "assets/cast/example/point.svg" },
      "profile": { "age": 34, "lives": "…", "work": "…", "routine": "…", "pains": ["…"], "quotes": ["…"], "never": ["…"] }
    }
  ]
}
```

| field | used by | meaning |
|---|---|---|
| `id` | kit, tools | lowercase id, used in code (`E.CAST.example.stand`) and `--character` |
| `role` | you | one line: who they are (never shown; no name anywhere) |
| `voice` | `.vo.js` | edge-tts voice and rate for their lines (`edge-tts --list-voices`) |
| `facing` | kit | where the BASE pose looks (`'left'`/`'right'`): pass it as `facing` to `E.character` |
| `anchors` | pose.mjs | the visual anchors IN THE STYLE (colours already translated into ink/cream/slate): hair, glasses, garments, props. The model keeps identity from them and the refs |
| `skin` | pose.mjs | optional sentence that locks how their skin tone renders. Needed when the style's palette pushes a skin tone wrong (a dark-skinned character rendered as a flat black silhouette, or as beige) |
| `noLogo` | pose.mjs | optional sentence naming the props that must carry no logo (shoes, laptop, phone, cup) |
| `refs` | pose.mjs | engine-relative transparent PNGs that lock identity AND style (the approved portrait + one pose). Empty → text-only generation (the first portrait) |
| `poses` | kit | name → engine-relative image (transparent PNG or SVG). Add every approved, cleaned pose here |
| `profile` | you | long profile for writing: age, where they live, work, routine, real pains, quotes in their voice, what they never do. Numbers here are story setting, never product statistics |

## `style.json`

`style_en` is the FULL image-style prompt (proportions, face, line, shading, texture, palette, how each original
colour translates into the three). Never summarize it: with a generic style prompt the model copies the reference
image instead. `nothing_around` asks for no marks around the figure (the model ignores it; `prepare.mjs` cleans up).

## Adding a character

1. Write the entry (role, voice, facing, anchors in the style's colours, skin and noLogo sentences, profile).
2. Generate the first portrait text-only: `node tools/pose.mjs --character <id> --n 2 --out <abs>/assets/cast/<id>/raw/portrait.png --scene "Full body from head to toe, standing, …"`.
3. Clean it with `prepare.mjs`, check it (`references/art.md`), save it as `assets/cast/<id>/portrait.png`, add it to
   `refs` and to `poses`. From then on every new pose keeps that identity.
4. Show the user the portrait before making reels with the character.

## Voices

Per character: one edge-tts voice and a rate that matches their temperament (+4% calm, +12% fast talker). The brand
closes in a separate voice (`VOICE` in the `.vo.js`). A multilingual voice speaking English with an accent is a fine
choice for a character from elsewhere, as long as Whisper transcribes it.
