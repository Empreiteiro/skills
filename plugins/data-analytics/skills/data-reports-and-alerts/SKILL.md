---
name: data-reports-and-alerts
description: Design templated KPI reports, exploratory (EDA) data reports and scheduled data alerts — template schema, deterministic KPI SQL, safe parameters, caching, chart plans, HTML output, scheduling across replicas and change-based notifications. Use when building or reviewing report templates, "executive summary" or EDA reports, recurring email/webhook reports, or alerts on a metric or natural-language question.
---

# Data reports and alerts

Rule of thumb: numbers come from deterministic queries; the LLM only plans (from a closed menu) and narrates
(from rows it was actually shown). Every report and alert states what data it covered.

## 1. Templated KPI reports

### Template schema

```json
{
  "id": "saas_revenue_overview",
  "name": "Revenue overview",
  "source_type": "billing_api",
  "params": {"date_start": {"type": "date"}, "date_end": {"type": "date"}, "plan": {"type": "text", "optional": true}},
  "queries": [
    {"id": "mrr_by_month", "title": "MRR by month", "kind": "sql",
     "sql": "SELECT strftime('%Y-%m', created_at) AS month, SUM(amount)/100.0 AS mrr FROM subscriptions WHERE status = 'active' AND created_at BETWEEN :date_start AND :date_end GROUP BY 1 ORDER BY 1",
     "chart": {"type": "line", "x": "month", "y": ["mrr"]}},
    {"id": "churn_reasons", "title": "Churn reasons", "kind": "question",
     "question": "Count cancelled subscriptions by cancellation reason", "columns": ["reason", "count"],
     "chart": {"type": "bar", "x": "reason", "y": ["count"]}}
  ],
  "layout": "grid_2x2",
  "refresh_seconds": 3600
}
```

- **Explicit `kind`.** `sql` runs as written; `question` goes through the normal question-answering path with the
  output columns requested by name. A template whose queries have neither runnable SQL nor a question executor
  must fail validation at load time, not at run time.
- **Write KPI SQL against the connector's catalog tables** (see `api-data-connector`), so API sources and SQL
  databases share templates: MRR from active subscriptions, win rate, cycle time, refund rate, open bugs by
  priority.
- **Validate templates at load:** ids unique, `source_type` known, every chart key is an output column, SQL parses
  for the target dialect, every `:param` is declared.
- **Dialect:** a template is written for one dialect (SQLite `strftime`, PG `date_trunc`, `pragma_table_info`
  only on SQLite). Record the dialect in the template or keep one per engine.

### Parameters and safety

- Bind filters as parameters (`:date_start`). Never string-replace `{{value}}` into SQL — that is SQL injection
  through a filter box.
- Allowlist placeholder names. Never expose source metadata to substitution: `SELECT '{{connectionString}}'` would
  read a credential the API carefully masks.
- Run on read-only credentials with a timeout and row cap (`text-to-sql`).
- Cache key = hash of (source, template version, every param, every toggle such as disabled queries, date range).
  A key that ignores an input serves stale results. Never mutate a cached object (copy before adding commentary).
- If runs reference templates by foreign key, seed built-in templates into that table, or the first run fails on
  PostgreSQL.

### One chart enum

Use one enum (`bar | horizontal_bar | stacked_bar | line | pie | scatter | histogram`) shared by the template
schema, the LLM prompt, the spec builder and the renderer. Anything the renderer cannot draw must be rejected at
validation, not silently drawn as a bar chart. See `chart-spec`.

## 2. Exploratory (EDA) report pipeline

1. **Profile deterministically** (`dataset-profiling`): types, missing %, unique counts, numeric stats and
   quantiles, top values, inferred datetimes, correlations, a few sample rows.
2. **Observations (LLM):** from the profile only; bounded length; explicit output language.
3. **Chart plan (LLM):** a JSON list from the closed chart enum with column names. Validate every column against
   the profile; drop invalid entries; if nothing survives, use a deterministic fallback plan (histograms of the main
   numerics, bars of low-cardinality categoricals, a correlation heatmap with ≥3 numerics, a missing-values chart
   when any column is >5% missing).
4. **Render deterministically** (matplotlib/Vega/your chart lib). Never execute model-written plotting code. A
   failed chart is dropped and logged, not fatal.
5. **Explanations (LLM):** one batched call; give it the aggregated values each chart plots, not only titles, or
   it will describe charts it never saw.
6. **Assemble:** `html.escape` every data-derived string (column names, values, titles, errors); sanitize LLM HTML
   to a small tag allowlist or render Markdown; serve in a sandboxed iframe or with a strict CSP.

State coverage on the report: "Rows analysed: 5,000 (random sample of 1,240,331)". Sample with a fixed seed; do not
silently take the first N rows (head-biased) while calling it a sample.

## 3. Scheduled alerts and recurring reports

### Definition

`{question or KPI query, schedule, timezone, condition, recipients, channel, last_result}`. Conditions:
`always` (a report), `threshold` (`value > 100`), `change` (value or row set differs from last run),
`anomaly` (outside a band of recent runs).

### Scheduler

- Store `next_run` in UTC computed from a timezone-aware rule; unit-test every frequency ("hourly", "weekly on
  Monday" — `weekday()` is 0 for Monday — "monthly on the 31st").
- Claim due jobs with a lease: `SELECT … WHERE next_run <= now() FOR UPDATE SKIP LOCKED` (PostgreSQL) or an atomic
  `UPDATE … SET locked_until = … WHERE id = ? AND (locked_until IS NULL OR locked_until < now())`. Without it every
  replica sends every alert.
- Run jobs concurrently with a bound; one slow LLM call must not delay every other alert.
- Reuse the main question-answering path (same source support, same decryption, same tenant scope). A second,
  smaller dispatcher drifts and supports fewer sources.
- Load the alert's workspace and sources with the alert's tenant scope; validate on create that the referenced
  workspace belongs to the creator's tenant.

### Evaluate, then notify

- Store each execution's answer, the structured value(s) and the query. Compare with the previous execution to
  decide whether to notify; "always email the answer" is a report, not an alert.
- A run is `success` only if the delivery succeeded; record `email_sent` / `webhooks_fired` separately.

### Delivery

- Email: verified recipients only (an unverified address is an exfiltration channel); send asynchronously; escape
  or Markdown-render the LLM answer, never interpolate it raw into HTML.
- Webhooks: sign `HMAC-SHA256(secret, f"{timestamp}.{body}")`, send `X-Signature`, `X-Timestamp`, `X-Event-Id`
  (idempotency); apply user custom headers first so they cannot overwrite the signature; SSRF-check the target
  (`api-data-connector/scripts/check_url.py`); retry only network errors and 5xx with backoff from a queue, keep a
  dead-letter list; store the real last status code.
- Chat channels: send charts as images or files, not only text, and truncate at the platform limit with a link
  to the full answer.

Related: `grounded-answers` (narration rules), `chart-spec`, `secure-data-platform` (tenant scope, outbound
delivery).
