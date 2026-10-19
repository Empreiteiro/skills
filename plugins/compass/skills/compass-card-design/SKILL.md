---
name: compass-card-design
description: The design system of the Compass training cards (the 1080x1080 PNGs from /api/cards and the 1080x1350 Instagram posts) — the sheet and its margins, the three typefaces and when to use each, the theme's color roles and where the highlight goes, the textures, the mark vocabulary (filled/hollow, robust scale, inverted pace axis), the voice of the eyebrow, headline, subtitle and note, and how to check the real PNG. Use whenever you create or change a card, a body shape, a theme, a texture, or an Instagram, analysis or race post — anything in src/lib/cards, src/app/api/cards or src/lib/i18n/messages/cards-*.ts — even if the request only mentions "the card text" or "the chart color".
---

# The card design system

A card is the only part of Compass that leaves the app and lands in someone
else's timeline. It is a PNG drawn on the server by Satori (the
`ImageResponse` from `next/og`), so its design system is not CSS: it is numbers
in `render/geometry.ts`, tokens in `themes.ts`, copy in
`i18n/messages/cards-*.ts` and a contract in `types.ts`. This skill condenses
the rules those files explain in long comments. The full reference (every
theme, every body shape, every type size) is in [`reference.md`](reference.md).

Paths are relative to `src/lib/cards/` unless they start with `src/`. Ids,
query parameters and identifiers are quoted exactly as the code spells them,
which is often in Portuguese (`?tema=noite`, `paraOsGlifos`).

## 1. The contract: whoever measures does not draw

- A card is a serializable `CardSpec`: `eyebrow`, `headline[]`,
  `subtitle?`, `caption[]` and a `body` with a `kind`. The builder
  (`builders/activity.ts`, `builders/period.ts`) produces it; the `Card`
  consumes it.
- The builder is a **pure function**: it fetches nothing. Data that costs a
  network call (pace profiles, the previous period) arrives ready in the
  `PeriodInput`.
- The drawing only receives **finished numbers**. Binning hexagons, tracing
  contour lines, projecting GPS, pushing the swarm, building the isometric
  table: all of it happens in the builder, in pixels of the box the body
  declares (`box`), because it is the TEXT that needs to know the result
  ("half of the workout fits in here").
- A constant shared by builder and drawing lives in `render/geometry.ts`,
  never written by hand on both sides.
- A card that cannot exist returns `{ ok: false, reason }`, and the reason is
  copy that explains what is missing ("This workout has no cadence data."),
  never an error. The route draws `renderUnavailable`.
- **Changing the drawing does not move a pixel for anyone who did not ask.**
  It is the principle every adjustment here respects: the texture on the
  square card comes out with the same numbers as before, the body only
  centers when the text really is gone, the room an accented headline takes is
  given back by the next margin. If your change moves every card, that has to
  be the intent, and stated in the PR.

## 2. The sheet

A **1080 x 1080** frame, margins `PAD_X` 88, `PAD_TOP` 52, `PAD_BOTTOM` 58.
From top to bottom, in a flex column:

| Part | Typeface | Size | Color | Notes |
| --- | --- | --- | --- | --- |
| Eyebrow (`eyebrow`) | Oswald SemiBold | 28, `letterSpacing` 1 | `accent` | Uppercase; the card's NAME, no number |
| Headline (`headline`) | Anton | 82 → 46 (`headlineSize`) | `ink` | Uppercase, 10 px below the eyebrow, line height 1.06 |
| Subtitle (`subtitle`) | Oswald SemiBold | 24, `letterSpacing` 0.5 | `muted` | Uppercase, **centered**, 34 px below the headline |
| Body (`body`) | — | — | — | 24 px below the subtitle (46 without it); `flexGrow: 1`, `overflow: hidden` |
| Note (`caption`) | Inter | 27, line height 1.5 | `muted` | A normal sentence, at the foot; 10 px between lines |

The card studio labels these parts Eyebrow, Headline, Caption (the
`subtitle`) and Note (the `caption`); this skill uses the field names.

- `headlineSize` picks by the longest line: up to 18 characters 82, 24 → 74,
  30 → 64, 38 → 54, above that 46.
- With an accented capital from the second line on (`ÁÂÃÀÉÊÍÎÓÔÕÚÛ`), the line
  height goes to 1.14 and the subtitle/body margin gives the room back — the
  accent of "TRÊS" was touching the line above.
- The body sits at the top and rests on the note. Fixed-aspect figures
  (`heatmap`, `grid`, `radial`, `radial-line`, `trace`, `waffle` — the
  `CORPO_CENTRADO` list) center vertically; any body centers when the headline
  or the note has been switched off.
