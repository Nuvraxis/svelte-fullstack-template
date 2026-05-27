# Contributing to VaultFlow

Thanks for your interest! VaultFlow is MIT-licensed and we welcome bug fixes, feature PRs, docs improvements, and ideas.

> **Need commercial support or a custom build?**
> If you'd rather hire us to ship something on top of this template, get in touch at **[nuvraxis.com](https://www.nuvraxis.com)**.

## Quick links

- 📘 **[GUIDE.md](../GUIDE.md)** — full customization guide
- 🧠 **[CLAUDE.md](../CLAUDE.md)** — architecture spec
- 🐛 **[Open an issue](https://github.com/) → New issue** — bug reports or feature requests (use the templates)
- 🔒 **Security issues** — email [security@nuvraxis.com](mailto:security@nuvraxis.com), please don't open a public issue

## Getting started

```bash
git clone <your-fork>
cd svelte-app
pnpm install
pnpm supabase:start
pnpm db:reset
pnpm seed:dev --reset
pnpm dev
```

Log in as `alice@novapay.io` / `Demo@1234` to see the demo.

## Running checks locally

Before opening a PR, make sure these all pass — the same checks run in CI on every PR ([`.github/workflows/pr.yaml`](./workflows/pr.yaml)).

```bash
pnpm --filter dashboard exec svelte-check    # type-check (must be 0 errors)
pnpm --filter dashboard exec eslint .         # lint
pnpm test:unit                                # Vitest (19 tests)
pnpm test:e2e                                 # Playwright (23 chromium tests)
```

## Branch & PR conventions

- Branch from `main`. Name branches `<type>/<short-description>` — e.g. `fix/cohort-overflow`, `feat/sso-magic-link`, `docs/clarify-rls`.
- Keep PRs focused. One concern per PR — bug fixes, features, and refactors should be separate.
- Write a clear PR description: what changed, **why**, how you tested it.
- Reference any related issues (`Closes #123`).

## Code style

- **TypeScript everywhere.** No `any` unless you've got a good reason — leave a comment if so.
- **Svelte 5 runes.** Use `$state`, `$derived`, `$props`, `$effect`. Don't reach for `writable()` / `derived()` from `svelte/store`.
- **Semantic tokens, not raw colors.** `bg-card`, `text-muted-foreground`, `border-border` — not `bg-zinc-900`. The compat shim (`bg-brand-500`, `bg-surface-1`, `border-default`) is also fine but new code should prefer shadcn names.
- **No comments unless the *why* is non-obvious.** Names should carry the *what*.
- **Run prettier** before pushing: `pnpm --filter dashboard exec prettier --write .`

## Database changes

If your PR touches the schema:

1. Add a new migration file in `apps/dashboard/supabase/migrations/` with a timestamp prefix. **Never edit existing migrations.**
2. Update RLS policies if needed — see `20260527000001_rls_and_catalog.sql` for the canonical pattern (`SECURITY DEFINER` helpers with `(SELECT auth.uid())` to avoid RLS recursion).
3. Re-run `pnpm db:reset && pnpm seed:dev --reset` locally and confirm everything still works.
4. Regenerate types: `pnpm db:types`.

## What to work on

Open issues are the easiest starting point. If you want to propose something larger (a new module, a refactor, a different chart library, etc.), open a discussion or feature-request issue first so we can align on direction before you spend time on it.

Be kind to other contributors. Disagreement is fine; condescension and personal attacks aren't.
