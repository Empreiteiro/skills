---
name: data-table-list-view
description: One consistent List view for screens that show items as cards and/or a table. A shared dataTable() with sortable headers, one value per cell, an info tooltip per column, a persisted sort and Cards · List choice, empty values sorted last, conditional columns, keyboard-activatable rows and an activity-blocks cell, plus mobile and theme rules. Use whenever a screen gains or changes a table or List view, a column, a sort or a Cards · List toggle, or when building the shared table component itself. Never hand-roll rows for a list. For the bar above the table see search-filter-bar.
---

# List view (shared data table)

When a screen shows its items as a **List**, that list is one table pattern: a shared `dataTable()` with one
set of styles. Hand-rolled rows, grids of divs and per-screen table CSS all drift. When the pattern needs
something new, evolve the shared component (and this skill).

## 0. Map the project first

- Grep for an existing shared table (`dataTable`, `DataTable`, `.dt`). If it exists, use its API. The rules
  below still apply.
- If not, build it once from the reference below, migrate one screen, then the rest.
- Find the search bar (`search-filter-bar`), the chips and avatars the cards already use, the i18n file and
  the test plan.

## 1. Anatomy and look

```
 Project ⓘ ▲▼      Activity ⓘ ▲▼          Owner ⓘ ▲▼     Status ⓘ ▲▼   Due ▲▼
 ═══════                                   (sorted column: accent + underline)
╭──────────────────────────────────────────────────────────────────────────────╮
│ ● Website        ▮▮▯▮▯▯▮▮▮▮  7          (A) Ana        At risk       12 Nov  │
╰──────────────────────────────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────────────────────────────╮
│ ● Onboarding     ▯▯▯▯▮▯▯▯▯▮  2          —              On track      —       │
╰──────────────────────────────────────────────────────────────────────────────╯
```

- **One row per item and one value per cell.** Nothing stacked: no meta line under the title, no two facts
  in one column.
- **No box and no divider lines.** Each row is its own strip in a subtle surface color (the side menu's shade
  works well), a few pixels apart, with slightly rounded ends. Hover darkens it a little. The header has no
  line under it, only the sorted column's accent underline.
- **Sortable headers** show ▲▼ with the active direction lit. The sorted column is in the accent color,
  underlined.
- **A column's explanation lives in its "i"**, shown on hover and focus and read by screen readers. Never
  put explanatory text above the table.
- **Empty values** show a muted `—`.
- **The first column** (name, title) uses the accent color, stays on one line and is cut with an ellipsis.
- **Narrow screens.** The table has a minimum width (e.g. 640px) and scrolls sideways inside its wrapper on
  a phone. The page itself never scrolls sideways.
  - In a flex column, the wrapper must not shrink, or a long list gets cut instead of scrolling to its last
    row.

## 2. Cards vs. List

- Screens with both views get an icon-only **Cards · List** toggle as a quick selector in the search bar.
  *Cards* is the default.
- The choice persists per browser: read `localStorage['<screen>_view']` on init and write it on change,
  both wrapped in `try {} catch {}` (storage can throw).
- Search, pills and filters apply to **both** views, before either one renders. Grouping renders one table
  per group, all sorted the same way.
- **The List is not a squashed card.** Narrative or multi-line info (an AI status line, a description,
  progress bars, lists of reasons) stays on the cards and the item page. The table keeps the facts that
  compare well across rows.

## 3. API

