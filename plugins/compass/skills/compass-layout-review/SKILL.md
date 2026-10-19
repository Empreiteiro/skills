---
name: compass-layout-review
description: Starts Compass with demo data, takes screenshots of a screen on the web (1440px) and on mobile (390px), in the paper and dark themes, and goes through the app's layout checklist (text under the title using the full width, the board with both curves, filters in the right place, the side panel, nothing overflowing on mobile). Use whenever you create or change a screen in src/app/compass, a component in src/components/compass or the CSS in src/lib/design — even if the request does not mention layout — and before opening or updating a PR that touches the interface.
---

# Review the web layout of a screen

Compass is read on the web (sidebar, board, right rail) and on mobile (tab
bar, drawers). Layout bugs do not show up in the typecheck or in the tests:
they only show up by looking. This skill exists because one of them — the text
under the title stuck in a 58ch column, with half the screen empty beside it —
made it to the screen. The rules are in [`layout-rules.md`](layout-rules.md)
(the project keeps them in `.claude/rules/layout-web.md`); this is how to
actually check them.

Run every command from the root of the Compass checkout
(Empreiteiro/training-analysis), after `npm ci`. Routes, CSS classes and
component names are quoted as the code spells them, often in Portuguese
(`/compass/comparar`, `.pm-deck`, `PainelLateral`).

## 1. Start the app with data

The app needs a session and a history to draw any screen. The seed script
creates a SQLite database with three athletes (one of them coaching the other
two, plus an athlete without Strava), 14 months of varied workouts, per-km pace
measurements and the session already encrypted.

```bash
DEMO=$(mktemp -d)
export SQLITE_PATH=$DEMO/demo.db SESSION_SECRET=demo-secret-local-only
node --no-warnings --import ./tests/register.mjs \
  "${CLAUDE_SKILL_DIR}/scripts/seed.ts" > $DEMO/cookie.txt

NEXT_PUBLIC_BASE_URL=http://localhost:42195 STRAVA_CLIENT_ID=1 STRAVA_CLIENT_SECRET=x \
  npx next dev --port 42195 > $DEMO/dev.log 2>&1 &
```

Run the server in the background and wait for `curl -s localhost:42195` to
answer. `POST /api/sync 500` in the log is expected: the seed's Strava token is
fake.

## 2. Take the screenshots

```bash
node "${CLAUDE_SKILL_DIR}/scripts/capture.mjs" \
  --cookie $DEMO/cookie.txt --route /compass/comparar \
  --width 1440 --theme paper --out $DEMO/web-paper.png
```

Take at least four per screen: `--width 1440` and `--width 390`, each with
`--theme paper` and `--theme dark`. Useful options:

- `--height 2400` to see more of the page (the default is the window height);
- `--scroll ".selector"` to scroll to a block before capturing;
- `--action drawer` opens the right panel on mobile;
- `--rail open` captures with the web panel open (the default is collapsed),
  and `--key Tab` presses the shortcut that opens and closes it;
- `--lang en` when the change touches text — English sentences are longer.

The script prints the page's console errors. Read each PNG with the image
reading tool — the check is visual, not about the code.

## 3. Check

In each screenshot, look at:

1. **The text under the title** (`.pm-deck`, subtitle, hints) reaches the edge
   of the column on the web. A line breaking in the middle of the screen with
   empty space to the right is the bug that prompted this skill: look for a
   `max-width` in `ch` on the selector.
2. **The board** (`.pm-canvas`) has both top corners rounded and the line
   running down both sides; nothing touches the right edge of the window.
   **The margin:** the title sits 48px from the board's left edge on every
   screen — compare with a neighboring screen, with and without the panel.
   Subtitle, tags, section titles, list rows and the first number of the stats
   strip start on the same vertical as the title.
3. **The right panel** (`PainelLateral`): collapsed in the default capture,
   with the vertical strip showing the title and the Tab key; open with
   `--key Tab` or `--rail open`. Categories in a selection list, one per row.
   Check that the sheet says what it is filtering (tags under the title) while
   the panel is collapsed, and that on mobile the funnel sits at the top, next
   to the avatar.
4. **Mobile (390px)**: nothing makes the page scroll sideways (a wide table
   scrolls inside `.pm-tabela-rolagem`); the screen title does not show (the
   tab bar says where you are) and the text starts at the 20px gutter; the
   funnel at the top opens the drawer; the tab bar does not cover the last
   block. On `/compass` mobile shows the home screen and the web shows the
   feed — capture both widths.
5. **Themes**: on paper, the accent is light green and whatever carries
   meaning turns to ink; on dark, the accent is the green. Nothing disappears
   in either.
6. **Numbers** aligned (`tabular-nums`) and the unit written once ("8 to 12
   km", not "8 km to 12 km").

Found something? Fix it, capture again and compare. Only then open the PR —
and send the final screenshots to whoever asked for the change.

## 4. Wrap up

Stop the server (`kill` the `next dev` process) and delete `$DEMO`. Nothing
from the seed goes into the repository.
