---
name: test-and-ship
description: Run the project's gate, fix every failure until it is green, then ship — commit an explicit allowlist, open and squash-merge the PR with gh, and deploy, proving by fetching the live URL that it serves what shipped. Use whenever the user wants to validate and ship ("test and ship", "run the gate and merge", "validate and open the PR"). Takes the destination right after the command — (prod) or (main), (dev) or (staging), (prod+dev) for both, nothing for the project's default (both if unset) — and (branch X) for a PR into X only, with no sync and no deploy. When staging is a destination, main is merged into it first through a merge-commit PR. A red gate stops before any commit. Not for shipping without the gate (ship) or for operating the infrastructure (railway-ops).
---

# Test and ship

Green gate, then ship, then live: one flow where the ship happens only if the gate passes. Every phase runs in
subagents, so this session's state does not change.

- **It ends live, not merged.** When deploys are manual, merging publishes nothing and the platform keeps serving the
  last build silently. Green gate, merged PR and nothing users see is a reachable state, so the deploy is a phase.
- **The local gate is the one that fails.** When the production branch requires no checks, CI runs but a PR merges red;
  this gate is then the only layer that rejects. `ship`, which skips it, is only for diffs that do not run.
- **Feature branch, always.** Never commit or push directly to `main` or `staging`, never force.

`main` and `staging` stand for the project's production and staging branches.

## Project setup

Everything in `ship`'s Project setup (`${CLAUDE_SKILL_DIR}/../ship/SKILL.md`): above all `<gate commands>`,
`<install command>`, the deploy commands and URLs, and the default destination. Read them from the project's CLAUDE.md
or AGENTS.md; ask the user once for what is missing.

## Phases

| Phase | Subagent | `subagent_type` · model | Job |
|---|---|---|---|
| 1 | tester | `general-purpose` · sonnet | runs `<gate commands>` and **fixes** every failure until all exit 0. It is the gate |
| 1 | doc-checker | `general-purpose` · sonnet | finds docs the diff made false and **edits** them |
| 1 | system-checker | `Explore` · sonnet (read-only) | the diff against the project's written invariants and design system; **recommends** |
| 1 | ux-checker | `Explore` · sonnet (read-only) | eleven UX principles against the diff, plus regressions of fixed findings; **recommends** |
| 2 | shipper | `general-purpose` · haiku | commits the allowlist, opens and merges the destination PR (squash); when staging is a destination, syncs `main` into it (merge commit) |
| 3 | deployer | `general-purpose` · sonnet | deploys from a disposable worktree on `origin/main` and/or `origin/staging`, **proves by fetch**, records the production release |

The gate proves the code compiles, the logic holds and the colors pass; nothing in it looks at a design decision. A
screen can pass all of it and still ask four questions before introducing itself, or dress a destructive button as a
grey link. That is why the ux-checker exists. Both checkers are `Explore` because they run while the tester edits code:
read-only by construction, they cannot collide with a fix or read a file halfway through one.

**The gate is non-negotiable:** phase 2 runs only if the tester returns 100% green. The other three are not gates.

The doc-checker, system-checker, shipper and deployer prompts live in `${CLAUDE_SKILL_DIR}/../ship/agents/`, one copy
for both skills, because duplicated copies drift silently. The tester and the ux-checker are in
`${CLAUDE_SKILL_DIR}/agents/`.

## Usage

```
/test-and-ship                 # the project's default destination; both if unset
/test-and-ship (prod)          # production only · (main) is the same
/test-and-ship (dev)           # staging only · (stag), (staging) are the same
/test-and-ship (prod+dev)      # both · (main+dev), (dev+prod), (dev+main) are the same
/test-and-ship (branch X)      # a PR into X only: no sync, no deploy
```

A request in words that names the environment counts as the modifier ("production only" is `(prod)`).

Extract `\(branch(?:es)?\s+([^)]+)\)` first. Present → `MODE=branch`, exactly as in `ship`: PRs only into those
branches, none into `main`, no sync, no deploy. It wins over any other modifier; ignore the other one and say so in the
report. If merging into a target triggers a CI deploy, do not promise the rebuild: check the run and report what you
saw. Whoever wants staging synced and live uses `(dev)`.

Otherwise, case-insensitive:

