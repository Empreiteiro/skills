# Skills

Claude Code skills and the presentations built with them, in one plugin (`empreiteiro`). The skills are grouped by
category, one folder each under `skills/`, and every category has a README with what each skill does and what its
scripts need.

| Category | What it is for | Skills |
|---|---|---|
| [`presentations/`](skills/presentations/README.md) | Creating and checking HTML presentations | `presentation-create`, `presentation-slide`, `presentation-graph`, `presentation-export`, `presentation-check-structure`, `presentation-check-visual`, `presentation-check-facts`, `presentation-review` |
| [`writing/`](skills/writing/README.md) | Brand copy without AI tells, and the craft of fourteen forms from fiction to technical docs | `write`, `no-ai-slop`, `humanizer`, `writing-*` (14) |
| [`video/`](skills/video/README.md) | Video and motion made by code, rendered frame by frame | `animated-reel`, `kinetic-film` |
| [`memes/`](skills/memes/README.md) | Writing and rendering posts and reels for a humor/meme page | `meme-post`, `meme-chart`, `meme-reel`, `meme-game` |
| [`data/`](skills/data/README.md) | Answering questions over data and building data features with LLMs: profiling, text-to-SQL, connectors, reports, pipelines, security | `dataset-profiling`, `dataset-onboarding`, `text-to-sql`, `tabular-file-qa`, `join-discovery`, `grounded-answers`, `chart-spec`, `api-data-connector`, `data-reports-and-alerts`, `medallion-pipeline`, `lineage-and-versioning`, `identity-resolution`, `baseline-automl`, `secure-data-platform`, `llm-structured-output`, `sqlite-postgres-portability` |
| [`backend/`](skills/backend/README.md) | Multi-tenant SaaS backends: secure API routes, SQLite/Postgres schema changes, data-source integrations | `secure-api-route`, `sqlite-postgres-schema`, `data-source-integration` |
| [`frontend/`](skills/frontend/README.md) | Web UI: search/filter bar, sortable List view, SPA screens, React component placement, screen prototypes, data cards, layout review | `search-filter-bar`, `data-table-list-view`, `vanilla-spa-screen`, `atomic-design`, `ui-revamp-prototype`, `data-card-design`, `web-layout-review` |
| [`dev-workflow/`](skills/dev-workflow/README.md) | A change from request to production: worktree, gate, PR, deploy, proof by fetch | `implement`, `test-and-ship`, `ship`, `railway-ops` |
| [`ab-testing/`](skills/ab-testing/README.md) | Product A/B tests, from the design to promoting the winner | `ab-test-create`, `ab-test-promote-winner` |

```
.claude-plugin/
  marketplace.json         the marketplace, with one plugin: empreiteiro
  plugin.json              the plugin manifest; "skills" lists the category folders below
skills/
  <category>/              one folder per category, with a README.md
    <skill>/               one folder per skill: SKILL.md, plus scripts/, references/ or an engine when it has them
presentations/
  README.md                index of presentations and how to add one
  _template/               starter deck: copy it to start a new presentation
  <slug>/                  one folder per presentation (index.html, assets/, data/, README.md)
```

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install empreiteiro@empreiteiro-skills
```

Inside a session: `/plugin install empreiteiro --marketplace Empreiteiro/skills`. Skills are then available as
`/empreiteiro:presentation-review`, `/empreiteiro:write`, `/empreiteiro:kinetic-film` and so on, and Claude loads them
on its own when a task matches. Updates: `claude plugin update empreiteiro@empreiteiro-skills`.

### Coming from the per-area plugins

Until version 2.0.0 each area was a plugin of its own (`presentations`, `memes`, `saas-backend`, `web-ui`,
`data-analytics`, `data-cards`, `writing`, `dev-workflow`, `ab-testing`, `animated-reels`). They are no longer in the
marketplace: uninstall the ones you have and install `empreiteiro`.

```bash
claude plugin marketplace update empreiteiro-skills
claude plugin uninstall writing@empreiteiro-skills    # once per plugin you had installed
claude plugin install empreiteiro@empreiteiro-skills
```

The skill names did not change; only the prefix did (`/writing:write` is now `/empreiteiro:write`). The old
`saas-backend` skills are in `backend/`, `web-ui` and `data-cards` in `frontend/` (with `atomic-design` and
`ui-revamp-prototype`, which were in `dev-workflow`), `data-analytics` in `data/` and `animated-reels` in `video/`.

### Without the plugin system

Copy the skill folders you want from `skills/<category>/` to `~/.claude/skills/` (personal) or to a project's
`.claude/skills/`. Some skills use a sibling's files, so copy these together: `presentation-export` with the
presentation check skills; `dataset-profiling` and `text-to-sql` with `tabular-file-qa`; `write` with `no-ai-slop` and
`humanizer`; the four meme skills; `test-and-ship` with `ship`; and `ab-test-promote-winner` with `ab-test-create`.
`presentation-create` and `presentation-graph` also read `presentations/` from this repository.

## Requirements

Only the skills with scripts need anything installed; each category README has the details.

- **presentations**: Python 3.9+, Chrome/Chromium/Edge (`CHROME_PATH`), `pip install pymupdf pillow`.
- **video**: Node 18+ and ffmpeg for both; `animated-reel` also needs ImageMagick 7 and whisper.cpp, and its setup
  script installs the rest; `kinetic-film` needs Playwright with a Chromium.
- **memes**: `pip install pillow` and an ffmpeg for videos.
- **data**: Python 3.9+ and `pip install pandas openpyxl` for the scripts that read data files (`pyarrow` for
  Parquet and `sqlglot` for stricter SQL validation are optional).
- **frontend**: Node 18+ and Playwright with a Chromium for the layout review; `pip install pillow` for the card
  render comparison.
- **ab-testing**: Node 18+ and Playwright for the board scripts.

## Viewing a presentation

The latest version of every deck on `main` is published at <https://empreiteiro.github.io/skills/>, one page per
presentation (`https://empreiteiro.github.io/skills/<slug>/`); `.github/workflows/pages.yml` republishes it on every
push to `main` that changes `presentations/`. Locally, open `presentations/<slug>/index.html` in a browser.

Arrows or space to advance, `F` fullscreen, `O` overview, `S` presenter window (timer, current and next slide,
notes). Add `?all` (or `?todos` in older decks) to the URL to include hidden backup slides.
