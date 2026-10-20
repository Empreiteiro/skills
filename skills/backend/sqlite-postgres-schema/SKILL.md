---
name: sqlite-postgres-schema
description: Change the database schema and write SQL that runs on both SQLite (local development, tests) and Postgres (production), in an app that keeps its schema as idempotent files applied at every boot instead of using a migration tool. Covers new tables, columns and indexes, constraint changes, boot backfills, column conventions, tenant scoping and the dialect traps between the two engines. Use whenever a task touches the schema files or the SQLite upgrade list, or adds or changes SQL that must run on both engines.
---

# Schema changes and SQL for SQLite + Postgres

Some apps run on SQLite locally and on Postgres in production, behind one small async database API. That
setup is convenient, but each engine fails on things the other accepts, and an idempotent boot-time schema
has ordering traps. This skill covers both.

If the project uses a migration tool (Knex, Prisma, Drizzle, Alembic, Rails…), follow the tool for *where*
schema changes go. The SQL rules, conventions and scoping below still apply.

## 0. Map the project first

| What | Look for |
|---|---|
| The database layer and how it picks the engine | `db.ts`: e.g. SQLite when `DATABASE_URL` is unset, Postgres when it is set |
| The SQLite schema for fresh databases | `schema.sql` with `CREATE … IF NOT EXISTS` |
| The SQLite upgrade list for existing files | An array of `ALTER TABLE … ADD COLUMN` statements run after the schema, ignoring "already exists" |
| The Postgres schema | `schema.pg.sql`, the **final state**, re-applied at every boot |
| A translation step | A function that rewrites placeholders and a few functions for Postgres |
| Where queries live | A repository module (`repo.ts`, `queries/`) |
| Tenant scoping helpers | `tenantWhere(scope)`, `memberWhere(email)` |
| The boot sequence | `main()`: database init → backfills → workers and cron |

## 1. The model

| Piece | Engine | When it runs | Role |
|---|---|---|---|
| SQLite schema file | SQLite | Every boot | Fresh databases: `CREATE TABLE/INDEX IF NOT EXISTS` |
| SQLite upgrade list | SQLite | Right after the schema file | Existing files: `ALTER TABLE … ADD COLUMN`, indexes on those columns, one-off data fixes. Errors such as "duplicate column" are swallowed |
| Postgres schema file | Postgres | Every boot | The final state, idempotent: `CREATE … IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` |

A failing statement in either schema file aborts the boot, and with it a production deploy. Treat both files
as code that must run cleanly **twice in a row**, on a fresh database and on an old one.

## 2. Recipes

### New column

Change all three places:

1. SQLite schema: add the column to the table's `CREATE TABLE` body.
2. SQLite upgrade list, at the end: `"ALTER TABLE project_state ADD COLUMN checked_at TEXT"`.
3. Postgres schema: add it to the `CREATE TABLE` body **and**, right after that table,
   `ALTER TABLE project_state ADD COLUMN IF NOT EXISTS checked_at TEXT;`.

SQLite can't `ADD COLUMN … NOT NULL` without a non-null `DEFAULT`. Give the column a default or keep it
nullable.

### New table

- The same `CREATE TABLE IF NOT EXISTS` block, with types adapted (see section 3), in both schema files,
  plus its indexes.
- **Nothing** in the SQLite upgrade list: the schema file already creates missing tables on every boot.
- In the Postgres file, declare the table **after** the tables it references. File order matters for foreign
  keys.

### New index

- On a column that exists in fresh databases: `CREATE INDEX IF NOT EXISTS` in both schema files.
- On a column added by `ALTER`:
  - SQLite: put the index **only** in the upgrade list, after the `ALTER`. On an old database the schema
    file runs before the `ALTER`, so an index there fails and aborts the boot.
  - Postgres: put it after the `ADD COLUMN IF NOT EXISTS`.