| Modifier | `TARGET` | PRs, in order | Deploy |
|---|---|---|---|
| `(prod)` · `(main)` | `main` | feature → `main` (squash) | production + release record |
| `(dev)` · `(stag)` · `(staging)` | `staging` | sync `main` → `staging` (merge commit) · feature → `staging` (squash) | staging only, no record |
| `(prod+dev)` and its spellings | `both` | feature → `main` (squash) · sync `main` → `staging` (merge commit), which carries the feature | production + record, **then** staging |
| none | the project's default; `both` if unset (`main` if there is no staging branch) | | |

The sync is skipped when `origin/staging` already contains `origin/main`. In `both` there is no feature → staging PR:
the feature reaches staging through `main`, inside the sync.

**Why `main` goes into staging first, by merge commit.** The feature branch starts from `origin/main`; a PR from it into
a staging branch that is behind would carry, inside its squash, every `main` commit staging lacks, flattened under the
feature's title. And only a merge commit keeps `main`'s history inside staging: after a squash git does not know those
commits are there, and the next sync hits the same lines again. Shipping only to `main` by default also leaves staging
drifting days behind production.

**Production first in `both`.** Production deploy and release record, then the sync and the staging deploy: if staging
gets stuck, production is already live; if production gets stuck, staging waits.

## Step 0 — Branch guard and allowlist

`ship`'s Step 0, exactly: branch guard (not `main`, not `staging`; create from `origin/main` after `git fetch`), the
staleness preflight, the "my own work already shipped by a concurrent session" case, the never-commit paths and the
warning about someone else's hunks. Here that warning bites harder: a green gate run in a working tree with someone
else's WIP certifies **both** diffs, so the green that authorizes phase 2 describes a state the PR will not contain.
Prevention is one worktree per session (`implement`).

In `TARGET=staging`, drop skill files (`.claude/skills/`) from the allowlist: sessions load skills from the checkout
they start in, normally on `main`, so a skill shipped only to staging reaches nobody. Ship it to `main` in its own run.

## Step 1 — Phase 1, four subagents in parallel

One message, four `Agent` calls. Each prompt = the full file + the allowlist + a 1–3 line summary of the session.

| Subagent | `subagent_type` | `model` | Prompt |
|---|---|---|---|
| tester | `general-purpose` | `sonnet` | `${CLAUDE_SKILL_DIR}/agents/tester.md` + `<gate commands>` and `<install command>` |
| doc-checker | `general-purpose` | `sonnet` | `${CLAUDE_SKILL_DIR}/../ship/agents/doc-checker.md` |
| system-checker | `Explore` | `sonnet` | `${CLAUDE_SKILL_DIR}/../ship/agents/system-checker.md` |
| ux-checker | `Explore` | `sonnet` | `${CLAUDE_SKILL_DIR}/agents/ux-checker.md` |

- `ship`'s directory guardrail (Step 1) applies unchanged, to the subagents and to you in the follow-up loop.
- A fresh worktree has no dependencies: tell the tester to install first. Do not symlink dependencies from another
  checkout; some bundlers reject a symlink that points outside the project root, and the build fails while the other
  gate commands pass. That is environment, not the diff: replace the link with a real install and rerun everything.
- The ux-checker dismisses itself when the diff touches no surface a person sees. Do not force a finding.

Output contracts: tester → `GATE: GREEN|RED` · what ran · what it fixed · `FILES_FIXED` · remaining failures;
doc-checker → `DOC-CHECK` · `DOCS_TOUCHED`; system-checker → `SYSTEM-CHECK` · `SYSTEM_FOLLOWUPS`; ux-checker →
`UX-CHECK` · findings with `file:line`, principle and severity · `UX_FOLLOWUPS`.

## Step 2 — The gate decides

**`GATE: RED`** → **stop**. No commit, no PR. Report each remaining failure with the command that reproduces it. If the
tester fixed part and got stuck on the rest, say what is green and what is not — and do **not** ship "the part that
passed".

**`GATE: GREEN`** → final allowlist = Step 0 allowlist + `FILES_FIXED` + `DOCS_TOUCHED`. A tester fix left out of the
commit ships the bug that was just fixed, and the gate you ran describes a state that does not exist on the remote.

