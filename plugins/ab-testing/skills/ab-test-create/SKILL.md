---
name: ab-test-create
description: Start an A/B test in a web app with user accounts, from design to a live results board. Designs the test with the user (the question, the arms, the control, how accounts split, the cut points, who is excluded), assigns each account exactly once at signup in a column of its own, gates what each arm sees behind a feature flag whose default lives in code, and builds the board (funnel per arm, allocated ad cost, the assignment bar with its cut marks, a screenshot of each arm). Use for "set up an A/B test", "test X against Y", "split accounts into arms", "half see A and half see B", "add an arm to the test", even without the words A/B. Not for ending a test and keeping the winner (ab-test-promote-winner), flipping a flag (one click in the console), shipping (test-and-ship), or testing anonymous visitors before signup: this method assigns accounts, so stop and ask.
---

# A/B test: create

Assign each account once at signup, gate the arms behind a flag, read the result on a board built for this
test's question. Ending a test is `ab-test-promote-winner`.

**Code, not configuration.** No experiment framework, per-account rollout or percentage targeting. Each test is
a small bespoke set (one import-free assignment module, one column, one flag, one board) because each board
answers its own question. Do not build the framework.

## Project setup

Read these from the project's CLAUDE.md/AGENTS.md and the docs they point to; ask the user once, in one
message, for whatever is missing:

- every code path that creates an account (grep for the insert into the users table);
- the database dialects every statement must run on, where the schema lives, how an existing database gets a
  new column, and any schema parity test;
- the flag registry (defaults in code), the overrides table, the retired-keys list, and what each flag must
  carry (a docs paragraph, a screenshot);
- where boards live: the A/B page, the list of tests, the board components (funnel, ad-cost chain, assignment
  bar), the arm screenshots, and every path the page is served at;
- the analytics event registry, the funnels the board reads, and the list of accounts excluded from counts;
- the locales and the writing process for user-facing copy; the list of import-free modules, if any;
- the gate, the browser e2e command, and who the result is reported to.

If the project ran tests this way before, find those commits (`git log` on an earlier assignment module) and
read the diffs first: they are the template.

## 0. Isolate and design

Work in an isolated worktree (`implement` does it). Close the design with the user in **one message**, with
your recommendation on every line; flag product and money decisions explicitly.

| Decide | Why |
|---|---|
| The question, in one sentence | Without it nobody can pick the deciding step |
| The arms, and what each one SEES | One letter per surface; the description becomes the arm's caption and hint |
| A control arm (the app as it is) | Without one the board answers "which of N", never "is any better than nothing". Recommend one |
| Who enters | Only accounts created after the deploy. Older accounts are "before the test" |
| How accounts split | Step 1 |
| The deciding step | Default: the last step of the activation funnel, plus a line of the test's own |
| Does an arm call a paid model or API? | A spend decision if nothing caps it: ask |
| Accounts per arm, in how many days | Small numbers mislead. Divide the last 30 days of signups by the arms |

**Stop and ask** if the user wants to test anonymous visitors before signup (a landing or pricing page): an event
with no account behind it is in no arm, so this method cannot answer that question.

## 1. How accounts split

Decided **at signup, once, never again**. The unit is the account created after the deploy, and every path
that creates an account assigns.

**Pure random at signup.** Every new account rolls once; the device plays no part. `assign<Test>Arm(roll)`
never returns `null`, so `null` in the column means "created before the test", and a device filter shows two
halves of one arm. The roll comes after the ad click, so the ad decides nothing: one ad-cost chain covers all
arms, and each arm pays its share of the total, divided over the whole board, unassigned included.

**Segment cut, random inside.** The segment decides part of the answer with no roll (desktop always gets A) and
the roll splits the rest (mobile: half B, half C): `assign<Test>Arm(segment, roll)`. `null` means an unreadable
segment (scripts and health checks, not people) and must not inflate an arm. The ad platform knows which screen
it served, so the ad decides the family: one ad-cost chain per segment, each arm paying against the chain that
fed it, never against the whole board.

For any split:

- **Cuts are exported VALUES**, `<TEST>_CUTS = { a: 0.25, b: 0.5, c: 0.75 } as const`, never "a quarter"
  scattered in code. The board draws its marks from them and the test pins them.
- **`roll` is the caller's `Math.random()`**, half-open [0, 1). Clamp anything else:
  `Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 0.999999) : 0`. Signup must never fail on a strange
  number, and a strange number lands in the first arm, so **the first arm is the control**.
- **One `Math.random()` per test.** Two tests sharing a roll correlate their arms, and one test's finding
  becomes the other's artifact.
- **One column per test** (`users.ab_<test>`), never a new value in an existing column: tests overlap on the
  same accounts.
- **Written once, never re-rolled.** An arm that moves counts one person in two funnels. The arm is read from
  the column, so no id hashing.
