---
name: lineage-and-versioning
description: Add run tracking, data lineage and immutable version history to data pipelines (ETL steps, medallion layers, question-answering runs) — run/edge data model, best-effort instrumentation, snapshots, diffs, restore and pushing versions to git. Use when building "where did this table come from" views, pipeline history with restore/diff, or committing pipeline definitions to a repository.
---

# Lineage and versioning

Lineage is observability: it must never break the work it observes. Versioning is history: it must never be
rewritten. Both need the tenant id on every row.

## Runtime lineage

### Data model

```
pipeline_run:  id (client-side UUID), tenant_id, kind (ingest|transform|qa|...), status (running|success|error),
               started_at, finished_at, duration_ms, error_message (truncated), metadata JSON
lineage_edge:  id, run_id (cascade delete), tenant_id, source_kind, source_ref, target_kind, target_ref,
               edge_type (read|write|transform|derive), created_at
```

- Refs are typed strings, `kind:ref` (`source:3f2a…`, `table:silver_orders`, `column:silver_orders.amount`). String
  refs leave room for column-level lineage without a schema change.
- Edges are append-only and tied to the run that produced them; the graph is the union of edges over recent runs,
  deduplicating nodes by `kind:ref`.

### Instrumentation rules

- Wrap work in a context manager: start run → yield → finish `success`, or `error` with the message, then re-raise
  the original exception.
- The tracker swallows its own failures (log them) — an instrumentation error must not fail the business call.
- Always pass the tenant id explicitly. Defaulting it to the user id makes the runs invisible to tenant-filtered
  views.
- Persist error runs in their own session/transaction. If the run row lives in the request transaction, the
  request's rollback deletes exactly the runs you most want to see.
- Don't flush eagerly. On SQLite an early flush opens a write transaction that is held across slow LLM or warehouse
  calls and blocks other sessions ("database is locked"). Assign ids client-side so edges can reference the run
  before it is flushed.
- Declared dependencies (`depends_on`) give a step graph only. For table/column lineage from SQL, parse it:
  `sqlglot.parse_one(sql, read=dialect)` → tables from `exp.Table`, columns via `sqlglot.lineage`.

## Pipeline versioning

### Model

```
pipeline_version: id, tenant_id, owner_id (workspace/project), pipeline_id, version_number,
                  snapshot JSON, content_hash, message, author_id, parent_version_id,
                  restored_from_version_id, vcs_commit_sha, vcs_commit_url, created_at
UNIQUE (owner_id, pipeline_id, version_number)
```

- `version_number = max + 1` per (owner, pipeline), backed by the unique constraint declared in BOTH the ORM model
  and the migration (otherwise test databases built from models lack it). Retry on conflict.
- Rows are immutable; only the VCS fields are filled after a push.
- Pipeline ids must be stable and never reused. `pipeline_{len(list)+1}` reuses ids after a delete and makes a new
  pipeline inherit another's history — use UUIDs.

### Snapshot, hash, diff, restore

- **Snapshot** = deep copy of the definition with secrets scrubbed, serialized canonically:
  `json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False)`. Canonical JSON gives byte-stable files and clean
  git diffs.
- **Content hash** (`sha256` of the canonical JSON) — skip creating a version when nothing changed.
- **Scrub by exact key list** (`password`, `api_key`, `access_token`, `client_secret`, …) or, better, by the
  schema's `secret: true` fields. A broad regex such as `(key|secret|token)` also nulls `dedup_key`, `primary_key`,
  `join_key`; after a restore those values are gone for good.
- **Diff** by stable step ids: `added_steps`, `removed_steps`, `changed_steps[{id, fields: {name: {a, b}}}]`,
  `top_level` changes. Test add/remove/change/no-op.
- **Restore** never rewrites history: write the old snapshot back to the live definition (copy, then reassign the
  JSON column so the ORM sees the change), then create a new version with `message="Restored vN"`,
  `restored_from_version_id = vN.id`.
- Version when the user saves, or automatically on every edit — but document which; don't claim "every edit" if
  versions are only created by an explicit commit.

### Pushing versions to git

- Use the hosting API's contents endpoint (get file SHA → PUT with SHA if it exists); no clone needed.
- Path: `<base>/<owner_id>/<pipeline_id>/v<N>.json`; commit message `pipeline <owner>/<pipeline> vN — <message>`.
- Re-check that the stored repository is still writable by the connected account at push time (list writable
  repos, require push/admin) so a tampered row cannot redirect pushes.
- OAuth: `state` is random, single-use, short-lived (≈10 min) and bound to (user, tenant); with multiple replicas
  store it in the database or cache, not process memory. Store tokens encrypted; use the refresh token.
- Require the right role for commit/restore/push; list and get must apply the same visibility filter (a list that
  shows teammates' versions while get/restore 404s on them is a bug).

### Routing gotcha

Register static paths before parameterized ones: `GET /versions/diff` declared after `GET /versions/{version_id}`
is captured as `version_id="diff"` and returns 404.

Related: `medallion-pipeline` (edges per layer), `secure-data-platform` (secret fields, tenant scope),
`sqlite-postgres-portability` (JSON mutation tracking, SQLite locking).
