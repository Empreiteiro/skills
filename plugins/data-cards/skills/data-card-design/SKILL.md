---
name: data-card-design
description: Design and check shareable data cards — the PNG images an app draws on the server (Satori, or ImageResponse from next/og or @vercel/og) for people to post — a chart with a headline, a stats summary, a social-media post. Covers the builder/renderer contract, the sheet and margins, a three-role type system, color tokens by role with a single highlight, textures, a vocabulary of chart marks, the copy (eyebrow, headline, subtitle, note), editable parts, derived formats (4:5 social posts, text-only posts) and rendering fixtures to PNG to check them and catch unintended changes. Use when creating or changing a share card, a data-driven social or OG image, a card theme or texture, or a card's copy — even if the request only mentions "the card text" or "the chart color".
---

# Data card design

A data card is the part of an app that leaves it and lands in someone else's
timeline. It is a PNG drawn on the server — usually by Satori, often through
`ImageResponse` — so its design system is not CSS: it is numbers (a geometry
module), tokens (themes), copy (message files) and a contract (a typed spec).
This page gives the rules. [`reference.md`](reference.md) gives a complete
default spec you can adopt as is or use as a checklist: sheet, type scale,
tokens, ten palettes, textures, a catalog of chart bodies and a module layout.

In an existing code base, first find its equivalents of the spec type, the
builders, the renderer, the geometry constants, the themes and the copy, and
apply the rules there. Starting from scratch, use the layout in the reference.

## 1. The contract: whoever measures does not draw

- A card is a serializable spec: `eyebrow`, `headline[]`, `subtitle?`,
  `caption[]` (the note at the foot) and a `body` with a `kind` (`bars`,
  `area`, `table`, `heatmap`...). A builder produces it; the renderer consumes
  it.
- The builder is a **pure function**: data in, spec out. Anything that costs a
  network call (the previous period, a second data source) arrives ready in
  its input.