- **Unequal splits are fine**; each rate divides by its own arm. Say so in the board's hint.
- **An arm added mid-test** changes the cuts, not the accounts already assigned. The board then holds two
  populations: rates stay comparable, raw counts do not. Say so in the count's hint.
- **No backfill.** Rolling an old account puts it in an arm whose surface it never saw.

## 2. The assignment module, with no imports

It fails by returning something plausible (a cut one hundredth off moves people between arms and reads as a
finding), so it imports nothing and its test exercises it directly. Add it to the project's import-free list
if there is one. For a pure random split:

```ts
// Which arm of the <test> experiment an account is in.
//
// The question: <one sentence>. <N> arms answer it:
//   A — <what A sees>. The control: the app as it shipped.
//   B — <what B sees>.
//
// Rolled once at signup, never moved; the device does not enter it.
// `null` means "created before the test shipped" — one fact, one spelling.
// No imports: tests/ab-<test>.test.mjs exercises it directly.

export type Ab<Test>Arm = 'A' | 'B';
export const AB_<TEST>_ARMS = ['A', 'B'] as const;

/** Boundaries as VALUES: the board draws its marks from these and the test pins them. */
export const <TEST>_CUTS = { a: 0.5 } as const;

export function assign<Test>Arm(roll: number): Ab<Test>Arm {
  const r = Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 0.999999) : 0;
  return r < <TEST>_CUTS.a ? 'A' : 'B';
}

/** `false` for `null` keeps a pre-test account out of arm A. */
export function is<Test>Arm(value: unknown): value is Ab<Test>Arm {
  return value === 'A' || value === 'B';
}
```

For a segment cut: `assign<Test>Arm(segment: 'mobile' | 'desktop' | null, roll: number)`, the segment decided
before the roll and `null` returned for an unreadable one.

The test asserts:

- each boundary from both sides (`cut - 1e-9` and `cut`), plus `0` and `0.999999`;
- the cuts as a value (`deepEqual(<TEST>_CUTS, {…})`): boundary tests follow the constant wherever it goes, this
  one notices it moving;
- strange numbers (`NaN`, `-3`, `2`, `Infinity`) land in an arm;
- 10,000 rolls land where the cuts say, within at least 4σ (σ = √(p(1−p)/n); 25% of 10,000 gives 0.43 points);
- the arity (`assign<Test>Arm.length`), so adding or removing the segment is deliberate;
- only the declared letters are arms (`null`, `''`, lowercase and an extra letter are not).

## 3. The column, in every dialect

Add `ab_<test> TEXT` (NULL = before the test) to every schema path the project has. On an existing database
`CREATE TABLE IF NOT EXISTS` is a no-op, so a column added only inside it reaches new deployments alone: add
`ALTER TABLE users ADD COLUMN IF NOT EXISTS ab_<test> TEXT` (or the project's migration) beside it. Run the
schema parity check if there is one.

## 4. Assign at signup

In every account-creation path: `const <test>Arm = assign<Test>Arm(Math.random());`, with a comment on why it
rolls its own; the column in the insert, in order; and the arm as a property of the signup event, as a
convenience for whoever reads events. The board's denominator **never** comes from that event (step 7).

## 5. The flag

- Register `<test>_flag` with a label, a one-line description in product terms, a note that off hides the
  surfaces while arms keep being assigned and counted, and **default on**: a test nobody runs answers nothing.
- **The flag governs what the arms DO, never who is in them.** Off pauses the experience, not the record.
- The key must not be in the retired list (`ab-test-promote-winner` says why). Add what every flag must carry,
  and a docs paragraph with the rule, not the history.

## 6. What each arm sees

- **Resolve the arm on the server.** The layout reads the column and the flag and hands the answer down. A
  browser that decides its own arm can be talked into another, and an experiment with an editable arm has no
  result.
  - Inside client components: a context provider mounted by the server layout.
  - A surface that interrupts the flow (a wall, a redirect): one predicate asked by **every** place that must
    agree, or someone bounces between two of them forever. When the answer depends on the current path and the
    layout cannot see it, the server hands down the answer and a small client guard in the shell carries it out.
- `null` is the app as shipped: pre-test account, flag off, or no session. Consumers ask `arm === 'C'`,
  **never** `arm !== 'B'`. The control is the app's path with no change at all.
- Copy goes through the project's writing process, in every locale. New event names enter the registry first.
  New components follow the project's placement rules. An arm that calls a model goes through the project's
  usage ledger, and only with the spend approved.

## 7. The board

**Layout** (reuse the project's components):

- The arms side by side, same scale, one row: one card per arm. On the card: the arm's name (opens its
  screenshot), a hint with the definition, the account count large with its own hint, and below it the funnel
  scoped to the arm, with its allocated cost. The test's own line under each funnel; the funnel note once, under
  the grid.
- "Before the test" in its own panel for unassigned accounts, not a card inside a card.
- The ad-cost chain follows step 1: one over all arms, or one per segment.
- **The assignment bar, with cut marks, while the test runs.** It takes the arms as `{ arm, accounts }[]`, the
  cuts (fractions of the bar), the hint and the unit as props. Pass `<TEST>_CUTS`, never a `1 / 3` in the
  component. Each mark is a thin line at `left: cut × 100%`, in a color that passes 3:1 against its surface in
  both themes (an easy miss in dark mode); add the pair to the project's contrast test if it has one, and never
  lower the floor. A finished test passes no cuts.
- Definitions behind hints; each warning next to the number it qualifies; hint markers outside truncated text
  and outside buttons, with ids scoped by arm, or four hints answer for one id.
- **A number that lives only in a hover tooltip does not exist on a phone or for the keyboard**: every tooltip
  figure also appears in a row.
- Mark each arm card `data-arm="<arm>"` and the selected test tab `aria-current="page"`: the scripts of both A/B
  skills find them by those.
- **No green and no "won" while the test runs.** That belongs to the promotion.

**Data and wiring:**

1. **The query composer.** An arm column interpolated into SQL belongs to an allowlist union. The **denominator
   comes from the users table**, in one pass, with the range end bound by hand: counted from the signup event
   it loses everyone whose event failed, and an arm that looks smaller looks better at everything. The arm list
   includes `unassigned`. Per arm: the activation funnel and the test's own reading. The composer reads the
   **excluded-accounts list** itself and keeps it out of every count, binding it by hand in the users
   denominator if that bypasses the shared filter. A cohort question measured on product-journey steps may
   get a separate composer that reads users directly.
2. **The board component**: copy the closest earlier board.
3. **Register the test** at the top of the tests list **without** a finished date: that puts it on the running
   shelf and opens it when the URL names no test. The label names the question, not a funnel step: it sits next
   to a percentage and would read as the test's result.
4. **The page**: one branch per key choosing the composer and the board, plus a note per key on what the device
   filter narrows, if there is one. Only the open test's composer runs (plus the ad report when the board has a
   chain).
