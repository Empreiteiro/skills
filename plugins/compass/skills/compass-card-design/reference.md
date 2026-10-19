# Card reference

The tables that `SKILL.md` summarizes. The source of truth is the code — if a
number here disagrees with it, the code wins and this page is out of date.

## The themes (`src/lib/cards/themes.ts`)

| Theme | `bg` | `ink` | `muted` | `accent` | `bar` / `barMuted` | `grid` / `fill` | Own texture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Night (`noite`) | `#0A0A0A` | `#FFFFFF` | `#8C8C8C` | `#D6F520` | `#FFFFFF` / `#5E5E5E` | `#262626` / `#1F1F1F` | plain |
| Ember (`brasa`) | `#140805` | `#FFF1E8` | `#A3806F` | `#FF5C1A` | `#FFE0CC` / `#4D2C1C` | `#331C12` / `#2B150D` | plain |
| Ice (`gelo`) | `#05121A` | `#EFFAFF` | `#6F93A3` | `#3BE0F0` | `#D6EDF5` / `#22414F` | `#122C38` / `#0E2430` | plain |
| Paper (`papel`) | `#F2EFE6` | `#14120E` | `#6E675B` | `#E0402B` | `#14120E` / `#BDB6A6` | `#D9D2C2` / `#DED7C7` | plain |
| Chlorophyll (`clorofila`) | `#06140D` | `#ECFFF4` | `#6E9480` | `#27F08A` | `#D4F5E3` / `#1E4030` | `#122C1F` / `#0D2418` | plain |
| Graph paper (`milimetrado`) | `#EDF1F5` | `#0C1622` | `#5E7085` | `#1F5FD0` | `#0C1622` / `#AEBECE` | `#C9D7E4` / `#DAE4EE` | grid |
| Asphalt (`asfalto`) | `#141719` | `#F1F3F4` | `#8B9398` | `#F2C230` | `#D9DEE1` / `#3B4348` | `#272C30` / `#1E2326` | hatch |
| Graphite (`grafite`) | `#07090D` | `#F2F5F8` | `#7F8B98` | `#FF4F8B` | `#DCE3EA` / `#2B323B` | `#262D36` / `#161B22` | grain |
| Aurora (`aurora`) | `#0B0A1E` | `#F1ECFF` | `#8580B5` | `#B36BFF` | `#DCD3FF` / `#2C2757` | `#1C1940` / `#161334` | plain |
| Sand (`areia`) | `#F6EBDA` | `#221A10` | `#7B6851` | `#136F63` | `#221A10` / `#CDB99C` | `#E3D2B8` / `#EBDDC5` | plain |

`onAccent` is the `bg` in all of them. The `heat` ramp goes from the `fill` (or
a tone just above the background) to the `accent`, in five steps; Paper is the
exception, with its own green contribution-map ramp.

**Textures** (`?textura=`), which apply to any theme:

| Texture | What it is | How the color comes out |
| --- | --- | --- |
| `lisa` (plain) | Flat color | — |
| `grade` (grid) | Graph paper, a 1 px line every 36 px | `grid` mixed 80% over the `bg` |
| `hachura` (hatch) | 45° diagonal, a 9 px stroke every 24 px | `grid` mixed 35% over the `bg` |
| `grao` (grain) | Fine noise (`feTurbulence` 0.7, 2 octaves) | Graphite's whole surface; the theme gives only the highlight, lightened up to a 4.5 contrast |
| `papel` (paper) | Noise stretched horizontally (0.3 × 0.9, 4 octaves) | The white sheet `FOLHA` (`#FDFCF9`, ink `#16171A`); the highlight darkened down to 4.5 |

The noise comes out in only three opacities (discrete `feFuncA`): with
continuous noise the PNG went past 1 MB. The theme swatch in the interface
uses `textureCss`, the same shape at a scale that fits in 26 px.

## The body shapes (`src/lib/cards/types.ts`)

Card names are the English gallery labels; the id each one goes by in the code
is in `CARD_NUMBER` (`src/lib/cards/meta.ts`).

