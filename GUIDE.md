# VaultFlow How To Guide

**Note:** VaultFlow is a random name i named for this template.  You can use your brand name.

The 30-minute tour from clone to your-own-branded dashboard.

## 1. Prerequisites

- **Node.js 20+** — `node --version`
- **pnpm 9+** — `npm install -g pnpm`
- **Docker** — required for local Supabase
- **Supabase CLI** — bundled in `devDependencies`; auto-installed by `pnpm install`

Optional: a Supabase Cloud project if you'd rather use a hosted backend.

## 2. First run (local Supabase)

```bash
pnpm install
pnpm supabase:start         # boots Postgres + Auth + Realtime + Storage + Studio in Docker
pnpm db:reset               # applies migrations from supabase/migrations/
pnpm seed:dev --reset       # seeds 3 orgs, 7 users, 4k+ rows
pnpm dev                    # → http://localhost:5173
```

Log in as `alice@novapay.io` / `Demo@1234`. You should see the dashboard with live KPIs.

## 3. First run (Supabase Cloud)

If you'd rather use a hosted Supabase project:

1. Create a project at supabase.com
2. Paste the URL + anon + service-role keys into `apps/dashboard/.env.local`
3. `pnpm dlx supabase login` then `pnpm dlx supabase link --project-ref <ref>`
4. `pnpm dlx supabase db push` to apply migrations to the cloud DB
5. `pnpm seed:dev` to seed demo data
6. `pnpm dev`

## 4. Customization

### Change brand name + logo

`apps/dashboard/src/lib/config/app.config.ts` → set `PUBLIC_APP_NAME` in `.env.local`. Logo SVG lives in `apps/dashboard/static/favicon.svg` and as inline SVG in `(auth)/+layout.svelte` + `Sidebar.svelte`.

### Change color scheme

