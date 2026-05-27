# VaultFlow (Fullstack Template)

> **SvelteKit 5 · Supabase · Tailwind v4 · TypeScript**
> Premium fintech + SaaS dashboard template with org-level RBAC, per-resource permission overrides, real-time transactions feed, and 4,000+ rows of realistic seed data.

VaultFlow is a fully-working SvelteKit 5 admin dashboard that ships as source — no closed component library. Fork once, retheme via one CSS file, sell client implementations. Two verticals in one template: flip between **Fintech** and **SaaS** mode via a config flag.

## Product Demo
- See [Demo Video]() of the product.

## Documentation

- 📘 **[GUIDE.md](./GUIDE.md)** — Full buyer customization guide: theme + fonts swap, adding nav items / permissions / roles, RBAC architecture, deployment, troubleshooting. Start here after the Quick start below.


## What's in the box

- **Auth** — Supabase email/password + magic link, SSR cookies via `@supabase/ssr`. Editable profile, organization, and notification preferences settings pages
- **RBAC** — 6 system roles (super_admin, admin, finance_manager, ops_manager, analyst, viewer) + per-row resource permission overrides enforced at both Postgres RLS and route load. Real invite-member flow that creates auth users via the service client
- **Live data** — every chart and table reads from Supabase. 3 seeded orgs, 7 demo users, 820 customers, 2,800 transactions, 547 subscriptions, 190 fraud signals, 545 MRR snapshots, 32 notifications
- **Realtime** — dashboard transactions feed subscribes to Supabase Realtime
- **Charts** — hand-rolled SVG line, bar, donut, sparkline (no chart-library bloat)
- **Analytics** — MRR waterfall, **cohort retention table** (12-month × 12-month matrix), churn-by-reason, revenue-by-plan, status donut
- **Reports** — 4 pre-built reports with **preview + schedule form + CSV export** (monthly summary, fraud report, churn analysis, revenue by country); schedules persist to `organizations.settings` JSONB
- **API keys** — full personal-key CRUD with SHA-256-hashed secrets, scopes (`read`/`write`), prefix-only display after creation, and revoke
- **Billing** — plan tier comparison, paid/outstanding invoice counts, 12-month invoice history
- **Topbar UX** — notifications dropdown with unread badge + mark-all-read, and a Cmd+K command palette filtered to the user's RBAC-visible routes
- **Theme** — shadcn warm-orange palette (light + dark) with a compat shim so all the original `brand-*`/`surface-*` utility classes still resolve. Self-hosted fonts via `@fontsource` — no runtime Google Fonts request
- **Accessibility** — focus rings, ARIA grid table, keyboard navigation, screen-reader data tables on charts
- **Mobile** — full responsive layout down to 320px (sidebar → bottom drawer)
- **Audit log** — every grant/revoke/role-change/invite/key-creation/report-schedule is recorded
- **Tests** — Playwright auth fixtures for every role (23 chromium E2E), Vitest unit suite for formatters + permission resolver (19 unit)

## Quick start

```bash
# Requirements: Node 20+, pnpm 9+, Docker
pnpm install

# 1. Boot Supabase locally (postgres + auth + storage + realtime in Docker)
pnpm supabase:start

# 2. Apply migrations (RLS, permission catalog, etc.)
pnpm db:reset

# 3. Seed demo data — 3 orgs, 7 users, 4k+ rows
pnpm seed:dev --reset

# 4. Run the app
pnpm dev
# → http://localhost:5173
```

Open the printed Supabase keys and paste into `apps/dashboard/.env.local` (or copy from `.env.example`).

Next: skim **[GUIDE.md](./GUIDE.md)** to swap brand colors, fonts, add a permission, or deploy.

## Demo credentials

| Email                  | Role             | What they see                                      |
|------------------------|------------------|----------------------------------------------------|
| alice@novapay.io       | super_admin      | Everything                                         |
| bob@novapay.io         | admin            | All except billing changes                         |
| carol@novapay.io       | finance_manager  | Transactions, customers, revenue, reports         |
| dave@novapay.io        | analyst          | Read-only on most, can export                      |
| eve@novapay.io         | viewer           | Read-only basics                                   |
| frank@novapay.io       | ops_manager      | Payments, fraud, customer ops                      |
| grace@novapay.io       | analyst (+ override) | Same as Dave **plus** explicit `transactions:export` grant |

Password for all: `Demo@1234`

## Tech stack