- Name indexes `idx_<table>_<purpose>`, e.g. `idx_items_tenant ON items(tenant_id, created_at)`. Partial
  unique indexes (`… WHERE status = 'running'`) work on both engines.

### Non-additive change (drop `NOT NULL`, change a primary key or `UNIQUE`)

- **SQLite can't alter constraints.** Rebuild the table after the upgrade list, guarded so it runs once:
  1. check the current shape with `PRAGMA table_info` or `PRAGMA index_list`;
  2. `PRAGMA foreign_keys = OFF`;
  3. `ALTER TABLE x RENAME TO x_old`;
  4. `CREATE TABLE x (…new definition…)`;
  5. `INSERT INTO x (cols) SELECT cols FROM x_old`;
  6. `DROP TABLE x_old`, recreate its indexes, `PRAGMA foreign_keys = ON`.
- **Postgres:** `ALTER COLUMN … DROP NOT NULL`, or `DROP CONSTRAINT IF EXISTS` followed by
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '…') THEN ALTER TABLE … ADD CONSTRAINT …; END IF; END $$;`.
- **Renaming or dropping a column, or changing its type**, needs a plan for both engines and for the old
  code that still reads the old name during a rolling deploy. Leaving a dead column in place is usually the
  cheaper choice.

## 3. Column conventions

| Concept | SQLite | Postgres |
|---|---|---|
| Id | `id TEXT PRIMARY KEY`, generated in the app (`crypto.randomUUID()`) | same |
| Auto-increment (avoid in new tables) | `INTEGER PRIMARY KEY AUTOINCREMENT` | `INTEGER GENERATED ALWAYS AS IDENTITY`; read it back with `RETURNING id` |
| Timestamp | ISO-8601 `TEXT` | `TEXT` (or `timestamptz`, if every query is written for it) |
| `created_at` | `TEXT NOT NULL`, set by the app | same |
| Boolean | `INTEGER NOT NULL DEFAULT 0` | same (or `boolean`, but then the binds differ) |
| JSON | `TEXT NOT NULL DEFAULT '[]'` or `'{}'` | same (or `jsonb`, with the same caveat) |
| Float | `REAL` | `DOUBLE PRECISION` |
| Binary, e.g. packed embedding vectors | `BLOB` | `BYTEA` |
| Tenant | `tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` | same |
| Author | `created_by TEXT REFERENCES users(id) ON DELETE SET NULL` | same |

- **Identical types on both engines** (text timestamps, integer booleans, text JSON) let the same SQL and the
  same row-mapping code run everywhere. Native types are nicer, but they force per-engine code paths.
- **Every tenant-owned table** has `tenant_id`, preferably `NOT NULL`, and an index that starts with it.
  A `UNIQUE` over a nullable column doesn't stop duplicates where the value is NULL, and an `ON CONFLICT` on
  it never fires.
- **Timestamps:** generate them in the app (`new Date().toISOString()`). SQLite's `datetime('now')` gives
  `YYYY-MM-DD HH:MM:SS`, which neither sorts nor parses like ISO with milliseconds and `Z`. If old rows mix
  the two formats, compare through a parse function, not as strings.
- **Foreign keys:** SQLite enforces them, cascades included, only while `PRAGMA foreign_keys = ON` is in
  effect for the connection. Some drivers turn it on, others don't. Check yours, or delete child rows
  explicitly in the repository code.

## 4. Writing SQL that runs on both

Pick one source dialect (usually SQLite's) and keep the translation layer tiny: placeholders, plus a few
functions such as `datetime('now')`, `GROUP_CONCAT` → `STRING_AGG` and `instr` → `strpos`. Everything else
must already be valid on both engines:

- **Placeholders.** If the layer rewrites `?` to `$1…$n` with a regex, never put a literal `?` inside a SQL
  string. For named parameters (`@a`), default every key to `null` in the bag.
- **Upserts.** Use `INSERT … ON CONFLICT (cols) DO NOTHING` or `DO UPDATE SET x = excluded.x` (SQLite ≥ 3.24).
  Never use `INSERT OR IGNORE` or `INSERT OR REPLACE`: they are SQLite-only, and `REPLACE` deletes and
  re-inserts the row, which fires cascades.
  - On a partial unique index, the conflict target must repeat the predicate
    (`ON CONFLICT (a) WHERE status = 'running'`). If that's awkward, guard with a `SELECT` first.
- **`RETURNING`** works on both (SQLite ≥ 3.35). Use it instead of a "last insert id": Postgres drivers
  have no such thing.
- **Dates.** No date functions in SQL (`datetime('now','-1 day')`, `strftime`, `julianday`, `now()`,
  `interval`). Compute ISO boundaries in the app, pass them as parameters, and bucket by day in the app,
  in the user's timezone.
- **Case-insensitive match:** `lower(col) LIKE ?` with a lowercased parameter. SQLite's `LIKE` ignores ASCII
  case and Postgres's doesn't. Add `ESCAPE '\'` when the value may contain `_` or `%` (e-mail addresses).
  No `ILIKE`, no `COLLATE NOCASE`.
