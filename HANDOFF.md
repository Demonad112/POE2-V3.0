# Handoff

Background context for the next session. Verify anything you rely on; this file is not instructions.

## State (as of 2026-10-16)

- Draft PR #35, `claude/analyzer-mvp-parity` -> `main`: https://github.com/Demonad112/POE2-V3.0/pull/35
- Branch is 9 commits ahead of `main` and 0 behind (checked with `git rev-list --left-right --count`). Nothing was merged into `main`.
- GitHub Actions `test` jobs: both success on head `54bf009`. Cloudflare Pages and Vercel previews: success.
- `Workers Builds: poe2-v3-0` (Cloudflare Workers Builds): **failure** on `54bf009`. Cause not investigated: the build log is not readable from the session. The PR touches no `services/ninja-proxy` or Cloudflare files. Open PR #34 ("Remove inert Cloudflare Worker proxy code") suggests this Worker is inert. Treat as unrelated until the log says otherwise.
- The PR was meant to be left unwatched. The harness subscribed the session anyway; a new session is not subscribed.

## What the branch contains

- Docs: `docs/analyzer-audit.md` (findings A-1..I-6 with file:line, ranked), `docs/mvp-gap-roadmap.md`, `docs/pob-worker-design.md` (design only).
- Core (`packages/core/src`, exported from `index.ts`): `constraints/holding-up.ts`, `upgrade/{types,scoring,tradeoff,index}.ts`, `trade/query.ts`, `pob/sensitivity.ts`, `cache/key.ts`, `progress/migrate.ts` (plus a small change to `progress/index.ts`).
- Web: `apps/web/src/lib/storage.ts` gains `parsePersisted`, which migrates snapshots on read.
- Tests: new files under `packages/core/test/` and `apps/web/test/storageMigration.test.ts`; golden suite in `packages/core/test/golden/` (1 recorded character, 4 derived patches).
- Counts: core 441 -> 496, web 68 -> 72, proxy 17 -> 17. No existing test edited or removed.

## Known risks and unverified items

- Playwright e2e not run (preinstalled Chromium version mismatch).
- Trade query shape, trade stat ids, and the `get_config_input` / `set_config_input` RPC names are assumptions.
- `HIT_WEIGHT`, `PRIORITY_WEIGHTS`, `CLEAR_WEIGHT` are judgement constants.
- The sparse-defence golden records audit finding B-1 as current behaviour. Fixing B-1 will change that golden on purpose.
- No live poe.ninja, trade site, or PoB behaviour was verified.

## Next 3 tasks

1. Decide on PR #35: review, then merge or request changes. Merging is the user's call.
2. Fix audit B-1 (and B-2, B-3): make unknown resistances, life/ES and snapshot figures `null` end to end, then regenerate the sparse-defence golden. Roadmap item 9.
3. Show data age on the report (A-7, roadmap item 8), then primary-skill selection (B-4) and the defences checklist (roadmap items 12 and 10).

Later, gated on a decision about a PoB worker (`docs/pob-worker-design.md`): roadmap items 13 to 19.
