# SaaS backend skills

Checklists for the backend of a multi-tenant SaaS app: the changes where one missed step leaks data
between tenants, breaks a production boot or silently stops a sync. Each skill starts by mapping the
project's own helpers, so it adapts to your codebase instead of imposing names.

| Skill | Use it when a task… |
|---|---|
| `secure-api-route` | Adds or edits an endpoint, webhook, OAuth callback or service-to-service route: deny-by-default auth, tenant scope, roles, tenant-checked writes, input, errors, audit, SSRF, signatures, secrets |
| `sqlite-postgres-schema` | Changes the schema or SQL of an app that runs SQLite locally and Postgres in production with idempotent boot-time schema files: recipes, conventions, dialect traps, backfills |
| `data-source-integration` | Connects an external SaaS source: config, accounts table, OAuth or API key, token refresh, cursors and rate limits, webhooks, ingestion with dedupe, summaries and embeddings, visibility, UI, docs |

The examples are TypeScript (Node, Fastify-style routes), but the rules carry over to other stacks.
The skills point to each other: `secure-api-route` and `data-source-integration` rely on
`sqlite-postgres-schema` for storage and scoping.

## Install

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install saas-backend@empreiteiro-skills
```

Skills are then available as `/saas-backend:secure-api-route`, `/saas-backend:sqlite-postgres-schema` and
`/saas-backend:data-source-integration`, and Claude loads them on its own when a task matches.