- The renderer only receives **finished numbers**. Binning hexagons, tracing
  contour lines, projecting GPS, laying out a beeswarm, projecting an
  isometric chart: all of it happens in the builder, in pixels of the box the
  body declares, because it is the TEXT that needs to know the result ("half
  of the volume fits in this box").
- A constant shared by builder and renderer lives in one geometry module,
  never written by hand on both sides.
- A card that cannot exist returns `{ ok: false, reason }`, and the reason is
  copy that explains what is missing ("This workout has no cadence data."),
  never an error. The route draws it as an "unavailable" card.
- **Changing the drawing does not move a pixel for anyone who did not ask.**
  The texture on the square card keeps its numbers when a new format needs a
  different one; the body only re-centers when the text really is gone; the
  room an accented headline takes is given back by the next margin. If your
  change moves every card, that has to be the intent, and stated in the PR —
  section 10 shows how to prove which cards moved.

## 2. The sheet

The default is a **1080 x 1080** square with margins of 88 (sides), 52 (top)
and 58 (bottom), in one flex column:

| Part | Role | Notes |
| --- | --- | --- |
| Eyebrow | label face, accent | Uppercase; the card's NAME, no number |
| Headline | display face, ink | Uppercase, 1–3 lines, size stepped by the longest line |
| Subtitle | label face, muted | Uppercase, centered over the chart: what it is and how to read it |
| Body | — | Grows to fill (`flexGrow: 1`, `overflow: hidden`) |
| Note (`caption`) | text face, muted | One or two normal sentences at the foot |

Sizes and gaps are in the reference. Three rules that are easy to miss:

- **Step the headline size by the longest line** (82 px up to 18 characters,
  down to 46 above 38), so short headlines are loud and long ones still fit.
- **Accented capitals need room**: from the second line on, a line with
  `ÁÂÃÀÉÊÍÎÓÔÕÚÛ` (or any tall diacritic in your languages) touches the line
  above at a tight line height. Open the line height for that headline only
  (1.06 → 1.14) and give the difference back in the next margin.
- **The body sits at the top and rests on the note.** Fixed-aspect figures
  (calendar heatmap, punch card, circle, GPS trace, waffle) center vertically,
  and any body centers when the headline or the note has been switched off.

**Satori's limits, which become rules:**

- Flexbox only: every `div` with more than one child needs `display: "flex"`;
  no CSS grid, no `repeating-linear-gradient`, no `pattern`.
- **Text never goes inside the `<svg>`**: Satori draws an SVG as an image,
  without the loaded fonts. Strokes and areas in the SVG; every label in an
  absolutely positioned `div` on top of it.
- Fonts as TTF, OTF or WOFF (not WOFF2). Ship subsets: a glyph outside the
  subset comes out blank, so check that the font has every character your
  code writes (`−`, `≥`, `→`, `…`) or normalize them before rendering.
- Keep the bundle small: on an edge runtime it has a size ceiling that counts
  fonts and images (500 KB for `@vercel/og` on Vercel). No background PNGs —
  textures are generated SVG.
- There is no text measurement before layout: estimate widths (about 13 px
  per character for a 24 px axis label) and err on the high side. Shrinking
  is better than overflowing.

## 3. Typography: three roles

- **Display** — the card's voice: the headline, the number written on the
  data (on a bar, on a marker), big standalone numbers, the value of each
  group in a legend. A condensed, heavy face (Anton in the reference).
- **Label** — eyebrow, subtitle, category names (months, days, hours), table
  headers and rows, uppercase series legends, annotations. A condensed sans
  (Oswald SemiBold).
- **Text** — whatever reads as a sentence or as a scale: axis ticks, the ends
  of a color scale, the note. A text face (Inter).

Fonts that only one derived format uses (a mono or a serif for social posts)
load only for that format, so the regular card does not pay for parsing them.

## 4. Color: tokens by role

No hex value in the renderer: every color comes from a theme object.

| Token | Role |
| --- | --- |
| `bg` | Background |
| `ink` | Headline and main text; the main line of a profile |
| `muted` | Subtitle, note, axes and labels |
| `accent` | The highlight: the eyebrow, the mark the headline announces |
| `onAccent` | Text on the highlight (usually the `bg`) |
| `bar` / `barMuted` | Default mark / faded mark (context, below average, the "before") |
| `grid` | Grid lines (1 px) |
| `fill` | Area under a line, ridges, neutral gaps |
| `heat[0..4]` | Intensity ramp, from near the background to the `accent`, five steps |

- Marks ask for a color by **role**, never by value: `tone: "primary" |
  "muted" | "accent"`, resolved by one function for shapes and one for text.
- **The highlight is the answer.** The `accent` goes on the eyebrow and on the
  mark the headline points to — the fastest split, the peak week, the one
  month that broke the record — or, when the card compares, on the series for
  the present (this period's line, the front row, the latest month). The rest
  is `bar` and `barMuted`: two highlights competing for the same question are
  none. A large area in the highlight goes down to about 16% opacity, or it
  becomes a block of color.
- Intensity and order in time use the `heat` ramp, never invented colors;
  when color alone does not separate the series, stroke width changes with it.
- A theme brings every token and a five-step ramp, and its highlight has to
  read on its `bg`.
- **Texture is a separate choice from the theme**, with a default per theme.
  Grid and hatch are the grid color pulled towards the background: they sit
  BELOW the chart and do not compete with it. Grain and paper are surfaces:
  they replace the background, and the theme only paints the highlight, pushed
  to a 4.5:1 contrast on the new surface. Generate textures as SVG (one `path`
  with many subpaths, or an `feTurbulence` filter) drawn before the content,
  and quantize noise to a few opacity levels — continuous noise made the PNG
  pass 1 MB.

## 5. The mark vocabulary

Conventions that repeat across chart bodies — reuse them before inventing:

- **Filled where it started, hollow where it is.** In a trajectory or a route,
  the start is a filled accent dot; the end is a `bg` dot with an accent
  outline.
- **Off the scale = hollow.** Use a robust scale (modified z-score up to 3.5,
  not percentiles, which fail on small samples); the extreme value stays in
  the drawing, at the edge, outline only. Do not let the outlier rule the
  scale, nor disappear.
- **When lower is better, say so.** For pace, time or rank, invert the axis
  (best on top) and write the convention in the subtitle ("HIGHER = FASTER"),
  or draw the quantity that rises (speed) and label it in the familiar one
  (pace).
- **The before is dashed or at the back**: the previous period in `muted`,
  dashed or in the back row; the current one in a solid stroke.
- **Strokes**: data line 3 px, highlighted curve 5 px, secondary strokes 2 px,
  reference rules 1 px; routes with round caps and joins.
- **Cells** (calendars, punch cards, waffles) with corners at 18% of the side
  and a gap between them; hexagons one pixel smaller than the grid radius, so
  the shape does not become a blot.
- **Circles**: zero at the top, clockwise, the label on the slice's mark and
  not in its middle; no outer ring.
- **Labels in fixed-size boxes**, centered on their point and clamped to the
  edge of the drawing; collisions solved in the geometry code and proven in a
  test, not by eye.
- **The legend aligns with the drawing**, not with the card's margin; an empty
  label does not spend its gap.
- **Paint order is information**: whatever comes later sits on top — the
  present in front of the past.
- **Window ceilings**: a chart has a maximum span (for example 104 weekly bars,
  53 calendar weeks, 3 monthly columns). Trim the period keeping its END, and
  say it in the subtitle (" · LAST 12 MONTHS") — headline, subtitle and chart
  talk about the same slice.

## 6. The voice

All copy lives in message files, one per language, never as a literal in the
builder: a computed number goes in, a sentence comes out. Every language
changes in the same commit.

- **Eyebrow**: the card's name, article and noun — "WEEK BY WEEK", "THE
  DRIFT", "A HUNDRED SQUARES". If cards are numbered, the number is identity
  and stays off the artwork: it goes in the gallery (`07 · Week by week`) and
  in the file name (`07-weekly.png`). A new card takes the next number; gaps
  are not filled and retired numbers never come back, because someone has a
  downloaded file with that number.
- **Headline**: two short lines, each closing with a period, saying the number
  the drawing shows — "THE PEAK WAS 62 KM. / THE AVERAGE, 45 KM.". It **comes
  out of the calculation**: no fixed headline for a card that compares two
  numbers. It counts, it does not conclude ("TWO OF THREE CLOSED SLOWER", not
  "you fade at the end"). It talks about what was drawn, after any window
  ceiling. Avoid direction words that read both ways: "the pace went up" can
  mean slower; say faster or slower.
- **Subtitle**: what the chart is, with the unit and the reading convention,
  separated by " · " — "AVERAGE PACE PER 2 KM BLOCK · HIGHER = FASTER".
- **Note**: one or two normal sentences, with the numbers the drawing does not
  write and the context to read it. A number that starts a sentence is
  spelled out.
- **Limits**: enforce a maximum per part (eyebrow 44 characters, headline 3
  lines of 42, subtitle 76, note 4 lines of 240) for edited text, and write
  generated copy well inside them.
- **Units**: every quantity with a unit goes through a unit-aware formatter
  (never a plain number formatter), and the word changes with it
  ("kilometers" or "miles", "at km 7" or "at mile 7"). Pick round marks in the
  unit as displayed. Write the unit once: "8 to 12 km", not "8 km to 12 km".

## 7. Editable parts

Every text is editable and travels in the query (eyebrow, headline, subtitle,
note; `\n` between lines), and one parameter picks the parts to show —
eyebrow, headline, subtitle, note, values, axes. Absent means everything;
empty means only the drawing. Apply the text edits first, then the parts.

- A **value** is the number written on the data ("18 km" on a bar, a marker's
  label); an **axis** is the text of the scale (months, ticks, the ends of a
  color scale, series names). Without them the TEXT goes away; the grid, the
  bars and the curves stay. Tables, standalone numbers and traces pass through
  untouched: there the text is the data.
- Every body kind has to handle both families. A test that runs every body
  through the "no labels" mode keeps new bodies honest.

## 8. Derived formats

- **Social post (4:5, 1080 x 1350)**: the SAME card without its text, scaled
  to about 80% around the center and centered on the drawing's own width.
  Profile grids show a cropped thumbnail of the post, so keep the drawing well
  inside the center (the reference keeps it between x = 178 and x = 902).
  Background and texture at the frame's size.
- **A phrase on the post**, at a fixed distance from the top, in one of a few
  voices — mono (uppercase, letter-spaced), serif (lowercase), headline
  (display face), eyebrow (label face in the highlight, the only one that
  paints). Up to 3 lines; shrink the size until the longest line fits whole.
- **Text-only post**: the theme's background and the text in a fixed box with
  the same side margins; short lines stay as written (a poster), long text
  wraps between words (a paragraph).
- **Long-form posts** (an analysis split over several images): fixed margins,
  a mono eyebrow `SECTION · DETAIL`, and the title ALWAYS starting at the same
  height, so the posts line up side by side in a grid.
- **A post that reuses a page's chart** renders the page's own component. If
  the post must say the same with less (fewer series, a short label, an
  approximate scale), the component provides that variant itself, fed by the
  same calculation — never a second computation of the numbers.
- **The post's caption** (the text published next to the image) opens with the
  name of the visual (bar chart, heat map...), explains how to read it and
  quotes nobody's personal numbers.

## 9. Adding things

- **New card**: an id in the list of cards (in number order), its number, its
  name and hint for the gallery, its copy in every language (eyebrow, headline,
  subtitle, note, unavailable reasons, social phrase and caption), a pure
  builder and tests.
- **New body kind**: the interface and its entry in the body union (and in any
  list of all kinds that tests iterate), the drawing in the renderer's switch
  (reusing the shared axis frame when it has axes), both label families in the
  parts filter, its constants in the geometry module, and the
  fixed-aspect-centering list if it is a fixed-aspect figure.
- **New theme**: every token, a five-step ramp from near the background to the
  accent, and every texture checked on it.

## 10. Checking — by looking at the PNG

A card bug does not show up in the typecheck: it shows up in the PNG. Keep a
fixtures renderer in the project (`scripts/render-cards.tsx` or similar) that
builds every card from **fixed, made-up data** — no randomness, nothing that
depends on the clock — and calls the same builder and the same render
function as the route, so it can never drift from production:

```tsx
// npx tsx scripts/render-cards.tsx --theme dark --out /tmp/cards/after
for (const id of requestedCards) {
  const result = buildCard(id, fixtures[id], locale, units);   // the route's builder
  const image = result.ok
    ? await renderCard(applyParts(result.spec, parts), theme)  // the route's renderer
    : await renderUnavailable(result.reason, theme);
  writeFileSync(path.join(out, `${number(id)}-${id}-${theme.id}.png`), Buffer.from(await image.arrayBuffer()));
}
```

Render the base branch into `before/` (from a `git worktree` of it, or after
a `git stash`), your change into `after/`, and compare:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/compare_renders.py" /tmp/cards/before /tmp/cards/after \
  --expect "07-*,12-*" --diff /tmp/cards/diffs
```

PNG renders are deterministic, so by default any changed pixel counts. Every
file outside `--expect` that changed is a regression until explained; open
its `-diff.png` to see where. To see many cards at once, put them on a contact
sheet (`montage /tmp/cards/after/*.png -tile 6x -geometry 360x360+6+6
sheet.png`).

Read each PNG with the image tool and check, at least, one dark and one light
theme, a surface texture, the longest language, the other unit system, the
no-parts mode and the social format:

1. Nothing cut off: the top label of the axis, the last category name, the
   headline's accents, the number on the tallest bar.
2. A single highlight, on the mark the headline announces.
3. The requested unit everywhere — number and word.
4. Without the parts, the drawing centered with no gap where the text was;
   legends aligned with the drawing.
5. On the social post, the drawing inside the safe area and the phrase
   without an orphan word on its last line.
6. The cards you did NOT touch come out the same as before (the comparison
   above).

Then run the project's typecheck, lint and the card tests.