| Function | Purpose |
|---|---|
| `dataTable(o)` | The table. `o = { cols, rows, sort, sortAction, cls?, empty? }`. `cols = [{ id, label, info?, sort?, w?, align?: 'right'\|'center', cls? }]`; `rows = [{ attrs, cls?, cells: { [colId]: html } }]`; `sort = { key, dir: 'asc'\|'desc' }`; `sortAction` is the header buttons' action (each carries its column key); `empty` is the text of the single empty row |
| `dtSort(items, sort, get)` | Sorts a copy. `get = { colId: (item) => comparable }`. Strings compare with `localeCompare` (base sensitivity), numbers by value. `null` and `''` always go last, in both directions |
| `dtNextSort(cur, key, firstDir = 'asc')` | The next sort on a header click: the same column flips direction, another column starts at its `firstDir` |
| `loadTableSort(name)` / `saveTableSort(name, sort)` | The sort persisted per browser (`localStorage['sort_' + name]`). `null` means the screen's default |
| `activityBlocks(days, unit?)` | The Activity cell: one block per day (oldest → today), lit when `n > 0`, the total next to them, the day and count in each block's `title`. `days = [{ day: 'YYYY-MM-DD', n }]` |
| `cardsListToggle(active, action)` | The Cards · List segmented toggle |

Reference implementation of the two sorting helpers:

```js
function dtSort(items, sort, get) {
  const g = sort && get[sort.key];
  if (!g) return items.slice();
  const dir = sort.dir === 'desc' ? -1 : 1;
  return items.slice().sort((a, b) => {
    const x = g(a), y = g(b);
    const xe = x == null || x === '', ye = y == null || y === '';
    if (xe || ye) return xe === ye ? 0 : xe ? 1 : -1;            // empty always last
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y), undefined, { sensitivity: 'base' }) * dir;
  });
}

function dtNextSort(cur, key, firstDir = 'asc') {
  return cur && cur.key === key
    ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: firstDir };
}
```

Cell building blocks, styled next to the table's CSS:

| Class | Use |
|---|---|
| `.dt-title` | Main column: `<span class="dt-title">[dot/icon]<span>text</span></span>` |
| `.dt-person` | Avatar + name |
| `.dt-avatars` | Overlapping avatars, with every name in `title` |
| `.dt-muted` | Empty value `—`, or a muted note ("not tracked") |
| `.dt-num` | Numbers with tabular figures. Align the column `right` when it is all numbers |
| `.dt-link` | A link inside a row (one line, ellipsis) with its own action |
| `.dt-preview` | A one-line text excerpt with an ellipsis, and the full text in `title` |
| `.dt-status` | Status dot + name |
| `.dt-chips` | A few chips in one cell; past two, show `+N` with the full list in `title` |
| `.dt-id` | Ids and slugs, in a monospace font |
| `.dt-acts` + column `cls: 'dt-col-acts'` | Icon buttons at the end of the row (empty label) |
| column `cls: 'dt-col-check'` | A leading checkbox column (empty label) |
| row `cls: 'is-done'` | Strikes through the title (completed tasks) |
| row `cls: 'is-sel'` | The row whose item is open in a drawer next to the table |

Reuse the app's existing chips and pills inside cells, so a value looks the same in the table as on the
card.

## 4. Rows that open something

- **The whole row opens the item** through `attrs`: its action, plus `role="link"` (navigates) or
  `role="button"` (opens a drawer or modal) and `tabindex="0"`. One generic keydown handler makes **Enter**
  on a focused actionable row do what a click does. Don't add one per screen.
- **Controls inside a row** (checkbox, link, bookmark, delete) have their own action. The click handler
  resolves the innermost action, so they never trigger the row.
- **Drawers.** When a row opens a drawer beside the table, pass the open item's id into the table function
  and mark that row `is-sel` while the drawer is open.
- **Rows that open nothing** (e.g. a pending invitation) get no `attrs`: no action, no `role`, no `tabindex`.
  Their own buttons still work.

## 5. Columns and sorting

- **Make every comparable column sortable** and give it a getter. Sort by a meaningful value, not the
  rendered label:
  - a rank map for status, priority or stage;
  - a timestamp for dates;
  - the total for activity.
- **Each screen has a default sort** that makes sense (`X_DEFAULT_SORT`), e.g. projects by risk, messages
  by the latest one, keywords by most mentions. A screen may keep the server's order until a column is
  picked (`sort: null`).
- **First direction per column:** dates, numbers and activity start `desc` (largest or most recent first);
  text starts `asc`.