A green bought by loosening an assertion is not green. If `FILES_FIXED` includes a test file, read its diff before
shipping: changing the expected value to what the code produces is the cheapest way to buy green, and CI would run the
same weakened assertion and pass too.

## Step 3 — Shipper

`Agent` with `general-purpose`, `haiku`, prompt = full `${CLAUDE_SKILL_DIR}/../ship/agents/shipper.md` + the final
allowlist + the mode + the attribution lines + the ready PR bodies — the feature PR's and, in `MODE=staging`, the
sync's (how many commits staging was behind, and why it merges with a merge commit) — written with the `write` skill
when the project has one.

| `TARGET` | Mode for this round |
|---|---|
| `main` · `both` | `MODE=main`; in `both` the sync comes after the production deploy (Step 7a) |
| `staging` | `MODE=staging`: commit, sync `main` → `staging`, feature PR → `staging`, in that order |
| `(branch X)` | `MODE=branch` + `TARGET_BRANCHES` |

> "The gate already ran and is green (the orchestrator confirmed) — do NOT run any gate command again; go straight to
> commit, push, PR. The current branch is a feature branch. In `MODE=main` open and merge ONE PR into `main`; in
> `MODE=staging`, the sync with a merge commit and then ONE feature PR into `staging`; in `MODE=branch`, PRs only into
> `TARGET_BRANCHES`."

## Step 3.5 — Validate the shipper's report (you)

`ship`'s Step 3.5: a new SHA, `comm -13` of the allowlist against the commit, PR head and base, poll until `MERGED`,
content check.

In `MODE=staging`, the same with `staging` in place of `main`, and two PRs:

```bash
gh pr list --state merged --head main --base staging --limit 1 --json number,url   # the sync, when there was one
gh pr list --state merged --head <feature> --base staging --json number,url        # the feature
git fetch origin staging -q
git merge-base --is-ancestor <origin/main SHA the shipper noted> origin/staging && echo "main inside staging"
git diff --stat HEAD origin/staging -- <final allowlist>                            # empty = arrived
```

The numbers must be the ones the shipper reported. The `--is-ancestor` check proves what `MERGED` does not: without the
echo, `main` did not go in with its history (a squash, or a sync that never happened) — stop, because the next sync
will hit the same lines and the feature PR may have carried `main` commits flattened inside it.

Shipper returned `sync main→staging conflicted` → the feature commit is pushed and no PR into staging exists. Resolve
it with Step 7b now, before Step 4; then run the shipper's `MODE=staging` item 3 yourself (the counts, the feature PR,
the squash) and come back here.

Say which green is which: "local gate green (<gate commands>); remote CI ran in parallel and did not gate the merge".
Never phrase them so that remote CI seems to have blocked anything.

## Steps 4 and 5 — Remove the worktree, update the main checkout

`ship`'s Steps 4 and 5. Step 4 is mandatory, after the content check and **before** any deployer; everything that needs
another worktree (the deploys, a `both` sync conflict) comes after it.

| `TARGET` | Proof before removing |
|---|---|
| `main` · `both` | `git status --porcelain` and `git diff --stat HEAD origin/main` empty. In `both`, staging has received nothing yet |
| `staging` | `git status --porcelain` empty and, after `git fetch origin staging -q`, `git diff --stat HEAD origin/staging -- <final allowlist>` empty |

On staging the proof is always per allowlist: the full tree never matches `origin/staging`, which carries newer `main`
commits and its own. The feature branch stays on the remote (`MODE=staging` does not delete it), so discarding the
worktree loses nothing. Step 5 applies in `staging` too: other ships may have moved `main`.

## Step 6 — Phase 3, production deploy (`TARGET=main` · `both`)

`ship`'s Step 6: the same agent (`${CLAUDE_SKILL_DIR}/../ship/agents/deployer.md`), the same contract, one deploy per
chain from the final state, the same exceptions. It does not run in `TARGET=staging` (`main` did not move). In `both` it
runs before anything on staging, and its result decides Step 7:

- **Production deploy failed** (red build, marker timed out) → stop: no sync, no staging deploy. It is the same code;
  the human needs the production diagnosis, not a second red build.
- **Deploy skipped** (CLI not authenticated, user request) → the 7a sync still runs (it is only git); 7c is skipped for
  the same reason.

