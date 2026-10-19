# Skills

Claude Code skills, grouped into plugins, and the presentations built with them.

```
.claude-plugin/            marketplace manifest + the presentations plugin manifest
skills/                    presentations plugin: one folder per skill (SKILL.md + scripts)
presentations/
  README.md                index of presentations and how to add one
  _template/               starter deck: copy it to start a new presentation
  <slug>/                  one folder per presentation (index.html, assets/, data/, README.md)
plugins/
  data-analytics/          data-analytics plugin: .claude-plugin/plugin.json, README.md, skills/
```

| Plugin | Skills | What it covers |
|---|---|---|
| `presentations` | 8 | Create HTML presentations from a template and check them: structure, visuals, facts, full review |
| `data-analytics` | 16 | Answer questions over data and build data features with LLMs (see [its README](plugins/data-analytics/README.md)) |

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

## Data analytics skills

Distilled from building [Data Talks](https://github.com/Empreiteiro/data-talks), an LLM data-analysis platform, and
generalized: they hold the patterns that worked and the lessons from what broke, with no project-specific names.

| Group | Skills |
|---|---|
| Analysis | `dataset-profiling`, `dataset-onboarding`, `text-to-sql`, `tabular-file-qa`, `join-discovery`, `grounded-answers`, `chart-spec` |
| Integration and reporting | `api-data-connector`, `data-reports-and-alerts` |
| Data engineering | `medallion-pipeline`, `lineage-and-versioning`, `identity-resolution`, `baseline-automl` |
| Platform | `secure-data-platform`, `llm-structured-output`, `sqlite-postgres-portability` |

Descriptions, scripts and requirements: [plugins/data-analytics/README.md](plugins/data-analytics/README.md).

## Install

As plugins (recommended):

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install presentations@empreiteiro-skills
claude plugin install data-analytics@empreiteiro-skills
```

Inside a session: `/plugin marketplace add Empreiteiro/skills`, then `/plugin install presentations@empreiteiro-skills`
or `/plugin install data-analytics@empreiteiro-skills`.
Skills are then available as `/presentations:presentation-review`, `/data-analytics:text-to-sql`, and so on.
Updates: `claude plugin update <plugin>@empreiteiro-skills`.

Without the plugin system, copy the folders you want from `skills/` or `plugins/data-analytics/skills/` to
`~/.claude/skills/` (personal) or to a project's `.claude/skills/`. Copy `presentation-export` together with the
check skills: they use its script. Copy `dataset-profiling` and `text-to-sql` together with `tabular-file-qa`: it
uses their scripts.

## Requirements for the scripts

Presentations:

- Python 3.9+
- Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found)
- `pip install pymupdf pillow` for slide images and render comparison

Data analytics: Python 3.9+; `pip install pandas openpyxl` for the scripts that read data files (`pyarrow` for
Parquet, `sqlglot` for stricter SQL validation — both optional). Details per script in the plugin README.

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
