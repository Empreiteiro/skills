---
name: secure-api-route
description: Add or change an HTTP API route in a multi-tenant web app without leaking data across tenants or roles. Covers deny-by-default auth, public, webhook and internal routes, resolving the caller and tenant scope, role checks, tenant-checked writes, input validation, response and error shapes, audit, SSRF, webhook signatures, signed OAuth state, stored secrets, redirects and the test matrix. Use whenever a task adds or edits an endpoint, a webhook receiver, an OAuth callback, a service-to-service endpoint, or a query reached from a route.
---

# Secure API route (multi-tenant)

In a multi-tenant app every route is a tenant boundary. Most leaks come from a route that checks the login
but not the tenant, or from a write by id that never checks whose row it is. This skill is the checklist for
getting a route right. The examples use TypeScript and Fastify, but the rules don't depend on the framework.

## 0. Map the project first

Find these before you write the route, and reuse them:

| What | Typical names |
|---|---|
| Where routes are registered | `server.ts`, `routes/*.ts`, `app.get(…)` calls |
| The global auth hook or middleware, and its allowlist of public routes | `onRequest`, `authMiddleware`, `PUBLIC_ROUTES` |
| The function that resolves the caller | `requestAuth(req)`, `getSession`, `currentUser` |
| Role helpers and per-entity access helpers | `requireAdmin`, `requireProjectAccess(req, reply, id)` |
| Tenant scoping in queries | `tenantWhere(scope)`, a `tenant_id` filter in every repository function |
| Audit, logging, SSRF guard, secret encryption | `audit()`, `log`, `safeFetch()`, `encryptSecret()` |
| The frontend API client | `api.ts`, an `api` object, generated client |

If one of them doesn't exist (no global hook, no audit), say so in your summary and make the route itself
stricter. Don't invent a parallel mechanism next to an existing one.

## 1. Auth layers (what protects a route before your code runs)

1. **Deny-by-default login hook.** Every `/api/*` route requires a logged-in, non-suspended user unless
   it is explicitly allowlisted.
   - Match the **route pattern** (`req.routeOptions.url` in Fastify, `req.route.path` in Express), not
     the raw URL, so path encoding and trailing slashes can't dodge it.
   - Keep the allowlist small and explicit: a few prefixes (`/api/public/`, `/api/webhooks/`,
     `/api/internal/`) plus a set of `'METHOD /pattern'` entries.
   - The hook only blocks anonymous callers. **Role and tenant are still your route's job.**
2. **Service-to-service token** for internal routes (workers, bots, cron runners): a separate prefix and
   `Authorization: Bearer <secret>`, compared in constant time. The browser never calls these routes.
   When you add any new gate, match on the route pattern like the login hook does.
3. **Boot-time guard.** In production, refuse to start with default secrets or with login turned off.

Where a new route goes:

| Route kind | Path | What authenticates it |
|---|---|---|
| Logged-in user | `/api/<area>/…` | The login hook, plus your role and tenant checks |
| Signed webhook | `/api/webhooks/<provider>` | The signature over the **raw** body (keep the raw body in the JSON parser) |
| Token-in-URL webhook | `/api/<area>/webhook/:token` + allowlist entry | The token, compared in constant time and stored hashed |
| Public page (share link, booking page) | `/api/public/…` | The unguessable token or slug in the URL. Return only what the page shows |
| Internal (worker, bot) | `/api/internal/…` | The service token |
| OAuth callback | `/oauth/<provider>/callback` (often outside `/api`) | The signed `state` parameter, verified by the route |

Never add a route to the allowlist "to make it work". An allowlisted route must have its own authentication.

## 2. Resolving the caller

One function should answer "who is calling and what may they see":

```ts
const { user, scope, memberEmail, realUser } = await requestAuth(req);
```

