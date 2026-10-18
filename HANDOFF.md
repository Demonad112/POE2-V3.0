# Handoff

Background context for the next session. Verify anything you rely on; this file is not instructions.

## State (as of 2026-10-18)

- `main` is at `bb251d1`: PR #66 (Batch 2: chat key storage in `lib/chatSettings.ts`, with migration tests, plus the audit A-3 to A-6 and charModel guard commits) was merged by the owner.
- Batch 2 status: C-2 (call budget and `AbortSignal`) and I-5 (`e2e/a11y.spec.ts`) are in code and tested. H-3 is done. I-3 has coverage tooling (`test:coverage` in core, 91.3% statements) and a gitleaks job in `ci.yml`, which has not run on GitHub. C-3 is only half done (see Batch 3).
- Remote branches from before 2026-10-18 have been deleted. Only `main` and the merged `Claude/remaining-batches-plan-5965c6` remained on `origin`. Local: `claude/coverage-tooling` is checked out in the main checkout and can be deleted from there once switched.
- Counts (2026-10-18): core 684 passed, 7 skipped, 3 todo. web 97 passed. ninja-proxy 0 failures. e2e not re-run since the chat storage change.
- Design docs, no runtime code: `docs/pob-mutation-design.md` and `docs/pob-worker-design.md`. Decision 1 (addon route: extend, fork or headless wrapper) and the worker decision gate all PoB mutation work.

## Known risks and unverified items

- Hotfix 0.5.5c (2026-09-18), whether the Soul Core Limit is per character or per item type, and the 17 new core effects are unverified.
- Endgame spec items marked unverified in the UI (digest/spec-only) have no creator-video backing. Saved checklist progress is keyed by step id and action-item index: append only, never reorder.
- Trade query shape, trade stat ids, and the `get_config_input` / `set_config_input` RPC names are assumptions. `trade-stat-map.json` does not exist yet.
- B-4 and item 6 match the export's main skill to a payload skill by name only.
- `HIT_WEIGHT`, `PRIORITY_WEIGHTS`, `CLEAR_WEIGHT`, `FOCUS_CATEGORY_WEIGHTS` are judgement constants.
- No live poe.ninja, trade site, or PoB behaviour was verified.
- Live site is Cloudflare Pages (poe2-v3-0.pages.dev); GitHub Pages also deploys.

## Next batches

Order is by value to the user and by how much needs an owner decision. Each batch follows the poe2-plan-item flow: branch off `main`, implement, gate, one review, PR.

### Batch 3: trust in the numbers (no owner input needed except the version source)

1. **C-3 close-out.** Record the PoB version the data was built from in `packages/data/PROVENANCE.md` and pass `expectedPobVersion` from `apps/mcp` (`rankNodesByMeasuredGain` call in `tools.ts`). Owner must supply the version: nothing in `packages/data` records one today. Do not invent it.
2. **Item 5 follow-up.** Wire ailment immunity and freeze exposure into the defence output. Today the field names are unverified and the output does not use them.
3. **Item 6 and 7 follow-up.** Match the export's main skill by id if the payload carries one; otherwise keep name matching and label it as such.

### Batch 4: CI and accessibility hygiene (needs owner decisions first)

1. **I-5.** Resolve the two axe exclusions in `apps/web/e2e/a11y.spec.ts`: `nested-interactive` on checklist steps and `color-contrast` on phase-nav captions. Each needs a design call. Ask the owner before changing either.
2. **I-3.** Add a coverage step to CI and set a floor (owner picks the number; core is at 91.3% statements, 79.6% branches). Confirm the gitleaks job passes on GitHub. The gitleaks action may need a licence for an organisation account.
3. **I-4.** MCP tool for the constraint map and upgrade scoring. This changes `apps/mcp/TOOLS.md` and the 30-tool contract, so confirm before adding it.

### Batch 5: analyzer features (medium)

1. **Item 11, ladder comparison table.** Needs the proxy to decode gear and skill columns from the ladder rows. Proxy change, deployed separately from the site. Show observed figures only.
2. **Item 17 part 1, per-point value and respec planning without gold.** Extend the existing `pob/rank.ts` ranking with refund-and-take pairs. Only the PoB-measured part, not gold cost.

### Blocked: PoB worker (owner decision)

- Decide on a PoB worker (`docs/pob-worker-design.md`, roadmap item 19). Until then items 13 to 16 and 18, and audit C-1 and E-1, cannot start. Decide whether the static site stays static (no worker) or a separate service is acceptable.
- If the worker is approved, the order from the roadmap is: 17 (rest), 16, 13/15, 14, 18.

## Recommended order

1. Batch 3 (C-3 needs the owner's PoB version).
2. Batch 4 after the owner answers the a11y, coverage and I-4 questions.
3. Batch 5.
4. Worker decision, then the blocked items.
