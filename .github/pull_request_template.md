<!-- Keep this short. Diff + tests do the heavy lifting. -->

## What

<!-- One sentence. -->

## Why

<!-- Bug, design intent, or upstream issue. Link if applicable. -->

## How to verify

<!-- Specific steps a reviewer can run. e.g. "Open /admin/loans, click Issue, ensure …". -->

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` clean
- [ ] `pnpm build` clean
- [ ] Manually exercised the changed surface in dev

## Risk / rollback

<!-- What could regress? How do we revert if it does? -->

## Migration / config / secrets touched?

- [ ] No
- [ ] Yes — described above (migration applied to staging)
