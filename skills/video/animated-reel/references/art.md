# Art: new poses, vignettes and the check

A reel's character comes from three sources, in this order: a pose that already exists; a new pose generated from
it; never a new character (that is a question for the user). Paths are relative to the engine.

| where | what |
|---|---|
| `cast/cast.json` → `poses` | every approved pose of every character (`E.CAST.<id>.<pose>`) |
| `assets/cast/<id>/` | the character's portrait and kit poses |
| `assets/reels/<id>/` | what each reel generated (only the cleaned files; the `raw/` folder is scratch) |
| `assets/style/editorial/paper.png` | the backdrop (`paper.mjs` regenerates it identically) |

A pose from one reel works in any reel: its path is `/assets/reels/<id>/<file>.png` in the item. A pose used in 3+
reels moves to `assets/cast/<id>/` and into `cast.json`.

## New pose: `tools/pose.mjs` + `prepare.mjs`

```bash
node tools/pose.mjs --character <id> --n 2 \
  --out "$PWD/assets/reels/<reel>/raw/<pose>.png" \
  --scene "Full body from head to toe, <posture, view>, <concrete action with the hands>, <expression>; <2 to 5 props>."
node assets/style/editorial/prepare.mjs assets/reels/<reel>/raw/<pose>-1.png assets/reels/<reel>/<id>-<pose>.png
```

- **Identity:** the character's `refs` (portrait + one pose) go in as reference images; they lock face, outfit, line
  and palette at once. `--ref <png>` adds one more (an approved pose holding the prop the scene needs). Without refs
  the call is text-only (use it once, for the first portrait).
- **The prompt is never summarized.** `pose.mjs` joins on its own: the FULL `style_en` (`cast/style.json`), the
  character's anchors, their `skin` sentence (without it a stylized palette can flatten a dark skin tone into a
  silhouette, or wash it to beige), their `noLogo` sentence and "nothing floats around the figure". You write only the
  scene, in English.
- Legible words in the image only in double quotes in the scene; anything else becomes squiggles. Legible UI belongs
  to the engine, never to the image.
- `--dry` prints the prompt and refs without calling the API. `OPENAI_API_KEY` must be set (never print it); the model
  is `--model`, else `OPENAI_IMAGE_MODEL`, else the tool's default. ~20–25 s per image. Up to 3 poses per reel, `--n 2`
  each: the second variant is often the clean one.
- Each call writes `<pose>-1.png`, `<pose>-2.png` and a side-car `.json` (prompt, refs, timing, alpha check).

### `prepare.mjs`, always

The model **bakes proofreader's marks around the figure** even when told "nothing floats around" (the style prompt
asks for marks around the figure). In the video the marks draw themselves live; a baked one stays still and fights
them. `prepare.mjs` hard-cuts the alpha, removes the thin slate stroke outside the body mass and the loose islands,
and trims the transparent margin.

```bash
node assets/style/editorial/prepare.mjs <raw.png> <out.png>                 # default
node assets/style/editorial/prepare.mjs <raw.png> <out.png> --ring          # a light-blue ring baked around the hips
node assets/style/editorial/prepare.mjs <raw-plate.png> <out.png> --paper   # an opaque plate → vignette (cream → transparent)
```

- `--ring` only when the model drew a light-blue ring on top of the body: elsewhere light blue can be legitimate
  (trousers, lanyards, stickers) and `--ring` repaints it.
- Thin blue left on dark clothing: `--retouch x,y,w,h` (px of the INPUT image). A legitimate thin blue detail OUTSIDE
  the body (a loose cord): `--thin 0`. A big separate object disappears: `--large 0.15`.
- ⚠️ **Blue baked over CREAM does not come out** (`--retouch` only handles blue over ink): use the other variant. That
  is why you generate `--n 2`.
- Requires ImageMagick 7 (`magick`).

## Vignette (setting): `tools/plate.mjs` + `prepare.mjs --paper`

This style has no wall-to-wall plates: the setting is a magazine spot illustration resting on the page.

```bash
magick <an approved vignette>.png -background '#f4eee4' -flatten out/<reel>/ref-paper.png
node tools/plate.mjs --style editorial --style-ref "$PWD/out/<reel>/ref-paper.png" \
  --space "the left half and the whole upper half of the frame" --out "$PWD/assets/reels/<reel>/raw/plate-<x>.png" \
  --scene "A sparse magazine spot illustration printed on plain cream paper: <furniture + 2 to 4 objects>, all drawn in dip-pen ink line in the lower right quarter of the frame. Everything else is plain empty cream paper: no wall, no room, no window, no floor line beyond a short hatched shadow under <the furniture>."
node assets/style/editorial/prepare.mjs assets/reels/<reel>/raw/plate-<x>.png assets/reels/<reel>/vignette-<x>.png --paper
```

The plate's style reference is opaque (cream), so a transparent vignette is flattened on the paper first.

## Check every new image (look at each one, after `prepare`)

- Face and skin tone as the character's `skin` sentence says; never a flat silhouette.
- Hands: five fingers, the prop in the right hand, nothing melted.
- The character's anchors (hair, glasses, garments, props) are all there.
- **Zero logos:** zoom into shoes, laptop, phone and cup (`magick <png> -crop WxH+X+Y -resize 300% crop.png`). A
  swoosh has leaked before.
- Only the three colours (ink, cream, slate). Yellow, green or red on the character fails.
- No baked mark left (bracket, arrow, `^`, halo).

## Lessons that keep holding

- A generic style prompt ("cozy gouache", "ligne claire") comes back almost identical to the reference: name
  proportions, face, line, shading, texture and palette. That is why `style_en` is long.
- The model copies brand marks from the reference: clean the reference before using it.
- Retouching the image itself ("reproduce unchanged, only remove X") makes halos on thin lines: generate again instead.
- For a logo check by a vision model, use a strong one; small models miss logos.
