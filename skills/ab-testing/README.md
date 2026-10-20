# A/B testing skills

Product A/B tests for web apps with user accounts, from the design to keeping only the winner.

| Skill | Use it when a task… |
|---|---|
| `ab-test-create` | Starts a test: designs it with you, assigns each account once at signup, gates the arms behind a flag, builds the results board |
| `ab-test-promote-winner` | Ends a test: snapshots the final board, sends everyone to the winner, deletes the losing arms, retires the flag, archives the test |

These skills assign accounts, not anonymous visitors. To test a page before signup, they stop and ask.

Both read the project's facts (where flags are defined, where signup assigns arms, where boards live) from its
`CLAUDE.md` or `AGENTS.md`, and ask once for what is missing.

## Scripts

`ab-test-create/scripts/check-board.mjs` opens each board URL, signs in if a password field appears, checks that the
arm cards render and saves a screenshot. `ab-test-promote-winner/scripts/read-board.mjs` reads the final board's
cards into JSON before the test is archived. Both need Node 18+ and Playwright (`npm i -D playwright`), and are
configured through environment variables listed at the top of each file. Credentials come from a file and are
never printed.

Skills are available as `/empreiteiro:ab-test-create` and `/empreiteiro:ab-test-promote-winner`. Copying by hand:
keep both together, since the second uses the first one's board check.
