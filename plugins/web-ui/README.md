# Web UI skills

Patterns that keep list-heavy web apps consistent: one search/filter bar and one table for every list
screen, plus the wiring rules for screens in a framework-less single-page app.

| Skill | Use it when a task… |
|---|---|
| `search-filter-bar` | Adds or changes a search box, *Filters* popover, status chips, view toggle or row of pills, or builds the shared bar |
| `data-table-list-view` | Adds or changes a List/table view, a column, a sort or a Cards · List toggle, or builds the shared table |
| `vanilla-spa-screen` | Adds or restructures a screen in a vanilla-JS SPA (hash router, global state, `innerHTML` render, delegated handlers) |

`search-filter-bar` and `data-table-list-view` are framework-agnostic: the anatomy and rules apply anywhere,
and the reference API maps to components one to one. `vanilla-spa-screen` applies only to apps without a
UI framework.

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install web-ui@empreiteiro-skills
```

Skills are then available as `/web-ui:search-filter-bar`, `/web-ui:data-table-list-view` and
`/web-ui:vanilla-spa-screen`, and Claude loads them on its own when a task matches.
