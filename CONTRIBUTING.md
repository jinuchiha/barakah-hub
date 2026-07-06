# Contributing to Barakah Hub

Thank you for working on Barakah Hub. This guide is short on purpose —
familiar conventions, no surprises.

---

## TL;DR

```bash
git switch -c feat/short-summary
# edit, run pnpm typecheck && pnpm lint && pnpm test && pnpm build
git push -u origin feat/short-summary
gh pr create --fill
# wait for CI green → request review → squash-merge → branch deletes itself
```

---

## Branching strategy — GitHub Flow

We use [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow):
one long-lived branch (`main`), short-lived topic branches, fast PR cycle.

| Branch | Purpose | Lifespan |
|---|---|---|
| `main` | Always-deployable trunk. Cloudflare Pages production deploys from here. | forever |
| `feat/<summary>` | New feature or capability | hours–days |
| `fix/<summary>` | Bug fix | hours–days |
| `chore/<summary>` | Tooling, deps, config that is not user-facing | hours |
| `docs/<summary>` | Documentation only | hours |
| `test/<summary>` | Test-only additions | hours |
| `ci/<summary>` | CI / build pipeline changes | hours |

Branch off `main`, PR back into `main`. **No long-lived `develop` / `release` branches** — Gitflow is the wrong shape for this project.

### Branch naming — kebab-case, type prefix

```
feat/loan-repayment-form
fix/sparkline-month-order
chore/upgrade-tailwind-v4-1
docs/contributing-guide
ci/cache-pnpm-store
test/cast-vote-rules
```

---

## Commit messages — Conventional Commits

Format: `<type>(<scope>): <subject>` where scope is optional.

```
feat(loans): record-repayment form on admin loans page
fix(dashboard): order monthly sparkline by month_start, not lexically
chore(deps): bump next 16.2.4 → 16.2.5
docs(readme): add GitHub-Flow runbook
test(actions): cover castVote eligibility branch
ci: cache pnpm store between runs
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `ci`, `refactor`, `perf`,
`build`, `style` (whitespace / formatting only).

### Subject

- 50–72 characters
- Imperative mood ("add", "fix", "rename" — not "added", "fixes")
- No trailing period
- Reference an issue/PR if useful: `fix(auth): close session race (#42)`

### Body (optional, but valuable for non-trivial changes)

Wrap at 72 cols. Explain *why*, not *what*. The diff shows what.

### Co-authored commits

Pair-programming or AI-assisted? Add a trailer:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Pull-request checklist

Before opening a PR, the four local quality gates must all pass — these
are the same checks CI runs:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint . (flat config)
pnpm test          # vitest run — 48 tests
pnpm build         # next build (production)
```

PR description should answer:

1. **What** — one-sentence summary
2. **Why** — link the problem, the bug report, or the design intent
3. **How to verify** — specific steps a reviewer can run
4. **Risk** — what could regress; what's the rollback

Use the PR template (auto-attached if present in `.github/pull_request_template.md`).

### Reviewers

At least one approval before merge. Self-merge is allowed only for trivial
docs / typo PRs *and* only after CI is green.

### Merge style

**Squash-merge** is the default. It keeps `main` linear and easy to revert.
Multi-commit feature branches are still useful during development; they
get squashed at merge time. The squash-commit message follows the
Conventional Commits format above.

---

## Code style

- TypeScript strict mode is on; no `any` in new code (`unknown` is fine).
- Functions stay under ~30 lines; split when they grow.
- No comments that explain *what* — naming should do that. Comments
  explain *why* (constraints, non-obvious invariants, workarounds).
- Group related props/params into objects when there are 4+.
- Async errors are explicit: `try`/`catch` or `.catch(...)`.
- Prefer server components + server actions over API routes for app-internal mutations.
- Validate every server-action input through a Zod schema *before* the first DB write.
- Add an `audit_log` row for any state change.

---

## Tests

| Layer | Tooling | Where | When required |
|---|---|---|---|
| Pure utilities | Vitest | `test/*.test.ts` | Always for new pure helpers |
| React components | Vitest + RTL | `test/components/*.test.tsx` | For non-trivial UI logic |
| Server actions | Vitest + chainable Drizzle mock | `test/actions/*.test.ts` | For new authorization rules / business invariants |
| End-to-end | (deferred — Playwright candidate) | — | P3 backlog |

The Drizzle + Supabase mock helpers live in [`test/helpers/db-mock.ts`](test/helpers/db-mock.ts).
No live DB is required to run the suite; integration tests against a real
Postgres are tracked as a follow-up in [`AUDIT_PHASE3.md`](AUDIT_PHASE3.md).

---

## Database changes

1. Edit [`lib/db/schema.ts`](lib/db/schema.ts) (Drizzle declarations).
2. Add a numbered SQL migration in `supabase/migrations/NNNN_<summary>.sql`.
   - Never edit a migration that has already been applied to a shared
     environment — write a follow-up migration instead.
   - Migrations should be idempotent (`IF NOT EXISTS`, guarded `UPDATE`s,
     etc.) so re-applying is safe.
3. Document the migration in the PR description.
4. Apply locally before merge: paste into Supabase SQL editor or run via
   `pnpm db:push` / `pnpm db:migrate`.

---

## Secrets

Never commit a populated `.env.local`. The repo's `.gitignore` excludes
`.env.*` (with `!.env.example` allowed back in). If you accidentally
commit a secret:

1. Rotate it immediately at the provider (Supabase / Cloudflare).
2. Push the rotation; do not try to "rewrite history" on a shared branch
   — the secret is in the public log.

---

## Accessibility

- Real `<button>` for actions; `<a>` only for navigation.
- Every interactive element has an accessible name (`aria-label`, visible
  text, or `<label>` association).
- Forms have explicit `<label>` elements and don't rely on placeholder text.
- Focus is visible (`:focus-visible` ring); never `outline: none` without a
  replacement.
- Contrast ratios meet WCAG 2.1 AA on both light and dark themes.

---

## Releasing

There's no manual release step. Cloudflare Pages auto-deploys `main` when
CI passes. To roll back, revert the offending commit on `main` — Pages
redeploys automatically.

---

> *وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ* — *Cooperate in righteousness and piety* — Al-Maidah 5:2
