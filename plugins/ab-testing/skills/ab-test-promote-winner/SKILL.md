---
name: ab-test-promote-winner
description: End an A/B test and keep only the winning arm. Snapshots the final production board before it drains, sends all traffic in the segment to the winner, deletes the losing arms' surfaces instead of disabling them, retires the flag into a retired-keys list that only grows, marks the winner on the board, archives the test, updates the docs and ships through test-and-ship. Use for "arm B won", "promote the winner", "the A/B test is over", "send everyone to B", "archive the test", even when the test's file is not named. Not for starting a test or adding an arm (ab-test-create), flipping a flag in the console (one click, not a PR), or shipping without the gate.
---

# A/B test: promote the winner

**A PR, not a click.** A winner is a product decision, not a switch. Losers left behind a flag nobody will flip
are dead code that looks like an option, and the next person cannot tell whether it is safe to delete.

## Project setup

The facts `ab-test-create` reads (account-creation paths, database dialects, flag registry and retired list,
boards, events, locales, gate), plus: where frozen results and the finished-tests shelf live, the production
console's URL, and how to read its login from the deploy platform without printing it. Read them from the
project's CLAUDE.md/AGENTS.md; ask the user once for what is missing. If the project promoted a test before,
read that diff first: it is the template.

## 0. Isolate and confirm

Work in an isolated worktree (`implement`). Confirm **which test**, **which arm won** and **in which segment**:
a segment that did not lose keeps its arm. Ambiguous: ask. Read the assignment module, the test's entry in the
tests list, its flag, and the A/B section of the docs.

## 1. Snapshot the result BEFORE anything else

The live board reads the arm column inside the header's date range. Once the losers stop receiving accounts,
their columns **drain** as accounts age out of the range. The snapshot is the only record of what the arms did.

1. **The production console login, never printed.** Pipe the platform's variables, filtered to the login keys,
   straight into a scratch file (`<platform> variables --kv | grep '^ADMIN_' > <scratch>/console.kv`). No `cat`,
   no `echo`, no base64, nothing on a command line.
2. **The window is the test's whole life.** Start: the day the module landed
   (`git log --format=%ad --date=short -- <assignment module> | tail -1`). End: today. Production, all devices.
   Read again with a much earlier start (the start of the year) and confirm the numbers are identical; if not,
   the window is cutting accounts.
3. **Read in a real browser:**

   ```bash
   PROJECT_DIR=<repo> CREDS_FILE=<scratch>/console.kv \
     node "${CLAUDE_SKILL_DIR}/scripts/read-board.mjs" '<prod board url>?t=<test>&<from>=<YYYY-MM-DD>&<to>=<YYYY-MM-DD>' <scratch>/board.json
   ```

   It signs in through the console's form if one appears, reads each arm card's visible text from the DOM
   (`[data-arm]`, or `CARD_SELECTOR`) and writes JSON. Take the range parameter names from the URL the console
   itself builds.
4. **Write the numbers into the result file as soon as you have them**: the scratch directory does not survive
   a restart.

⚠️ **The DOM, never the raw HTML.** A server-rendered page can carry what is not on screen (the e-mail behind
every funnel step) in its payload. Do not save, print or paste it.

If the sandbox refuses a script path built from a variable, write the path out literally. If hours pass between
the read and the ship, read again: new accounts keep entering the arms until the deploy.

**The snapshot becomes code**: a frozen-result file with `title`, `hint`, `winner`, `on` (the date), `range`,
`arms`, `verdict`, and `extra` + `extraLabel` when only some arms had a treatment.

- `share` = actors ÷ the arm's own accounts × 100, rounded exactly as the board prints (for example one decimal
  under 10, whole numbers above).
- Nothing is computed at render: the numbers are written by hand and never move again.
- `winner` is a string literal, not an import from the live module: the snapshot is a record of the past.

## 2. All traffic in the segment to the winner

In the assignment module (still import-free):

- Export `<TEST>_WINNER = '<arm>' as const`.
- The assignment function no longer takes a roll. The test asserts its arity (`fn.length`) and the winner **as
  a value** (`'B'`), not by comparing with the constant.
