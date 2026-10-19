---
name: search-filter-bar
description: One consistent search/filter bar for every list screen of a web app. Search box first, a Filters button with a categorized popover, quick selectors (chips, a view toggle), trailing actions and an optional row of pills, with rules for counts, accent-insensitive matching, clearing, empty states, overflow and mobile. Use whenever a screen gains or changes a search box, filters, status or type chips, a view toggle or a row of filter pills, or when building the shared bar component itself. For the table under the bar see data-table-list-view.
---

# Search/filter bar

Every screen that searches or filters a list uses **the same bar**: one shared component with one set of
styles. Screens that hand-roll their own bar drift apart in height, order and behavior within weeks. When
the bar is missing something, evolve the shared component (and this skill) instead of patching one screen.

## 0. Map the project first

- Is there already a shared bar? Grep for `searchBar`, `SearchBar`, `FilterBar`, `.sbar`. If yes, use its
  API and follow its conventions. The rules below still apply.
- If not, build it once from the anatomy and the reference API below, migrate one screen, then the rest.
- Find the i18n file, the shared popover and chip components, and the test plan.

## 1. Anatomy

```
┌ bar card ───────────────────────────────────────────────────────────────┐
│ LABEL (eyebrow), or a clickable call to action                          │
│ [🔍 search ...........................] [Filters ▾] [chips|seg] [acts] │
│ (optional) second row: pills [a] [b] [c] [⋯]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

Fixed order on one row, with every control the same height (e.g. 42px):

1. **Search box.** Always first and always present. It grows to fill the row.
2. **Filters** (optional). A button that opens a popover: categories on the left, options on the right,
   *Clear all* at the top, an optional footer. Its badge counts the categories with an active filter.
3. **Quick selectors** (optional). What the user switches all the time, one click away:
   - chips for status or type;
   - an icon-only segmented toggle for the **view** (cards/list, list/board, chart types).
4. **Actions** (optional). Icon buttons at the end: refresh, create. A list's actions live here, not in the
   page header.

**Pills on a second row** are for one dimension that must stay in sight and doesn't fit on the row: the
source of each item, a time window, item types, status with counts, tabs like *All · Admins · Members ·
Pending*.

- **Overflow.** With many pills, add a "⋯" button that opens the full list in a popover. It **only appears
  when the pills don't fit**: after every render and on resize, measure the row, hide the pills that
  overflow, and show the "⋯". Lit pills never hide.
- **Few short options.** Without a "⋯", the row may scroll sideways on a phone. On desktop, hide the
  scrollbar.
- **One place per dimension.** A dimension that becomes pills leaves the popover. It never lives in both.
- **Single-choice pills** keep one pill always lit (usually *All*).
- **Counts** cover the **whole list**, not the search result, so the numbers don't jump while the user
  types. A pill with 0 may be hidden, except *All* and the lit one.

**Stable height across tabs.** When the pill row only exists in some states of a screen, render an empty
pill row in the others, so the content below doesn't jump when the view changes.

**Popover or quick selector?**

- Up to about 5 options of one dimension the user switches constantly → chips or pills.
- Everything else → the popover: several categories, long lists, multi-select, dates, the time window of
  indicators.
- Never put the same dimension in both.
- **Defaults.** A filter with a default value (e.g. the last 30 days) counts on the badge only when it
  differs from the default, and *Clear all* resets it to the default.

**No KPI cards above the bar.** The screen goes straight from its header to the bar and the list. Summary
dashboards and settings screens with headline numbers are the exception, not the rule.

## 2. Reference API (HTML-string components)

If the project renders with template strings, this shape works well. In a component framework, map each
function to a component with the same props.

| Function | Purpose |
|---|---|
| `searchBar(o)` | The bar. `o.label` (eyebrow) or `o.cta = { action, icon, label }`, `o.search`, `o.filter`, `o.quick`, `o.actions`, `o.below` (second row), `o.cls` |
| `o.search` | `{ action, value, placeholder, submit?, clearAction?, loading?, disabled?, extra? }` |
| `filterButton(o)` | `{ open, toggle, count, popover, icon?, label?, badge? }`. With another `icon` and `label`, it doubles as any dropdown with the same look (e.g. "Group by") |
| `filterPopover(o)` | `{ close, clear?, count?, cats?, activeCat?, catAction?, opts, foot?, title? }`. `cats = [{ id, label, n }]`, where `n > 0` lights the category's dot. Without `cats` it is a plain option list |
| `filterOpt(o)` | One popover row: `{ on, attrs, label, multi?, lead?, count?, disabled? }`. Radio by default, checkbox with `multi: true`; `lead` is HTML before the label (icon, color dot) |
| `chips(items)` | `[{ on, attrs, label, icon?, hue?, count?, title? }]`. Without `hue` the lit chip uses the accent color |
| `seg(items)` | `[{ on, attrs, icon, label }]`. Icon only; the label goes in `title` and `aria-label` |
| `pills(items, o?)` | Second-row pills, same item shape as `chips`; `o = { label?, more? }`, where `label` is the group's `aria-label` and `more = { open, toggle, popover }` turns on the "⋯" overflow |

Details of `o.search`:

- **`action` identifies the input** (e.g. `data-action`). If the app re-renders on every keystroke, this
  identity is what lets it restore focus and caret. Never leave the input without it.
- **`submit` wraps the input in a form**, so Enter runs the search (server-side or semantic search). Without
  `submit`, the list filters as you type.
- **The "×"** shows whenever there is text. Hide the browser's native one (`type=search`). By default,
  clearing empties the input and re-fires its `input` event, so the screen's normal handler updates the
  state. Pass `clearAction` only when clearing must do more, e.g. also drop server results.
- **`loading`** swaps the search icon for a spinner (server-side search).
- **`extra`** is HTML after the input. Make the search wrapper `position: relative`, so it can anchor a
  suggestions popover.

A **narrow variant** (a list column next to a detail pane) drops the label, keeps search and *Filters* on
one row, and anchors the popover to the card's left edge, so it opens over the detail pane instead of being
clipped.

## 3. Recipe (new or migrated screen)

1. **State:** the search text, the filters, `filterOpen` and `filterCat`.
2. **View:** put the bar between the page header and the list:

   ```js
   ${searchBar({
     label: t('projects.toolbar'),
     search: { action: 'projects-search', value: P.search, placeholder: t('projects.search_ph') },
     filter: filterButton({
       open: P.filterOpen, toggle: 'projects-filter-toggle', count: activeFilterCount(P),
       popover: P.filterOpen ? projectsFilterPopover(P) : '',
     }),
     quick: cardsListToggle(P.view, 'projects-view'),
     actions: refreshButton('projects-reload', P.loading),
     below: pills(STATUSES.map((st) => ({
       on: P.status === st, attrs: `data-action="projects-status" data-status="${st}"`,
       label: t('projects.status.' + st), count: counts[st],
     })), { label: t('projects.filter.status') }),
   })}
   ```

3. **Matching:** client-side search ignores case **and accents**. Fold both sides, so "cafe" finds "Café",
   and match every field the user would expect (name, description, id, owner):

   ```js
   const foldText = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
   ```

4. **Handlers:**
   - **input:** update the state and re-render. For server-side search, debounce.
   - **click:**
     - toggle, close (the backdrop), category and clear-all;
     - one handler per option. **Picking an option doesn't close the popover**, because categories
       combine. Only the backdrop and the toggle close it.
5. **Leaving the screen:** close its popover on route change. Search text and pills survive opening an item
   and coming back.
6. **Empty list:** tell "there is nothing yet" apart from "nothing matches the search or filters". The second
   one offers to clear them.
7. **i18n:** the label (lowercase; the CSS uppercases it), the placeholder, categories and options, in every
   locale.
8. **Test plan:** update the screen's scenarios, and the bar's own section if its behavior changed.

## 4. Rules

- Search always comes first. Nothing goes before it on the row.
- One short label per bar, in the infinitive ("search and filter tasks"). A screen may swap the label for a
  call to action.
- The popover opens anchored to the button's right edge and is pushed back inside the window if it leaks.
  Don't position it by hand per screen.
- Refresh is an icon action at the end of the bar, spinning while loading, not a button in the page header.
  The bar also renders while loading and after a load error, so refresh stays reachable.
- No per-screen CSS for the bar.

## Verification checklist

- Every theme the app ships.
- Mobile width:
  - the search takes its own row, with the controls below on the right;
  - chips and pills scroll sideways;
  - the popover stays inside the screen.
- Typing keeps focus and caret. The "×" clears and refilters. Accents and case are ignored.
- The *Filters* badge counts active categories. *Clear all* resets only what is in the popover: not the
  search, not the pills.
- Pills with "⋯": with few options the "⋯" disappears; narrowing the window hides the last pills and shows
  it, and lit pills stay.