| `kind` | Card(s) | What it solves, and the detail that matters |
| --- | --- | --- |
| `bars` | 01 every kilometre, 02 every block, 05 the fade, 07 week by week, 09 the home stretch, 11 the climbing, 12 the effort, 14 the zones, 33 efficiency, 36 the halfway point | One bar per slice; `display` writes the value (Anton 32), `marker` is the 2 px line in the highlight with its name in Anton 34; a 42 px band is reserved on top when there is a value or a marker |
| `area` | 03 the profile, 13 the drift | A 3 px `ink` line over a `fill` area; annotations in Oswald 26 in the highlight, 8 px dot |
| `table` | 04 night and day | Header Oswald 30, row name Oswald 27 `muted` (330 px column), value Anton 62 |
| `stats` | 06 the block | Four Anton 96 numbers in two columns, Oswald 27 `muted` label |
| `bars-table` | 08 month by month | Bars aligned to the table's columns; the `highlight` column in the highlight; values Anton 34 |
| `heatmap` | 10 consistency, 16 the effort calendar | GitHub-style grid (cells up to 34 px); up to 7 weeks it turns into a transposed calendar (a week per row); a day outside the period is transparent, not empty |
| `grid` | 15 the clock | Punch card: day against hour, cells up to 40 px, 74 px names column |
| `radial` | 26 the rose of hours, 37 the year in a ring | Slices from the center, no ring; 452 px circle, labels outside in a 90 × 34 box |
| `trace` | 34 the signature | GPS without a map, 508 px box, 5 px stroke; filled start, hollow finish |
| `scatter` | 27 the pace curve | 7 px dots in `muted`, fitted curve in the highlight, 5 px |
| `hexbin` | 38 the hive | Hexagons binned in the builder (22 columns), colored by the `heat` ramp |
| `ridgeline` | 39 the ridges | Every ridge the same height (shape, not quantity); overlap 2.2 steps; median marked |
| `connected` | 40 the trajectory | The order is the data; 9 px dots, names that look for room (`posicionaNomes`) |
| `waffle` | 41 a hundred squares | 10 × 10, one square per percentage point; legend with the value in Anton 32 |
| `contour` | 44 the relief | Three contour lines (2, 3, 5 px), workouts almost faded out in `grid`, the summit as a cross |
| `candles` | 46 the candles | 2 px wick = the week's range; body filled in the highlight if it closed faster, hollow if slower |
| `range` | 48 the load | Two lines and the gap split into lobes at the crossings; legend with a stroke sample |
| `dendro` | 49 the tree | Fitting without a calendar; a single meeting in the highlight (4 px), the rest 2 px |
| `radial-line` | 50 the orbits | One lap per workout; order in time is color (`heat`) AND stroke width |
| `bars-3d` | 51 the towers | 30° isometry, one scale per column, numbers only on the front row |
| `swarm` | 52 the swarm | Dot area by the square root of the distance; off the scale, hollow at the edge |
| `stream` | 53 the river | Centered bands (none gets a baseline), painted by the `heat` ramp |
| `cumulative` | 54 the running total | This period in the highlight (5 px), the previous one dashed `muted` (2.5 px), gap at 16% |
| `dots` | 55 the dust | One 4 px dot per workout; dotted calendar rules at 35%; above the ceiling, hollow at the top |

The empty numbers (17–25, 28–32, 35, 42, 43, 45, 47) are catalog designs
waiting for code or cards that left; they are not reused.

## Typography, piece by piece (`render/Card.tsx`)

| Piece | Typeface | Size | Color |
| --- | --- | --- | --- |
| Eyebrow | Oswald | 28, spacing 1 | `accent` |
| Headline | Anton | 82 / 74 / 64 / 54 / 46 | `ink` |
| Chart subtitle | Oswald | 24, spacing 0.5 | `muted` |
| Y-axis tick | Inter | 25, set 16 px before the area | `muted` |
| X-axis tick | Inter | 24, box centered on the point and clamped to the edge | `muted` |
| Value on the bar | Anton | 32 | the bar's tone |
| Marker name | Anton | 34 | `accent` |
| Month, day, hour, circle label | Oswald | 20–22 | `muted` |
| Series / group legend | Oswald | 23–24, uppercase | `muted` |
| Ends of the color scale | Inter | 22; 20 px swatches, corner 4, gap 5 | `muted` |
| Note | Inter | 27, line height 1.5 | `muted` |
| Unavailable card | Anton 62 (title) + Inter 30 (reason) | — | `muted` |

## Instagram (`cards/instagram.ts`, `render/Instagram.tsx`)

| Voice (`?frase=`) | Typeface | Size in the phrase | Case | Line height | Spacing | Color | Max in the text-only post |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mono` | JetBrains Mono 500 | 30 | upper | 1.6 | 3 | `ink` | 60 |
| `serifa` (serif) | Newsreader | 56 | lower | 1.14 | 0 | `ink` | 104 |
| `manchete` (headline) | Anton | 64 | upper | 1.1 | 0 | `ink` | 150 |
| `olho` (eyebrow) | Oswald | 32 | upper | 1.4 | 2 | `accent` | 68 |

- 1080 × 1350 frame; the drawing at 80% around the center, between 178 and
  902 px.
- Phrase 200 px from the top, up to 3 lines of 64; the size goes down to two
  thirds so the longest line fits whole.
- Text-only post: a 720 × 880 box, up to 8 lines of 120; short lines stay as
  they were written (poster), long text wraps between words (paragraph).
- Analysis and race posts: 180 margin, mono 24 eyebrow with spacing 4 at
  170 px from the top, title starting at 290 px (maximum: mono 56, serif 84,
  headline 104, eyebrow 60), prose in Inter 30, footer in mono 20, 160 px
  base.

## The geometry (`render/geometry.ts`)

| Constant | Value | What for |
| --- | --- | --- |
| `CANVAS` | 1080 | Side of the frame |
| `PAD_X` / `PAD_TOP` / `PAD_BOTTOM` | 88 / 52 / 58 | Margins |
| `PLOT_HEIGHT` | 430 | Height of the chart area with axes |
| `X_LABEL_HEIGHT` | 44 | Band for the X-axis labels |
| `Y_GUTTER` | 104 | Minimum Y-axis gutter |
| `PLOT_WIDTH` | 800 | Usable width with the default gutter |
| `LARGURA_CARACTERE` | 13 | Width estimate for an axis label |
| `VALUE_LABEL_HEIGHT` | 42 | Band for the value on the bar |
| `RADIAL_BOX` / `TRACE_BOX` | 452 / 508 | Side of the circle and of the trace |
| `HEX_MAX_HEIGHT` / `HEX_COLUMNS` | 372 / 22 | Box and grid of the hive |
| `CORPO_LARGURA` | 904 | Body width without a gutter |
