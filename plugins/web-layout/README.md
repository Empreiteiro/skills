# Web layout

A skill for reviewing the layout of web app screens **by looking at them**: start the app with deterministic
demo data, take Playwright screenshots of a screen at desktop and phone widths in every theme, and go through a
layout checklist. Framework-agnostic: anything that serves pages on localhost.

| Skill | What it does |
|---|---|
| `web-layout-review` | How to seed demo data and start the app, the screenshot matrix, the checklist, and a default set of layout rules to adopt |

```
skills/web-layout-review/
  SKILL.md              seed, start, capture, check, wrap up
  layout-rules.md       a default rule set (width, alignment, frame, filters, phones) to copy into a project
  scripts/capture.mjs   screenshots for every width x theme, with console errors, failed requests
                        and horizontal-overflow detection
```

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install web-layout@empreiteiro-skills
```

The skill is then available as `/web-layout:web-layout-review`; its description also lets Claude pick it up on
its own when a task changes a screen. Without the plugin system, copy `skills/web-layout-review/` to
`~/.claude/skills/` or to a project's `.claude/skills/`.

To make the rules load on their own in a project, copy `layout-rules.md` to `.claude/rules/layout.md` with a
`paths:` front matter for the screen, component and CSS files, and replace the role names with the project's
classes and components.

## Requirements

- Node 18 or later.
- Playwright (`playwright` or `playwright-core`, in the project or installed globally) and a Chromium: Playwright's
  own (`npx playwright install chromium`), or one given in `CHROMIUM_PATH`.
