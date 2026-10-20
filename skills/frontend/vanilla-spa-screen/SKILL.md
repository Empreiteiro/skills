---
name: vanilla-spa-screen
description: Add or restructure a screen in a framework-less single-page app (plain JavaScript, a hash router, one global state object, a render() that rebuilds the page through innerHTML, delegated event handlers). Covers route parsing and old-URL aliases, state and loaders, the view, role and plan gates, the menu entry, handlers, focus and scroll preservation, escaping, i18n, mobile, themes and cache busting for new modules. Use whenever a task adds a route, menu entry or tab, moves a screen between menus, or adds a JS module to such an app. For a list screen's search bar see search-filter-bar; for its table see data-table-list-view.
---

# New screen in a vanilla-JS SPA

Some apps skip frameworks: one ES module with a hash router, a global state object `S`, a `render()` that
rebuilds the page with template strings and `innerHTML`, and event handlers delegated on `document`. That
architecture is fast to work in, but each screen has to be wired into several places by hand, and a few
rules keep `render()` from losing focus, scroll and safety.

If the app uses React, Vue, Svelte or similar, this skill doesn't apply. Only the checklist at the end does.

## 0. Map the project first

A screen touches these places, usually in this order. Find each one before starting (the file is often too
big to read whole, so grep for the section banners):

| # | What | Typical name |
|---|---|---|
| 1 | Route parser | `parseRoute()`: hash → `{ name, ...params }` |
| 2 | Route → screen map (plan gating, menu highlight) | `ROUTE_SCREEN` |
| 3 | Global state | `S = { … }` |
| 4 | API client | `api = { … }` |
| 5 | Loaders | `loadX()` |
| 6 | View functions | `viewX()` |
| 7 | View dispatcher with the gates | `viewForRoute()` |
| 8 | Menu builder | `navSections()` |
| 9 | Delegated handlers | `onClick`, `onInput`, `onChange`, `onKeydown`, `onSubmit` |
| 10 | `render()` | Close the screen's popovers when leaving the route |
| 11 | i18n dictionary | `strings.js`: every key in every locale |
| 12 | CSS | Screen block, mobile block, theme blocks |
| 13 | Test plan | The screen's scenarios |

## 1. Route

- The parser is a chain of exact matches, `startsWith` checks for query-string returns (OAuth, payments) and
  regexes for parameters. It returns plain objects: `{ name: 'project', id }`,
  `{ name: 'timeline', keys, days }`. Unknown hashes fall back to the home route.
- **Old URLs stay alive as aliases** that return an existing route name. Never break a link that was ever
  shared.
- **Register the route in the route → screen map.** A route missing there skips plan gating and is reachable
  on every plan.
- Navigation in markup is `data-action="nav" data-href="#/x"`; in code, `location.hash = '#/x'`. The
  `hashchange` listener sets `S.route`, resets per-screen transient state and calls `render()`.

## 2. State and loader

Declare the screen's state with the standard flags:

```js
// screen X: list + filters. stale = reload on entry (see hashchange).
x: { loaded: false, loading: false, error: null, list: [], search: '', filterOpen: false },
```

```js
async function loadX() {
  S.x.loading = true;
  try { S.x.list = await api.x(); S.x.error = null; }
  catch (e) { S.x.error = e.message; toast(t('toast.failed', e.message), 'bad'); }
  finally { S.x.loading = false; S.x.loaded = true; render(); }
}
```

- Start the loader from the dispatcher with a self-guard: `if (!S.x.loaded && !S.x.loading) loadX();`.
- **Fresh on every entry**, for lists other people change:
  - in `hashchange`, set `S.x.stale = true` when the route *enters* the screen from another screen;
  - load when `(!S.x.loaded || S.x.stale) && !S.x.loading`, clearing `stale` first;
  - keep the current rows on screen while it refetches (no "Loading" flash), and don't refetch when only a
    drawer under the same route opens or closes.
- **Never change `location.hash` during `render()`.** Redirect with
  `setTimeout(() => { location.hash = … }, 0)`.

## 3. View

- One section per screen (`// ── Screen name (#/x) ──`), holding its constants, helpers, view, drawers and
  modals.
- Skeleton:

  ```js
  function viewX() {
    return `
      ${topbar()}
      <div class="app-body">
        ${navRail('x')}
        <main class="main">…head… …search bar… …content…</main>
      </div>
      ${S.x.drawer ? xDrawer() : ''}`;
  }
  ```

  Drawers and modals go **outside** the main layout.
