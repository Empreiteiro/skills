# Skills

Claude Code skills and the presentations built with them. The repository is a plugin marketplace with two
plugins: `presentations` (the repository root: `skills/` and `presentations/`) and `compass` (`plugins/compass/`).

```
.claude-plugin/            marketplace manifest, and the manifest of the presentations plugin
skills/                    the presentation skills (one folder per skill, SKILL.md + scripts)
plugins/
  compass/                 skills for the Compass training-analysis app (own manifest, README and skills/)
presentations/
  README.md                index of presentations and how to add one
  _template/               starter deck: copy it to start a new presentation
  <slug>/                  one folder per presentation (index.html, assets/, data/, README.md)
```

## Presentation skills

| Skill | What it does |
|---|---|
| `presentation-create` | Start a new deck from `presentations/_template` and register it |
| `presentation-slide` | Add, edit, reorder or hide slides, with notes, explanations, fragments and controller steps |
| `presentation-graph` | Graph slides with D3: data, deterministic layout, legible labels, real datasets |
| `presentation-export` | PDF, one image per slide, or a single-slide screenshot at 1920×1080 (headless Chrome) |

## Presentation checking skills

| Skill | What it does |
|---|---|
| `presentation-check-structure` | Slide list, notes, explanations, clicks, controllers, slide references, assets, pinned CDNs, console errors |
| `presentation-check-visual` | Renders every slide and inspects it; compares before/after renders to catch unintended changes |
| `presentation-check-facts` | Verifies claims and datasets against primary sources and records them |
| `presentation-review` | Runs the three checks and returns one prioritized report |

## Compass skills

For [Compass](https://github.com/Empreiteiro/training-analysis) only: they run the app's own modules, so they
need a checkout of it. See [`plugins/compass/README.md`](plugins/compass/README.md).

| Skill | What it does |
|---|---|
| `compass-card-design` | The design system of the training cards and Instagram posts, and a script that renders the real PNGs without starting the app |
| `compass-layout-review` | Seeds demo data, starts the app, screenshots a screen at 1440px and 390px in both themes, and goes through the layout checklist |

## Install

As a plugin (recommended):

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install presentations@empreiteiro-skills
```

Inside a session: `/plugin marketplace add Empreiteiro/skills`, then `/plugin install presentations@empreiteiro-skills`.
Skills are then available as `/presentations:presentation-review`, `/presentations:presentation-create`, and so on.
Updates: `claude plugin update presentations@empreiteiro-skills`.
For the Compass skills: `claude plugin install compass@empreiteiro-skills`.

Without the plugin system, copy the folders you want from `skills/` to `~/.claude/skills/` (personal) or to a
project's `.claude/skills/`. Copy `presentation-export` together with the check skills: they use its script.

## Requirements for the presentation scripts

The Compass skills have their own, listed in [`plugins/compass/README.md`](plugins/compass/README.md).

- Python 3.9+
- Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found)
- `pip install pymupdf pillow` for slide images and render comparison

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