- **Conditional columns** are added only when they help: a *Folder* column only when the org uses folders, a
  *Relevance* column only during a search, a *Tenant* column only when the list mixes organizations.
  - Never show a column that would repeat the same value on every row.
  - When a saved sort points at a column that isn't shown, fall back to the default.

## 6. Activity column

- Ten blocks, one per day ending today **in the viewer's timezone**. The client sends
  `tz=${new Date().getTimezoneOffset()}`, and the server buckets by day and returns `days: [{ day, n }]`.
- The sort getter is the ten-day total, and the first direction is `desc`.
- An item without the data shows `—` or a muted note, never empty blocks.

## 7. Recipe (new List view)

1. **State:** `xView` from storage (default `'cards'`) and `xSort: loadTableSort('x')`, with a comment saying
   what `null` means.
2. **Table function** next to the card renderer:

   ```js
   const X_DEFAULT_SORT = { key: 'when', dir: 'desc' };

   function xTable(items, sort) {
     const dash = '<span class="dt-muted">—</span>';
     const rows = dtSort(items, sort, {
       name: (it) => it.name || '',
       count: (it) => it.count ?? null,
       when: (it) => (it.when ? Date.parse(it.when) : null),
     }).map((it) => ({
       attrs: `data-action="nav" data-href="#/x/${encodeURIComponent(it.id)}" role="link" tabindex="0"`,
       cells: {
         name: `<span class="dt-title"><span>${esc(it.name)}</span></span>`,
         count: it.count ? `<span class="dt-num">${it.count}</span>` : dash,
         when: it.when ? esc(fmtDate(it.when)) : dash,
       },
     }));
     return dataTable({
       cols: [
         { id: 'name', label: t('x.col.name'), sort: true },
         { id: 'count', label: t('x.col.count'), info: t('x.col.count_info'), sort: true, align: 'right' },
         { id: 'when', label: t('x.col.when'), info: t('x.col.when_info'), sort: true },
       ],
       rows, sort, sortAction: 'x-sort', cls: 'x-table',
     });
   }
   ```

3. **View:** the toggle goes in the search bar's quick selectors, and then
   `S.xView === 'list' ? xTable(filtered, S.xSort || X_DEFAULT_SORT) : cards(filtered)`.
4. **Handlers:**

   ```js
   if (a === 'x-sort') {
     const key = el.dataset.key;
     S.xSort = dtNextSort(S.xSort || X_DEFAULT_SORT, key, key === 'name' ? 'asc' : 'desc');
     saveTableSort('x', S.xSort);
     render();
     return;
   }
   if (a === 'x-view') {
     const v = el.dataset.view === 'list' ? 'list' : 'cards';
     try { localStorage.setItem('x_view', v); } catch {}
     S.xView = v;
     render();
     return;
   }
   ```

5. **Empty state:** pass `empty`, keeping "there is nothing" apart from "nothing matches".
6. **i18n:** every column label and every `info`, in every locale.
7. **Test plan:** the screen's columns, its default sort, the storage keys and what a row click opens.

## 8. Rules

- **No per-screen CSS that redraws the table** (borders, row backgrounds, header lines). Adjust a column's
  width through `w` or a column class. A screen class is only for content inside cells.
- **No *Sort* select above the table.** In the List view, the headers sort.
- **Keep cells on one line** (`white-space: nowrap` by default). Long text gets an ellipsis and the full
  value in `title`.
- **Themes.** Derive the row strips from theme tokens, so every theme gets matching rows.

## Verification checklist

- Lint.
- Every theme, and the mobile width: the table scrolls sideways inside its box, the page doesn't.
- Interactions:
  - hover and focus every "i";
  - sort by every column, twice;
  - reload: the sort and the view persist;
  - Tab to a row and press Enter;
  - click each control inside a row: it does its own thing, not the row's.
- Switch Cards · List with a search, pills and filters active: both views show the same items.
- A list taller than the window scrolls to its last row.
