---
name: join-discovery
description: Find how tables relate (foreign keys and join columns) by layering declared constraints, naming heuristics, value-overlap checks and validated LLM suggestions, then confirm them before use. Use when a question spans several tables or sources, when connecting a new database or set of files, when an ER diagram or relationship map is needed, or when joins produce duplicated or missing rows.
---

# Join discovery

Wrong joins are the quietest way to get wrong numbers: a many-to-many join multiplies revenue, an orphaned key
drops rows. Find candidate relationships with cheap evidence first, check them against the data, and let a person
(or an explicit rule) confirm them before they drive queries.

## Workflow

1. **Declared constraints first.** Read foreign keys from the catalog: SQLAlchemy `inspector.get_foreign_keys()`,
   `information_schema.table_constraints`/`key_column_usage`, SQLite `PRAGMA foreign_key_list`, dbt `relationships`
   tests. They are free and authoritative.
2. **Heuristics and values** with the script:
   ```bash
   python ${CLAUDE_SKILL_DIR}/scripts/infer_joins.py orders.csv customers.csv order_items.csv
   python ${CLAUDE_SKILL_DIR}/scripts/infer_joins.py --sqlite warehouse_sample.db --min-score 0.7
   python ${CLAUDE_SKILL_DIR}/scripts/infer_joins.py --schema schema.json      # names only, no data
   ```
   Each suggestion has `left` (child, referencing) and `right` (parent, referenced) sides, a `cardinality_guess`,
   a `score` and the `reasons`. With data it also reports `containment` (share of child values found in the parent).
3. **LLM suggestions for what heuristics miss** (e.g. `orders.buyer` → `users.id`, self-references like
   `employees.manager_id`). Send table/column names (capped: ~60 tables, ~40 columns each), the relationships already
   known, and ask for strict JSON. Then validate **each item separately** against real metadata (table exists,
   columns exist, not a self-loop, not already known). One hallucinated column must not discard the whole batch;
   keep the model's one-line reason attached to the validated item.
4. **Confirm.** Present suggestions with their evidence; store accepted and dismissed ones by a canonical key
   (`child_table|child_col|parent_table|parent_col`, direction-insensitive for dedupe) so dismissed suggestions do not
   come back. Never auto-apply inferred joins silently.
5. **Use them.** Put confirmed relationships into the SQL prompt both as prose (`orders.customer_id -> customers.id`)
   and as ready join predicates (`orders.customer_id = customers.id`).

## Evidence and how much to trust it

| Evidence | Trust | Notes |
|---|---|---|
| Declared FK | high | may be missing in warehouses and file exports |
| `<entity>_id` → table `<entity>`/`<entity>s` with `id` | good | also `entityId`, `id_entity`, `<entity>_key/_code/_sku`; strip `dim_`, `fact_`, `stg_` prefixes |
| `prefix_<entity>_id` (billing_customer_id) | medium | role-playing keys; confirm |
| Same key-like column name in two tables | medium | ignore generic names: `id`, `name`, `status`, `created_at` |
| Containment ≥ 95% and unique parent | strong support | low containment = wrong join, orphans, or partial extract |
| Identical names only (`id` ↔ `id`) | none | the classic false positive of name-matching heuristics |

## Fan-out check (do it before trusting any total)

- Parent side must be unique for a many-to-one join: `SELECT key, COUNT(*) FROM parent GROUP BY key HAVING COUNT(*) > 1`.
- Compare `COUNT(*)` before and after the join; if it grows, you are double counting. Aggregate the child side
  first (`SUM` per key in a subquery) or join on the full composite key.
- Joining two child tables of the same parent (orders → items and orders → payments) multiplies rows: aggregate
  each to the parent grain before combining.
- Report orphans (`LEFT JOIN ... WHERE parent.key IS NULL`) when containment is below 100%.

## Across different sources

Keys that "match" across systems often differ in type or format (`'00123'` vs `123`, emails with different case,
UUID with/without dashes). Normalize before comparing (the script compares trimmed strings and treats `1.0` as `1`),
and ask the user whether two identifiers really denote the same entity — this is a clarification worth adding
during onboarding (`dataset-onboarding`). For people/companies matched by email or phone, use `identity-resolution`.

## Scripts

`scripts/infer_joins.py` — pandas for data files (CSV/TSV/XLSX/Parquet/JSON), standard library for `--schema`.
`--sqlite` reads declared foreign keys and samples up to `--sample-rows` rows per table (opened read-only).
Output: JSON list sorted by score; exit 0 ok, 1 input error, 2 usage error. Suggestions are hypotheses.