- A chart area with axes has `PLOT_HEIGHT` 430 and the width left over by the
  Y-axis gutter (`Y_GUTTER` 104, or the width of the longest label at 13 px
  per character — `LARGURA_CARACTERE` —, or zero when no mark has a name).

**Satori's limits, which become rules:** flexbox only (every `div` gets
`display: "flex"`), no grid, `repeating-linear-gradient` or `pattern`;
**text never inside the `<svg>`** (Satori draws the SVG without the fonts) —
strokes and areas in the SVG, labels in an absolutely positioned `div` on top;
the bundle has a 500 KB ceiling, so no background PNGs. Text width is estimated
before layout (13 px per character on the axes, `caractere` per voice on
Instagram): the estimate errs on the high side, because shrinking is better
than overflowing.

## 3. Typography

Three typefaces, Latin subsets in `src/assets/fonts` (`cards/fonts.ts`):

- **Anton** (`FONT_DISPLAY`) — the card's voice: the headline, the number
  written on the data (32 on bars, 34 on the marker), the big numbers in the
  table (62) and in the standalone numbers (96), each group's value in the
  legend (32).
- **Oswald SemiBold** (`FONT_LABEL`) — labels: eyebrow, subtitle, category
  names (months, days, hours, 20–24), table header and rows (26–30), uppercase
  series legend (23–24), annotations (26).
- **Inter** (`FONT_BODY`) — whatever reads as text or as a scale: Y-axis
  (25) and X-axis (24) ticks, the ends of the color scale (22), the note (27).

**JetBrains Mono** and **Newsreader** belong to the brand and only load for the
Instagram posts (`instagramFonts`), so the regular card does not pay for
parsing them.

A glyph outside the subset comes out blank. The engine writes `−`, `≥`, `τ`,
`→`, `…`: every text that comes from the screen goes through `paraOsGlifos`
(`cards/instagram.ts`) before becoming a PNG. A new character in the copy?
Check that the font has it.

## 4. Color

No hex value in the render: every color comes from a `CardTheme`
(`themes.ts`).

