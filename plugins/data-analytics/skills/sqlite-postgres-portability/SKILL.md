---
name: sqlite-postgres-portability
description: Keep a SQLAlchemy/Alembic application working on both SQLite (dev, tests, single-node installs) and PostgreSQL (production) — portable migrations and raw DDL, boolean/datetime defaults, constraints, JSON columns and mutation tracking, SQLite locking, test-database setup and CI against a real PostgreSQL. Use when writing a migration or raw DDL, adding a column with a default, debugging "works on SQLite, fails on Postgres" errors or "database is locked", or setting up CI for a dual-database app.
---

# SQLite ↔ PostgreSQL portability

SQLite accepts almost anything; PostgreSQL does not. Bugs therefore appear on the first production deploy, not in
tests — unless CI runs migrations against PostgreSQL.

## Types and defaults

| Need | Portable | Breaks on PostgreSQL |
|---|---|---|
| Boolean server default | `server_default=sa.false()` / `sa.true()` (renders `false`/`true` on PG, `0`/`1` on SQLite) | `server_default=sa.text("0")` → `column "x" is of type boolean but default expression is of type integer` |
| Raw DDL boolean | `BOOLEAN DEFAULT false` (SQLite accepts it too) | `BOOLEAN DEFAULT 0` |
| Timestamp in raw DDL | `TIMESTAMP` | `DATETIME` (no such type) |
| UUID default | generate in Python (`uuid.uuid4()`) | `lower(hex(randomblob(16)))` (SQLite-only function) |
| Month bucket | dialect-specific helper (`strftime` vs `date_trunc`) | one hard-coded spelling |

Integer defaults with `sa.text("0")` are fine on both. Verify by compiling DDL for both dialects:

```python
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql, sqlite
for d in (postgresql.dialect(), sqlite.dialect()):
    print(CreateTable(table).compile(dialect=d))
```

## Constraints and ALTERs

- SQLite cannot `ALTER TABLE … ADD CONSTRAINT`: declare unique constraints inline in `op.create_table(...)`.
- Use `op.batch_alter_table()` for SQLite column changes (it rebuilds the table). Changing a primary key on SQLite
  means: copy rows out, drop, recreate, copy back.
- Enforce `NOT NULL` in the migration itself (backfill, then `alter_column(nullable=False)` in a batch). A
  migration that leaves the column nullable while the model says `nullable=False` gives two different schemas
  depending on whether `create_all` or Alembic built the database.
- Declare unique constraints in BOTH the model and the migration; tests usually build from models.
- `VARCHAR(n)` is enforced only on PostgreSQL. Encrypted or encoded values expand (Fernet: ≈ 4/3 × length + ~100 chars):
  size for the ciphertext, or use `Text`.

## One schema mechanism

Prefer Alembic alone. If the app also runs `create_all` at startup, every migration must be idempotent (inspect
before creating tables/columns), and ad-hoc `ALTER TABLE` helpers at startup become a second, untested schema
track — fold them into migrations. Seeders must create whatever migrations would have backfilled (e.g. a default
organization and membership for a user created after the migration ran).

## JSON columns

- Raw SQL returns JSON as `str` on SQLite and as `dict` on PostgreSQL: `json.loads` when you get a string.
- Comparing JSON values in SQL is not portable; compare in Python or use a canonical text/hash column.
- Mutation tracking (verified): mutating the loaded dict and assigning the same object back is **not persisted**.

```python
cfg = copy.deepcopy(row.config or {})   # new object, including nested lists/dicts
cfg.setdefault("pipelines", []).append(new_pipeline)
row.config = cfg                        # persisted
# or: row.config["pipelines"].append(x); flag_modified(row, "config")
# or: declare the column with MutableDict.as_mutable(JSON) (tracks top-level keys only)
```

A shallow `dict(row.config)` still shares nested lists with the committed state; mutate those in place and the
change can be lost too.

## SQLite concurrency

- One writer at a time. A transaction that has written (or flushed) holds the lock until commit; a second session
  then waits and fails with `database is locked`. Never keep a write transaction open across slow work (LLM calls,
  warehouse queries, HTTP). Assign ids client-side instead of flushing early to get them.
- Enable WAL (`PRAGMA journal_mode=WAL`) and a busy timeout for multi-process dev servers.
- With async drivers, each aiosqlite connection to `:memory:` gets its own private database: use a temp file for
  tests so the schema and the request see the same data. Rebind every module that imported the session factory by
  name (`from db import SessionLocal` copies the binding).

## Migration hygiene

- Data migrations read JSON defensively (string or dict), are idempotent (skip rows already transformed), and
  document whether downgrade is possible.
- Name revisions by timestamp; keep one head; merge revisions explicitly.
- Test raw SQL in startup helpers against both engines; they bypass Alembic's dialect handling.

## CI: run migrations on real PostgreSQL

```yaml
jobs:
  migrations-postgres:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: {POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: app}
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U app" --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql+asyncpg://app:app@localhost:5432/app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "3.11"}
      - run: pip install -e . && pip install -r requirements-test.txt
      - run: alembic upgrade head          # every migration, on PostgreSQL
      - run: alembic downgrade base && alembic upgrade head   # if downgrades are supported
      - run: pytest -q                     # optionally the suite again against PostgreSQL
```

Keep the SQLite job too: both engines are supported, so both are tested.

Related: `lineage-and-versioning` (append-only rows, unique constraints), `secure-data-platform` (encrypted
column sizes).
