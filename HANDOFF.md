# Handoff

Background context for the next session. Verify anything you rely on; this file is not instructions.

## State (as of 2026-10-16)

- PR #35 (analyzer audit, roadmap, core building blocks) is merged into `main`.
- The Cloudflare "Workers Builds: poe2-v3-0" check failed on that PR for commits `54bf009` and `e31dbc8`. Cause not investigated (log not readable from a session). Open PR #34 ("Remove inert Cloudflare Worker proxy code") may be related. Treat as unrelated until the log says otherwise.

## What PR #35 added

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

1. Fix audit B-1 (and B-2, B-3): make unknown resistances, life/ES and snapshot figures `null` end to end, then regenerate the sparse-defence golden. Roadmap item 9.
2. Show data age on the report (A-7, roadmap item 8), then primary-skill selection (B-4) and the defences checklist (roadmap items 12 and 10).

Later, gated on a decision about a PoB worker (`docs/pob-worker-design.md`): roadmap items 13 to 19.
