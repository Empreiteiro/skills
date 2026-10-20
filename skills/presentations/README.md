# Presentation skills

Create HTML presentations from the template in [`presentations/_template/`](../../presentations/_template/) and check
them before they are shown: structure, rendered slides and facts. The decks themselves live in
[`presentations/`](../../presentations/README.md) at the repository root.

## Creating

| Skill | What it does |
|---|---|
| `presentation-create` | Start a new deck from `presentations/_template` and register it |
| `presentation-slide` | Add, edit, reorder or hide slides, with notes, explanations, fragments and controller steps |
| `presentation-graph` | Graph slides with D3: data, deterministic layout, legible labels, real datasets |
| `presentation-export` | PDF, one image per slide, or a single-slide screenshot at 1920×1080 (headless Chrome) |

## Checking

| Skill | What it does |
|---|---|
| `presentation-check-structure` | Slide list, notes, explanations, clicks, controllers, slide references, assets, pinned CDNs, console errors |
| `presentation-check-visual` | Renders every slide and inspects it; compares before/after renders to catch unintended changes |
| `presentation-check-facts` | Verifies claims and datasets against primary sources and records them |
| `presentation-review` | Runs the three checks and returns one prioritized report |

The checks use `presentation-export`'s script, so copying by hand: keep `presentation-export` with the
`presentation-check-*` skills. `presentation-create` and `presentation-graph` read the template and the reference
deck from `presentations/` at the repository root, which ships with the plugin.

## Requirements for the scripts

- Python 3.9+
- Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found)
- `pip install pymupdf pillow` for slide images and render comparison

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
