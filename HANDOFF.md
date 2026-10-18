# Handoff

Background context for the next session. Verify anything you rely on; this file is not instructions.

## State (as of 2026-10-17)

- `main` includes PR #57 (design only: PoB mutation RPCs, gem-removal sim, trade stat mapping, per-skill DPS) and PR #58 (audit B-4 / roadmap 12: primary skill prefers the PoB export's main skill). The audit's remaining items B-5, B-6, B-7, H-2, A-1, A-2 and I-1 are done on branch `ccr-17ce96af-0bnpf4` (draft PR); see below.
- Web work (#52, #54, #55) and the analyzer/design work (#57, #58) now run in one session.
- Merged since the last handoff: audit fixes B-1 to B-3 (#38, unknown stays `null`), plan items 5-10 in core and web (#39-#45), data age on the report, the 0.5.5 Soul Core table (#47, #48), the snapshot `gameVersion` stamp (#49), and the 0.5.5 endgame progression update (#52, #54): 32-step checklist, patch changes, Trial of Chaos, essence crafting, Atlas regex strings and trap-node groups, boss resistances.
- Web has the focus toggle, "Changed since last report" panel, family notes, ailment immunities, main-skill note and inactive weapon set.
- Cloud sessions can run Playwright e2e: `playwright.config.ts` uses the preinstalled Chromium when `CLAUDE_CODE_REMOTE=true`. 77 passed, 3 skipped on 2026-10-17.
- Counts: core 669 (7 skipped, 3 todo), web 92, proxy 13. e2e re-run on this branch: 81 passed, 3 skipped.
- Design docs, no runtime code: `docs/pob-mutation-design.md` (C1-C5, A3, D2, A8; 13 open assumptions in §5, 12 owner decisions in §6, build order in §7) with type-only interfaces in `packages/core/src/pob/{mutation,support-removal,trade-stat-map,per-skill-dps}.ts` and 15 compile-time tests. Decision 1 (addon route: extend, fork or headless wrapper) gates all PoB mutation work.

## This branch (audit batch)

- B-5: `planReplacement`, `removalDeficits` and `rankReplacements` take the `AttributionReport` (required). What an item holds up comes from poe.ninja's breakdown, so rune, implicit and enchant resistance now count. A resistance whose breakdown is not `trustworthy` is unknown: no impact entry, a note on the plan, `removalCostUnknown` on the ranking row. `resistancesFrom` is replaced by `resistanceGrants`.
- B-6: offence grades, `OFFENCE_WEIGHT` and the A/B/C tier cutoffs moved to `thresholds.ts`. B-7: `analyzeFromPob` tags `pob-export`.
- H-2: `parsePersisted` salvages each slice of a payload from another storage version, validated by shape, instead of resetting. No version-to-version migrations exist yet; add one when the shape changes. A newer app's payload is read by an older one and rewritten without its unknown fields.
- A-1: User-Agent is a public repo URL (`UPSTREAM_CONTACT` / `POE2_UPSTREAM_CONTACT` override it), never an email. The browser client sends none. A-2: retry on 429/503 (proxy also 502/504), `Retry-After` honoured up to 2 s (proxy) / 5 s (client); proxy edge cache `s-maxage=300`. No ETag handling.
- I-1: README counts updated. Snapshots already carry a `schema` field (`progress/migrate.ts`); an earlier version of this file said they did not.

- Batch 2: C-2 (call budget + `AbortSignal` on the bridge and ranking), C-3 (`version()`, `RankReport.pobVersion`, `expectedPobVersion`), H-3 (chat key in `sessionStorage`), I-3 secret scan (gitleaks job in `ci.yml`, not yet run on GitHub). I-5: `e2e/a11y.spec.ts` (axe) added; two known rules excluded in the spec (`nested-interactive` on checklist steps, `color-contrast` on phase-nav captions), both need a design call. A-7 was already shown in `CharacterHero`.

## Known risks and unverified items

- Hotfix 0.5.5c (2026-09-18), whether the Soul Core Limit is per character or per item type, and the 17 new core effects are unverified.
- Endgame spec items marked unverified in the UI (digest/spec-only) have no creator-video backing. Decisions taken: Asmodeus day 1-2 order, "Mired Fury" kept, Aldur's Saga stays Runes of Aldur-only. Saved checklist progress is keyed by step id and action-item index: append only, never reorder.
- Trade query shape, trade stat ids, and the `get_config_input` / `set_config_input` RPC names are assumptions. Every new RPC name in `docs/pob-mutation-design.md` is an assumption too; no trade stat id is stated anywhere and `trade-stat-map.json` does not exist yet.
- B-4 matches the export's main skill to a payload skill by name only.
- `HIT_WEIGHT`, `PRIORITY_WEIGHTS`, `CLEAR_WEIGHT`, `FOCUS_CATEGORY_WEIGHTS` are judgement constants.
- No live poe.ninja, trade site, or PoB behaviour was verified.
- Live site is Cloudflare Pages (poe2-v3-0.pages.dev); GitHub Pages also deploys. Compare `/_next/static/*.js` names in the live HTML against a local `npm run build` to confirm a deploy landed.

## Next tasks

1. Audit items still open (2026-10-18, after PR #68): C-1 and E-1 (need a PoB worker), C-4 (needs a config RPC on the bridge), A-2 ETag handling (not implemented), H-4 bundle profiling, and `scoreUpgrade` exposure over MCP (needs before/after profiles). Done: F-2, I-3 (coverage floor 90/75 in CI), I-4 (`poe2_constraint_map`, 31 tools), both a11y exclusions (axe `KNOWN` set is empty), A-3 to A-6 (verified in code). See `docs/analyzer-audit.md`.
2. Roadmap item 12 / audit B-4 is done: `primary` is the export's main skill when it is a hit skill, else highest DPS (`DpsSummary.primarySource`). The defences checklist (item 10) is done in web: `lib/defenceChecklist.ts`, shown above the character notes; it restates existing figures and reports unknown where the payload cannot settle a check.
3. The runtime RePoE loader (Batch 3b(b)) is dropped on purpose; data refresh uses `packages/data/scripts/` and `docs/DATA-REFRESH.md`.
4. Ailment immunity (item 5) is wired into `Analysis.ailments`, the web defences checklist and character notes; freeze exposure stays unknown. Main-skill matching (item 6) is by name and says so. Checked 2026-10-18.

Detailed plan with batches 3 to 5: `docs/NEXT-STEPS.md`.

Later, gated on a decision about a PoB worker (`docs/pob-worker-design.md`): roadmap items 13 to 19.
