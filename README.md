# Skills

Claude Code skills and the presentations built with them. The repository is a plugin marketplace with three
plugins: `presentations` (the repository root: `skills/` and `presentations/`), `data-cards` and `web-layout`
(each in `plugins/<name>/`).

```
.claude-plugin/            marketplace manifest, and the manifest of the presentations plugin
skills/                    the presentation skills (one folder per skill, SKILL.md + scripts)
plugins/
  data-cards/              shareable data cards rendered to PNG (own manifest, README and skills/)
  web-layout/              layout review of web app screens with screenshots (own manifest, README and skills/)
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

## Data card skills

See [`plugins/data-cards/README.md`](plugins/data-cards/README.md).

| Skill | What it does |
|---|---|
| `data-card-design` | Design system for chart images shared from an app (Satori / `next/og`): sheet, type, color roles, chart marks, copy, social formats, and before/after render comparison |

## Web layout skills

See [`plugins/web-layout/README.md`](plugins/web-layout/README.md).

| Skill | What it does |
|---|---|
| `web-layout-review` | Seeds demo data, starts the app, screenshots a screen at 1440px and 390px in every theme, flags sideways overflow, and goes through a layout checklist |

## Install

As a plugin (recommended):

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install presentations@empreiteiro-skills
```

Inside a session: `/plugin marketplace add Empreiteiro/skills`, then `/plugin install presentations@empreiteiro-skills`.
Skills are then available as `/presentations:presentation-review`, `/presentations:presentation-create`, and so on.
Updates: `claude plugin update presentations@empreiteiro-skills`.
The other plugins install the same way: `claude plugin install data-cards@empreiteiro-skills`,
`claude plugin install web-layout@empreiteiro-skills`.

Without the plugin system, copy the folders you want from `skills/` to `~/.claude/skills/` (personal) or to a
project's `.claude/skills/`. Copy `presentation-export` together with the check skills: they use its script.

## Requirements for the presentation scripts

The other plugins list their own in their READMEs.

- Python 3.9+
- Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found)
- `pip install pymupdf pillow` for slide images and render comparison

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
