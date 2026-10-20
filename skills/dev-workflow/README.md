# Dev workflow skills

A change from request to production, with proof that it is live: isolate it, check it against the project's rules,
run the gate, merge, deploy, and fetch the live site to confirm it serves what shipped.

| Skill | Use it when a task… |
|---|---|
| `implement` | Asks to build, fix or change something: isolates the work in a git worktree, reads the framework docs, checks the project's invariants, validates the premise against today's code, plans |
| `test-and-ship` | Is done and should go live: runs the gate and fixes what fails, commits an allowlist, opens and merges the PR, deploys, proves it by fetch |
| `ship` | Ships a diff that does not run (docs, skills, config) without the gate |
| `railway-ops` | Touches an app on Railway: status, logs, deploys, variables, read-only Postgres, rollback, domains |

`implement` points to two skills in [`frontend/`](../frontend/README.md): `atomic-design` before creating or moving
a React component, and `ui-revamp-prototype` when the task is to draw options for a screen rather than build one.

## Project setup

The skills do not hard-code project facts. They read them from the project's `CLAUDE.md` or `AGENTS.md`, and ask
once for what is missing. Each skill lists what it needs in its "Project setup" section. The main ones:

- gate commands (lint, typecheck, tests, build) and the install command;
- deploy command per environment, production and staging URLs, branch names;
- where the project's invariants and framework docs live;
- for `railway-ops`, the Railway project, environment and service IDs.

Skills are available as `/empreiteiro:implement`, `/empreiteiro:test-and-ship` and so on. `test-and-ship` takes the
destination after the command: `(prod)`, `(dev)`, `(prod+dev)` or `(branch X)`. Copying by hand: keep
`test-and-ship` together with `ship`, whose agents it uses.
