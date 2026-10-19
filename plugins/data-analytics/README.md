# data-analytics

Skills for answering questions over data and for building data features with LLMs. They were distilled from
[Data Talks](https://github.com/Empreiteiro/data-talks), a platform where users connect files, databases and SaaS
APIs and ask questions in natural language, and then generalized: each skill keeps the pattern that worked and turns
what broke into a rule.

Install:

```bash
claude plugin marketplace add Empreiteiro/skills
claude plugin install data-analytics@empreiteiro-skills
```

Or, in a session: `/plugin install data-analytics --marketplace Empreiteiro/skills`. Skills are then available as
`/data-analytics:text-to-sql`, `/data-analytics:dataset-profiling`, and so on.

Two ways to use them:

- **Analysing data for someone** (a CSV, a database, an API export): profile, ask, query, check, answer, chart.
- **Building a data or LLM feature** into an application: each skill ends with what to get right in code.

## Skills

### Analysis

| Skill | What it does | Script |
|---|---|---|
| `dataset-profiling` | Load messy files (encoding, delimiter, decimal comma, sheets, nested JSON), coerce types, and profile them once: types, nulls, cardinality, top values, keys, filter candidates | `profile_dataset.py` |
| `dataset-onboarding` | Capture domain knowledge after connecting data: clarifying questions, KPI definitions, filters, warm-up questions, scoped instructions | |
| `text-to-sql` | Generate, validate and run SQL safely: schema context, explicit dialect, single read-only statement, limits, bounded self-correction | `sql_guard.py` |
| `tabular-file-qa` | Answer questions over CSV/XLSX/JSON/Parquet by loading them into SQLite and querying with SQL instead of executing generated pandas | uses the two scripts above |
| `join-discovery` | Find join keys across tables and sources: declared FKs, naming rules, value overlap, validated LLM suggestions | `infer_joins.py` |
| `grounded-answers` | Turn query results into an answer that only states what the rows show, with truncation disclosure and schema-checked follow-ups | |
| `chart-spec` | Have the model propose a constrained chart spec, validate it, render it deterministically; heuristic fallback | `chart_spec.py` |

### Integration and reporting

| Skill | What it does | Script |
|---|---|---|
| `api-data-connector` | Turn a SaaS or REST API into queryable tables: typed catalog, auth, pagination, rate limits, flattening, caching, SSRF guard | `check_url.py` |
| `data-reports-and-alerts` | Templated KPI reports, exploratory reports and scheduled alerts that notify on change, with safe delivery | |

### Data engineering

| Skill | What it does | Script |
|---|---|---|
| `medallion-pipeline` | Bronze/silver/gold where the model picks from a closed vocabulary and code compiles the SQL | |
| `lineage-and-versioning` | Runtime lineage that never breaks the pipeline, and immutable, diffable, git-friendly pipeline versions | |
| `identity-resolution` | Normalize emails and phones, link records with union-find, flag suspicious clusters | `resolve_identities.py` |
| `baseline-automl` | A guarded baseline model (leakage, ID columns, stratification, dummy baseline) explained in plain language | |

### Platform

| Skill | What it does | Script |
|---|---|---|
| `secure-data-platform` | Tenant isolation on every entry point, secrets at rest, scoped API keys, contained queries, safe inbound and outbound channels | |
| `llm-structured-output` | Portable JSON from any provider: prompt contract, defensive parsing, validation, fallback policy, logging | |
| `sqlite-postgres-portability` | Keep one schema working on SQLite and PostgreSQL: defaults, DDL, migrations, JSON columns, locking, CI | |

## Scripts

All scripts run with `python3 <script> --help`, print JSON to stdout, and exit `0` on success, `1` when the input is
rejected or unsuitable, `2` on usage errors.

| Script | Requires |
|---|---|
| `dataset-profiling/scripts/profile_dataset.py` | `pandas`; `openpyxl` for Excel; `pyarrow` for Parquet |
| `text-to-sql/scripts/sql_guard.py` | standard library; uses `sqlglot` when installed (stricter, enables `--allowed-tables`) |
| `join-discovery/scripts/infer_joins.py` | `pandas` for data files; standard library for `--schema` JSON |
| `chart-spec/scripts/chart_spec.py` | standard library |
| `api-data-connector/scripts/check_url.py` | standard library |
| `identity-resolution/scripts/resolve_identities.py` | `pandas` |