Theme tokens live in two blocks at the top of `apps/dashboard/src/app.css` — `:root` for light mode and `.dark` for dark mode. The system follows the [shadcn](https://ui.shadcn.com/) convention (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, plus a `--chart-1…5` series and a parallel `--sidebar-*` set).

```css
:root {
  --background: oklch(0.9856 0.0084 56.3169);
  --foreground: oklch(0.3353 0.0132 2.7676);
  --primary:    oklch(0.7357 0.1641 34.7091);   /* warm orange — change to your brand */
  --secondary:  oklch(0.9596 0.0200 28.9029);
  /* …16 more */
}
.dark { /* dark overrides */ }
```

A `@theme inline` block exposes these as `--color-*` so Tailwind generates `bg-primary`, `text-muted-foreground`, `border-border`, etc. utility classes automatically.

**Fastest swap path:** open [tweakcn.com](https://tweakcn.com) or shadcn's theme generator, pick a palette, and paste the resulting `:root` + `.dark` blocks straight into `app.css`. Every page picks up the new colors instantly — there are zero raw `bg-zinc-900`-style classes anywhere.

**Compatibility shim:** the file also keeps a few legacy aliases (`--color-brand-*`, `--color-surface-*`, `--color-border-default`, etc.) inside `@theme inline` so older utility-class patterns (`bg-brand-500`, `bg-surface-1`, `border-default`, `text-muted`) keep resolving to the new palette. Don't remove them unless you've migrated those classes.

**Default mode:** `<html class="dark">` is hard-coded in `app.html` for the demo. Light mode works by removing that class — the theme picker at `/settings/appearance` does this for you.

### Switch to fintech-only or saas-only

Set `PUBLIC_APP_MODE=fintech` (or `saas`) in `.env.local`. The nav config filters items by mode (`nav.config.ts`), and most KPI cards/charts conditionally render.

### Add a new nav item

Edit `lib/config/nav.config.ts`:
```ts
{
  group: 'Insights',
  label: 'My Custom Module',
  href: '/my-module',
  icon: BarChart2,
  permission: { resource: 'reports', action: 'read' }
}
```
Add a matching `src/routes/(app)/my-module/+page.svelte`.

### Add a new permission

1. Add a row to the permissions catalog migration:
   ```sql
   INSERT INTO permissions (resource, action) VALUES ('my_resource', 'do_thing');
   ```
2. Grant it to roles in `lib/db/seed/01-rbac.ts` `ROLE_PERMS`.
3. Use it in code: `permissions['my_resource:do_thing']` (server) or `page.data.permissions?.['my_resource:do_thing']` (client).
4. (Optional) add RLS policies that reference `user_has_permission(org_id, 'my_resource', 'do_thing')`.

### Add a new role

1. Add the role's display name + perm matrix to `lib/db/seed/01-rbac.ts`.
2. Re-seed: `pnpm seed:dev --reset`.

### Change fonts

Fonts are self-hosted via [@fontsource](https://fontsource.org/) — the Svelte equivalent of `next/font/google`. No runtime Google Fonts request, no FOUC, latin-subset only.

```css
/* apps/dashboard/src/app.css */
@import '@fontsource-variable/montserrat';
@import '@fontsource/merriweather/400.css';
@import '@fontsource/merriweather/700.css';
@import '@fontsource/ubuntu-mono/400.css';
@import '@fontsource/ubuntu-mono/700.css';
```

To swap, install a different `@fontsource*` package (`pnpm --filter dashboard add @fontsource-variable/inter`), update the `@import` line, and change the `--font-sans` / `--font-serif` / `--font-mono` values in `:root`. Variable-font packages live under `@fontsource-variable/<name>`; classic per-weight packages under `@fontsource/<name>`.

The favicon at `apps/dashboard/static/favicon.svg` has its own literal hex gradient stops — update those too when re-branding (CSS variables don't apply to standalone SVG files).

## 5. RBAC architecture

**Resolution order** (highest priority first):

1. `resource_permissions` row with `granted = FALSE` → explicit DENY (final)
2. `resource_permissions` row with `granted = TRUE` → explicit GRANT
3. `role_permissions` via the user's `org_members.role` → role default
4. Default → DENY

Implemented in:
- **Server**: `lib/server/permissions.ts` (resolver merges all three layers)
- **UI**: `page.data.permissions` is a `Record<'resource:action', boolean>` consumed by `<PermissionGuard>` and `filterNav()`
- **Database**: every domain table has RLS using `user_has_permission(org_id, resource, action)` and `user_in_org(org_id)`

The Team page (`/team`) demonstrates per-resource overrides — Alice (super_admin) can grant any single permission to any user, and the change is enforced immediately on next request.

## 6. Feature modules — what's wired

Everything below is real (not a stub). Each writes to Postgres, respects RLS, and writes an audit-log entry when it should.

| Route | What it does | Storage |
|---|---|---|
| `/dashboard` | KPI strip, MRR line chart, status donut, **live transaction feed**, top customers | Supabase Realtime on `transactions` |
| `/transactions` | Server-paginated table, URL-synced filters, slide-over detail, bulk flag, CSV export | `transactions` |
| `/payments` | 30-day volume, success rate, method/provider mix, recent payments | `transactions` + `payment_methods` |
| `/fraud` | Severity tiles act as filter chips, resolve workflow with audit log | `fraud_signals` |
| `/customers` & `/customers/[id]` | Searchable list + LTV chart + linked subscriptions + transactions | `customers` |
| `/subscriptions` | Status / plan filters + MRR-by-plan rollup | `subscriptions` |
| `/revenue` | MRR trend + waterfall + revenue-by-plan + **cohort retention table** + churn-by-reason | `mrr_snapshots`, `churn_events` |
| `/reports` & `/reports/[slug]` | 4 pre-built reports (monthly/fraud/churn/revenue-by-country) with **preview + schedule form** + CSV export | Schedules in `organizations.settings.report_schedules` JSONB |
| `/team` | Member list, role change, **invite-member form** (creates auth user via service client), per-resource permission overrides | `org_members`, `resource_permissions` |
| `/audit-log` | Filterable activity log, JSON old/new value diff | `audit_log` |
| `/settings/profile` | Editable name + timezone + avatar URL | `user_profiles` |
| `/settings/organization` | Editable name + slug + mode + logo URL (gated by `settings:update`) | `organizations` |
| `/settings/notifications` | 6 toggle rows (fraud, payment failures, churn risk, team, reports, weekly digest) | `user_profiles.preferences.notifications` JSONB |
| `/settings/api-keys` | Create/list/revoke personal API keys — SHA-256-hashed secrets, scopes (`read`/`write`), prefix-only display after creation | `api_keys` (added in migration `20260527000002`) |
| `/settings/billing` | Plan tier cards + paid/outstanding counts + 12-month invoice history | `organizations.plan`, `invoices` |

**Topbar extras** —
- **Notifications dropdown** with unread badge + per-row "mark read" + "mark all read". Layout server loads the latest 12 + count. Mark-read endpoint at `POST /api/notifications/read` accepts `{id}` or `{all:true}`.
- **Cmd+K command palette** — global shortcut (`Cmd/Ctrl+K`) opens a fuzzy-search palette filtered to the user's RBAC-visible nav items. Arrow keys / Enter to navigate, Esc to close.

## 7. Deployment

Build:
```bash
pnpm build       # produces apps/dashboard/build/
```

Adapter is `@sveltejs/adapter-node` by default. Swap for Vercel/Cloudflare/Netlify by changing `svelte.config.js`.

```bash
# Production env vars
PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only
DATABASE_URL=...                # only for seeds, not runtime
```

## 8. Testing

```bash
pnpm test:unit       # Vitest — formatters + permission resolver logic (19 tests across 2 files)
pnpm test:e2e        # Playwright — auth, RBAC nav visibility, action gating (23 chromium tests)
pnpm test:a11y       # Scaffolded — Playwright `accessibility` project for axe-core sweeps (no tests yet)
pnpm test:mobile     # Scaffolded — iPhone 14 viewport project (no tests yet)
```

Playwright auth state is captured per-role in the `setup` project — every role-scoped test loads its storage state from `tests/e2e/.auth/<role>.json` so it doesn't re-log-in each run. Three role-scoped fixtures live in `tests/e2e/fixtures/auth.ts`.

The `a11y` and `mobile` project configurations exist (`testMatch: /\.a11y\.spec\.ts/` and `/\.mobile\.spec\.ts/` in `playwright.config.ts`) but ship without test files — add `*.a11y.spec.ts` or `*.mobile.spec.ts` files in `tests/e2e/` to populate them.

## 9. Replacing seed data with your real data

The seed script in `lib/db/seed/` is purely for the demo. To wire VaultFlow to your production data:

1. **Direct Supabase queries** — every page's `+page.server.ts` already reads from Supabase tables. Adjust the table names + columns to match your real schema.
2. **External APIs** — replace the Supabase queries with `fetch()` calls. Keep the load functions' return shapes intact and your pages won't notice.
3. **Webhook ingestion** — add endpoints in `routes/api/webhooks/` that insert into your `transactions`/`subscriptions` tables. The dashboard's Realtime subscription will surface them live.

## 10. Common operations

| Task                                 | Command                                              |
|--------------------------------------|------------------------------------------------------|
| Regenerate Supabase types            | `pnpm db:types`                                      |
| Open Supabase Studio                 | http://127.0.0.1:54323 (after `pnpm supabase:start`) |
| View seeded auth users               | Studio → Authentication → Users                      |
| Stop local Supabase                  | `pnpm supabase:stop`                                 |
| Truncate + re-seed                   | `pnpm seed:dev --reset`                              |
| Apply new migrations after pull      | `pnpm db:reset` then `pnpm seed:dev --reset`         |
| Tail dev server                      | `pnpm dev`                                           |
| Type-check                           | `pnpm --filter dashboard exec svelte-check`          |
| Smoke-test a fresh checkout          | `pnpm install && pnpm supabase:start && pnpm db:reset && pnpm seed:dev --reset && pnpm dev` |
| Open command palette in the app      | `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)           |
| Toggle dark / light mode             | `/settings/appearance` (or remove `class="dark"` from `app.html`) |

## 11. The demo

See [Demo Video]() of the product.

## 12. Troubleshooting

### "supabase:start" fails with `container is not running: exited`

The Postgres container was killed (Docker Desktop restart, sleep/wake, OOM). The local volume sometimes survives, sometimes comes up blank — recover in three commands:

```bash
pnpm supabase:stop          # tear down the broken stack
pnpm supabase:start         # bring it back up clean
pnpm db:reset               # reapply migrations
pnpm seed:dev --reset       # repopulate (820 customers + 2.8k txns in ~1.5s)
```

If `supabase:start` still says "already running" after a stop, run:

```bash
pnpm dlx supabase stop --no-backup    # drop the docker volume too
pnpm supabase:start
```

### Dev server returns 303 → /login on every protected route

Your auth cookie expired (default 1h) or the Supabase JWT signing key rotated. Log out and back in.

### Login succeeds but pages return empty data

Two likely causes:

1. **RLS recursion** — if you add a new RLS policy that calls a helper function which queries the same table, Postgres will silently filter to zero rows. Always use `SECURITY DEFINER` for helpers and reference tables via `public.table_name`. See `supabase/migrations/20260527000001_rls_and_catalog.sql` for the pattern.
2. **Ambiguous FK on join** — if you embed a related table that has multiple FKs to the parent (e.g. `org_members` has both `user_id` and `invited_by` pointing to `user_profiles`), PostgREST returns HTTP 300 with a hint. Always disambiguate: `user_profiles!org_members_user_id_fkey(...)`.

### `svelte-check` errors after upgrading dependencies

If `@supabase/ssr` and `@supabase/supabase-js` drift apart, the `SupabaseClient` generic shapes don't line up. Pin both to the same minor and ensure `App.Locals.supabase` reads its type from `ReturnType<typeof createSupabaseServerClient>` (see `app.d.ts`), never `SupabaseClient<Database>` directly.

### Realtime feed never updates

Check that you ran the `ALTER PUBLICATION supabase_realtime ADD TABLE …` statements in `20260527000001_rls_and_catalog.sql`. Without them, Postgres won't emit change events to the websocket. Also verify `PUBLIC_FEATURE_REALTIME=true` in `.env.local`.

### `pnpm dev` hangs at "vite optimizing dependencies"

Vite is rebuilding its dep cache. First boot can take 30-60s on Windows. If it stalls past 2 minutes, kill it and delete `apps/dashboard/.svelte-kit/` and `apps/dashboard/node_modules/.vite/` then retry.

### Type errors on `@lucide/svelte` icons

Make sure you use `@lucide/svelte` (the official Svelte 5 package), not the legacy `lucide-svelte` which uses pre-runes `$$props` and won't compile in runes mode.

### Charts show a solid black area under the line

The chart's gradient `id` attribute was built from the chart label. If the label contains spaces or punctuation, `url(#line-grad-Some Label)` becomes invalid URL syntax and the browser silently falls back to `fill: black`. The fix is in `LineChart.svelte` / `SparkLine.svelte`: slugify the label before using it as an ID — `${label.replace(/[^a-z0-9]/gi, '-')}`. The compile-time CSS-var stops on the `<stop>` elements also need to be set via `style=` not `stop-color=` (SVG attribute parsing doesn't resolve chained `var()`).

### `/settings/api-keys` errors with "relation api_keys does not exist"

You pulled new code but didn't reapply migrations. The `api_keys` table ships in `20260527000002_api_keys.sql`. Run:

```bash
pnpm db:reset
pnpm seed:dev --reset
```

### "Invalid export 'X' in +page.server.ts" 500 at request time

SvelteKit only allows a fixed set of exports from `+page.server.ts`: `load`, `actions`, `prerender`, `csr`, `ssr`, `trailingSlash`, `config`, `entries`, plus anything `_`-prefixed. Any other value-level `export const X = …` fails route validation and returns 500 *before* `load()` runs. Either drop the `export`, prefix the name with `_`, or move the value into a sibling module under `$lib/`. (Type-only `export interface` / `export type` is fine — those erase at compile time.)