Report `local gate green (<gate commands>)` and `live at <production URL>: <codes>` as **two separate lines**: one is
about your machine, the other about what users get, and merging them is how "deployed" gets read when nothing arrived.
Report the deployer's `Release recorded` line; a failure there is WARN, not STOP. If the diff changed the schema, the
natural marker is the page using the new table answering 200 instead of 500: a green build does not prove the table
exists in production.

## Step 7 — The staging side (`TARGET=staging` · `both`)

### 7a — Sync `main` → `staging` (`both` only)

In `TARGET=staging` the sync already ran in Step 3. In `both` it runs here, after Step 6, and it is what carries the
feature to staging. Shipper again (`general-purpose` · `haiku`), `MODE=sync-staging`, with the PR body ready and **no
allowlist** (it commits nothing). The session left its worktree in Step 4, so the working directory is the checkout you
are in now; there the shipper only runs `git fetch`, reads and `gh` — no local `checkout`, `pull` or `merge`, because
that checkout belongs to whoever works in it.

Validate: the sync PR is `main` → `staging` and `MERGED`, and

```bash
git fetch origin staging -q
git merge-base --is-ancestor <merge SHA of your PR on origin/main> origin/staging && echo "feature in staging"
```

`sync main→staging conflicted` → 7b.

### 7b — A sync that conflicts

The shipper predicts the conflict with `git merge-tree` before opening a PR and returns the files; you resolve it. First
`git fetch origin main staging -q`. Where depends on whether the session is still isolated:

- **`TARGET=staging`** — the conflict shows up in Step 3, still inside the session's worktree: resolve it **there**. The
  feature commit is already pushed, so leaving its branch risks nothing: `git status --porcelain` with no modified
  tracked file, then `git switch --detach origin/staging`.
- **`both`** — the conflict shows up in 7a, after the worktree was removed: use a throwaway one,
  `git worktree add --detach /tmp/sync-main-into-staging-<YYYY-MM-DD> origin/staging`, and work there (test whether
  `cd` persists, as in the deployer's Step 1).

Then:

```bash
git merge origin/main --no-edit       # conflicts: resolve them, `git add` what you resolved
```

- **`main` is production and wins by default; what only staging has is someone's work in staging.** Never discard a
  staging-only hunk to make the conflict go away: reapply it on top of `main`'s version. Unsure whose it is, or whether
  it still matters → stop and ask (a git question).
- **A hand-resolved conflict is code no gate has seen.** Before pushing, install and run all of `<gate commands>` right
  there. Red → stop **without pushing**: a badly resolved merge does not become a PR.

```bash
git commit --no-edit
git push origin HEAD:refs/heads/sync/main-into-staging-<YYYY-MM-DD>
gh pr create --base staging --head sync/main-into-staging-<YYYY-MM-DD> --title "Sync staging with main" --body "<ready body>"
gh pr merge <n> --merge                                       # merge commit, never squash
git push origin --delete sync/main-into-staging-<YYYY-MM-DD>
```

- A dated branch on the remote and a detached HEAD locally, on purpose: no local branch is left to delete. Never push
  directly to `staging` or `main`, never force.
- An older `main` → `staging` PR still open? Close it pointing to the new one:
  `gh pr close <n> --comment "Superseded by #<m>"`.
- The proof is 7a's: `git merge-base --is-ancestor <the origin/main you merged> origin/staging`.

Afterwards: in `TARGET=staging`, `git switch <feature>`, run the shipper's `MODE=staging` item 3, and go back to Step
3.5. In `both`, `git worktree remove --force /tmp/sync-main-into-staging-<YYYY-MM-DD>` from outside it, then 7c.

### 7c — Staging deploy

`Agent` with `general-purpose`, `sonnet`, prompt = full `${CLAUDE_SKILL_DIR}/../ship/agents/deployer.md` +
`ENVIRONMENT=staging` + the `origin/staging` SHA after the last merge (the feature PR's in `TARGET=staging`, the sync's
in `both`) + the one-line summary + the marker, if any. Its staging section first checks whether CI is already
deploying (then it only waits and verifies), deploys by hand when not, and proves on `<staging URL>`.

**No release record, on purpose**: the release log is production's, and a staging SHA there would put commits on
production's timeline that its users never received.

Validate as in `ship`'s Step 6, plus the `Published by` line: by hand (with the CI run that never started) or by the CI
workflow (with the run number). Same exceptions as Step 6.

## Follow-up loop

`ship`'s loop, with three sources: `SYSTEM_FOLLOWUPS`, `UX_FOLLOWUPS`, and what the tester noted (an assertion it had to
touch, a type left loose, an environment dependency it installed).

