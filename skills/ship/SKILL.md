---
name: ship
description: Ship what the session changed without running the gate — doc and system checks in parallel, commit an explicit allowlist, open and squash-merge one PR into the production branch with gh, then deploy and prove by fetching the live URL that it serves what shipped. Use only for diffs that do not run (docs, skills, config already validated by hand), when the user asks to ship, to commit and merge, or to ship without tests. (branch X) opens PRs only into X, with no deploy. Anything that runs goes through test-and-ship, because CI that requires no checks is a signal, not a gate.
---

# Ship

`test-and-ship` without the gate: doc and system checks (phase 1), commit + PR + merge (phase 2), deploy and proof
(phase 3). Every phase runs in subagents, so this session's state does not change. The ship is unconditional: nothing
here stops a red build.

- **Shipping ends live, not merged.** When the project deploys by hand, a merged PR changes nothing users see, and the
  platform keeps serving the last build with no error anywhere saying so. The deploy is a phase of this skill, not a
  reminder in the report.
- **CI is a signal, not a gate, when nothing is required.** If the production branch has no branch protection (no
  required checks), a PR merges instantly, red or not, and `MERGED` says nothing about quality. The local gate in
  `test-and-ship` is then the only thing that stops a red build. Use `ship` only for diffs that do not run.
- **Feature branch, always.** Never commit or push directly to `main` or `staging`, never force.

`main` and `staging` below stand for the project's production and staging branches.

## Project setup

Read these from the project's CLAUDE.md or AGENTS.md (or its deploy doc). Ask the user once for whatever is missing,
and suggest adding it there. `test-and-ship` uses the same list.

