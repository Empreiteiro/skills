# Style bible: editorial

A magazine page in motion: ink, paper and slate blue, a character printed like a paper cut-out, proofreader's marks
that draw themselves, and the product UI as crisp type on a sheet. Paths below are relative to the engine
(`engine/` in the skill, `<workspace>/engine` when running). Kit in code: `src/shots/style/editorial.js`. Demo and
template: `src/reels/example.js` (not a deliverable). Kit art: `assets/style/editorial/` (the paper). Cast and image
prompts: `cast/`. A reel's own art: `assets/reels/<id>/`.

To adapt the style to a brand, change only: `E.BRAND` (lockup name), the slate if it clashes with the brand (keep it
a muted mid-dark blue-grey so the three-colour rule holds), the end-card accent (`COLOR.accent`) and the product
labels you pass to `E.product.*`. Everything else is the style.

## The idea in four rules (not negotiable)

1. **Three colours in the world and nothing else.** Ink `#2b2a28`, paper `#f4eee4`, slate `#4b638e`. The background is
   a magazine page: paper with fibre, no painted set behind. Setting comes in as a **vignette** (the desk, the lamp)
   resting on the page, never as a wall-to-wall plate.
2. **Slate is the writer's hand.** Every gesture of the person on the page is slate: the marker block over a word, the
   circle, the underline, the arrow, the bracket, the `^`, the check, the tally, the comment rule. Green (`#0a7646`)
   appears only when the **AI** proposes (the suggestion, the sweep, the insertion); red (`#9e1901`) only for the cut
   in a diff. The **accent red** (`#ae1803`) appears ONCE per reel: the lockup mark and the CTA button on the end card.
   The marker block is slate, not the accent: in the video the mark is the writer's gesture, and red mid-story would
   fight the diff's strike and steal the CTA.
3. **The world is an engraving; the screen is real.** Character, objects and marks are magazine pen work. Every UI
   (the draft, the comment, the rules, the versions, the chat) is crisp type on a sheet on the desk, in a pen-drawn
   laptop or on an ink panel. It never becomes an unreadable drawing: it is the proof of the story.
4. **Magazine animation, with a still character.** The character is a printed cut-out: no boil, breathes slowly and
   barely moves while talking (`E.MOTION`, 0.25). Emotion comes from the POSE (a hard swap on the frame) and the
   proofreader's pen around the head, not from a swaying body. Marks DRAW themselves live (`stroke` items); the camera
   glides like a reader. The FRAME never stays still for more than ~1 s; the character can.

Known risk of the style: three colours and a thin line vanish in a feed. The kit compensates: a big character (body
height 1000–1200 px), an 88–96 px headline with ONE word in a solid slate block, thick marks (thickness 6–8) drawn
on the spoken word, and the marker block crossing the whole frame at the turn of the story.

## 1. Motion language

| gesture | how | in the kit |
|---|---|---|
| enter | slides in from the side like paper on a desk (0.5 s, automatic swish) or is already there on the cut (`fx: 'cut'`); restrained pop (stretch 0.07) only for cartoon beats | `character({ enter: { t, from: 'left' } })` |
| breathe | 0.7% × 0.25 over 3.2 s + 0.15° × 0.25 sway; light contact shadow. No boil (the line is printed; the paper moves) | `character` default |
| talk | a 7 px × 0.25 (≈ 2 px) hop with a light squash on the STRONG word of the character's own line. Say which: **1, at most 2 per sentence** | `speech: { line: 'l2', words: ['changes'] }` |
| swap pose | hard cut on the frame with a 2% × 0.25 jolt (the cut-out replaced). The style's main gesture: a new emotion comes in a new pose. Dissolve only for time passing | `swap: [{ t, pose: 'point' }]` |
| gestures | `hop` · `startle` · `recoil` · `lean` · `sigh` · `headShake` · `nod` · `shrug` · `jolt`: short, back to rest, at 25%. **At most one per line**, preferably on the reaction (after the word), not on every word | `gestures: [{ t, type: 'sigh' }]` |
| calibrate | `E.MOTION` (0.25) applies to the whole reel; `motion` on one character applies only to it (e.g. 0.5 for a startle in a hook) | `character({ motion: 0.5 })` |
| react | the proofreader's pen around the head, in slate: startle (`!` + lines), doubt (`?`), relief (6-ray sparkle), idea (8-ray sparkle), frustration (scribble), tired (spiral + sweat drop) | `...E.reaction.tired({ x, y, t, side })` |
| facepalm, rubbing eyes, hugging papers | a new generated pose + hard swap + a gesture (`sigh`, `shrug`) + a reaction | — |
| exit | slides out (0.4 s, swish) | `exit: { t, to: 'right' }` |