- The arms union and array **keep every letter**: the column still stores the losers and the board still reads
  them.
- `null` keeps its meaning, and a segment that did not lose keeps its arm.
- The column **is still written** at signup. Without it the console reads "a test that stopped getting
  signups", not "a test that ended".
- Rewrite the module header: the test ended, who won, where the snapshot is.

## 3. Delete the losers, don't disable them

Delete every surface only a losing arm reached, and every orphan that leaves: routes, components, actions,
e-mails, dictionary keys **in every locale**, the redirects that sent people there, the public-path allowlist
entries. Old accounts in losing arms now see what the winner sees, because their surface no longer exists.

The flag:

- Leaves the registry and enters the **retired list** with `key`, `label`, `retired` (ISO date) and `why`. The
  list only grows: overrides outlive the code that read them, so a reused key opens a new feature holding
  whatever an operator last set for the old one, and nothing raises. If the project has no retired list yet,
  create it with a test that fails when a live key collides with it.
- Leaves whatever each flag carries (docs paragraph, screenshot, counts that mention it).
- Its override row in the database is **not** deleted: it is the only record that a human flipped it, and when.

**Do not delete** the arm column, event names (the archived board reads history), tables or columns (a drop is a
destructive migration: ask first), or the arm screenshots. A table no longer written gets a code comment saying
so; its SQL does not change.

⚠️ **Find whoever still READS a string from the deleted surface, and read that code before deciding.** A side
channel may classify records by a string that lived in the deleted dictionaries (an e-mail subject, say), and
the first guess about what breaks is often wrong. If the string still feeds a reader of history, freeze it into
a constant with the true reason. Grep every key and name you deleted before calling it done.

## 4. Mark the winner

- Live board: the winner's card gets the project's success border and title color **and the word "won"**:
  color alone says nothing to someone who cannot see it.
- Frozen panel: the winner's column, painted the same way.
- Both read `<RESULT>.winner`, never a loose `'B'` in the component.

## 5. The snapshot on top of the board

- The frozen-result panel goes above the live arms.
- The account count's hint warns that losers drain in a range ending today, and points to the snapshot.
- Arm screenshot captions move to the past: "Won, and it is what the app does now: …" / "Lost. … Deleted."
- The assignment bar loses its cut marks: there is no roll anymore.

## 6. Archive

The test's entry in the tests list gets `finished: 'YYYY-MM-DD'` and a blurb and hint saying it ended. That alone
moves it to the finished shelf; read it only through the project's single "is finished" predicate. Bookmarks
with the test's key keep opening it. With no test running, the tab shows the switcher and "No test is running."
and queries nothing. Verify every path the page is served at with the check from `ab-test-create`
(`${CLAUDE_SKILL_DIR}/../ab-test-create/scripts/check-board.mjs`).

## 7. Docs and copy

- The module header (step 2). The flag's docs paragraph becomes "retired on <date>, surface deleted, key in the
  retired list, do not bring it back": the rule, not the history.
- The A/B section of the docs: shelves, result files, columns that drain. If a whole feature folder went, every
  doc and skill that lists or counts it. Grep the docs for the deleted surface by name; a sentence that still
  cites a deleted path says that it was deleted.
- New console copy (verdict, hints, captions) goes through the project's writing process. The verdict is
  **honest about small numbers**: say how many accounts reached the deciding step and what was decided; never
  "clear win" over a handful.

## 8. Gate, ship, report

Ship through `test-and-ship`. Also run the browser e2e suite when shell or onboarding redirects or a core
interactive loop changed, with no dev server alive.

Report to the stakeholder in app behavior, not files: who gets what from now on, what stopped for whom (old
accounts in losing arms included), and where the result lives (the A/B tab, finished tests, the test).

## Never

- Leave losers behind a flag. Delete them.
- Delete the arm column, event names, screenshots, tables or columns.
- Recompute the snapshot at render, or read it back from the database.
- Mark the winner with color alone, without the word "won".
- Print an e-mail or a credential anywhere, or save the page's raw HTML.
- Ship without the snapshot.
- Reuse a retired flag key.