- **NULL ordering:** `ORDER BY (col IS NULL), col` is portable everywhere, including old SQLite versions
  without `NULLS LAST`.
- **`GROUP BY`** every non-aggregated column. SQLite tolerates bare columns and Postgres rejects them.
- **Booleans:** compare `= 1` / `= 0` and bind `x ? 1 : 0`.
- **`IN` lists:** build them with `ids.map(() => '?').join(',')`, return early on an empty list (`IN ()` is a
  syntax error), and chunk at a few hundred ids. Parameter limits are 999 on old SQLite builds and 65535 on
  Postgres.
- **Untyped parameters.** Postgres can't infer the type of a parameter used only in `? IS NULL`. Build the
  SQL per case, or cast (`CAST(? AS TEXT) IS NULL`).
- **JSON:** parse JSON columns in the app instead of using `json_extract` or `->>` in `WHERE`, unless you
  keep a per-engine version of that query.
- **Numbers from Postgres.** node-postgres returns `bigint` (including `COUNT(*)`) and `numeric` as
  **strings** unless a type parser is set. Wrap aggregates in `Number()`.

## 5. Queries and tenant scoping

- Keep queries in the repository module, next to the related ones.
- Every query on user-visible data takes the caller's scope, resolved once per request (see
  `secure-api-route`). Never recompute it from the user inside the query. Build the filter with the scope
  helper and return early on the "none" scope.
- Member-level visibility (only items the user takes part in) and sharing grants go through their own
  helpers, never through copies of the SQL fragment.
- A new table is never read without a tenant filter.

## 6. Transactions

Every statement inside a transaction must use the same connection. With a Postgres pool, that means
carrying the client through `AsyncLocalStorage` or passing it explicitly. Without savepoint support in the
layer, don't nest transactions.

## 7. Boot backfills

- Pure-SQL fixes can live in the schema files if they are idempotent:
  - `UPDATE … WHERE x IS NULL`;
  - `INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM target) ON CONFLICT DO NOTHING`, which only fills
    an empty table.
- Fixes that need code (parsing, embeddings, LLM calls) are functions called from `main()` after the
  database init:
  - fire-and-forget, with logging, unless a worker depends on the result; then await it before starting
    the workers;
  - idempotent and converging: select `WHERE col IS NULL`, cap each run with a `LIMIT`, and finish over
    several boots.
- A table with a `running` status needs a boot recovery that fails or reclaims stale rows. Otherwise a crash
  leaves them stuck forever.

## Verification checklist

- Typecheck and lint.
- Boot twice on a **fresh** SQLite file and twice on an **existing** one from before the change. Both must
  come up without errors.
- When a Postgres is available, boot twice against it as well: the Postgres schema must apply cleanly over
  itself.
- Run the feature's queries on both engines. The dialect traps above usually fail only on Postgres.
- In the commit message, say which schema places changed.
