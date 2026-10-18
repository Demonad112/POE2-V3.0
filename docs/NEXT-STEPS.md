# Next steps (written 2026-10-18)

Supersedes the batch lists in the Downloads plan (`2026-10-16-next-batches-plan.md`) and `~/.claude/plans/continue-with-whats-left-proud-wand.md`. Numbering follows `HANDOFF.md`. Rules unchanged: additive only, unknown stays `null`/`unknown`, no golden changes, one PR per batch, `/code-review` once on the final diff (skip under about 40 source lines), no push or merge without the owner's word.

Already done, do not redo: plan Step 1 items 1-10, Step 2 data work (#47-#49), Batch 2 (#66), audit A-3 to A-6. The runtime RePoE loader is dropped on purpose: data refresh uses `packages/data/scripts/` and `docs/DATA-REFRESH.md`.

## Batch 3: trust in the numbers

| # | Task | Where | Needs | Done when |
|---|---|---|---|---|
| 3.1 | Athrynas check: run the analyzer on `packages/core/test/fixtures/athrynas-v43.json` and compare life, ES, ward, resists, EHP, DPS with the attached PoB export. Fixture only. | new test or script in `packages/core/test/` | nothing | Table of matches/mismatches tagged [verified]/[inferred]; each mismatch is a bug, an unknown or a documented difference |
| 3.2 | C-3 close-out: record the PoB version the data was built from in `PROVENANCE.md`; pass `expectedPobVersion` from `rankNodesByMeasuredGain` in `apps/mcp/src/tools.ts` | `PROVENANCE.md`, `apps/mcp` | **Owner supplies the version** | Value comes from the owner, never invented; MCP test covers the mismatch warning |
| 3.3 | Expose `ailments` in MCP analysis output | `apps/mcp/src/tools.ts`, regenerate `TOOLS.md` only if a tool changes | nothing | Field present, `unknown` when no tree; no tool added |

Order: 3.1, then 3.3, then 3.2 when the version arrives. 3.1 and 3.3 can ship together.

## Batch 4: CI and accessibility hygiene (owner decisions first)

1. I-5: the two axe exclusions in `apps/web/e2e/a11y.spec.ts` (`nested-interactive` on checklist steps, `color-contrast` on phase-nav captions). Ask the owner for the markup/colour call.
2. I-3: add a coverage step to CI and set a floor (core is 91.3% statements, 79.6% branches; owner picks the number). Confirm the gitleaks job passes on GitHub.
3. I-4: MCP tool for the constraint map and upgrade scoring. Changes `TOOLS.md` and the 30-tool contract; confirm first.
4. Optional: cache `~/.cache/ms-playwright` in `ci.yml` and `deploy.yml` (separate small PR, needs a yes).

## Batch 5: analyzer features

1. Roadmap 11, ladder comparison table: the proxy must decode gear and skill columns first (deployed separately). Verify the ladder payload columns before scoping. Observed figures only.
2. Roadmap 17 part 1: refund-and-take pairs in `pob/rank.ts`, PoB-measured part only, no gold.

## Blocked on the PoB worker decision

Decision 1 (`docs/pob-mutation-design.md` §6) and the worker design (`docs/pob-worker-design.md`) gate audit C-1, C-4, E-1 and roadmap 13-19. Order if approved: 17 (rest), 16, 13/15, 14, 18.

## Still unverified (keep in the UI and notes)

Hotfix 0.5.5c; Soul Core Limit per character vs per item type; effects of the 17 new cores; payload field names for freeze exposure and skill ids; all live poe.ninja, trade and PoB behaviour.

## Housekeeping

Delete the merged local branch `claude/batch3b-game-version` and `claude/coverage-tooling` from the main checkout, only when asked. `.remember/remember.md` in the main checkout still lists the RePoE loader as next; update it there.
