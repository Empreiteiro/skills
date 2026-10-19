---
name: implement
description: Entry point for any request to build, fix or change something in an app. Isolates the session in a dedicated git worktree, reads the version-specific framework docs the task needs, checks which project invariants the request touches, validates the premise against the current code, asks when the target is ambiguous, drafts a short plan, does the work and hands off to test-and-ship (gate) or ship (no gate). Use for "fix the editor", "add a screen", "implement X", "this job fails" or a pasted screenshot, even without the word implement. Accepts `(branch X)` to start from another branch. Not for only running the gate or shipping (test-and-ship, ship) or operating infrastructure (railway-ops).
---

# Implement

Turns an idea, a screenshot or a complaint into a session that is isolated in its own worktree, has read
the right docs, knows which invariants it touches and has a plan. You do not run the gate or ship here.

## Project facts

Read these from the project's CLAUDE.md / AGENTS.md and the docs they point to. Ask the user once for
anything missing; never invent a value.

| Placeholder | What it is |
|---|---|
| `<base branch>` | the branch work starts from and ships to (often `main`) |
| `<install command>` | installs dependencies in a fresh checkout |
| `<dev command>` | runs the app locally (and its variant with auth on, if any) |
| `<framework docs>` | version-specific docs the framework ships or the project points to |
| `<invariant docs>` | the rules file(s) and per-surface docs that list rules which are not style |

If the project names a non-technical stakeholder, write the plan and the final report in terms of what
the app and its users do, not files, routes, columns or flags. The diff is where engineering lives.

## 1. Understand the input

- **Free description** → step 2.
- **Pasted screenshot: current state or target?** Find out with a grep, not a guess. Take 2-3 distinctive
  strings from the image and search the UI source **and** the copy/i18n files (UI text often lives there,
  not in the component). Zero hits = mockup or target: propose on top of the current code. Hits = today's
  screen: the request is to improve what is there, and check the "already done" case in step 5.
- **External reference** → direction for structure and hierarchy, not a spec.
- **Ambiguous target** (which screen, which flow, which file) → ask before planning, naming two
  interpretations instead of silently picking one.
- **`(branch X)` modifier**, e.g. `/implement tighten the diff view (branch editor/spike)`. Extract with
  `\(branch(?:es)?\s+([^)]+)\)` into `BRANCH_BASE`; without it, `BRANCH_BASE = <base branch>`. Work
  starts from `origin/<BRANCH_BASE>`, and you pass `(branch X)` on to test-and-ship / ship at the end,
  otherwise they ship to the default destination.

## 2. Read the framework docs before writing code

Frameworks ship breaking changes between versions, and your training data may describe another one.
Check the installed version (manifest or lockfile), then read the part of `<framework docs>` the task
touches: routing and file conventions, rendering (server vs client), server actions, caching, middleware,
config. Example of what memory gets wrong: in recent Next.js a `'use server'` module may export only async
functions; one exported `const` or `type` makes the framework reject the whole file. **The installed docs
win over memory.** Heed deprecation notices.

## 3. Check the invariants the request touches

Many projects have written rules that are not style: breaking one produces a wrong number, a wrong
account or a broken public promise, with no error anywhere. Read the rules file once in full; for each
surface your diff touches, open that surface's doc (the file, not the index line). Then list the rules
this diff touches. Shapes to look for:

| If you will… | the usual rule |
|---|---|
| add an event, flag or translation key | the name goes into its typed `const` array first, so a typo fails the type check; the vendor SDK is called only through its wrapper |
| add a paid API call (LLM, email, maps…) | it goes through the project's metering/usage wrapper; a call with no ledger row is a hole in the ledger |
| show vendor, model or internal detail on screen | check whether the project promises users never see it |
| touch an endpoint that reports conversions | keep the idempotency/event id; without it a retry counts as a second conversion |
| read or write the database | SQL valid in every dialect the project runs (e.g. SQLite locally, Postgres in production), through its portability helpers; a schema change lands in every migration path; inside a SQL template string `//` is not a comment, use `--` |
| touch an admin surface | auth is checked where the project says, on every page and action |
| make behavior switchable | a feature flag in the registry with its default in code, not an `if` in a component |

## 4. Isolate the session in a dedicated worktree (forced)

A feature branch in the shared checkout is not isolation: HEAD, branch and index are single-writer, and
another session on the same `.git` can switch them under you. What that breaks, with no error:

1. A path allowlist on `git add` separates files, not hunks. Two sessions in one file means shipping the
   other session's unfinished hunk.
2. HEAD moves mid-session, so the gate you already ran describes a base that is gone.
3. Two concurrent deploys from different SHAs: the last to finish wins, and the older one silently
   undoes the newer.

None of these is a git conflict. All of them are one working tree with two owners.

```bash
git rev-parse --show-toplevel    # already a worktree? (under .claude/worktrees/ or a temp dir)
git worktree list                # other live sessions on this .git?
git branch --show-current
```

- **Already in a dedicated worktree on its own branch** → isolated. Do **not** call `EnterWorktree`
  again; it refuses to nest.