- **A UX `Blocker` is not a follow-up.** The person cannot continue or loses work: it goes back into the diff before the
  PR. The tester stays the gate, but shipping a screen that loses someone's text because the gate only checks
  compilation is the exact hole the ux-checker exists to close.
- Each round reships through **`test-and-ship`**, so every round passes the gate. Stop at the fixpoint.
- `TARGET` holds for the whole chain. In `both`, the sync and both deploys wait for the last round. In
  `TARGET=staging`, each round opens its own PR into staging (its sync is usually "nothing to bring") and the staging
  deploy waits for the last round.

## Final report (mandatory)

`ship`'s format (TL;DR on the first line, then the summary table, `Exit?` last), plus the gate line and **one line per
destination**, in the table and in phase 3. The example is `both`; in `main` drop the staging line, in `staging` drop the
`main` line (the staging PR is then the feature's, with the sync on its own line when there was one).

| What | PR | Target | State |
|---|---|---|---|
| <the change> | #28 | `main` | merged (squash; CI does not gate) · live · release recorded |
| sync `main` → `staging`, carrying #28 | #29 | `staging` | merged (merge commit) · live |

```
OK  Green, shipped and live in both environments — local gate green (<gate commands>); PR #28 merged into main, sync #29 into staging; deploy verified at <production URL> and <staging URL>. Remote CI ran in parallel (signal, not gate). Safe to exit.

Tested and shipped (/test-and-ship · TARGET: both, the default · branch: <branch>)

Phase 1
  GATE GREEN — <each gate command> ✓
    fixed: <what the tester fixed, or "nothing — green on the first run">
    FILES_FIXED: <list or empty>
  Doc-check: CLEAN  ·  or EDITED <file>: <what>
  System-check: <n> findings  ·  or N/A
  UX-check: CLEAN  ·  or <n> findings  ·  or N/A (no surface touched)
  Committed: <Step 0 allowlist + FILES_FIXED + DOCS_TOUCHED>

Phase 2 (TARGET: both → MODE: main, then sync-staging)
  Commit <sha> (pushed) · PR #28 → main MERGED, content confirmed on origin/main
  Sync #29 main → staging MERGED with a merge commit; #28's commit is an ancestor of origin/staging
  (if it conflicted: "resolved in sync/main-into-staging-<date>, gate green on the merge, PR #29 with a merge commit")
  Local gate green; remote CI ran in parallel and did not gate the merge

Phase 3
  Production: deployed origin/main <sha> → build ok · live at <production URL>: <codes> · marker "<x>" present in <where>
    Release recorded: <n> changes  ·  or nothing new  ·  or WARN <failure>
  Staging: by CI run <id> from origin/staging <sha>  ·  or by hand — CI did not start (run <id>: 0 steps)
    live at <staging URL>: <codes> · marker ... · no release record
  or, for either: deploy skipped — <reason>; the environment stays on the previous build

Follow-ups: <list or none>
Worktree: removed  ·  or kept: <reason>   ·   Main checkout: <what Step 5 did>

Exit? yes — gate green, fixpoint, PR #28 and sync #29 merged with content confirmed, deploy verified in both environments, worktree gone, no pending question.
```

`Exit? yes` only with: gate green + fixpoint + **every destination PR** merged with content confirmed (on staging,
`main` an ancestor of `origin/staging`) + **every destination deploy verified live** (or skipped for a stated reason) +
this session's worktree gone + no pending question. Otherwise `no`, with the reason in one line. One side green does
not cover the other: production live with staging stuck in a conflict is `no`.

## Related skills

- `ship` — the sibling without the gate, for diffs that do not run; it owns the shared agents.
- `implement` — the entry point before both.
- `railway-ops` (or the project's infrastructure skill) — logs, variables, database, rollback after the ship.