- **Head:** reuse the app's page-head helper. Tabs sit right under the title and never move when switching.
- **States:** loading, error and empty each have a message. Tell "there is nothing yet" apart from "nothing
  matches the search or filters".
- **Lists:** the bar is the shared search bar (`search-filter-bar`) and the List view is the shared table
  (`data-table-list-view`).
- **Escape every interpolated value**, in text and in attributes (`esc()`). `innerHTML` turns any unescaped
  user text into an XSS hole.

## 4. Gates in the dispatcher

The dispatcher runs the global gates (login, 2FA, onboarding, billing, plan), then one block per route:

```js
if (r.name === 'x') {
  if (!canManageTeam()) return viewDenied();   // role gate, when the screen isn't for everyone
  if (!S.x.loaded && !S.x.loading) loadX();
  return viewX();
}
```

- The UI gate is a convenience. The API must enforce the same rule (see the
  `secure-api-route` skill).
- Screens that are tabs of a section remember the last tab, so the menu entry reopens it.

## 5. Menu and plans

- A menu item is `{ id, href, icon, label: t('nav.x') }`, gated inline (`...(admin ? [item] : [])`), and
  then filtered by plan and feature toggles.
- If plans limit screens, the plan → screens lists live on the server **and** in the client. Keep them in
  sync: the server applies the same rule to the data.
- Leave hardcoded mobile bottom navs alone unless the screen belongs there. The menu already reaches it.

## 6. Handlers

- All events are delegated on `document`. A `findAction(target)` returns the nearest element with
  `data-action`, so a button inside a clickable row wins over the row.
- One block per action:

  ```js
  if (a === 'x-toggle') { ev.preventDefault(); S.x.open = !S.x.open; render(); return; }
  ```

- Async actions:
  1. set a busy flag and `render()`;
  2. `try { await api…; toast(t('x.saved'), 'ok'); }`
  3. `catch (e) { toast(t('toast.failed', e.message), 'bad'); }`
  4. `finally { busy = null; render(); }`
- Prefix every action with the screen's short name (`x-`), so grep finds the view and its handlers together.

## 7. `render()` rules

- Coalesce renders through `requestAnimationFrame`.
- **Focus and caret.** After rebuilding the DOM, restore them on the input that had focus. Find it by a
  **unique** `data-action`, and bind its `value="${esc(S.x.field)}"` to state. Without both, typing loses
  focus on every keystroke.
- **Scroll.** Restore it for registered scroll containers while their scroll key stays the same. Register
  every new scrollable pane (thread, drawer body).
- **Overlays.** Register modals, drawers and popovers so their entry animation doesn't replay on every
  render.
- **Leaving the route.** Close the screen's popovers: `if (route.name !== 'x') S.x.filterOpen = false;`.

## 8. API calls

- One-liners in the API object, through a `j()` helper that throws `Error(body.error || 'HTTP n')` carrying
  `.status` and `.body`:

  ```js
  x:       ()      => fetch('/api/x').then(j),
  xUpdate: (id, b) => fetch(`/api/x/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(j),
  ```

- Ids go through `encodeURIComponent`.
- Day-bucketed data sends `tz=${new Date().getTimezoneOffset()}`.
- Generated text sends the user's language.

## 9. i18n

- `t(key, ...args)` replaces `{0}`, `{1}`… and falls back to the default locale, then to the key.
- Plurals are explicit: `t(n === 1 ? 'x.items_one' : 'x.items', n)`.
- Keys are flat and dotted per screen (`x.title`, `x.search_ph`, `x.col.name`, `x.empty`). Add the block to
  **every** locale, in the same order.

## 10. CSS, mobile and themes

- Screen styles go in their own commented block. Reuse the shared components (search bar, table, chips) and
  never restyle them per screen.
- Mobile: at the app's breakpoint the side menu hides and a bottom nav may appear. Nothing may scroll the
  page sideways.
- Check every theme the app ships (light, dark, and any brand theme with its own menu or layout).

## 11. New JS module (cache busting)

If the server serves `app.js` as immutable with a version in the URL, a **new** module imported by `app.js`
needs the same treatment:

1. a route that serves it;
2. its name in the list of versioned assets;
3. its import specifier rewritten with the version.

Without this, browsers keep the first version of the module forever.

## Verification checklist

- Lint (and typecheck if server files changed).
- Every theme, every locale, and the mobile width.
- As each relevant role. On a plan without the screen, it is hidden, including when you type the hash
  directly.
- Deep link, reload, back and forward. Typing keeps focus. Leaving the route closes its popovers.
- Add the screen's scenarios to the test plan.
