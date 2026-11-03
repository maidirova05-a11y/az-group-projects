# Backend standard

Stack: Hono (`server/app.ts`) on Vercel Functions or `npm run dev:api`, Drizzle ORM + PostgreSQL, zod contracts in `shared/schemas.ts`. Full endpoint list: `docs/ARCHITECTURE.md`.

## Layering
- `server/routes/**` (handlers): parse and validate input, check auth, call the DB, shape the DTO. Keep handlers thin; extract shared logic to `server/lib/**` (http, audit, cache, ratelimit, i18n, logger) before duplicating it.
- `server/auth/**`: session (JWT in httpOnly cookie), `requireAdmin`, `requireOwner`, CSRF.
- `server/db/**`: schema, migrations, client, seed. Handlers import `db()` only, never build their own connection.
- Routes that grow past ~150 lines of business logic should get a `server/services/<name>.ts` and the handler only maps HTTP to it.

## Input and output
- Every body goes through `body(c, schema)` (zod, JSON only, 256 KB cap). Query params are validated by hand (`idParam`, `posInt`, enum checks) and answer 400.
- Errors always `{ error: { code, message, fields? } }` via `ApiFail`. Codes: 400 bad input/id, 401 no session, 403 role/CSRF, 404, 409 conflict, 413, 415, 422 validation, 429 rate limit (with `Retry-After`), 500 internal (no details leaked).
- Never return DB rows with `ip_hash`/`password_hash`; select explicit columns or map to a DTO. Dates leave the API as ISO strings.
- Admin and auth responses carry `Cache-Control: no-store`; public content is cached in memory and by the CDN with an ETag.

## Auth and abuse control
- `/api/admin/*` is behind `requireAdmin` (session version checked in DB on every request) and CSRF header. Owner-only actions use `requireOwner`.
- Public writes (`/leads`, `/registrations`): honeypot field, per-IP limit, duplicate suppression, both enforced under advisory locks in one transaction.
- Login: per e-mail+IP and per e-mail lockouts, constant-time-ish bcrypt path.

## Config
- Env vars are read only in `server/env.ts`; `envProblems()` validates all at once (used by `dev.ts` at startup and `GET /api/health/ready`). Secrets live in `.env.local` / Vercel env, never in code. `.env.example` lists the names only.

## Database
- Schema in `server/db/schema.ts`; change it only with `npm run db:generate` and commit the generated SQL. Migrations are forward-only, additive first (add nullable column or index, backfill, then constrain); never edit an applied migration. Run migrations over a direct (non-pooled) URL; run time traffic over the pooled one (`prepare: false`, `max: 1` on Vercel).
- Every FK column and every filter/sort column used by a hot query has an index; uniqueness is enforced by unique indexes, and the handler maps `23505` to 409.
- Queries are Drizzle builders or `sql` template tags (parameterised). Never concatenate input into SQL; `sql.raw` is only for constants.
- Multi-row writes that must be consistent use `db().transaction`.

## Observability
- `server/lib/logger.ts` writes one JSON line per event (`log.info/warn/error`); `console.*` is not used in `server/`. Every request logs `requestId, method, path, status, ms` and returns `X-Request-Id`.
- `GET /api/health` is liveness; `GET /api/health/ready` checks env and runs `select 1` (503 on failure).

## Tests
- `npm test` runs the API against a real Postgres (`TEST_DATABASE_URL`, database name must be `azgroup_test`). New endpoints need: success, validation error, auth/role error.
