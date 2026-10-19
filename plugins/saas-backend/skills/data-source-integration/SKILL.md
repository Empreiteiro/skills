---
name: data-source-integration
description: End-to-end checklist for connecting an external SaaS data source (issue tracker, helpdesk, docs, chat, CRM, meeting notes) to a multi-tenant app. Covers config, per-tenant account storage, OAuth or API-key connect, token refresh, polling with cursors and rate limits, webhooks, ingestion into a searchable store (dedupe, summaries, embeddings), who can see what, live-search tools for an AI assistant, the connections UI, plan gating and docs. Use whenever a task adds, extends or removes an integration, or wires an existing one into a new place (search, assistant tools, digests).
---

# New data-source integration

An integration brings an external source into each tenant's data, so search, an AI assistant, digests or
reports can use it. Integrations look different but share most of their plumbing. Copy the closest existing
one in the project, then walk this checklist so nothing is missed.

## 0. Pick the shape and the closest example

| Shape | Examples | Where items land |
|---|---|---|
| Polled thread with an outcome | Issues, tickets, support conversations | One searchable record per thread, keyed by the external id |
| Per-user token, polled | Personal meeting-notes or note-taking apps | The same, owned by the user |
| Documents with live search | Wiki pages, cloud drives, repositories | Their own table plus embeddings, and a live-search tool |
| Webhook-driven | Chat apps, code hosts | Depends on the content. Usually polling as a safety net |
| Live search only (nothing stored) | Mailboxes, CRMs | Nothing: an assistant tool queries the provider on demand |

Then find in the project:

- config loading and the env example file;
- the scheduler (cron) and how other pollers register;
- the store items go into, and its dedupe key;
- the summarizer, the embedder and LLM call tracing with cost;
- every list that enumerates source kinds (grep for an existing kind);
- the connections screen and its catalog;
- i18n files, plan gating, and the integration docs, README and test plan.

The recipe below is the polled-thread shape, the most common. The other shapes reuse most of it.

## 1. Config and env

- One config block per integration: `clientId`, `clientSecret`, `syncMinutes` (clamped, e.g. 1–60, default
  10), `maxPerPoll`, `maxTextChars`, `backfillDays` (e.g. 30).
- **Empty credentials mean the integration is off.** An `isConfigured()` function next to the sync code is
  checked by every entry point: scheduler, routes, assistant tools, UI status.
- Document the block in the env example file: how to register the app with the provider, the redirect URL,
  token lifetimes and each knob.

## 2. Storage

- A per-tenant accounts table `<provider>_accounts`:
  - `id`, `tenant_id NOT NULL UNIQUE` (cascade on tenant delete), `access_token`, `refresh_token`,
    `expires_at`;
  - the cursor column (`sync_since` or `sync_cursor`), the provider's workspace id, `installed_by`,
    timestamps.
  - Per-user connections key on the user instead.
- **Health columns:** `last_sync_at` and `last_error`, so the UI can show why a source stopped.
- **Tokens:** encrypt them at rest if the project encrypts other provider credentials.
- Repository functions: `upsertAccount` (on conflict by tenant, and reset the cursor when the workspace
  changes), `getAccountByTenant`, `listAccounts`, `updateTokens`, `setCursor`, `setHealth`, `deleteAccount`.
- Follow the project's schema-change process (see `sqlite-postgres-schema` if the app runs on both engines).

## 3. The sync module

- Exports: `isConfigured()`, OAuth helpers (install URL, code exchange, refresh), a small API client, a
  private `buildDocument(item)`, and `syncAccount(acc)` returning `{ processed, fetched }`. The manual
  "sync now" route reuses `syncAccount`. Finally `syncAll()`, which loops over `listAccounts()` with a
  try/catch **per account**, so one broken tenant doesn't stop the others.