- **Rhythm:** 6 to 9 shots of 2.5 to 5 s in a 25–35 s reel. The voice drives the cut: a shot starts ~0.1 s before the
  first word of its line. Inside a shot, SOMETHING happens in the frame every 1–1.5 s: a mark drawing itself, the
  caption lighting up, the camera, a pose swap. The character does not have to be that something.
- **Transitions (only four):** hard cut (default) · the slate **marker block** sweeping the whole frame on the cut (the
  marking gesture at frame scale; once or twice per reel, at the problem → product turn) · **page sliding in** (the
  sheet comes up from below with the `page` sound) · **cartoon panel** whose pen border draws itself.
- **Camera:** `camera.reader` (moves down ~30–50 px and pushes in 3–4%, like someone reading; an almost still hand) on
  character shots; `camera.pushIn` (2–3%) on product shots; `camera.pan` to reframe in steps. Never shaky. Only items
  with `depth` move: character and vignette have it (1 and 0.85); headline and caption do not (they stay on screen).
- **Hook:** the headline slams in at 0.02 s (readable in 0.5 s); the pen circles the passage when it is said; the slate
  block covers the key word when it is said.

## 2. Burned-in captions

Two voices, two designs:

- **The character speaks → cartoon caption** (`caption.cartoon`): Newsreader italic 500, **54 px**, in curly quotes, on
  a `#fbf8f2` paper strip with a 2 px ink rule: the caption under a magazine cartoon. The strip stays inside the safe
  band (x 90–940, centered at 515, up to 850 px wide), its BOTTOM fixed at y 1398 (grows upwards) or at the top
  (`atTop: true, y: 396`) when the bottom of the frame is busy. The spoken word lights up (unsaid words at 0.32; in the
  hook, `hook: true` = 0.8). `highlight`: ONE word gets the hand underline in slate when it is said.
- **The narrator or the brand → headline** (`caption.headline`): Archivo 700, 64 px, words come in as they are said and
  ONE (`mark`) gets the slate block on time.
- **Two lines per screen at most = ≤ ~60 characters per line of the `.vo.js`.** A longer sentence becomes two lines.
  The cartoon strip takes ~34 characters per line at 54 px: a two-word quoted term can break in the middle; shorten the
  line or force the break before the term.
- Check the break on a still: a lone word on the headline's 2nd line ("…keep the / pen.") asks for `size` 60 or a
  different split.
- Never over the face: with a big standing character, the caption goes at the bottom (the body, not the face, sits
  behind the strip) or at the top; with the product page on screen, at the top.

## 3. Backdrop and world

| token (`E.COLOR`) | value | role |
|---|---|---|
| `ink` | `#2b2a28` | line, text, the product button (charcoal, paper letters, square corners) |
| `paper` | `#f4eee4` | the ground of every scene (`E.SKIN`) |
| `slate` | `#4b638e` | everything the writer leaves on the page |
| `sheet` | `#fbf8f2` | the draft sheet, the caption strip, the comment card |
| `rule` · `muted` · `faint` | `#ddd4c6` · `#57534e` · `#6e6a63` | rules, secondary text, labels |
| `ai` · `aiWash` | `#0a7646` · `rgba(10,118,70,.13)` | the AI's suggestion (`E.SKIN_AI`) |
| `cut` · `insert` | `#9e1901` · `#0f7a3d` | the diff |
| `slateOnInk` | `#92a5c9` | slate on the ink panel (`E.SKIN_INK`) |
| `accent` | `#ae1803` | end card only |

- **Paper:** `...E.backdrop()` first in the item list. A static PNG (`assets/style/editorial/paper.png`, made by
  `paper.mjs`, deterministic): broad pulp + fine fibre darkening 1–4%. Static on purpose: a live `feTurbulence` cost
  ~40% of render time, and the master already adds moving grain to the luma.
- **Vignette** (`E.vignette`): a generated plate cleaned with `prepare.mjs --paper` (the cream turns transparent and
  only the drawing remains), resting on the page with no rectangle.
- **Cartoon panel** (`E.panel`): a pen frame with a clip; the zoom moves INSIDE and the frame stays still, as on a
  printed page. Character + vignette inside, cartoon caption below: the style's magazine panel.
- **Ink panel** (`skin: E.SKIN_INK`): `#2b2a28` ground, paper text. The place of the problem (a generic chat). **No
  full-body character on top**: dark trousers and hair vanish into the black (put the character on a paper panel).
