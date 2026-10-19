# Web UI skills

Patterns that keep list-heavy web apps consistent: one search/filter bar and one table for every list
screen, the wiring rules for screens in a framework-less single-page app, and a review that looks at every
changed screen at the widths and themes people use.

| Skill | Use it when a task… |
|---|---|
| `search-filter-bar` | Adds or changes a search box, *Filters* popover, status chips, view toggle or row of pills, or builds the shared bar |
| `data-table-list-view` | Adds or changes a List/table view, a column, a sort or a Cards · List toggle, or builds the shared table |
| `vanilla-spa-screen` | Adds or restructures a screen in a vanilla-JS SPA (hash router, global state, `innerHTML` render, delegated handlers) |
| `web-layout-review` | Creates or changes a screen, a shared component or the app's CSS, or is about to open a PR that touches the interface |

`search-filter-bar`, `data-table-list-view` and `web-layout-review` are framework-agnostic: the anatomy and rules
apply anywhere, and the reference API maps to components one to one. `vanilla-spa-screen` applies only to apps
without a UI framework.

```
skills/web-layout-review/
  SKILL.md              seed demo data, start the app, capture, check, wrap up
  layout-rules.md       a default rule set (width, alignment, frame, filters, phones) to adopt in a project
  scripts/capture.mjs   screenshots for every width x theme, with console errors, failed requests
                        and the elements that make the page scroll sideways
```

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install web-ui@empreiteiro-skills
```

Skills are then available as `/web-ui:search-filter-bar`, `/web-ui:data-table-list-view`,
`/web-ui:vanilla-spa-screen` and `/web-ui:web-layout-review`, and Claude loads them on its own when a task matches.

To make the layout rules load on their own in a project, copy `skills/web-layout-review/layout-rules.md` to
`.claude/rules/layout.md` with a `paths:` front matter for the screen, component and CSS files, and replace the
role names with the project's classes and components.

## Requirements for `web-layout-review`

- Node 18 or later.
- Playwright (`playwright` or `playwright-core`, in the project or installed globally) and a Chromium: Playwright's
  own (`npx playwright install chromium`), or one given in `CHROMIUM_PATH`.