- **Any other case** (base checkout, on the base branch or a feature branch, clean or holding another
  session's WIP):

  ```bash
  git fetch origin <base branch> -q            # mandatory, and first
  ```
  ```
  EnterWorktree({ name: '<area>/<short-slug>' })     # e.g. editor/diff-spacing, chore/skills
  ```
  ```bash
  <install command>                            # a new worktree has no dependencies
  ```

  Report the worktree path and branch you created.

**Fetch first:** `EnterWorktree` branches from the local remote-tracking ref and does not fetch. Without
it the worktree is born stale and you reimplement merged work. Right after entering:
`git rev-list --count HEAD..origin/<base branch>` must be `0`.

**Install, never symlink.** A symlinked `node_modules` can make the bundler abort (Turbopack rejects a
symlink pointing outside the project root), and native addons are compiled per install. **Check the
runtime version before installing** (`node -v` against `.nvmrc` / `engines`): native addons compile
against the runtime on `PATH` at install time, and a wrong one leaves an ABI mismatch
(`ERR_DLOPEN_FAILED`, `NODE_MODULE_VERSION`) that fails only the tests loading the addon. That is
environment, not code: rebuild the addon under the right version. Measure the version, do not assume it;
version managers change. Each shell call is a fresh shell (`nvm use` in one call does not reach the next),
so put the right version's `bin` directory on `PATH` inside the same command, as a literal path: sandbox
guards may refuse `source`, `export` or a `$PATH` expansion.

**`BRANCH_BASE` is not the base branch:** re-root right after entering, before any edit:
`git fetch origin <BRANCH_BASE> -q && git checkout -B <your-branch> origin/<BRANCH_BASE>`. Never
`reset --hard`. The freshness check is then against `origin/<BRANCH_BASE>`.

The worktree also gives you per-directory local state (a local SQLite file, the build folder and its
lock), so your migrations, seeds and builds stop colliding with other sessions. Another session's WIP
stays theirs: never revert, stash, commit or tidy it.

**Three path traps that do not error:**

- **Write:** rebuilding the worktree's absolute path from memory sends edits to the root checkout, which
  is a valid repo, so the write succeeds in the wrong place. Symptom: the worktree's `git status` is empty
  after editing. Highest risk right after context compaction and in every subagent prompt: pass the
  worktree as the working directory, forbid writes outside it, and afterwards run
  `git -C <root checkout> status --short` to confirm nothing leaked.
- **Read:** the root checkout can be arbitrarily stale. Read from the worktree or
  `git show origin/<base branch>:<path>`.
- **Remove:** never delete a worktree that is the starting directory of a live session, yours or another.
  The skill registry is a snapshot of that directory; deleting it kills every project skill in that
  session with no in-place fix. Check `git worktree list` first.

**Fallback** when `EnterWorktree` is missing or refuses (e.g. a subagent with a pinned working directory):

```bash
git fetch origin <base branch> -q
git worktree add .claude/worktrees/<slug> -b <area>/<slug> origin/<base branch>
```

then `EnterWorktree({ path: '.claude/worktrees/<slug>' })`. Make sure `.claude/worktrees/` is gitignored;
a worktree in a temp directory also works and shows up in nobody's `git status`.

**In place, last resort** (`git checkout -b <slug> origin/<base branch>` in the shared checkout) isolates
nothing: commit and push early, and if HEAD, branch or WIP change under you, stop and move to a worktree.

## 5. Validate the premise against the current code

Confirm the problem exists and is still what the request describes: read the code, start the app with
`<dev command>`, look at the screen. Requests go stale between being written and being picked up.

**Already solved → do not force a diff.** Say so with evidence (`file:line` and the commit) and skip
step 7.

Answer "what is true" from the project's sources of truth (its docs usually map them): design tokens,
not invented hex; the type scale, not arbitrary pixel sizes; the copy files; the prompt files; the schema
in every migration path; the event registry. For production state, use railway-ops when the app runs on
Railway.

## 6. Short plan

3-6 steps naming the likely files. It must answer:

- which existing component or module covers each piece, and what has to be created (reuse first; run
  atomic-design before creating or moving a component);
- which token (never a raw color), and what dark mode needs alongside;
- database: every migration path, and whether a new column needs a backfill;
- paid calls: which wrapper meters them;
- events, flags, keys: registered before the call site;
- whether the behavior should be switchable.

Large change → confirm the scope. Trivial → go.

## 7. Work and hand off

Implement. When done, hand off; you do not run the gate, ship or deploy here:

- **test-and-ship** → gate green → PR → merge → deploy. The default whenever the project's CI does not
  block merges: then the local gate is the only thing that actually fails a change.
- **ship** → PR without running anything. Only for changes that do not run (docs, skills, config already
  validated by hand).
- With `BRANCH_BASE` set, pass `(branch X)` along: PR into that branch only, no deploy.

## Autonomy

Autonomous by default. Before settling a decision, check its reach: who else uses the module, which
screen could break, which reported number would start lying, which event would leave unregistered.

Stop and ask only when the doubt is about:

- **product**: what the app should do or promise;
- **money**: more paid calls per user action;
- **data**: destructive migration, backfill, dropping a column in production;
- **git**: force-push, history rewrite, committing to the base or integration branches directly.

Never ask small implementation questions: of two reasonable options, take the one closest to the
surrounding code, note it in one line, move on. When you do ask: one line saying a decision is needed,
1-2 sentences of context, a closed question, the options with their trade-offs, and your recommendation.

## Do not

- Write framework code without reading the installed version's docs.
- Edit on the base or an integration branch, or in the shared checkout without a worktree, not even "one
  small file".
- Symlink dependencies into a worktree or skip the install.
- Touch another session's WIP.
- Treat a pasted screenshot as a spec without the grep.
- Use a raw color where a token exists, SQL valid in one dialect only, an unmetered paid call, or an
  event/flag/key that skipped its registry.
- Run the gate, ship or deploy here.
- Draw UI options for someone to choose between; that is ui-revamp-prototype. Here the direction arrives
  decided.
