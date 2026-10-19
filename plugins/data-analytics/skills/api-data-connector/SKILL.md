---
name: api-data-connector
description: Build or review a connector that pulls data from a SaaS or REST API (Stripe, HubSpot, Jira, a generic JSON endpoint, …) into queryable tables — typed table catalog, auth, pagination, rate limits, flattening, caching, credentials and SSRF protection. Use when adding an API integration to an analytics product, loading API data into SQLite/DuckDB for questions, or debugging empty or wrong tables from an API extract.
---

# API data connector

An API connector turns endpoints into tables that SQL (or an LLM writing SQL) can query. Most failures are silent:
a throttled call becomes an empty table, a list column crashes the loader, a skipped page undercounts revenue.
Design so that every one of those is loud.

## Anatomy

Keep one shared base. A vendor module should contain only: the catalog, the auth headers, and record mappers.
Paginators, backoff, flattening, loading, profiling and the question flow exist once — copy-pasted connectors drift
(different JSON keys, different return shapes, one copy fixed and nine not).

```python
CATALOG = {
    "subscriptions": {
        "path": "/v1/subscriptions", "records_key": "data", "pagination": "cursor_after",
        "primary_key": "id",
        "columns": {"id": "TEXT", "customer_id": "TEXT", "status": "TEXT",
                    "amount": "INTEGER", "created": "INTEGER"},
        "foreign_keys": {"customer_id": "customers.id"},
        "notes": "amount in cents; created is epoch seconds (UTC)",
        "children": {"subscription_items": {"from": "items.data", "fk": "subscription_id"}},
    },
}
```

The catalog is the contract: generate DDL from it, show it to the LLM (columns, types, keys, units, notes), give it
to onboarding and report templates, and test against it. Units matter: say "cents" and "epoch seconds" in the
catalog or every revenue answer is off by 100x.

## Workflow for a new connector

1. **Auth** — credentials in headers (`Authorization: Bearer`, vendor header, Basic). Never in the query string:
   URLs end up in logs, exceptions and chat history. Pin API version headers in one config place.
2. **Test connection** — the cheapest authenticated call (`/me`, `/balance`, `limit=1`); return
   `{"ok": true, "account": "..."}` or a clean error.
3. **Discover** — per table: row count or sample count, columns, 3–5 preview rows, and `_error` when that table
   failed (missing scope, plan restriction). Store it in one canonical shape:
   `[{"table", "columns", "row_count", "preview_rows", "_error"?}]`.
4. **Extract** — paginate, back off, flatten, map to catalog columns, load.
5. **Refresh** — re-run discover/extract on demand or on a TTL; never on every question.

## Pagination is a state machine — test it

| Style | Next request | Stop when |
|---|---|---|
| cursor / after | `starting_after = last["id"]` or `after = paging.next.after` | `has_more` false / no cursor |
| Link header | follow `rel="next"` URL as-is | no `next` |
| next_url | follow `nextRecordsUrl` / `next` | null |
| offset + total | `offset += len(page)` | `offset >= total` or short page |
| isLast | `startAt += maxResults` | `isLast` true |
| page number | `page += 1` (exactly once) | empty or short page |

- Increment the page counter in exactly one place. A loop that does `page += 1` at the top and again at the bottom
  requests pages 1, 3, 5… and silently halves the data.
- Keep the cursor on every request. Passing `params` only on the first call drops `starting_after` and re-reads
  page 1 until the page cap.
- Send an explicit page size. Cap pages and rows (e.g. 100 pages / 50k rows) and record when a cap was hit, so the
  answer can say "first 50,000 rows".
- Unit-test each paginator with a fake transport returning 3 pages.

## Rate limits and errors

- On 429/503: honour `Retry-After` (seconds or HTTP date), else exponential backoff with jitter; give up after N
  tries with a clear error. Watch `X-RateLimit-Remaining` and slow down before hitting zero.
- Retry 5xx and network errors; never retry 4xx other than 429.
- A table that failed is `_error`, not an empty DataFrame. Empty-because-failed produces confident wrong answers
  ("you have 0 open deals").
- Redact before surfacing: strip query strings and tokens from exception text before it reaches the user, the LLM
  or the stored conversation.
- Bound N+1 calls (per-record detail or association fetches): batch endpoints first, then a hard cap.

## Flattening

- Nested dict → `parent_child` columns (`plan.amount` → `plan_amount`).
- List of objects → child table with a foreign key (`order_lines.order_id`), declared in the catalog.
- List of scalars (tags, emails) → JSON string or comma-joined text, documented in the catalog.
- Never hand a list or dict cell to SQLite (`to_sql` fails, often outside any try). `json_normalize` alone is not
  enough: it leaves lists in place. Run a final pass: any non-scalar cell → `json.dumps(value, default=str)`.
- Build the column set from the catalog (stable), not from the union of whatever keys the first page had.

## Loading and caching

- Load into SQLite (in-memory or temp file) or DuckDB; DuckDB keeps types and handles nested data better.
  A SQLite `:memory:` connection is private to its thread/connection — use a temp file if threads differ, and
  delete it afterwards.
- Cache the extract per source with a TTL and reuse it across questions, refreshes and templates. Re-fetching every
  table on every question burns rate limits and makes answers slow and inconsistent.
- Return the executed SQL with every answer so users can audit it.

## Credentials and outbound safety

- Declare secret fields in the connector schema (`secret: true`); encrypt and mask by schema, not by guessing key
  names (`apiKey` vs `api_key` mismatches leave secrets in plaintext). See `secure-data-platform`.
- Decrypt in one helper used by every code path (question, refresh, templates, reports).
- Support OAuth refresh; a static access token stops working within hours.
- Any user-supplied endpoint (generic REST URL, S3/MinIO endpoint, webhook target) is an SSRF vector. Check it with
  `${CLAUDE_SKILL_DIR}/scripts/check_url.py` (scheme allowlist, DNS resolution, private/metadata ranges, embedded
  IPv4 forms), disable redirects, and connect to the validated address. A guard that raises `ValueError` inside
  `try: ... except ValueError: pass` blocks nothing — test it with `http://169.254.169.254/`.
- Any endpoint that returns a fetched preview to the user is a full-read SSRF if the guard is wrong.

## Registration checklist

Adding a type usually touches several places (type allowlist, dispatcher, secret fields, router, UI form, API
client types). Write a contract test that walks every registered connector type and asserts: it can be created,
has test-connection/discover, declares its secrets, returns the standard answer shape, and its discover response
matches the client's type. Dead connectors (form exists, backend rejects the type) are caught by this test only.

## Scripts

`${CLAUDE_SKILL_DIR}/scripts/check_url.py URL [URL ...] [--allow-host H] [--allow-scheme S] [--no-resolve]` —
prints `{"ok", "reason", "host", "addresses"}` per URL; exit 0 all allowed, 1 any rejected, 2 usage error.
Import `check_url()` from it in Python code.

Related: `tabular-file-qa` (loading and coercing frames), `text-to-sql` (querying the loaded tables),
`data-reports-and-alerts` (KPI templates on top of the catalog).
