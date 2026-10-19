---
name: secure-data-platform
description: Security checklist and patterns for a multi-tenant data/LLM platform that stores customer database credentials and runs generated queries — tenant scoping on every entry point, secret encryption and masking, API keys, query containment, connection-string and SSRF controls, inbound/outbound channel security and auditing. Use when designing or reviewing such a platform, adding an endpoint, connector, bot, scheduler or MCP tool, or auditing a codebase for cross-tenant leaks.
---

# Secure data platform

Most leaks in such platforms are not in the main UI API — that one gets reviewed. They are in the side doors:
public API, MCP/tool servers, chat bots, schedulers, webhooks, refresh endpoints and "test connection" routes.
Every rule below applies to every entry point.

## 1. Tenant scope

- Resolve one scope object per request — `(user, tenant_id, role)` — in one dependency: API key → the key's
  tenant; else the token's tenant claim (membership re-checked); else guest (only when login is disabled).
  Never trust a "last active tenant" field on the user row.
- Every entry point builds the same object: UI API, public API, MCP/tool server, bots, schedulers, webhook
  receivers, CLI jobs. A function that used to take a `user` and now takes a `scope` must change its type so callers
  passing the old object fail type-checking; grepping function bodies misses positional call sites.
- Filter every read, update and delete by tenant (`WHERE tenant_id = :scope_tenant`), set the tenant on every
  insert. Return **404, not 403**, for another tenant's row so existence does not leak.
- IDs stored inside JSON (`workspace.source_ids`, `alert.workspace_id`, template ids) are references: validate them
  against the tenant on write and filter again on load. "The parent was already scoped" holds on some paths only.
- Enforce roles on writes (`viewer < member < admin < owner`): creating API keys, alerts, restores and pushes are
  writes too.
- Defence in depth: a static lint that fails CI when a tenant-scoped model is queried without a tenant predicate
  (cover `select`, `get`, `update`, `delete`, counts; allow single queries with a reason, not whole files; generate
  the model list from the schema), plus a runtime guard — an ORM execute hook that rejects unscoped queries, or
  PostgreSQL row-level security.
- Test with a two-tenant fixture and a user who belongs to both with different roles: cross-tenant GET/PATCH/DELETE
  return 404, role gates return 403, the last owner cannot be demoted.

## 2. Secrets at rest

- Declare secret fields in each connector's schema (`{"name": "apiKey", "secret": true}`). Key-name heuristics fail
  silently: a snake_case allowlist (`api_key`, `connection_string`) never matches camelCase payloads (`apiKey`,
  `connectionString`), leaving credentials in plaintext and unmasked. Add a test that sends the real UI payload for
  every connector and asserts the stored value is encrypted and the response is masked.
- Envelope format inside JSON: `{"__enc": "<ciphertext>"}`; scalar columns via an encrypted column type.
- **Decrypt into a copy**, right before the driver call. Decrypting onto an ORM row attached to the session writes
  plaintext back on the next commit.
- One decrypt helper used by every path (questions, refresh, templates, reports, schedulers). Paths that "work"
  without it usually work because nothing was encrypted.
- Keys: separate the encryption key from the token-signing key (rotating one must not brick the other); support
  rotation (MultiFernet or KMS envelope keys, ideally per tenant); refuse to boot with a default secret; make
  decryption failures loud instead of passing ciphertext through.
- Encrypted values are randomized: add a keyed hash column (HMAC) for equality lookups. Leave room for ciphertext
  expansion in column lengths (enforced on PostgreSQL only).
- Also encrypt: LLM provider API keys, webhook secrets, OAuth access/refresh tokens, bot tokens.

## 3. Secrets in transit and in responses

- One masking serializer for every response that includes source metadata (list, create, refresh, discover);
  masked fields become `{"present": true}`. Forms send a new value or leave the field untouched — they never read
  the secret back.
- Redact tokens and query strings from error messages before they reach users, logs, LLM prompts or stored chat
  history. Credentials go in headers, never URLs.
- Template placeholders and prompt variables never draw from source metadata.

## 4. API keys

Random, prefixed (e.g. `dp_…`, so leaked keys are easy to scan for), stored as a hash plus a display prefix, returned once. Bound to one tenant (non-null)
and optionally one workspace; scopes (`ask`, `read`, `admin`) enforced on every interface including the tool
server; membership and role of the owner re-checked on each use; `last_used_at` recorded; revocable.

## 5. Containing generated queries

- Database first: read-only credentials or role, read-only transactions, statement timeout, row cap at the driver,
  byte caps for warehouses (BigQuery `maximum_bytes_billed`, dry run).
- Then the parser: one statement, `SELECT`/`WITH` only, no `SELECT … INTO`, no side-effecting functions
  (`text-to-sql`). Substring blacklists both block valid queries (`updated_at`) and allow attacks.
- Connection strings: allowlist drivers/schemes; block the platform's own database, local file URLs
  (`sqlite:///…`), and internal hosts; resolve and SSRF-check hosts.
- Never offer a tool or endpoint that reads an arbitrary server path ("upload file from path" = remote file read).
- Never `exec` model-written code in the server process; use a sandboxed subprocess/container with time and memory
  limits, or keep the model to SQL.

## 6. Inbound channels (bots, webhooks)

Verify signatures on every request and fail closed when the secret is missing (Slack `v0` HMAC with a 5-minute
window; Meta `X-Hub-Signature-256`; Telegram secret-token header). Compare in constant time. Acknowledge fast and
process asynchronously with retry de-duplication. An unauthenticated payload must never choose where an answer is
delivered (e.g. a phone number).

## 7. Outbound delivery is an exfiltration path

Email and webhook targets: verified recipients; SSRF-check webhook URLs (`api-data-connector/scripts/check_url.py`)
and disable redirects; HTML-escape or Markdown-render LLM output (data can carry markup and prompt-injected
content); sign with timestamp + event id; scope deliveries by tenant.

## 8. Logs and audit

LLM logs and traces contain prompts and sample rows — they are tenant data: store the tenant id and scope reads.
Audit log: tenant column, failed and denied attempts recorded, durable writes (not fire-and-forget), readable by
that tenant's admins only, `X-Forwarded-For` trusted only from known proxies. OAuth callbacks escape every
reflected parameter.

## Review checklist

- [ ] Every router/tool/bot/scheduler resolves the scope object; no `get(Model, id)` without a tenant check
- [ ] Stored ID references validated on write and filtered on load
- [ ] Secrets declared per connector; stored encrypted; masked in every response; decrypted into copies
- [ ] Generated queries: read-only + timeout + row cap + parser check; connection strings allowlisted
- [ ] Inbound signatures verified, failing closed; outbound targets verified and SSRF-checked
- [ ] Type checker / `ruff F821` in CI so refactors cannot leave undefined names behind

Related: `text-to-sql`, `api-data-connector`, `data-reports-and-alerts`, `sqlite-postgres-portability`.