- **Tokens.** Refresh when `expires_at` is less than about a minute away, and persist the new pair **every
  time**. Many providers rotate refresh tokens, and losing the new one disconnects the tenant. A revoked
  token (401 that a refresh can't fix) records `last_error` and makes the UI ask for a reconnect.
- **Rate limits.** Retry a 429 a couple of times, honoring `Retry-After` with a cap. Check how the provider
  actually signals limits: some answer 400 or 200 with an error code in the body.
- **Cursors.** Pick one of two patterns:
  - process items oldest-first and stop the batch at the first error, so the watermark never skips an item;
  - or advance page by page with the provider's opaque cursor.

  Either way, cap each run with `maxPerPoll`, and have the first sync look back `backfillDays`.
- **Content.** Cap the document at `maxTextChars`. Keep the header fields that make a summary useful:
  identifier, title, state, assignee, project, labels, dates.

## 4. Ingestion

- **Dedupe by external id:** find the record by `(kind, external_id, tenant)`. Update it, re-summarizing
  only when the content changed, or insert a new one.
  - `external_id` is the provider's stable id (`ENG-123`).
  - Store a user-facing label next to it (`Linear ENG-123`).
- **Summaries** go through the project's shared summarizer. **Every LLM or speech-to-text call** goes
  through the project's tracing, with an estimated cost, and logging must never break the sync.
- **Embeddings and lexical index:** best-effort after the write (`embed(id).catch(() => {})`), plus a boot
  backfill that catches what was missed.
- **Register the new kind everywhere sources are enumerated:** search, open and delete routes, digests,
  onboarding, assistant labels and citations, agent source pools. Grep for an existing kind to find every
  list.
- **Deleting and disconnecting:**
  - deleting a record by hand should leave a tombstone, so the next sync doesn't bring it back;
  - decide whether disconnecting keeps or purges what was ingested, and document it.

## 5. Visibility

- Records are always tenant-scoped.
- **Inside a tenant**, decide who sees what on purpose. If members see only items they take part in, fill
  the record's participants (assignee, requester, commenters). An item ingested with no participants is
  visible to admins only.
- Connect, sync and disconnect are admin-only. Status is readable by any user of the tenant. See
  `secure-api-route` for the role checks.

## 6. Connecting and routes

- **OAuth with a dedicated callback** per provider (preferred):
  - `GET /api/<provider>/install-url` (admin) → provider consent → `GET /oauth/<provider>/callback`.
  - The `state` is signed: an HMAC over `{ tenant_id, user_id, exp, nonce }`, verified in constant time.
    The callback usually sits outside the authenticated API, so the signed state is its only
    authentication.
  - Redirect back to the connection's page with `?connected=1`.
- **OAuth with a shared callback:** add the provider to the shared builder and branch on it in the start and
  callback routes.
- **API-key connections:** `POST /api/<provider>/connect { token }`. Validate the key with one cheap provider
  call before saving it, then start the first sync without awaiting it.
- **Webhooks:** `/api/webhooks/<provider>`, with the signature verified over the raw body. Answer 200 fast
  and process in the background. Make processing idempotent: the webhook and the poller will race.
- **Operations:**
  - `GET /api/<provider>/status`;
  - `POST /api/<provider>/sync` (409 when not connected, 502 with the provider's error);
  - `POST /api/<provider>/disconnect`, which also revokes at the provider when it supports that.

## 7. Scheduling

```ts
if (providerConfigured()) {
  const every = config.provider.syncMinutes;
  cron.schedule(`*/${every} * * * *`, () => {
    syncProvider().catch((e) => log.error({ error: (e as Error).message }, 'provider sync'));
  });
  syncProvider().catch(() => {}); // first sweep at boot
}
```

Cron libraries don't prevent overlapping runs. Keep `maxPerPoll` small and the upserts idempotent, or add a
`running` flag when one run can outlast the interval.

## 8. Live-search tool for an AI assistant (optional)

- A tool `{ name, description, parameters, execute }` that queries the provider live. Register it only when
  the integration is configured, the tenant (or user) has an account, and the tenant hasn't turned the
  source off.
- Feed what the tool read into the answer's citations.
- If the app also has an MCP server, expose the same tool there with the same scoping.

## 9. Frontend

- An icon keyed by the source kind, and API client functions (status, install URL or connect, sync,
  disconnect).
- An entry in the connections catalog, with its group, the plans that show it, and a detail page: what it
  brings, how to connect, the last sync and the last error.
- The source in search filters and pills, in assistant source pickers and `@`-mentions, and in onboarding
  if the app has one.
- Every string in every locale the app ships.
- A dedicated screen is rarely needed: integrations are managed from the connections screen.

## 10. Plans and feature gating

If plans or feature flags limit which sources a tenant can use, add the new source where it belongs, on the
server **and** in the UI. The server must enforce the same rule the UI shows.

## 11. Docs

- The integration reference: what the source brings, API and auth, how the sync works (interval, cursor,
  caps), gotchas, the env table, the files involved.
- The README integrations table, and the agent tool list if you added a tool.
- The test plan: connect, first sync, incremental sync, re-summarize on change, visibility as admin vs
  member, disconnect.

## Verification checklist

- Typecheck and lint.
- **Unconfigured** (no env): boot without errors, no scheduled job, the card shows "not configured".
- **Connected** against the provider's sandbox:
  - the first sync fills the store;
  - a change at the provider updates the same record, with no duplicate;
  - search and the assistant find it.
- **Visibility:** as a member, only what the rule allows. From another tenant, nothing.
- **Failures:** an expired token, a revoked token and a 429. The sync recovers or reports the problem,
  without crashing the scheduler or skipping items.
- **Disconnect:** the account row goes away and the scheduler skips the tenant.
