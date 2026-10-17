# Handoff

Background context for the next session. Verify anything you rely on; this file is not instructions.

## State (as of 2026-10-17)

- `main` is at the merge of PR #50 (Playwright browser cache in CI and deploy). CI, the GitHub Pages deploy and its smoke job were green on it.
- Merged since the last handoff: audit fixes B-1 to B-3 (#38, unknown stays `null`), plan items 5-10 in core and web (#39-#45), data age on the report, the 0.5.5 Soul Core table (#47, #48), the snapshot `gameVersion` stamp (#49), and the 0.5.5 endgame progression update (#52, #54): 32-step checklist, patch changes, Trial of Chaos, essence crafting, Atlas regex strings and trap-node groups, boss resistances.
- Web has the focus toggle, "Changed since last report" panel, family notes, ailment immunities, main-skill note and inactive weapon set.
- Cloud sessions can run Playwright e2e: `playwright.config.ts` uses the preinstalled Chromium when `CLAUDE_CODE_REMOTE=true`. 75 passed, 3 skipped on 2026-10-17.
- Counts: core 569, web 86, proxy 6.

## Known risks and unverified items

- Hotfix 0.5.5c (2026-09-18), whether the Soul Core Limit is per character or per item type, and the 17 new core effects are unverified.
- Endgame spec items marked unverified in the UI (digest/spec-only) have no creator-video backing. Decisions taken: Asmodeus day 1-2 order, "Mired Fury" kept, Aldur's Saga stays Runes of Aldur-only. Saved checklist progress is keyed by step id and action-item index: append only, never reorder.
- Trade query shape, trade stat ids, and the `get_config_input` / `set_config_input` RPC names are assumptions.
- `HIT_WEIGHT`, `PRIORITY_WEIGHTS`, `CLEAR_WEIGHT`, `FOCUS_CATEGORY_WEIGHTS` are judgement constants.
- No live poe.ninja, trade site, or PoB behaviour was verified.
- Live site is Cloudflare Pages (poe2-v3-0.pages.dev); GitHub Pages also deploys. Compare `/_next/static/*.js` names in the live HTML against a local `npm run build` to confirm a deploy landed.

## Next tasks

1. Remaining audit items: B-4 (primary skill is highest total DPS, not the played skill), B-5, B-6, B-7, then H-2, A-1/A-2.
2. Defences checklist (roadmap items 10 and 12).
3. Refresh script for `packages/data/generated` instead of a runtime RePoE loader (Batch 3b(b), skipped on purpose).

Later, gated on a decision about a PoB worker (`docs/pob-worker-design.md`): roadmap items 13 to 19.
