---
name: railway-ops
description: Operate an app hosted on Railway, in production and a staging environment. Checks whether it is up, reads build and runtime logs, inspects deploys and metrics, lists or changes environment variables, queries the production Postgres read-only, and handles redeploy, restart, rollback, domains and cost. Use whenever a task touches the project's remote environment ("the app is down", "why did the deploy fail", "show the logs", "is it live?", "what is set in prod", "how many signups do we have", "how much is this costing"), even if Railway is not named. Picks the tool in order (Railway MCP, CLI, GraphQL) and reads the project's identifiers from its CLAUDE.md.
---

# Railway ops

## Project setup

Read these from the project's CLAUDE.md (or AGENTS.md / a deploy doc). If they are missing, ask the user
once and suggest adding this table there. Never guess an id: a wrong one points every command at another
service.

| | |
|---|---|
| Workspace | `<workspace>` |
| Project | `<project name>` — `<project id>` |
| Production environment | `<name>` — `<environment id>` |
| Staging environment | `<name>` — `<environment id>` |
| App service | `<service name>` — `<service id>` |
| Other services | `<names>`, and whether this runbook covers them |
| Database | `<Postgres service name>`, volume `<volume name>` |
| Domains | production `<url>` · staging `<url>` |
| How each environment deploys | `railway up` by hand · connected repo (push to deploy) · CI job |

## Which tool

In this order; stop at the first that serves:

1. **Railway MCP** (`mcp__railway__*` tools). Preferred: structured JSON instead of ASCII tables. Covers
   status, logs, deployments, variables (list and set), metrics, domains, redeploy, docs search.
2. **`railway` CLI**, when the MCP is not loaded or for what needs the local machine: `up`, `run`,
   `shell`, `connect` (psql), `ssh`.
3. **GraphQL**, only for what neither exposes: `railway api '{ me { email } }'`.

Railway's official `use-railway` skill, if installed, has per-operation detail. This file sets the route,
the project facts and the rules.

## Authentication: two credentials, tell them apart before touching either

A typical setup has both:

- **`RAILWAY_TOKEN`**, a project token injected into the shell from local settings outside git. Scoped to
  one project and environment, which keeps commands from leaking into another project.
- **The account login** (`railway login`, stored in `~/.railway/config.json`), used by the MCP (via
  `railway mcp proxy`) and `railway api`.

While `RAILWAY_TOKEN` is set, account-level commands (`whoami`, `list`, `login`) fail with `Unauthorized`
or `Invalid RAILWAY_TOKEN`. That is expected: a project token cannot see the account. The MCP proxy
inherits the token too, and its "rejected the CLI's credentials, run `railway login`" message almost never
means the login expired. Measure before acting:

```bash
railway status                          # project token: exit 0 = token is fine
env -u RAILWAY_TOKEN railway whoami     # account login: exit 0 = login is fine
```

Both exit 0 → nothing is broken; carry on, deploy included. Do not abort a deploy or send the user to
`railway login` over a bare `whoami` failing. Only when the second command also fails is the login
expired: `env -u RAILWAY_TOKEN railway login` (without `env -u` the token intercepts it and the browser
never opens).

## Linking

If a command says `No service linked`:

```bash
env -u RAILWAY_TOKEN railway link --project <project id> --environment <production> --service <app service>
```

With more than one service in the project, the directory link can be repointed silently (e.g. `railway
add` run from a worktree without its own link rewires the root's link), and every command without
`--service` then targets the wrong service. Confirm with `railway status` before trusting the link, and in
scripts always pass `--service` and `--environment` explicitly.

## Rules

- **Never print secret values.** `DATABASE_URL` carries the production password in clear text, and
  output becomes permanent conversation history. List names only:
  `railway variables --kv | cut -d= -f1`. The same goes for API keys and tokens.
- **Know how production deploys before calling anything live.** If the service has no connected repo,
  merging publishes nothing and the app keeps serving the previous build with no error anywhere; the
  deploy is `railway up` from a clean checkout of the deployed branch (a throwaway worktree on
  `origin/<branch>`). `railway up` cannot detach a repo that was never connected, so do not refuse it out
  of that fear. Check the service's source in its config, and after any deploy prove it by fetching the
  domain and finding something only the new build serves.
- **One deploy at a time.** Two `railway up` runs from different SHAs race: the last to finish wins, and
  the older can silently undo the newer. Check `railway deployment list` for one in flight first.
- **Confirm before** `down`, `delete`, `redeploy`, `restart`, `variables --set`, rollback, domain changes
  or anything that can take the app down. `railway down` removes the latest deployment, not the service.
- **The production database is read-only by default.** Start every session with
  `SET default_transaction_read_only = on;` and run only `SELECT`s. Any write, DDL or delete needs the
  user to confirm the exact statement.
- **If the app creates its schema at boot** (check), a missing table is a boot problem, not a database
  problem; do not run manual migrations.
- **Build log noise:** when the builder has no private network, lines like
  `ENOTFOUND <db>.railway.internal` while pages are pre-rendered are normal if the build ends in
  `SUCCESS`. They are not why a deploy went red; read the step that actually failed.
- **Staging is not production.** It usually has its own database on a separate volume (nothing written
  there reaches production) and runs with fewer variables on purpose (no email provider, no conversion
  APIs, a separate AI key). A variable missing there is not a bug until the project's notes say so.

## Recipes

```bash
railway status                                        # services, database, domain, health
railway logs                                          # runtime
railway logs --build --lines 2000 <deployment-id>     # one deploy's build log; without --lines it streams
railway deployment list                               # history, and ids for rollback
railway metrics                                       # CPU, RAM, network
railway usage                                         # workspace consumption this billing cycle
railway connect <Postgres service>                    # psql (then the read-only SET above)
railway variables --kv | cut -d= -f1                  # variable names, never values
```

Deploy staging by hand when its automatic deploy does not run, from a throwaway worktree on
`origin/<staging branch>`:

```bash
env -u RAILWAY_TOKEN railway link --project <project> --environment <staging> --service <app service>
env -u RAILWAY_TOKEN RAILWAY_HTTP_TIMEOUT=600 railway up --environment <staging> --service <app service> --message "<env> <short sha>: <what ships>"
```

**Rollback** (after confirmation): pick the last good deployment from `railway deployment list` and roll
back to it in the dashboard or through the MCP or GraphQL; or run `railway up` from a worktree at the last
good commit. Then prove it by fetch, as for any deploy.

## Reporting

If the person is not an engineer, translate: "the app was down for 4 minutes during the 9 pm deploy", not
"deployment 8766… went CRASHED with exit 137". Infrastructure numbers belong in the report only when they
change a decision: cost, capacity, risk of losing data.
