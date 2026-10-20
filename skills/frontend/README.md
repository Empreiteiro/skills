# Frontend skills

The interface side of a web app: consistent list screens, framework-less SPA screens, where React components live,
prototypes of a screen before any code, shareable data cards, and a review that looks at every changed screen at the
widths and themes people use.

| Skill | Use it when a task… |
|---|---|
| `search-filter-bar` | Adds or changes a search box, *Filters* popover, status chips, view toggle or row of pills, or builds the shared bar |
| `data-table-list-view` | Adds or changes a List/table view, a column, a sort or a Cards · List toggle, or builds the shared table |
| `vanilla-spa-screen` | Adds or restructures a screen in a vanilla-JS SPA (hash router, global state, `innerHTML` render, delegated handlers) |
| `atomic-design` | Creates, moves or splits a React component: where it lives, what it may import, what goes stale when it moves |
| `ui-revamp-prototype` | Rethinks one screen: publishes a throwaway Artifact with the current state, a diagnosis and N directions to pick from before any code |
| `data-card-design` | Designs or checks a data card, the PNG an app draws on the server for people to share (Satori, `next/og`, `@vercel/og`) |
| `web-layout-review` | Creates or changes a screen, a shared component or the app's CSS, or is about to open a PR that touches the interface |

`search-filter-bar`, `data-table-list-view` and `web-layout-review` are framework-agnostic: the anatomy and rules
apply anywhere, and the reference API maps to components one to one. `vanilla-spa-screen` applies only to apps
without a UI framework, `atomic-design` to React apps.

Skills are available as `/empreiteiro:search-filter-bar`, `/empreiteiro:web-layout-review` and so on, and Claude loads
them on its own when a task matches.

## Layout review

```
web-layout-review/
  SKILL.md              seed demo data, start the app, capture, check, wrap up
  layout-rules.md       a default rule set (width, alignment, frame, filters, phones) to adopt in a project
  scripts/capture.mjs   screenshots for every width x theme, with console errors, failed requests
                        and the elements that make the page scroll sideways
```

To make the layout rules load on their own in a project, copy `web-layout-review/layout-rules.md` to
`.claude/rules/layout.md` with a `paths:` front matter for the screen, component and CSS files, and replace the
role names with the project's classes and components.

Requirements: Node 18 or later, and Playwright (`playwright` or `playwright-core`, in the project or installed
globally) with a Chromium: Playwright's own (`npx playwright install chromium`), or one given in `CHROMIUM_PATH`.

## Data cards

`data-card-design` targets cards rendered by [Satori](https://github.com/vercel/satori), directly or through
`ImageResponse` from `next/og` or `@vercel/og`, but most of it (the contract, color roles, chart marks, copy) applies
to any server-rendered chart image: the rules for the sheet, a three-role type system, color tokens by role with a
single highlight, textures, a vocabulary of chart marks, the copy of each part, editable parts and derived social
formats; and how to render fixtures and compare before/after.

```
data-card-design/
  SKILL.md                     the rules
  reference.md                 a complete default spec: sheet, type scale, ten palettes, textures,
                               a catalog of 24 chart bodies, social formats, a module layout
  scripts/compare_renders.py   before/after comparison of two folders of renders
```

Requirements: Python 3.9+ and Pillow (`pip install pillow`) for `compare_renders.py`; optionally ImageMagick's
`montage`, to put many renders on one contact sheet.