| Fact | Placeholder |
|---|---|
| Production branch, and staging branch if any | `main`, `staging` |
| Default destination for `test-and-ship` | production, staging or both; both if unset |
| Gate commands, in order | `<gate commands>` |
| Install command (a fresh worktree has no dependencies) | `<install command>` |
| Deploy command per environment; which environments auto-deploy on push, and from which CI workflow | `<deploy command>`, `<staging deploy command>` |
| How to read which commit is live (the deploy message in the platform's status, a version endpoint) | `<live-commit check>` |
| Production and staging URLs; smoke paths and the status code each must return | `<production URL>`, `<staging URL>`, `<smoke checks>` |
| Release-log command, if the project keeps one | `<release-log command>` |
| Commit trailer and PR-body footer | `<attribution>` |
| Paths that never get committed (local databases, caches, build info) | `<never-commit paths>` |
| Path of the main checkout | `<main checkout>` |

## Phases

| Phase | Subagent | `subagent_type` · model | Job |
|---|---|---|---|
| 1 | doc-checker | `general-purpose` · sonnet | finds docs the diff made false and **edits** them |
| 1 | system-checker | `Explore` · sonnet (read-only) | the diff against the project's written invariants and design system; **recommends** |
| 2 | shipper | `general-purpose` · haiku | commits the allowlist, pushes, **opens and merges the PR** |
| 3 | deployer | `general-purpose` · sonnet | deploys `origin/main` from a disposable worktree, **proves by fetch** that it is live, records the release |

The system-checker is `Explore` because it runs while the doc-checker edits: read-only by construction, it cannot
collide with an edit. Its findings never block; auto-resolvable ones are fixed and reshipped in the follow-up loop,
without asking.

## Usage

```
/ship                  # one PR into main, then deploy
/ship (branch X)       # PRs only into X, or "(branches X and Y)": nothing into main, no deploy
```

Extract `\(branch(?:es)?\s+([^)]+)\)`, split on `and`/`,` → `MODE=branch`, `TARGET_BRANCHES=[...]`:

- PRs only into the target branches, never into `main`. Promoting is the branch owner's job.
- Per target: `git merge-base --is-ancestor origin/<target> HEAD` true → PR straight from the feature branch; false →
  cherry-pick onto `origin/<target>` in a `_cp-<target>-<slug>` branch.
- **No deploy**: phase 3 publishes `origin/main`, which did not move, so deploying would publish other people's work.
  Say in the report that production stays on the previous build.
- If merging into the target triggers a CI deploy (staging often does), do not promise the rebuild: check the
  workflow's latest runs (`gh run list --workflow <file> -L 3`) and report what you saw.

Without the modifier, `MODE=main`; `(prod)`/`(main)` is the same. A bare `(staging)` or `(dev)` means
`(branch staging)`, never `main`: whoever wrote it did not ask for production. Bringing `main` into staging first is
`test-and-ship (staging)`.

## Step 0 — Branch guard and allowlist

**Branch guard:** `git branch --show-current`. A feature branch → fine. `main`, `staging` or detached →
`git fetch origin main -q && git checkout -b <area>/<short-slug> origin/main`, and report it.

**Staleness preflight:** `git fetch origin main -q && git rev-list --count HEAD..origin/main`. Above 0 →
`git merge origin/main` and resolve conflicts **here**, not in a phase-2 cherry-pick that aborts. If
`git log --oneline HEAD..origin/main` shows a commit doing what you just did (a concurrent session shipped the same
work), do not merge two equivalent implementations: compare (`git show --stat <sha>`), keep only what is exclusively
yours, re-root (`git checkout -B <branch> origin/main`), reapply it and rerun phase 1.

**Allowlist:** the explicit list of files **this session** edited or created. The working tree may hold someone else's
WIP; only this session's files go in, never the `<never-commit paths>`. Nothing edited → stop and say so.

The allowlist protects against shipping someone else's *file*, not someone else's *hunk*: `git add -- <path>` cannot
split two sessions inside one file. Before listing a path, prove it is only yours: `git diff --numstat -- <path>`
matches the size of what you did, and grepping a symbol you did not write finds nothing. If not, do not commit that
path: redo your diff in a clean worktree from `origin/main` and ship from there. Never split hunks by hand in a shared
checkout, and never revert someone else's WIP to "clean" a file. Prevention is one worktree per session (`implement`).

## Step 1 — Phase 1, two subagents in parallel

One message, two `Agent` calls. Each prompt = the full contents of its file + the allowlist + a 1–3 line summary of
what the session did.

| Subagent | `subagent_type` | `model` | Prompt |
|---|---|---|---|
| doc-checker | `general-purpose` | `sonnet` | `${CLAUDE_SKILL_DIR}/agents/doc-checker.md` |
| system-checker | `Explore` | `sonnet` | `${CLAUDE_SKILL_DIR}/agents/system-checker.md` |

**Directory guardrail.** If this session lives in a worktree, every subagent prompt (the shipper's too) names its
absolute path as the WORKING DIRECTORY and forbids edits outside it: a subagent can start with its cwd pinned to the
main checkout and edit there through absolute paths. When results come back, run `git -C <main checkout> status
--short`; anything modified there is a misplaced edit — recover the content and restore the main checkout before
shipping. The same holds for you in the follow-up loop: before any edit, above all after the conversation compacts,
confirm where you are with `git rev-parse --show-toplevel` instead of rebuilding the path from memory. A write into the
wrong checkout does not fail.

Output contracts: doc-checker → `DOC-CHECK` · `DOCS_TOUCHED` · `DOCS_FOLLOWUP`; system-checker → `SYSTEM-CHECK` ·
findings by severity · `SYSTEM_FOLLOWUPS`.

## Step 2 — Final allowlist

Step 0 allowlist + `DOCS_TOUCHED`. A doc edited and left out of the commit is a stale doc on the remote.

## Step 3 — Shipper

`Agent` with `general-purpose`, `haiku`, prompt = full `${CLAUDE_SKILL_DIR}/agents/shipper.md` + the final allowlist +
`MODE=main|branch` (with `TARGET_BRANCHES`) + the attribution lines + the PR body (text a person reads: write it with
the `write` skill when the project has one) + this note:

> "No gate in this run — do not run any gate command; go straight to commit, push, PR. The current branch is a feature
> branch, not `main` or `staging`. In `MODE=main` open and merge ONE PR into `main`; in `MODE=branch`, PRs only into
> `TARGET_BRANCHES`, zero into `main`."

It returns the commit SHA, mode, PR URL and branch.

## Step 3.5 — Validate the shipper's report (you)

A haiku shipper has reported an old HEAD as the new commit, and a PR that did not exist. Check before moving on:

1. `git log --oneline -2` — the SHA exists and is new.
2. Compare sets; do not eyeball a list:
   ```bash
   comm -13 <(git show --name-only --format= <SHA> | sort) <(printf '%s\n' <allowlist> | sort)
   ```
   Empty = the whole allowlist went in. Any line = incomplete commit: commit what is missing
   (`git commit --only <missing> --amend --no-edit`, or a second commit if the PR exists) and recheck. A path that never
   changed shows up as a false miss; confirm with `git diff HEAD -- <path>` empty.
3. `gh pr list --state all --head <branch> --json number,baseRefName,state,url` — expected feature → `main`. Wrong
   pair → close it (`gh pr close`) and redo the step yourself.
4. Poll `gh pr view <n> --json state` until `MERGED`. Without required checks the merge does not wait for CI, so never
   report "checks green" as if they blocked anything; the honest line is "CI ran in parallel and did not gate the
   merge".
5. **Content check — `MERGED` does not prove the work arrived:**
   ```bash
   git fetch origin main -q
   git diff --stat HEAD origin/main -- <final allowlist>    # empty = arrived
   ```
   Any line → read the diff. Benign: `main` has additional changes to those files from another session. Serious: your
   work did not arrive — cherry-pick what is missing onto `origin/main` and open a fix PR.

## Step 4 — Remove this session's worktree (mandatory)

The ship ends without the worktree it used; keeping them "to ask later" is how worktrees, each with full dependencies
and build output, pile up. Do it right after the content check and **before the deployer**: a session isolated in a
worktree can be refused git operations on any other path, its subagents inherit that, and the deployer works in a
worktree of its own.

1. Prove again, and continue only if both are empty:
   ```bash
   git status --porcelain
   git fetch origin main -q && git diff --stat HEAD origin/main
   ```
   The second compares trees, which is why it works after a squash. If `main` moved on after the merge, compare only
   the allowlist (`... -- <allowlist>`).
2. `ExitWorktree(action: "remove", discard_changes: true)`. `discard_changes` is required: the squash created a
   different commit, so the branch's commit never becomes an ancestor of `main` and the tool refuses otherwise. Step 1
   is what makes it safe. The tool also deletes the local branch; do not delete it by Bash (`-d` fails after a squash,
   and some setups block `-D`).
3. `git worktree list` — this session's worktree is gone (an exit criterion).

In the follow-up loop, each round starts in its own worktree from `origin/main` and removes it here.

Do **not** remove it, and say why in the report, when:

- it is the session's **birth** cwd (the session opened inside it, without `EnterWorktree`): `ExitWorktree` cannot
  reach it, and deleting it from outside kills the session. Report the path;
- step 1 was not empty — Step 3.5 failed; stop;
- it holds another session's files: `action: "keep"` and warn. Never discard someone else's WIP.

A worktree left over from an earlier session: with the same proof via `git -C <path>` and no process with its cwd
inside, `git worktree remove <path>`, and give the user `git branch -D <branch>` to run themselves.

## Step 5 — Bring the main checkout up to date

Sessions opened in the main checkout read its skills and CLAUDE.md, not `origin/main`'s, so a stale main checkout means
stale rules in every new session. Fast-forward only, and only when nobody is working there:

```bash
git -C <main checkout> fetch origin main -q
git -C <main checkout> branch --show-current     # must be main
git -C <main checkout> status --short            # must be empty, apart from never-commit paths
git -C <main checkout> pull --ff-only origin main
```

- On `main` and clean → `pull --ff-only`, in every mode (other sessions' ships move `main` too).
- On another branch, or with modified files → fetch only, and report the branch and files. Someone works there: no
  `checkout`, no `stash`, no `pull`.
- The session is still confined to its worktree → git on the main checkout is refused; do not work around it. Report
  "not synced" and give the user the `pull --ff-only` line.
- **Never `git checkout main` in the main checkout**: it switches the branch under a live session, whose WIP travels
  along and looks deleted. `pull --ff-only` fails loudly; `checkout` does not fail at all.
- `--ff-only` failed → report it, never force.

## Step 6 — Phase 3, deploy (`MODE=main`)

Merge confirmed → `Agent` with `general-purpose`, `sonnet`, prompt = full `${CLAUDE_SKILL_DIR}/agents/deployer.md` + the
merge SHA on `origin/main` (it aborts on a mismatch) + a one-line summary for the deploy message + the **verification
marker** when there is one (a new route, string, header or status code). Without a marker it ties the commit and runs
the smoke checks.

**One deploy per chain, from the final state**: if the follow-up loop will reship, the deploy waits for the last round.

**Do not deploy**, and say in one line that production stays on the previous build, when: `MODE=branch`; the merge was
not confirmed; the platform CLI is not authenticated (hand the human the login command, do not work around it); the
user asked not to publish.

**Validate the deployer's report:**

- `Serving now` holds real status codes, not "ok"; `Live commit` shows a success status in front of your deploy message
  (the message appears while the build is still running).
- `Marker` has three possible values and only one is a failure. `timed out` means the work is **not live**, even with
  the PR merged and the build green: report STOP and do not say it shipped. `no content marker` is normal when the diff
  leaves no public trace; treating it as a failure reports a perfect deploy as broken.
- `Release recorded`: a list of changes is normal; `nothing to record` is right for a deploy with no new commit; a
  failure is a WARN in the TL;DR (the app is live, and the next ship records what is pending).

If the diff changed platform environment variables, say so: setting a variable without a redeploy does not reach the
running process. A fresh deploy picks it up, so this matters when the ship did not deploy.

## Follow-up loop

When the round left auto-resolvable follow-ups, loop: ship → resolve → ship → …

1. Collect `SYSTEM_FOLLOWUPS` and `DOCS_FOLLOWUP`.
2. Classify; the default is to implement. **Auto-resolvable** (most): a raw color where a token exists, a forgotten dark
   theme, a single-dialect query, a call outside a required wrapper, a missing auth check, a doc bullet — big items too,
   over several rounds. **Skip** only questions of **product** (what the app promises), **money** (more paid calls per
   user action), **data** (destructive migration, backfill) or **git**. Implementation ambiguity is not a reason to
   skip: investigate and decide.
3. Implement only the auto-resolvable ones and ship again. A follow-up that needs validation goes through
   `test-and-ship`, not `ship`.
4. Repeat on the new follow-ups of that round.

Stop at the **fixpoint**: a round that produces no new auto-resolvable follow-up. Stay inside this chain (never sweep
the repo looking for work), and report skipped items with their reason.

## Final report (mandatory)

First line: a one-line TL;DR that starts with the verdict — `OK` (shipped, live, safe to exit), `WARN` (shipped, with
something to know: a queued follow-up, work waiting for promotion in a branch, a deploy skipped on purpose, an
unrecorded release) or `STOP` (stuck or needs the human: PR not merged, failed deploy, marker timed out, pending
question). Then the summary table, even with one PR, then the rest:

| What | PR | Target | State |
|---|---|---|---|
| <the change> | #27 | `main` | merged (squash; CI does not gate) · live |
| <a deferred item> | — | — | follow-up |

```
OK  Shipped and live — PR #27 merged into main, deploy verified at <production URL>. CI ran in parallel (signal, not gate). Safe to exit.

Shipped (no gate — /ship · branch: <branch>)

Phase 1
  Doc-check: EDITED <file>: <what>  ·  or CLEAN
  System-check: <n> findings (<severities>)  ·  or N/A
  Committed: <final allowlist>

Phase 2 (MODE: main)
  Commit <sha> on <branch> (pushed) · PR #27 → main MERGED · content confirmed on origin/main
  CI ran in parallel and did not gate the merge (no required checks)

Phase 3
  Deployed origin/main <sha> → build ok · live commit: <status> · "<deploy message>"
  Live at <production URL>: <smoke paths and codes> · marker "<x>" present in <where>
  Release recorded: <n> changes  ·  or nothing new  ·  or WARN <failure>
  or: deploy skipped — <reason>; production stays on the previous build

Follow-ups: <list or none>
Worktree: removed (absent from git worktree list)  ·  or kept: <reason>
Main checkout: on main @ <sha> (pull --ff-only)  ·  or fetch only — <why>  ·  or not synced — <why>

Exit? yes — fixpoint, PR merged with content confirmed, deploy verified live, worktree gone, no pending question.
```

Always end with the `Exit?` line. `yes` only when everything holds: fixpoint, PR `MERGED` with content confirmed on
`origin/main`, deploy verified live (or skipped for a stated reason), this session's worktree absent from
`git worktree list`, no pending question. Anything missing → `no`, with the reason in one line.

**Merged is not published, and "deployed" is not "live".** Neither word goes in the report without a fetched status
code behind it; a green platform dashboard says *a* build finished, not yours.

## Related skills

- `test-and-ship` — the same flow with the gate, for any diff that runs. It reuses this skill's agents from
  `${CLAUDE_SKILL_DIR}/../ship/agents/` instead of copying them.
- `implement` — the entry point before both; it isolates each session in its own worktree.
- `railway-ops` (or the project's infrastructure skill) — logs, variables, database, rollback. The deployer only
  publishes and verifies; diagnosis belongs there.