| Token | Role |
| --- | --- |
| `bg` | Background |
| `ink` | Headline and main text; the profile line |
| `muted` | Subtitle, note, axes and labels |
| `accent` | The highlight: the eyebrow, the mark the headline announces |
| `onAccent` | Text on the highlight |
| `bar` / `barMuted` | Default mark / faded mark (context, below average, the "before") |
| `grid` | Grid line (1 px, derived from the mark's value) |
| `fill` | Area under the line, ridges, neutral gap |
| `heat[0..4]` | Intensity ramp, from near the background to `accent`, five steps |

- Marks ask for a color by **role**, never by value: `tone: "primary" |
  "muted" | "accent"`, resolved by `toneColor` (shape) and `toneInk` (text).
- **The highlight is the answer.** The `accent` goes on the eyebrow and on the
  mark the headline points to — the fastest kilometer, the peak week, the only
  pair of twin weeks in the tree — or, when the card compares, on the series
  for the present (the front row of the towers, this period's line, the most
  recent month of the ridges). Everything else is `bar` and `barMuted`: two
  highlights competing for the same question are none. A large area in the
  highlight goes to 16% opacity (the gap in the running total), otherwise it
  turns into a block of color.
- Intensity and order in time use the `heat` ramp, never invented colors; when
  color alone does not separate (orbits), stroke width changes along with it.
- Ten themes: `noite` (Night, the default), `brasa` (Ember), `gelo` (Ice),
  `papel` (Paper), `clorofila` (Chlorophyll), `milimetrado` (Graph paper),
  `asfalto` (Asphalt), `grafite` (Graphite), `aurora` (Aurora), `areia`
  (Sand). A new theme brings every token and a five-step ramp; the highlight
  has to read on the `bg`.
- **Texture is a separate choice** (`?textura=lisa|grao|papel|grade|hachura`
  — plain, grain, paper, grid, hatch), and without it each theme comes with
  its own. Grid and hatch are the grid color pulled towards the background —
  they sit BELOW the chart and do not compete with it. Grain and paper are
  surfaces: they bring Graphite's background (or the white sheet) and the
  theme paints only the highlight, pushed to a 4.5 contrast (`legivelSobre`).
  A texture is generated SVG (one `path` with many subpaths, or an
  `feTurbulence` filter), drawn before the content, in
  `render/texture.tsx`.

## 5. The mark vocabulary

Conventions that repeat across bodies — use the same ones before inventing:

- **Filled where it started, hollow where it is.** The start in filled
  `accent`, the finish in `bg` with a 5 px `accent` outline (signature,
  trajectory).
- **Off the scale = hollow.** The scale is robust (`eixoRobusto`: modified
  z-score up to 3.5, not a percentile, which fails on small samples); the
  extreme stays in the drawing, at the edge, outline only (swarm, dust).
  Do not let the outlier rule the scale, nor disappear.
- **Pace is an inverted axis**: the smallest value on top (`invert`), and the
  subtitle says "HIGHER = FASTER". When the quantity goes down as it improves,
  draw the one that goes up (the pace towers draw speed and write pace).
- **The before is dashed or at the back**: the previous period in `muted`,
  dashed or in the back row; the current one in a solid stroke.
- **Strokes**: data line 3 px, highlighted curve 5 px, wick and shared branch
  2 px, reference rule 1 px; routes with round caps and joins.
- **Cells** (calendar, clock, a hundred squares) with corners at 18% of the
  side and a gap between them; hexagons one pixel smaller than the grid
  radius, so the shape does not become a blot.
- **Circle**: zero at the top, clockwise, the label on the slice's MARK and not
  in its middle (`sliceAngle`, `noCirculo`); no outer ring.
- **Labels in a fixed-size box**, centered on the point and clamped to the edge
  of the drawing; collisions solved in `geometry.ts` (`posicionaNomes`) and
  proven in a test, not by eye.
- **The legend aligns with the DRAWING**, not with the card's margin; an empty
  label does not spend its gap.
- **Paint order is information**: whatever comes later sits on top — the
  present in front, the front ridge covers the mark of the one behind.
- **Window ceiling**: bars up to 104 weeks, calendar up to 53, monthly table up
  to 3 months. `limitar` shrinks the period keeping the END, and the subtitle
  gets " · LAST N MONTHS" — headline, subtitle and chart talk about the same
  slice.

## 6. The voice

All copy lives in `src/lib/i18n/messages/cards-pt.ts` and `cards-en.ts`, never
as a literal in the builder: a computed number goes in, a sentence comes out.
Both languages change together. The examples below are the English copy; the
Portuguese one follows the same rules.

- **Eyebrow**: the card's name, article and noun — "WEEK BY WEEK", "THE
  DRIFT", "A HUNDRED SQUARES". The number ("07") is identity and does not go
  on the artwork: it appears in the gallery (`07 · Week by week`) and in the
  downloaded file (`prefix-07-semanal.png`). A new number goes at the end of
  the queue (today, 56); gaps are not filled, and numbers that left (28, 42,
  43, 45, 47) do not come back.
- **Headline**: two short lines, each closing with a period, saying the number
  the drawing shows — "THE PEAK WAS 62 KM. / THE AVERAGE, 45 KM.". It **comes
  out of the calculation**: no fixed headline for a card that compares two
  numbers. It counts, it does not conclude ("TWO OF THREE CLOSED SLOWER", not
  "you close slower"). It talks about what was drawn, after the ceiling. In
  running, "the pace went up" reads as "got slower": say faster or slower.
- **Subtitle**: what the chart is, with the unit and the reading convention,
  separated by " · " — "AVERAGE PACE PER 2 KM BLOCK · HIGHER = FASTER".
- **Note**: one or two normal sentences, with the numbers the drawing does not
  write and the context to read it. A number at the start of a sentence is
  spelled out, capitalized.
- **Limits** (`LIMITS` in `overrides.ts`): eyebrow 44, headline 3 lines of 42,
  subtitle 76, note 4 lines of 240. Generated copy fits them with room to
  spare.
- **Units**: distance, climbing and grade go through `f.dist`, `f.numDist`,
  `f.subida`, `f.rampa` — never `f.num`; the word changes with it (`medida()`
  picks "kilometers" or "miles", "at km 7" or "at mile 7"). A round mark is
  chosen in the unit as READ. A unit is written once: "8 to 12 km".

## 7. Parts and editing

Every text is editable and travels in the query (`?olho=` eyebrow,
`?titulo=` headline, `?legenda=` subtitle, `?nota=` note, with `\n` between
lines); `?mostrar=` picks the parts — `olho`, `titulo`, `legenda`, `nota`,
`valores` (values), `eixos` (axes). Absent means everything; empty means only
the drawing. `applyText` runs before `applyParts`.

- A **value** is the number written on the data ("18 km" on the bar, the
  marker); an **axis** is the text of the scale (month, pace tick, end of the
  scale, series name). Without them the TEXT goes away; the grid, the bar and
  the curve stay. Table, standalone numbers and trace pass through untouched:
  there the text is the data.
- A new body has to go through both families in `applyParts` — the test
  "every body drawn today goes through the no-labels mode" enforces it.

## 8. The derived formats (admin only)

- **Instagram post** (`?formato=instagram`): the SAME card, without text
  (`specDoPost`), in a 1080 x 1350 frame, shrunk to 80% around the center and
  centered by the drawing's width — it stays between 178 and 902 px, inside the
  crops of the profile grid. Background and texture at the frame's size.
- **The phrase** (`?frase=`), 200 px from the top, in one of four voices:
  `mono` (JetBrains Mono, uppercase, letter-spaced), `serifa` (serif:
  Newsreader, lowercase), `manchete` (headline: Anton), `olho` (eyebrow:
  Oswald in the highlight — the only one that paints). Up to 3 lines of 64; the
  size shrinks so the longest line fits whole.
- **Text-only post** (`/api/cards/texto`): the theme's background and the text
  in a 720 x 880 box (the same 180 px margins); with no voice chosen, it speaks
  in the headline voice.
- **Analysis and race posts** (`render/Analise.tsx`, `render/Prova.tsx`):
  180 margin, mono eyebrow `SECTION · DETAIL` at 170 px, title ALWAYS starting
  at 290 px (side by side in the grid, nothing stepped), optional mono 20
  footer.
- **The race post reads the page's panel**; when the post needs to say the
  same with less (no split by sex, the short label, the approximate scale), the
  `Painel` brings its own drawing in the `post` prop — charts and, if there is
  one, the `Legenda`. The numbers come from the same calculation, in the same
  analysis.
- **The post's Instagram caption** goes outside the image: it opens with the
  name of the visual (bar chart, heat map...), explains how to read it and
  quotes nobody's numbers.

## 9. Adding things

**New card**: id in `ACTIVITY_CARDS` or `PERIOD_CARDS` (in number order),
number in `CARD_NUMBER`, name and hint in `cards` in
`i18n/messages/ui-pt.ts` and `ui-en.ts`, copy in `cards-pt.ts`/`cards-en.ts`
(eyebrow, headline, subtitle, note, reasons, phrase and Instagram caption), a
pure builder, tests in `tests/cards.test.ts`.

**New body shape**: an interface plus an entry in the union and in
`TODO_CORPO` (`types.ts`), the drawing in the `switch` of `Body`
(`render/Card.tsx`) using the `Moldura` (frame) when it has axes, both
families in `applyParts`, shared constants in `geometry.ts`, `CORPO_CENTRADO`
if it is a fixed-aspect figure.

**New theme**: every token (`onAccent` is the `bg`), a five-step ramp from near
the background to the `accent`, and check the five textures on it.

## 10. Checking — by looking at the PNG

A card bug does not show up in the typecheck: it shows up in the PNG. Render
without starting the app, with fixed data (a 21 km long run and the 16-week
block from the landing page). Run from the root of the Compass checkout — the
script resolves `@/` and the npm packages from the working directory:

```bash
DIR=$(mktemp -d)
node --no-warnings --import ./tests/register.mjs \
  "${CLAUDE_SKILL_DIR}/scripts/render.tsx" \
  --card semanal,splits --theme noite --out $DIR
```

`--all` draws all 36; `--card texto` is the text-only post. The race-analysis
posts come from `"${CLAUDE_SKILL_DIR}/scripts/race-posts.tsx"`, run the same way (`--race badwater-135
--panel passagem,abandonos`, plus `--theme`, `--texture`, `--lang` and
`--phrase`; without `--race`, all of them). The other options are the query
parameters with English names: `--theme` (`tema`), `--texture` (`textura`),
`--lang en` (`idioma`), `--units imperial` (`medida`), `--show
"titulo,eixos"` or `--show ""` (`mostrar`), `--format instagram --phrase
serifa` (`formato`, `frase`); the values are the app's ids. To see many at
once: `montage $DIR/*.png -tile 6x -geometry 360x360+6+6 $DIR/sheet.png`.

Read each PNG with the image tool and check, at least, on a dark theme and a
light one (`noite` and `papel`), with grain, in English and in miles, without
parts and on Instagram:

1. Nothing cut off: the top label of the axis, the name of the last month, the
   headline's accent, the number on the tallest bar.
2. A single highlight, and on the mark the headline announces.
3. The requested unit everywhere — number and word.
4. Without the parts, the drawing centered and no gap where the text was; the
   scale legend aligned with the grid.
5. On the post, the drawing within 178–902 px and the phrase without an orphan
   line break.
6. The cards you did NOT touch come out the same as before (render before and
   after and compare).

Then: `npm run typecheck`, `npm run lint` and the card tests —
`node --no-warnings --test --import ./tests/register.mjs tests/cards.test.ts
tests/temas.test.ts tests/instagram.test.ts tests/medidas.test.ts
tests/i18n.test.ts` (or `npm test`). Changed the Create or the Instagram
screen? Then it is the `compass-layout-review` skill.