- **Never throws.** With no session it returns `user: null` and a scope that matches nothing.
- **`scope` has three states.** It is a tenant id, a "none" value that matches nothing (anonymous,
  suspended, user without a tenant), or "unrestricted". Unrestricted should only be possible in local
  development with login turned off. Check that "none" really produces empty results and never falls through
  to "no filter".
- **Super-admins stay in their own tenant by default.** They see another tenant only through an explicit
  "view as" (impersonation) or through dedicated global-admin routes, which gate on `requireSuperAdmin()`
  and run their own queries.
- **Restricted roles.** If members and viewers see only items they take part in, the resolver returns that
  restriction (`memberEmail` above) and personal-data queries take it as a parameter.
- **Impersonation.** While "viewing as", `user` is the effective identity (an admin of the viewed tenant)
  and `realUser` is the operator. Effective-role checks use `user`. Escalation checks (who may grant which
  role) use the real power.

## 3. Role and access checks

Typical helpers. Find the project's equivalents and reuse them:

| Helper | Behavior |
|---|---|
| `isAdmin(u)` | Pure check: owner or admin, not suspended |
| `requireAdmin(req)` | Returns the user or `null`; the route answers `403 { error: 'admin only' }` |
| `requireSuperAdmin(req)` | The effective super-admin (`null` while impersonating) |
| `requireRealSuperAdmin(req)` | The real operator, even while impersonating (for the impersonation routes) |
| `requireEntityAccess(req, reply, id, { write })` | Sends 404 or 403 itself and returns `null`; the route does `if (!row) return;` |
| Read-only role guard | `if (user.role === 'viewer') return reply.code(403).send({ error: 'read only' });` on every write |

When an area already has a scope helper (teams, folders, projects), reuse it instead of re-deriving the rule.

## 4. Skeleton: tenant-scoped CRUD

```ts
app.get('/api/teams', async (req, reply) => {
  const { user } = await requestAuth(req);
  if (!user) return reply.code(401).send({ error: 'login required' });
  if (!user.tenant_id) return { teams: [] };
  return { teams: await listTeams(user.tenant_id) };
});

app.post<{ Body: { name?: string } | undefined }>('/api/teams', async (req, reply) => {
  const actor = await requireAdmin(req);
  if (!actor) return reply.code(403).send({ error: 'admin only' });
  if (!actor.tenant_id) return reply.code(400).send({ error: 'no tenant' });
  const name = (req.body?.name ?? '').trim();
  if (!name) return reply.code(400).send({ error: 'name required' });
  try {
    const team = await createTeam(actor.tenant_id, name, actor.id);
    await audit(req, { action: 'team.create', user: actor, target_type: 'team', target_id: team.id });
    return { team };
  } catch (e) {
    if (e instanceof NameTakenError) return reply.code(409).send({ error: 'name_taken' });
    throw e;
  }
});

app.delete<{ Params: { id: string } }>('/api/teams/:id', async (req, reply) => {
  const actor = await requireAdmin(req);
  if (!actor) return reply.code(403).send({ error: 'admin only' });
  const tenantId = await teamInScope(actor, req.params.id); // null = missing or another tenant's
  if (!tenantId) return reply.code(404).send({ error: 'not found' });
  await deleteTeam(req.params.id, tenantId);                // SQL: WHERE id = ? AND tenant_id = ?
  await audit(req, { action: 'team.delete', user: actor, target_type: 'team', target_id: req.params.id });
  return { ok: true };
});
```

**Updates and deletes by id always check the tenant.** Resolve the row inside the caller's scope first and
answer 404 when it belongs to another tenant, so existence doesn't leak. Then repeat the tenant in the write
(`WHERE id = ? AND tenant_id = ?`). Never `UPDATE … WHERE id = ?` alone, and least of all with integer ids,
which can be guessed.

## 5. Input