5. **Screenshots**: one per arm plus `unassigned`, looked up **by key**. An unknown key returns an empty list
   (an empty panel at least looks wrong), never another test's shots. Shoot a throwaway account on a local
   database, never a real one (static assets are public), and measure width and height from the file.

**Every path the page is served at.** If the board is mounted under more than one console, the new test appears
in each with no copy of the page. Links on the board are built from the console base the page already knows,
never a hard-coded path. A board that counts accounts by signup date labels its range as a signup range, or the
operator reads it as an activity period.

**Verify in a real browser**, against a local dev server with a throwaway console login in a `KEY=VALUE` file:

```bash
OUT=<scratch> PROJECT_DIR=<repo> CREDS_FILE=<scratch>/console.kv NAV_SELECTOR='<css of the test switcher>' \
  node "${CLAUDE_SKILL_DIR}/scripts/check-board.mjs" '<base>/<board path>?t=<test>' ['<base>/<other mount>?t=<test>']
```

It fails on a non-200 page, a board with no arm card, no selected tab, or a switcher link that leaves the page
it was opened on. Open every screenshot and compare them, and check the board's own links by hand. Open the dev
server on the host it expects (some block cross-origin dev requests and the page never hydrates), and stop it
afterwards: the e2e run wants none alive.

## 8. Docs

- The module's header is the test's doc: the question, the arms, the split, what `null` means.
- Project docs: the import-free list, the flag's paragraph, the A/B section (the running test, its composer,
  and what is structural on the board: denominator, ad allocation, split), the analytics doc for a new event,
  and any file counts the docs keep (take the main branch's and add your delta).

## 9. Gate, ship, report

Ship through `test-and-ship`. Also run the browser e2e suite when an arm touches onboarding, a shell redirect
or a core interactive loop, with no dev server alive. After the deploy, open the production board with no test
in the URL: with one test running it opens on it, arms at zero until the first signup.

Report to the stakeholder in app behavior, not files: who gets what from today and in what proportion; what
counts as winning; where to read it; when it is worth reading (accounts per arm, and how many days at the
current signup pace); how to pause (the test's flag off: nobody sees the arms, counting goes on); how it ends
(the result is photographed and only the winner stays, via `ab-test-promote-winner`).

## Never

- Build an experiment framework.
- Share a `Math.random()` between tests, or reuse another test's column.
- Reuse a retired flag key.
- Backfill old accounts.
- Let the browser decide the arm, or ask `arm !== 'X'`.
- Count the denominator from the signup event.
- Paint a running test green or write "won" on it.
- Hard-code a console path in a board link.
- Screenshot a real account.
- Put a paid model in an arm without the spend approved.