| Layer       | Choice                                                                       |
|-------------|------------------------------------------------------------------------------|
| Framework   | SvelteKit 5 (Runes API)                                                      |
| Styling     | Tailwind CSS 4 (CSS-first, no JS config)                                     |
| Theme       | shadcn token system (`:root` + `.dark`) — warm-orange palette, easy re-skin  |
| Fonts       | Montserrat / Merriweather / Ubuntu Mono — self-hosted via `@fontsource`      |
| UI          | Custom Svelte components + Bits UI primitives                                |
| Icons       | `@lucide/svelte`                                                             |
| Charts      | Hand-rolled SVG (no external chart library)                                  |
| Database    | Supabase (Postgres 15 + RLS + Realtime + Auth)                               |
| Auth        | Supabase Auth (cookie-based SSR)                                             |
| Validation  | Zod                                                                          |
| Testing     | Playwright (E2E) + Vitest (unit)                                             |
| Bundler     | Vite 6                                                                       |

## Project structure

```
apps/dashboard/
├── src/
│   ├── app.css                      # Tailwind v4 + shadcn design tokens + compat shim
│   ├── hooks.server.ts              # Supabase auth middleware
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                  # Card, Button, Input, Badge, Label
│   │   │   ├── layout/              # Sidebar, Topbar, UserMenu, Notifications, CommandPalette
│   │   │   ├── data-table/          # Generic paginated DataTable
│   │   │   ├── charts/              # LineChart, BarChart, DonutChart, SparkLine
│   │   │   ├── SlideOver.svelte     # Drawer modal
│   │   │   ├── StatusBadge.svelte   # Toned status pill
│   │   │   └── PermissionGuard.svelte
│   │   ├── config/                  # app.config, nav.config (RBAC-aware nav)
│   │   ├── db/seed/                 # Seed scripts (orgs, users, domain data, notifications)
│   │   ├── server/                  # supabase.ts + permission resolver
│   │   ├── stores/                  # ui.store.svelte (sidebar, theme, cmd-k state)
│   │   ├── types/                   # database.types, rbac.types, domain.types
│   │   └── utils/                   # cn, formatters, export (CSV)
│   └── routes/
│       ├── (auth)/                  # login, signup, forgot-password
│       ├── (app)/                   # protected; full dashboard
│       │   ├── dashboard            # Overview with KPIs + realtime feed
│       │   ├── transactions         # Full ledger + slide-over
│       │   ├── payments             # Volume + success rate + method mix
│       │   ├── fraud                # Signals + resolve workflow
│       │   ├── customers            # List + detail
│       │   ├── subscriptions
│       │   ├── revenue              # MRR trend + waterfall + cohort retention + churn
│       │   ├── reports              # Library + /[slug] preview & schedule
│       │   ├── team                 # RBAC showcase + invite-member form
│       │   ├── audit-log
│       │   └── settings/            # profile, organization, notifications, api-keys, billing, appearance
│       └── api/
│           ├── export/[slug].csv    # CSV report exports
│           └── notifications/read   # POST mark-read endpoint
├── supabase/migrations/             # Schema + RLS + permission catalog + api_keys
├── static/favicon.svg               # Warm-orange gradient brand mark
├── tests/
│   ├── e2e/                         # Playwright per-role suites (23 chromium tests)
│   └── unit/                        # Vitest (19 tests)
├── playwright.config.ts
└── vite.config.ts
```

## Configuration

Edit `apps/dashboard/.env.local`:

| Var                          | Purpose                                          |
|------------------------------|--------------------------------------------------|
| `PUBLIC_SUPABASE_URL`        | Your Supabase project URL                        |
| `PUBLIC_SUPABASE_ANON_KEY`   | Anon (or new `sb_publishable_*`) key             |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service-role key (server-only, used for seeds)   |
| `DATABASE_URL`               | Direct Postgres URL (used by seed scripts)       |
| `PUBLIC_APP_MODE`            | `fintech` \| `saas` \| `both`                    |
| `PUBLIC_APP_NAME`            | Branding name shown in topbar/logo               |
| `PUBLIC_DEFAULT_CURRENCY`    | Default currency for formatters                  |
| `PUBLIC_FEATURE_REALTIME`    | Toggle Supabase Realtime subscriptions           |
| `PUBLIC_FEATURE_FRAUD`       | Show/hide fraud module                           |
| `PUBLIC_FEATURE_EXPORTS`     | Show/hide export buttons                         |
| `PUBLIC_FEATURE_REPORTS`     | Show/hide reports module                         |

## Support & commercial work

VaultFlow is free under MIT — but if you'd rather hire someone to customize, integrate, or build on top of it, **[nuvraxis.com](https://www.nuvraxis.com)** offers commercial support, custom builds, and implementation services.

For non-commercial questions, open a [GitHub issue](./.github/ISSUE_TEMPLATE/) or start a discussion.

For **security vulnerabilities**, please email [security@nuvraxis.com](mailto:security@nuvraxis.com) — don't open a public issue.

## License

[MIT](./LICENSE) © nuvraxis. Use it, fork it, ship it, sell it — just keep the copyright notice.

---

**VaultFlow by [nuvraxis](https://www.nuvraxis.com)** · Built with SvelteKit 5 · Tailwind CSS v4 · Supabase