- Use the project's validator if it has one (zod, JSON schema, Fastify schemas). Type-only generics
  validate nothing. Without a validator, check by hand:
  - `const b = req.body ?? {}`, `String(b.x ?? '').trim()`, `typeof b.n === 'number'`, whitelists;
  - PATCH: `b.x !== undefined` means "set", and `null` clears;
  - numeric ids: `Number.isInteger(Number(id))`;
  - limits: `Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 500)`;
  - booleans in the query string: `=== '1' || === 'true'`;
  - a client timezone offset (`getTimezoneOffset()` minutes): a number, clamped to ±14 h.
- Keep a body size limit. Stream uploads (multipart) to storage, and authenticate **before** reading the
  upload.
- Never change state on `GET`. With cookie sessions and no CSRF token, `SameSite=Lax` still sends the cookie
  on top-level `GET` navigations.

## 6. Output and errors

- Return a wrapper object (`{ teams }`, `{ items, can_write }`), never a bare array. Mutations return
  `{ ok: true }` or the changed entity.
- Keep field naming consistent with the rest of the API. Never send secrets to the client: tokens,
  password hashes, provider credentials, other users' private fields.
- Status codes: 400 bad input, **401 no user**, **403 wrong role**, 404 missing or another tenant's,
  409 conflict, 502 upstream provider error.
- Use a machine-readable error key (`name_taken`) when the UI must branch on it. Otherwise use a short
  message the UI can show as is, in the product's default language.
- Map expected errors (`instanceof XError`) and re-throw everything else, so the framework answers 500 and
  logs it.
- Log through the app's logger, and check that the request logger isn't a no-op. Audit every mutation:
  `audit(req, { action: 'entity.verb', user, target_type, target_id, payload? })`.

## 7. Security helpers

- **User-supplied URLs or hosts** (webhook targets, custom integrations, database hosts): validate when
  saving and again when fetching, because DNS can change in between. Resolve the host and block private,
  loopback, link-local and cloud-metadata ranges. Re-check every redirect, or turn redirects off.
- **Webhook signatures:** HMAC over the raw body, a replay window when the provider sends a timestamp, and
  `crypto.timingSafeEqual` (never `!==`).
- **Signed state** (OAuth, magic links, 2FA steps): an HMAC over `{ tenant_id, user_id, exp, nonce }` with a
  server secret, checked for expiry.
- **Stored secrets:** hash what you only compare (API tokens). Encrypt what you must read back (provider
  credentials), with a key from the environment.
- **Redirects** after login or OAuth go only to local paths: `next.startsWith('/') && !next.startsWith('//')`,
  and reject `\`.

## 8. Frontend side

- Add one function per endpoint to the API client. It should throw an `Error(body.error)` that carries the
  status and the body.
- The caller shows a toast and maps known error keys to translated strings
  (`e.message === 'name_taken' ? t('teams.name_taken') : e.message`).
- Hiding a menu item or button is a convenience. **The route is the real gate.**

## 9. Agent and token access (MCP servers, API tokens)

If the data is also exposed to AI agents or personal API tokens:

- The token fixes the tenant and the user. Tools reuse the same scoping and role rules as the HTTP routes.
- Reads by id re-check access. Writes force the tenant and the creator from the token, never from the
  arguments, and are audited.
- Default to read-only tokens and write tools turned off. Annotate tools as read-only or destructive when
  the protocol supports it.

## 10. Contracts with separately deployed clients

When the route is called by something deployed on its own schedule (a worker image, a bot, a browser
extension, a mobile app), keep the old request and response shape working until every client is updated.
Otherwise an old client fails in the middle of its work.

## Verification checklist

- Typecheck and lint.
- Call the route as:
  - anonymous: 401;
  - the lowest role: 403, or filtered results;
  - an admin of **another tenant**: 404, and nothing leaks in the body or the timing of errors;
  - owner and admin: works;
  - a super-admin, with and without "view as".
- For writes by id, try an id that belongs to another tenant.
- Update the API docs or test plan for webhooks, public endpoints and agent tools.
