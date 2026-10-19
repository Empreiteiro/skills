---
name: web-layout-review
description: Review the layout of a web app screen by looking at it — start the app with deterministic demo data, screenshot the screen at desktop (1440px) and phone (390px) widths in every theme with Playwright, and go through a layout checklist (text under the title using the full width, one left margin and one text vertical across screens, side panels and filters, nothing scrolling sideways on mobile, both themes legible). Use whenever you create or change a screen, a shared component or the app's CSS — even if the request does not mention layout — and before opening or updating a PR that touches the interface.
---

# Review the layout of a screen

Layout bugs do not show up in the typecheck or in the tests: they only show up
by looking. The classic one is the text under a page title held to a 58ch
reading column, with half the screen empty beside it, under a title and a
table that use the whole width. This skill is how to look, every time, at the
widths and themes people actually use. The rules to check against are in
[`layout-rules.md`](layout-rules.md) — a default rule set to adopt and adapt.

## 1. Start the app with demo data

A screen needs a session and a history to draw anything worth checking. Use
the project's demo seed if it has one; otherwise write one (and keep it out of
production code paths, for example in `scripts/` or in this skill's folder in
the project). A good seed:

- **Creates a throwaway database** from the app's own schema or migrations — a
  SQLite file in a temporary folder, or a disposable schema or container —
  never the development database.
- **Goes through the app's own data layer** (its insert and upsert functions),
  so it follows schema changes.
- **Fills every screen**: months of history, every role the interface has
  (a regular user, an admin or coach, members, someone without the optional
  integration), and the states that change the layout (an open invite, a
  record not processed yet, an empty list).
- **Is deterministic**, so the before and after screenshots can be compared:
  a fixed-seed generator, dates relative to today, and values that are not
  part of the random stream (shapes, names) derived from ids, so adding a
  record does not reshuffle the rest.

  ```ts
  let seed = 7; // Park–Miller: the same sequence on every run
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a: number, b: number) => a + (b - a) * random();
  ```

- **Prints a logged-in session**: mint it the way the app's auth does (sign or
  encrypt it with a development-only secret) and print the cookie value. If
  that is not practical, log in once through the UI with a demo account and
  save Playwright's storage state.
- Uses fake tokens for third-party services, and expects the errors that come
  from them (a failing sync call in the log is normal; say so in the seed).

Then start the development server against the seed, in the background, on a
port of its own, and wait for it to answer:

```bash
DEMO=$(mktemp -d)
DATABASE_PATH=$DEMO/demo.db SESSION_SECRET=demo-only node scripts/seed-demo.mjs > $DEMO/cookie.txt
DATABASE_PATH=$DEMO/demo.db SESSION_SECRET=demo-only npm run dev -- --port 4100 > $DEMO/dev.log 2>&1 &
until curl -s -o /dev/null localhost:4100; do sleep 2; done
```

(The names of the variables and of the seed script are the project's.)

## 2. Take the screenshots

```bash
node "${CLAUDE_SKILL_DIR}/scripts/capture.mjs" \
  --url http://localhost:4100/reports --widths 1440,390 --themes light,dark \
  --cookie-file session=$DEMO/cookie.txt --out $DEMO/shots
```

That is four screenshots, `reports-1440-light.png` to `reports-390-dark.png`:
the minimum for every screen you touched. Widths below 768 also emulate a
touch phone. Useful options:

- **Themes**: `light` and `dark` emulate `prefers-color-scheme`. If the app
  keeps the choice itself, pass its own values and where it reads them:
  `--themes paper,ink --theme-storage app-theme` (localStorage) or
  `--theme-cookie theme`.
- **Session and language**: `--cookie name=value`, `--cookie-file name=path`,
  `--storage-state state.json`, `--local-storage key=value`, `--locale en-US`.
  Check the longest language when a change touches text.
- **State**: `--click <selector>` and `--key <key>` run in the order given
  (open a side panel, a drawer, a tab); `--scroll <selector>` brings a block
  into view; `--wait-for <selector>`; `--full-page` or `--height 2400` to see
  more of the page.

Each screenshot prints one JSON line: the steps that could not run on that
width, the console errors, the failed requests and, if the page scrolls
sideways, by how many pixels and which elements stick out. Then **read every
PNG with the image tool** — the check is visual, not about the code.

## 3. Check

In each screenshot, against the rules:

1. **Text under the title** (intro, subtitle, hints) reaches the edge of the
   content column on desktop. A line breaking in the middle of the screen with
   empty space to the right means a `max-width` in `ch` on the header text.
2. **One left margin and one text vertical.** The title sits at the same
   distance from the frame's edge on every screen — compare with a
   neighboring screen, with the side panel open and closed. Subtitle, tags,
   section titles, list text and the first number of a stats row start on the
   title's vertical. Nothing touches the window's right edge.
3. **The frame** (sidebar, content area, right rail) keeps its shape: corners,
   borders and columns are the shell's, not redrawn per screen.
4. **Side panel and filters**: the default state (collapsed or open) is the
   one the rules say; while collapsed, the screen still says what is being
   filtered; categories are selection lists, one option per row; on mobile the
   panel opens from its trigger at the top.
5. **Phone (390px)**: no sideways scroll (the JSON line reports it; a wide
   table scrolls inside its own container); the text starts at the mobile
   gutter; the bottom navigation does not cover the last block; screens that
   render differently on phone and desktop at the same URL are checked at both
   widths.
6. **Themes**: nothing disappears or loses contrast in either theme; the
   accent still marks what it marked.
7. **Numbers** aligned (`tabular-nums`) and the unit written once ("8 to 12
   km", not "8 km to 12 km").

Found something? Fix it, capture again with the same seed and compare. Only
then open the PR — and send the final screenshots to whoever asked for the
change.

## 4. Wrap up

Stop the development server and anything it spawned (check that the port no
longer answers), and delete `$DEMO`. Nothing from the seed run — the database,
the cookie, the screenshots — goes into the repository.
