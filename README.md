# Skills

Claude Code skills, grouped into four plugins, and the presentations built with some of them.

```
.claude-plugin/            marketplace manifest: four plugins, each listing its skills
skills/                    the skills (one folder per skill, SKILL.md + scripts, references, agents)
presentations/
  README.md                index of presentations and how to add one
  _template/               starter deck: copy it to start a new presentation
  <slug>/                  one folder per presentation (index.html, assets/, data/, README.md)
```

| Plugin | Skills | For |
|---|---|---|
| `presentations` | 8 | HTML decks: create, edit, graph, export, check |
| `writing` | 17 | Brand copy without AI tells, and the craft of fourteen forms |
| `dev-workflow` | 6 | A change from request to production, with proof it is live |
| `ab-testing` | 2 | Product A/B tests, from design to promoting the winner |

## Presentations

| Skill | What it does |
|---|---|
| `presentation-create` | Start a new deck from `presentations/_template` and register it |
| `presentation-slide` | Add, edit, reorder or hide slides, with notes, explanations, fragments and controller steps |
| `presentation-graph` | Graph slides with D3: data, deterministic layout, legible labels, real datasets |
| `presentation-export` | PDF, one image per slide, or a single-slide screenshot at 1920×1080 (headless Chrome) |
| `presentation-check-structure` | Slide list, notes, explanations, clicks, controllers, slide references, assets, pinned CDNs, console errors |
| `presentation-check-visual` | Renders every slide and inspects it; compares before/after renders to catch unintended changes |
| `presentation-check-facts` | Verifies claims and datasets against primary sources and records them |
| `presentation-review` | Runs the three checks and returns one prioritized report |

## Writing

| Skill | What it does |
|---|---|
| `write` | Brand writing system: voice and opinion templates you fill once, a claim check against the product, then the two passes below |
| `no-ai-slop` | Flags AI-slop patterns line by line and cuts them, keeping the writer's voice |
| `humanizer` | Rewrites what still reads as AI without changing what it says |
| `writing-academic-research` | Papers, abstracts, literature reviews, theses, responses to reviewers |
| `writing-blog-posts` | How-tos, tutorials, explainers, postmortems, announcements |
| `writing-books-fiction` | Novels, short stories, scenes, dialogue, opening pages |
| `writing-business-legal` | Contracts, memos, reports, proposals, grant applications |
| `writing-essays` | Personal and argument essays, columns, op-eds |
| `writing-ghostwriting` | Books, bylined articles, founder posts and speeches under someone else's name |
| `writing-journalism` | News, features, profiles, explainers, investigations, headlines |
| `writing-marketing-copy` | Landing and product pages, ads, launch emails, taglines, calls to action |
| `writing-newsletters` | Issues, subject lines and preview text, link digests, product updates |
| `writing-nonfiction-memoir` | Memoir, personal and reported narrative, biography, trade nonfiction |
| `writing-poetry` | Free verse, prose poems, fixed forms, spoken word, collections |
| `writing-scripts-speeches` | Screen and stage scripts, video and podcast scripts, talks, toasts |
| `writing-social-media` | LinkedIn and X posts, threads, captions, carousel text, replies |
| `writing-technical` | READMEs, tutorials, API references, runbooks, release notes, interface copy |

`write` reads two templates, `references/voice-dna.md` and `references/opinion-dna.md`. Fill them once per brand
(the skill drafts them from two or three samples of copy you like) and keep the filled copies in the project, for
example in `.claude/brand/`, so a plugin update does not overwrite them.

`humanizer` ([blader/humanizer](https://github.com/blader/humanizer)) and `no-ai-slop`
([petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop)) are vendored unedited under their MIT licenses.

## Dev workflow

| Skill | What it does |
|---|---|
| `implement` | Entry point for build/fix/change requests: isolates the work in a git worktree, reads the framework docs, checks the project's invariants, validates the premise against today's code, plans |
| `test-and-ship` | Runs the gate and fixes what fails, then commits, opens and merges the PR, deploys, and proves it by fetching the live site |
| `ship` | The same without the gate, for diffs that do not run (docs, skills, config) |
| `atomic-design` | Where a React component lives (atoms, molecules, organisms, templates, feature folders), what it may import, what goes stale when it moves |
| `ui-revamp-prototype` | A throwaway prototype of one screen, published as an Artifact: the current state, a diagnosis, N directions to pick from before any code |
| `railway-ops` | Operate an app on Railway: status, logs, deploys, variables, read-only Postgres, rollback |

These skills read project facts (gate commands, deploy command per environment, URLs, branch names, Railway IDs)
from the project's `CLAUDE.md` or `AGENTS.md`, and ask once for what is missing. Each one lists the facts it needs in
its "Project setup" section.

## A/B testing

| Skill | What it does |
|---|---|
| `ab-test-create` | Design the test with you, assign each account once at signup, gate the arms behind a flag, build the results board |
| `ab-test-promote-winner` | Snapshot the final board, send everyone to the winner, delete the losing arms, retire the flag, archive the test |

## Install

As plugins (recommended):

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install presentations@empreiteiro-skills
claude plugin install writing@empreiteiro-skills
claude plugin install dev-workflow@empreiteiro-skills
claude plugin install ab-testing@empreiteiro-skills
```

Install only the plugins you need. Inside a session: `/plugin marketplace add Empreiteiro/skills`, then
`/plugin install <plugin>@empreiteiro-skills`. Skills are then available as `/<plugin>:<skill>`, for example
`/presentations:presentation-review` or `/writing:write`. Updates: `claude plugin update <plugin>@empreiteiro-skills`.

Without the plugin system, copy the folders you want from `skills/` to `~/.claude/skills/` (personal) or to a
project's `.claude/skills/`. Some skills use a sibling's files, so copy these together:

- `presentation-export` with the presentation check skills (they use its script);
- `write` with `no-ai-slop` and `humanizer`;
- `test-and-ship` with `ship` (it uses ship's agents);
- `ab-test-promote-winner` with `ab-test-create` (it uses its board check).

## Requirements for the scripts

- Presentations: Python 3.9+, Google Chrome, Chromium or Microsoft Edge (set `CHROME_PATH` if it is not found), and
  `pip install pymupdf pillow` for slide images and render comparison.
- A/B testing: Node 18+ and Playwright (`npm i -D playwright`) for the board checks.

## Viewing a presentation

Open `presentations/<slug>/index.html` in a browser. Arrows or space to advance, `F` fullscreen,
`O` overview, `S` presenter window (timer, current and next slide, notes). Add `?all` (or `?todos` in older decks)
to the URL to include hidden backup slides.
