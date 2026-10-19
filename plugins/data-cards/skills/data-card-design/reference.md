# Data card reference

A default spec that has shipped: adopt it as is, or use it as the checklist of
decisions your own spec has to make. In a code base that already has cards,
its geometry module and themes are the source of truth — not this page.

## A module layout that works

```
cards/
  types.ts          the CardSpec, the body union, CardResult = { ok: true, spec } | { ok: false, reason }
  builders/         pure functions: data in, CardSpec out (one file per family of cards)
  render/
    geometry.ts     every constant the builders and the renderer share
    Card.tsx        the sheet and the switch over body kinds
    texture.tsx     the generated SVG textures
    respond.ts      spec + theme -> ImageResponse (the route and the fixtures renderer both call it)
  themes.ts         the theme objects and the texture choice
  fonts.ts          font loading (subsets, loaded once, per format)
  overrides.ts      text edits and the parts filter read from the query, with the length limits
messages/
  cards-<lang>.ts   all copy, one file per language, the same keys in each
scripts/
  render-cards.tsx  the fixtures renderer (see SKILL.md, section 10)
```

## The sheet

| Constant | Value | What for |
| --- | --- | --- |
| Canvas | 1080 x 1080 | The square card |
| Margins | 88 sides, 52 top, 58 bottom | |
| Eyebrow → headline | 10 px | |
| Headline → subtitle | 34 px | |
| Subtitle → body | 24 px (46 when there is no subtitle) | |
| Between note lines | 10 px | |
| Plot height | 430 | Chart area with axes |
| X-label band | 44 | Under the plot |
| Y gutter | 104 minimum, or the longest label at 13 px per character, or 0 when no mark has a name | |
| Plot width | 800 | With the default gutter |
| Body width | 904 | Without a gutter |
| Value band | 42 | Reserved above bars when they carry a value or a marker |
| Circle / trace box | 452 / 508 | Side of a radial body / of a GPS trace |
| Hexbin box | 372 high, 22 columns | |

**Headline size** by the longest line: up to 18 characters 82 px, up to 24 →
74, up to 30 → 64, up to 38 → 54, above that 46. Line height 1.06, or 1.14
when a line after the first has an accented capital.

## Type, piece by piece

| Piece | Face | Size | Color |
| --- | --- | --- | --- |
| Eyebrow | Oswald SemiBold | 28, letter spacing 1 | `accent` |
| Headline | Anton | 82 / 74 / 64 / 54 / 46 | `ink` |
| Subtitle | Oswald SemiBold | 24, letter spacing 0.5 | `muted` |
| Y-axis tick | Inter | 25, set 16 px before the plot | `muted` |
| X-axis tick | Inter | 24, box centered on the point and clamped to the edge | `muted` |
| Value on a bar | Anton | 32 | the bar's tone |
| Marker name | Anton | 34 | `accent` |
| Month, day, hour, circle label | Oswald | 20–22 | `muted` |
| Series / group legend | Oswald | 23–24, uppercase; group value in Anton 32 | `muted` |
| Ends of a color scale | Inter | 22; swatches of 20 px, corner 4, gap 5 | `muted` |
| Table | header Oswald 30, row names Oswald 27 `muted`, values Anton 62 | | |
| Standalone stats | Anton 96, label Oswald 27 `muted` | | |
| Note | Inter | 27, line height 1.5 | `muted` |
| Unavailable card | Anton 62 (title) + Inter 30 (reason) | | `muted` |

All three faces are open source (SIL Open Font License) and available as TTF.

## Ten palettes

`onAccent` is the `bg` in all of them. The `heat` ramp goes from the `fill`
(or a tone just above the background) to the `accent` in five steps; Paper
uses its own green ramp, like a contribution calendar.

| Theme | `bg` | `ink` | `muted` | `accent` | `bar` / `barMuted` | `grid` / `fill` | Default texture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Night | `#0A0A0A` | `#FFFFFF` | `#8C8C8C` | `#D6F520` | `#FFFFFF` / `#5E5E5E` | `#262626` / `#1F1F1F` | plain |
| Ember | `#140805` | `#FFF1E8` | `#A3806F` | `#FF5C1A` | `#FFE0CC` / `#4D2C1C` | `#331C12` / `#2B150D` | plain |
| Ice | `#05121A` | `#EFFAFF` | `#6F93A3` | `#3BE0F0` | `#D6EDF5` / `#22414F` | `#122C38` / `#0E2430` | plain |
| Paper | `#F2EFE6` | `#14120E` | `#6E675B` | `#E0402B` | `#14120E` / `#BDB6A6` | `#D9D2C2` / `#DED7C7` | plain |
| Chlorophyll | `#06140D` | `#ECFFF4` | `#6E9480` | `#27F08A` | `#D4F5E3` / `#1E4030` | `#122C1F` / `#0D2418` | plain |
| Graph paper | `#EDF1F5` | `#0C1622` | `#5E7085` | `#1F5FD0` | `#0C1622` / `#AEBECE` | `#C9D7E4` / `#DAE4EE` | grid |
| Asphalt | `#141719` | `#F1F3F4` | `#8B9398` | `#F2C230` | `#D9DEE1` / `#3B4348` | `#272C30` / `#1E2326` | hatch |
| Graphite | `#07090D` | `#F2F5F8` | `#7F8B98` | `#FF4F8B` | `#DCE3EA` / `#2B323B` | `#262D36` / `#161B22` | grain |
| Aurora | `#0B0A1E` | `#F1ECFF` | `#8580B5` | `#B36BFF` | `#DCD3FF` / `#2C2757` | `#1C1940` / `#161334` | plain |
| Sand | `#F6EBDA` | `#221A10` | `#7B6851` | `#136F63` | `#221A10` / `#CDB99C` | `#E3D2B8` / `#EBDDC5` | plain |