- **Skins:** `E.SKIN` (paper, slate cards) · `E.SKIN_AI` (the same, cards and passages in AI green) · `E.SKIN_INK`.
  **One card colour per shot**: the writer's comment and the AI's suggestion go in different shots.

## 4. The product UI in this style

Recognizable as a product, dressed in the style: the sheet on the desk (long shadow, `rule` border, optional tilt),
the slate pen on top, the pen-drawn laptop when the scene needs a screen. Pass your product's real labels.

| piece | how it looks | kit |
|---|---|---|
| the draft | `#fbf8f2` sheet, Archivo 44 title, mono meta, Newsreader 38 body (one text: `<br><br>` between paragraphs; `<u id>` comment, `<s id>` cut, `<ins id>` insertion, `<span id>` target) | `product.page` |
| the comment | card pinned to the passage by the 3 px rule running down the sheet's margin, typed; label in slate | `product.comment({ target: 'doc.q', margin: page.x − 36 })` |
| the AI's suggestion | the same card labelled "Suggestion", in green (shot with `SKIN_AI`); the writer decides with the pen: `mark.check` on the one they accept, `mark.x` (or the card leaves) on the one they skip | `product.suggestion` |
| the button | charcoal, square corners, a click | `product.button({ label })` |
| the AI pass | the green band sweeps ONLY the marked passage; then the red strike and the green insertion (`strike`/`insert` gestures of the body, or of the title via `titleGestures`) | `product.sweep` + gestures |
| the untouched | character-by-character check in slate over what nobody marked + "✓ Unchanged" (30 px, a UI label: the proof must also be in the voice or the caption) | `product.unchanged` |
| rules | numbered list (slate mono index, Source Serif 36 text); a new one slides in from the right with the proofreader's bracket | `product.rules` |
| versions | a named LIST, the chosen one gets the slate wash and bar; click sound | `product.versions` |
| the chat (the problem) | "Chat", rounded bubbles (the style's only rounded corner), on the ink panel, fully inside x 90–940. With `id` on a message the pen circles the changed word INSIDE the bubble (`<b id="g">…</b>` + `mark.circle({ target: 'ai1.g', color: E.COLOR.slate })`) | `product.chat` |
| the screen | pen-drawn laptop around the UI | `product.laptop` |

Show only buttons the product really has, with the label it really uses.

## 5. Image recipe

New poses and vignettes: `references/art.md`. In short: identity comes from the character's `refs` in
`cast/cast.json`; the prompt joins the FULL `style_en` of `cast/style.json` (never summarized), the character's
anchors, skin and no-logo sentences and "nothing around the figure"; every generated image goes through
`prepare.mjs` (the model bakes proofreader's marks around the figure even when told not to).

## 6. Cover

`export const COVER = E.cover({ ... })`: paper, slate mono label, Archivo 104 title with ONE word in a block (`<em>`)
and a passage circled in pen (`<span id="c">`), the big character on the right bleeding off the bottom, the arrow from
their pen to the passage, the lockup at the bottom left (y 1560). Everything that matters inside the central 3:4
(y 240–1680). Rules and check: `references/cover.md`.

## 7. Closing

- End card **skin `editorial`** (paper; the accent red only on the mark and the button): `E.end(C, { signature, dur,
  timing })` in SHOTS and `...E.endCues(C, { timing })` in CUES. `signature` BECOMES the card title, 2–3 lines; `<i>`
  paints the second sentence muted: `'Small fixes.<br><i>Nothing else moves.</i>'`.
- The voice: two final lines in the brand voice (`VOICE` of the `.vo.js`): the signature line, then
  `{ gap: 0.3, text: '<CTA>. The link is in the first comment.' }`. The first starts ~0.05 s before the cut.
- `timing = { lockup: 0, title: 0.05, button: E.loc(w('l4', '<CTA word>'), C), free: button + 0.3, action: E.loc(w('l4', 'link'), C) }`;
  `dur = DUR − C` with `DUR = E.loc(F.end + 1.25, 0)` (the voice ends and 1.2 s remain).
- One signature line per reel, never repeated inside a series.

## 8. Sound

- `export const MUSIC = E.MUSIC` (`{ style: 'editorial' }`: FM electric piano, a C–F–A bell motif).
- SECTIONS with the usual names: `intro` (hook; `build: true` raises a riser to the turn) → `tension` (the problem) →
  `soft` with `voice: true` (the product under the voice) → `final` (end card). `groove` with `energy` if the middle
  asks for it.
- **A shot's CUES come from its items:** `...E.sound.scene(shot)` (GLOBAL time) makes a pen `scribble` (panned) for every
  `stroke` with a dur, `swish` for a sliding character, `page` for a sheet/panel sliding in, `pop` + `type` for a typed
  comment, `strike`/`type` for the diff, `sweep` + `shimmer` for the AI pass, `scan` + `bell` for the check, `click`
  for the button. `{ skip: ['swish'] }` skips a type; never add by hand what it already makes. Transition:
  `...E.transition.marker.cues(tCut)`. Motif in the hook: `{ t: 0.1, type: 'motif' }`.
- Story foley allowed: `clink`, `page`, `pour`. Details: `references/sound.md`.

## 9. The kit in code (`src/shots/style/editorial.js`)

`import * as E from '../shots/style/editorial.js'`. Pure factories (no state); coordinates in the 1080x1920 frame;
LOCAL shot time. Pieces that return a LIST go in with `...`.

| function | returns | essentials |
|---|---|---|
| `E.backdrop()` | list | the paper (first item) |
| `E.character(o)` | item | `src` or `poses`+`pose`, `feet`+`height`, `facing`, `enter`, `speech { line, words }`, `swap`, `gestures`, `move`, `exit`, `idle`, `shadow`, `depth` 1 |
| `E.vignette(o)` | item | `src`, `feet`+`height`, `depth` 0.85, `enter` |
| `E.panel(o)` | list | `x y w h`, `items`, `zoom { s, dur }`, `outline { t, dur }`, `enter` |
| `E.mark.circle/underline/strike/lasso/caret/bracket/arrow/check/x(o)` | item | `target 'textId.partId'` or `x y w h` / `from to`, `t`, `dur`, `depth` equal to the text's |
| `E.mark.query/note/tally(o)` | list | circled `?` · Caveat handwritten note (2–4 words, never the message) · IIII tally |
| `E.reaction.startle/doubt/relief/tired/idea/frustrated(o)` | list | `x y` (free side of the head), `t`, `stay`, `side` (tired) |
| `E.title(o)` | item | Archivo 96 headline, `<em>` = the marked word, `mark` (t of the block), w 850 |
| `E.caption.cartoon(o)` / `E.caption.headline(o)` | list | `F, line, start`, `highlight`/`mark`, `atTop`, `exit` |
| `E.product.page(o)` | item | `id`, `title` (+ `tid`, `titleGestures`), `meta`, `body`, body gestures, `attached [...]`, `lean`, `enter` |
| `E.product.comment/suggestion(o)` | item | `target`, `x y w`, `text`, `author`, `t`, `margin` |
| `E.product.button/sweep/unchanged(o)` | item | button (`label`, `press`) · AI pass · check |
| `E.product.rules/versions/chat/laptop(o)` | list | rules with `added` · versions with `click` · chat (`messages [{ side, html, y, t, id }]`) · laptop |
| `E.transition.marker.wipeIn(tEnd)` / `.wipeOut()` / `.cues(tCut)` | item/item/CUES | slate block on the cut |
| `E.camera.reader/pushIn/pan` | camera | `opts.camera` |
| `E.sound.scene(shot)` | CUES | section 8 |
| `E.cover(o)` / `E.end(start, o)` / `E.endCues(start, o)` | COVER / SHOT / CUES | sections 6 and 7 |
| `E.word(F, 'l2', 'changes')` / `E.loc(t, start)` | seconds | GLOBAL time of the word / global → local |
| `E.COLOR`, `E.SKIN`, `E.SKIN_AI`, `E.SKIN_INK`, `E.MUSIC`, `E.AREA`, `E.CAST`, `E.CHARACTERS`, `E.BRAND`, `E.GESTURE_NAMES`, `E.MOTION` | — | tokens and pieces |

Shot template (the full demo is `src/reels/example.js`):

```js
const w = (id, k, n) => E.word(F, id, k, n);
{ id: 'problem', mod: 'scene/scene', start: A, end: B, opts: { skin: E.SKIN,
  camera: E.camera.reader({ dur: B - A, y: -30, s: 1.04, origin: [540, 1150] }), items: [
    ...E.backdrop(),
    E.character({ id: 'host', poses: { base: E.CAST.example.stand, point: E.CAST.example.point },
      feet: [320, 1900], height: 1160, enter: { t: 0, from: 'left' }, speech: { line: 'l1', words: ['recipe', 'one'] },
      gestures: [{ t: E.loc(w('l1', 'cups'), A) + 0.05, type: 'sigh' }], swap: [{ t: E.loc(w('l1', 'one'), A) + 0.04, pose: 'point' }] }),
    ...E.reaction.doubt({ x: 360, y: 880, t: E.loc(w('l1', 'cups'), A) }),
    E.title({ id: 'hook', html: 'My recipe says<br><span id="h">two cups.</span><br>It means <em>one.</em>', y: 400, size: 88, mark: E.loc(w('l1', 'one'), A) + 0.02 }),
    E.mark.circle({ target: 'hook.h', t: E.loc(w('l1', 'two'), A) + 0.15 }),
    E.transition.marker.wipeIn(B - A),
] } }
```

## 10. Character voices

The character speaks in first person as an animated character (no name, never "the user"). In the `.vo.js`, per line:
the character's voice from `cast.json` (e.g. `en-US-AvaMultilingualNeural` +4%); the brand closes with `VOICE`. A
voice with a foreign accent is a valid choice for a character from elsewhere, as long as Whisper transcribes it. The
hop (`speech`) only on the character's own line. "did not", never "didn't"; a sentence never ends on a short loose
word. A line with ✗ in Whisper is rewritten.

## 11. Pitfalls

- **Never the engine's `sheet` item in this style:** inside it the palette goes back to the default red accent. The
  page is `product.page`.
- **Text up to x 940.** The kit's defaults respect it (headline and spoken headline w 850, caption strip centered at
  515, lists w 880). Hand-set `x`/`w` must too, UI included (a time label in the versions list or the button can slip
  to 943–946). Backdrop, character and vignette may bleed.
- **A reaction above the head hits the headline:** the title lives at y 400–600 and the big character's head right
  below (the reader camera lifts the world ~50 px). Anchor reactions on the free side (tired: `x, y` = the temple;
  `side: 'left'` flips). Near a frame edge, with a 4% reader zoom, anchor on the inner side of the head.
- **Matching `depth`:** a mark on fixed text (headline) has no `depth`; on the character, `depth: 1`; items inside
  `page.attached` move with the page. Full-frame light/vignette without `depth`.
- **One card colour per shot** (`SKIN` or `SKIN_AI`). The ink panel takes no full-body character.
- **A mark inside a chat bubble:** the bubble is light even on the ink panel; there the pen goes with
  `color: E.COLOR.slate` (the default `slateOnInk` vanishes on the bubble). Inside the bubble use `<b id>` or
  `<span id>`; not `<i>`.
- **An ink panel is never empty on the cut:** the first bubble comes in at t 0.05; 0.6 s of black with only the caption
  looks like an error.
- **A scrolling chat must not rise out of the safe area:** a band in the panel colour, opaque down to y ~370, lets the
  conversation scroll under it like a chat window.
- **Time:** `E.word` returns GLOBAL time; convert with `E.loc(t, start)`. The hook's key word needs ≥ 0.5 s visible
  before the marker block covers it (move the cut if not).
- **Gesture and hop on the same word add up** (a `hop` gesture on the speech-hop word lifts the head twice as much):
  on the hop word, no gesture; let the beat be a key press and its sound.
- **A mirrored vignette shows the PNG's straight cut edge:** with `mirror`, check which side carries the cut edge and
  push `feet` until it leaves the frame.
- **The sweep covers only the marked passage.** A sweep washing the whole line contradicts the promise. Measure the
  passage (`x`, `w` of the `<span id>`) and sweep only it.
- **`&nbsp;` does not hold a break in kit text** (`text()` splits on `\s`): use `<br>` where the break matters.
- **Continuous camera across a page-to-page cut:** the next shot opens on the framing the previous one ended on
  (`pushIn` 1.025), or the sheet jumps on the cut.
- **Images:** run `prepare.mjs` on EVERY generated image; check for logos on a zoomed crop.
- **Captions:** 54 px or more, ≤ ~60 characters per spoken line. Mono labels (DRAFT, RULES, ✓ UNCHANGED) are UI chrome
  and never carry the message.

## 12. Pieces you may need to build in a reel

When the kit lacks a piece, compose it in the reel file from existing items (and move it into the kit only when 3+
reels need it): a versions list with a new row entering at the top and an "Add a label…" box, a project's document
list (`product.versions` with another title), a comment card without `target` (no rule).

## 13. Review (at least two rounds per reel)

`node tools/still.mjs --reel <id> --t <one frame per beat> --sheet --cols 6` and look at `sheet.png`. Criteria: it
looks like a magazine short, not a slide with a sticker · **the character almost still while talking** (at most one
gesture per line; check it on a video preview, a still does not show motion) · the FRAME changes every 1–1.5 s ·
everything readable on a phone · safe area (text within x 90–940, y 380–1410) · zero logos · the characters' identity
intact · the hook readable in 0.5 s.
