---
name: text-to-sql
description: Turn a natural-language question into one safe, dialect-correct, read-only SQL query, validate it with a parser-based guard, run it with database-level limits, repair it from errors, and return the executed SQL with the result. Use when answering a data question against a SQL database or warehouse (Postgres, MySQL, SQLite, BigQuery, Snowflake, SQL Server, DuckDB), or when building or reviewing a text-to-SQL feature.
---

# Text to SQL

## Workflow

1. **Build the schema context** (once per dataset, cached; see `dataset-profiling`):
   tables with true row counts; columns with types, nullability, primary/foreign keys, descriptions (dbt/catalog
   docs), top values for low-cardinality columns with exact spelling, ranges for dates and numbers, 3 sample rows.
   Add known relationships (`join-discovery`) and the domain context (clarifications, KPI definitions, instructions —
   `dataset-onboarding`). For large schemas, send every table name but full detail only for tables relevant to the
   question, and say what was left out. Never truncate silently.
2. **State the dialect and its rules in the prompt** (cheat sheet below). Store the dialect with the connection and
   pass it through; a stored-but-unused dialect field is a common bug.
3. **Generate** one query. Ask for JSON (`{"sql": ..., "explanation": ...}`) or a fenced block, and tell the model it
   may only use the listed tables and columns; if the data is not there it must say so instead of guessing.
4. **Validate** before running:
   ```bash
   python ${CLAUDE_SKILL_DIR}/scripts/sql_guard.py "$SQL" --dialect postgres --limit 1000 \
       --allowed-tables orders,customers,order_items
   ```
   Exit 0 → run `.sql` from the JSON output. Exit 1 → `reason` says why (multiple statements, DML/DDL, `SELECT INTO`,
   locking clause, file/sleep functions, table outside the allow-list). Install `sqlglot` for parser-based checks.
5. **Execute with limits enforced by the database**, not only by the guard:
   read-only credentials or role; read-only transaction (`SET TRANSACTION READ ONLY`, `default_transaction_read_only`);
   SQLite opened with `file:db?mode=ro`; statement timeout (`statement_timeout`, `STATEMENT_TIMEOUT_IN_SECONDS`,
   `max_execution_time`); BigQuery `maximum_bytes_billed` and a dry run for cost; fetch at most N rows at the driver.
6. **Repair loop** (1–3 attempts): on a database error, send back the SQL, the sanitized error (no hostnames,
   credentials, or stack traces) and the relevant schema; ask for a corrected query; re-validate. Also retry once on
   an empty result when the question implies data should exist (wrong filter value casing, wrong date format).
7. **Answer from the rows** (`grounded-answers`): tell the writer the true row count, how many rows it sees, and
   whether the result was capped. Return the executed SQL with the answer so users can audit and reuse it.

## Rules

- One statement, read-only, validated by a parser or a tokenizer that ignores comments, strings and quoted
  identifiers. Substring blacklists are wrong both ways: `"UPDATE" in sql.upper()` rejects `updated_at`, `CREATE`
  rejects `created_at`, `startswith("SELECT")` rejects CTEs and leading comments, yet `SELECT 1; CREATE TABLE ...`
  or `SELECT * INTO t2 FROM t` passes when the keyword is not on the list.
- Never present an answer written before execution as fact. If the query failed, was rejected, or no query was
  produced, say so plainly; do not show the model's first draft with an error appended.
- Strip code fences from the model output in one shared function used by every path; a fenced query that fails a
  `startswith("SELECT")` check is silently not executed.
- One output contract for every source: `{answer, query, queryLanguage, rows, rowCount, truncated}`.
- Multi-turn: replay previous questions, answers AND the SQL that was run, so "now split it by month" edits the
  last query instead of re-deriving it.
- Do not hold an application-database write transaction open while waiting for the LLM or the warehouse.
- Pool engines per connection string (`pool_pre_ping=True`) and dispose them when credentials change; creating an
  engine per question and never disposing it leaks connections.
- Validate connection strings before use: allow-list drivers and schemes, block `sqlite:///` paths and local files,
  block private/link-local hosts unless explicitly allowed — otherwise a tenant can point a "source" at your own
  application database or internal services.

## Dialect cheat sheet

| Dialect | Quote identifiers | Row cap | Dates | Notes |
|---|---|---|---|---|
| PostgreSQL | `"Mixed Case"` | `LIMIT n` | `date_trunc('month', ts)`, `ts::date` | unquoted names fold to lower case |
| MySQL | `` `name` `` | `LIMIT n` | `DATE_FORMAT(ts, '%Y-%m')` | `"x"` is a string by default |
| SQLite | `"name"` | `LIMIT n` | `strftime('%Y-%m', ts)` | dates are text; compare ISO strings |
| BigQuery | `` `project.dataset.table` `` | `LIMIT n` | `DATE_TRUNC(d, MONTH)`, `FORMAT_DATE` | always fully qualify tables |
| Snowflake | `"DB"."SCHEMA"."TABLE"` | `LIMIT n` | `DATE_TRUNC('month', ts)` | unquoted names fold to UPPER case |
| SQL Server | `[name]` | `SELECT TOP n` | `DATEFROMPARTS`, `FORMAT(ts,'yyyy-MM')` | no `LIMIT`; `ORDER BY` in subqueries needs `TOP` |
| DuckDB | `"name"` | `LIMIT n` | `date_trunc('month', ts)` | disable file functions (`read_csv`) for untrusted SQL |

## Several databases in one question

Prefer running joins inside one engine. If sources live in different databases:
- push filters and aggregates down to each source and move only the reduced result;
- if you must copy tables into a local engine, sample or cap rows, cache the copy with a TTL, and keep types
  (DuckDB keeps dates/decimals better than SQLite);
- run same-database joins natively — do not copy two tables out of the same database just to join them;
- make sure the SQL shown to the user is something they can run on their own database, not internal aliases.

## Studio-style "explore this table" queries

When the system (not the user) asks the model for a few exploratory queries, ask for 3–5 SELECTs without LIMIT
and add the cap yourself with the guard (`--limit 15`); it knows `TOP` for SQL Server and lowers larger limits.

## Scripts

`scripts/sql_guard.py` — standard library; uses `sqlglot` when installed (recommended), else a tokenizer.
Output JSON `{ok, reason, statement_type, tables, sql, dialect, parser, limit_mode, warnings}`; exit 0 accepted,
1 rejected, 2 usage error. `--limit` appends/lowers `LIMIT`, inserts `TOP` for T-SQL, and wraps only when needed.
It is a guard, not a sandbox: keep the database-level controls from step 5.
