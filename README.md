# Skills

Claude Code skills and the presentations built with them.

```
.claude-plugin/            plugin + marketplace manifests (install the skills with one command)
skills/                    the skills (one folder per skill, SKILL.md + scripts)
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

## Install

As a plugin (recommended):

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install presentations@empreiteiro-skills
```

Inside a session: `/plugin marketplace add Empreiteiro/skills`, then `/plugin install presentations@empreiteiro-skills`.
Skills are then available as `/presentations:presentation-review`, `/presentations:presentation-create`, and so on.
Updates: `claude plugin update presentations@empreiteiro-skills`.

Without the plugin system, copy the folders you want from `skills/` to `~/.claude/skills/` (personal) or to a
project's `.claude/skills/`. Copy `presentation-export` together with the check skills: they use its script.

## Requirements for the scripts

- Python 3.9+
- Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found)
- `pip install pymupdf pillow` for slide images and render comparison

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