## Textures

| Texture | What it is | How the color comes out |
| --- | --- | --- |
| plain | Flat color | — |
| grid | Graph paper, a 1 px line every 36 px | `grid` mixed 80% over the `bg` |
| hatch | 45° diagonal, a 9 px stroke every 24 px | `grid` mixed 35% over the `bg` |
| grain | Fine noise (`feTurbulence` base frequency 0.7, 2 octaves) | Graphite's whole surface; the theme gives only the highlight, lightened until it reaches 4.5:1 |
| paper | Noise stretched horizontally (0.3 × 0.9, 4 octaves) | A white sheet (`#FDFCF9`, ink `#16171A`); the highlight darkened until it reaches 4.5:1 |

Noise comes out in three opacities only (a discrete `feFuncA`). A theme
swatch in the interface can reuse the same shape in CSS at a scale that fits
a 26 px chip.

## Chart bodies

| `kind` | Use it for | The detail that matters |
| --- | --- | --- |
| `bars` | One value per slice: per split, per week, per zone, per block | The value written on the bar in the display face (32); a marker is a 2 px line in the highlight with its name in display 34; a 42 px band reserved on top when there are values or a marker |
| `area` | A profile along distance or time (elevation, a drift) | A 3 px `ink` line over a `fill` area; annotations in the label face (26) in the highlight, with an 8 px dot |
| `table` | A few groups against a few metrics (morning against evening) | Header label 30, row names label 27 `muted` in a 330 px column, values display 62 |
| `stats` | The closing numbers of a period | Four display-96 numbers in two columns, label-27 `muted` captions |
| `bars-table` | Monthly bars over a table of the same months' metrics | Bars aligned to the table's columns; the highlighted column in the highlight; values display 34 |
| `heatmap` | A value per day, as a contribution calendar | Cells up to 34 px; up to 7 weeks it turns into a transposed calendar (a week per row); a day outside the period is transparent, not empty |
| `grid` | Day of the week against hour of the day (a punch card) | Cells up to 40 px, a 74 px names column |
| `radial` | Shares around a circle (hours of the day, weeks of a year) | Slices from the center, no ring; a 452 px circle, labels outside in 90 × 34 boxes |
| `trace` | A GPS route without a map | A 508 px box, 5 px stroke; filled start, hollow finish |
| `scatter` | One dot per item and a fitted curve (pace against distance) | 7 px dots in `muted`, the curve in the highlight at 5 px |
| `hexbin` | A dense two-dimensional distribution | Hexagons binned in the builder (22 columns), colored by the `heat` ramp |
| `ridgeline` | One distribution per month, to compare shapes | Every ridge the same height (shape, not quantity); 2.2 steps of overlap; the median marked |
| `connected` | A connected scatter where the order is the data | 9 px dots, names placed by the collision solver |
| `waffle` | Shares of a total, one square per percentage point | 10 × 10; the legend carries each value in display 32 |
| `contour` | Where items concentrate, as a relief map | Three contour lines (2, 3, 5 px), the items almost faded out in `grid`, the summit as a cross |
| `candles` | The range of each period and whether it closed better or worse | A 2 px wick = the range; the body filled in the highlight when it closed better, hollow when worse |
| `range` | Two lines and the gap between them (short against long average) | The gap split into lobes where the lines cross; a legend with a stroke sample |
| `dendro` | Which periods look alike (hierarchical clustering) | No calendar; a single closest pair in the highlight (4 px), the rest 2 px |
| `radial-line` | One loop per item around a circle | Order in time is color (`heat`) AND stroke width |
| `bars-3d` | Several metrics for several periods, as isometric towers | 30° isometry, one scale per column, numbers only on the front row |
| `swarm` | One dot per item along one axis | Dot area by the square root of its size; off the scale, hollow at the edge |
| `stream` | Categories over time, as a streamgraph | Centered bands (none gets a baseline), painted by the `heat` ramp |
| `cumulative` | A running total, this period against the previous one | This period in the highlight (5 px), the previous one dashed `muted` (2.5 px), the gap at 16% |
| `dots` | One dot per item on a calendar axis | 4 px dots; dotted calendar rules at 35%; above the ceiling, hollow at the top |

Bodies with a fixed aspect, which center vertically: `heatmap`, `grid`,
`radial`, `radial-line`, `trace`, `waffle`.

## Social formats

| Phrase voice | Face | Size on a card post | Case | Line height | Letter spacing | Color | Max on a text-only post |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mono | JetBrains Mono 500 | 30 | upper | 1.6 | 3 | `ink` | 60 |
| serif | Newsreader | 56 | lower | 1.14 | 0 | `ink` | 104 |
| headline | Anton | 64 | upper | 1.1 | 0 | `ink` | 150 |
| eyebrow | Oswald | 32 | upper | 1.4 | 2 | `accent` | 68 |

- Card post: a 1080 × 1350 frame, the drawing at 80% around the center,
  between x = 178 and x = 902. The phrase starts 200 px from the top, up to 3
  lines of 64 characters; its size goes down to two thirds so the longest line
  fits whole.
- Text-only post: a 720 × 880 box (180 px margins), up to 8 lines of 120
  characters.
- Long-form posts: 180 px margin, a mono 24 eyebrow with spacing 4 at 170 px
  from the top, the title starting at 290 px (maximum sizes: mono 56, serif
  84, headline 104, eyebrow 60), prose in Inter 30, an optional mono 20
  footer, a 160 px base.
