---
name: medallion-pipeline
description: Design or review a bronze/silver/gold (medallion) pipeline where an LLM proposes cleaning and aggregation steps and deterministic code compiles and validates the SQL. Use when turning raw files or API extracts into clean, typed tables and KPI tables, when an LLM suggests transformations, or when reviewing LLM-generated ETL SQL.
---

# Medallion pipeline (LLM-assisted)

The pattern that works: **the LLM chooses from a closed menu, code writes the SQL.** Free-form LLM SQL for
transformations is fragile (wrong dialect, invented columns, unquoted names) and hard to review.

## Layers

| Layer | Content | Who decides | LLM? |
|---|---|---|---|
| Bronze | Raw rows, every column TEXT, plus load metadata | deterministic | no |
| Silver | Typed, cleaned, deduplicated entity tables | LLM proposes a spec from a closed vocabulary; code compiles it | yes, constrained |
| Gold | Aggregates / KPI tables for questions and dashboards | LLM proposes a structured spec; code compiles it | yes, constrained |

Enforce the order: silver needs a ready bronze; gold needs a saved silver.

## Bronze

- Load as-is, all columns `TEXT` (no type guessing at this layer), names preserved and quoted.
- Add `_loaded_at TIMESTAMP`, `_source_file TEXT`, `_row_hash TEXT` and actually fill them: the hash (e.g. SHA-256
  of the canonical row) is what makes re-loads idempotent and duplicates detectable.
- Record the true row count and the load run (see `lineage-and-versioning`).

## Silver: closed vocabulary

Prompt the model with: bronze column names, a profile (types guessed from the sample, missing counts, top values,
numeric stats — see `dataset-profiling`), 3–5 sample rows, the exact SQL dialect, and the exact runtime table name.
Ask for one entry per column:

```json
{
  "silver_table": "silver_orders",
  "columns": [
    {"source_column": "Order ID", "silver_name": "order_id",   "target_type": "TEXT", "transform": "trim",           "null_strategy": "DROP_ROW"},
    {"source_column": "Amount",   "silver_name": "amount",     "target_type": "REAL", "transform": "strip_currency", "null_strategy": "FILL_ZERO"},
    {"source_column": "Created",  "silver_name": "created_at", "target_type": "TEXT", "transform": "trim",           "null_strategy": "KEEP_NULL"},
    {"source_column": "Status",   "silver_name": "status",     "target_type": "TEXT", "transform": "lower_trim",     "null_strategy": "FILL_DEFAULT", "null_default": "unknown"}
  ],
  "dedup_key": ["order_id"],
  "dedup_order_by": "_loaded_at"
}
```

Vocabulary: `target_type ∈ {INTEGER, REAL, DECIMAL, TEXT, DATE, TIMESTAMP, BOOLEAN}`,
`transform ∈ {none, trim, lower_trim, remove_commas, strip_currency}`,
`null_strategy ∈ {KEEP_NULL, DROP_ROW, FILL_ZERO, FILL_DEFAULT}`.

Compiled for SQLite (verified):

```sql
INSERT INTO "silver_orders" ("order_id", "amount", "created_at", "status", "_loaded_at")
SELECT "order_id", "amount", "created_at", "status", "_loaded_at" FROM (
  SELECT
    NULLIF(TRIM("Order ID"), '') AS "order_id",
    COALESCE(CAST(NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(TRIM("Amount"), '$', ''), '€', ''), '£', ''), ',', ''), '') AS REAL), 0) AS "amount",
    NULLIF(TRIM("Created"), '') AS "created_at",
    COALESCE(NULLIF(LOWER(TRIM("Status")), ''), 'unknown') AS "status",
    "_loaded_at",
    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM("Order ID"), '') ORDER BY "_loaded_at" DESC) AS "_rn"
  FROM "bronze_orders"
  WHERE NULLIF(TRIM("Order ID"), '') IS NOT NULL
) AS t
WHERE "_rn" = 1;
```

### Validate the spec on the server (the prompt is not validation)

- `source_column` must exist in bronze; `silver_name` must match `^[a-z][a-z0-9_]*$` and be unique.
- Every enum value must be in the vocabulary; reject unknown values instead of pasting them into
  `CAST(... AS {target_type})`.
- `dedup_key` / `dedup_order_by` must be silver or metadata columns.
- Quote every identifier: `'"' + name.replace('"', '""') + '"'` — everywhere, including `WHERE` and
  `PARTITION BY`. Bind or escape literal defaults (`'` → `''`) and cast them to the target type.
- Unparseable model output is an error shown to the user, not an empty `{}` that compiles to nothing.

### SQLite type traps (verified)

- `CAST('2024-01-05' AS TIMESTAMP)` returns `2024` (NUMERIC affinity reads the leading number). Keep dates as
  ISO-8601 TEXT in SQLite, or parse them in Python/DuckDB.
- `CAST('' AS REAL)` is `0.0` and `CAST('abc' AS INTEGER)` is `0`: wrap with `NULLIF(x, '')` and count failed casts
  as a quality check, otherwise missing values silently become zeros.
- `CAST('1,234.5' AS REAL)` is `1.0`: remove thousands separators first (and decide per locale whether `,` is a
  decimal separator).

## Gold: structured aggregates

Prefer a spec over free SQL:

```json
{"name": "revenue_by_month", "from": "silver_orders",
 "dimensions": [{"column": "created_at", "grain": "month"}],
 "measures": [{"column": "amount", "agg": "sum", "alias": "revenue"}, {"column": "order_id", "agg": "count_distinct", "alias": "orders"}],
 "filters": [{"column": "status", "op": "=", "value": "paid"}]}
```

Compile per dialect (month grain is `strftime('%Y-%m', …)` in SQLite, `date_trunc('month', …)` in PostgreSQL).
If you accept free SQL: parse it (sqlglot) as a single `SELECT`, check every table/column against silver, and
dry-run it (`EXPLAIN` or `LIMIT 0`) before saving. Sanitize `name` before it becomes a table name.

## Suggest → edit → apply

- **Suggest**: LLM call; store the spec plus a build-log entry (`suggest`, model, tokens).
- **Redo**: the user's free-text feedback is appended ("User feedback on the previous suggestion: …"); log `redo`.
- **Edit**: dropdowns over the same vocabulary; the server re-validates.
- **Apply**: compile, run (or hand the SQL to the user), log `save` linked to the suggestion it came from.
- **Idempotent apply**: replace by layer + name. Re-applying gold must not pile up duplicate tables.
- Optional "goal" input for gold ("focus on retention") is a cheap, effective steer.

## Quality checks per layer

Bronze: row count equals source, no fully empty rows. Silver: cast-failure counts per column, null rate vs bronze,
uniqueness of the dedup key, row count delta explained by DROP_ROW + dedup. Gold: totals reconcile with silver
(sum of revenue by month = total revenue). Fail or warn loudly; store the results with the run.

Related: `lineage-and-versioning` (edges per step, run records), `dataset-profiling`,
`sqlite-postgres-portability`.
