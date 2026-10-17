# Analyzer triage (branch `claude/analyzer-top-tier`)

Method: every claim was checked against the code before a decision. The evidence pack comes from two captured pages and from the reference tool (poemvp.com); none of it was re-verified against live services. Anything needing poe.ninja, pathofexile.com, poemvp.com, a live PoB or the PoE2 patch files is marked **not verified here**.

## Baseline (before any change, 2026-10-17, Node 22.22)

| Check | Result |
|---|---|
| `npm run typecheck` | pass (12.5 s) |
| `npm run lint` | pass (9.4 s) |
| `npm test` core | 48 files, 569 tests, all pass |
| `npm test` web | 12 files, 76 tests, all pass |
| `services/ninja-proxy` tests | 6 pass |
| `npm run build` (core + web static export) | pass (18.6 s) |

## Decision rules

BUILD NOW = S0/S1, or S2 with effort S/M, rule fit, offline-testable. DESIGN ONLY = needs a PoB worker, a server or a new dataset. DEFER = S3 / low value / high risk. REJECT = rule violation, unsupported, or already present.
Scores: value 1-5; effort S/M/L; risk L/M/H. Rule fit and offline-testability are "yes" unless stated.

## Triage

| ID | Claim | Code evidence | Class | Sev (mine / prelim) | Value | Effort | Risk | Decision | Reason |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Simulated deltas need a baseline-reproduction gate | `pob/rank.ts:110` and `pob/sensitivity.ts` read the baseline from the live PoB and never compare it to the export or poe.ninja. `pob/config.ts` only reads config; no resistance-penalty or enemy-level handling. Revert/drift checks exist but test self-consistency, not fidelity | GAP | S0 / S0 | 5 | M | M | **BUILD NOW** | Without it a simulation run under a different resistance penalty (the reference tool's failure) looks authoritative. Config equality cannot be checked (RPC names unverified), so the gate is on stats |
| B2 | No cumulative constraint ledger | `constraints/holding-up.ts` is a single-state snapshot. `recommend/gear.ts:57,260-315` checks caps per recommendation, one at a time. No `ledger` anywhere | GAP | S0 / S0 | 5 | M | M | **BUILD NOW** | Two individually safe trims can together drop a resistance below cap |
| A1 | Unmapped ids (stat_87) count as "major"; banner and double header wrong; no rounding tolerance | `model/breakdowns.ts:212-236` unmapped ids get `confidence:null`; `reconcile/index.ts:135-150` checks them with no filter, as `breakdown:stat_87` via `computeTotal`; `analyze.ts:243-247` banner counts every major including `breakdown-arithmetic` ones that never involve the PoB export. Duplicate: `app/character/page.tsx:326` (summary) and `:327` (badge) both render "N major" inside `Accordion`. Tolerance: relative only, 0.5 % match / 5 % major (`reconcile:35-47`) | DEFECT (present-but-wrong) | S1 / S1 | 4 | S | L | **BUILD NOW** | Partly wrong claim: 52 vs 53 (1.9 %) is already "minor". But 2 vs 3 is 50 % → major from a 1-unit rounding difference, so add an absolute ±1 tolerance. Golden `sparse-defence.expected.json:88` pins banner text and will be regenerated and reviewed |
| A7 | Evade 29 % undocumented | `defense/index.ts:187` `evadeChance ?? 0` (missing shows 0 %, not unknown); rendered `DefensePanel.tsx:162`. Formula `defense/constants.ts:59-71` is never called by `src`; on the Athrynas fixture it gives 34.9 vs ninja/PoB 41. Not reconciled | DEFECT | S1 / S1 | 3 | S | L | **BUILD NOW** | The 29 % is poe.ninja's figure read verbatim. Label it observed, show unknown when absent, reconcile against PoB `EvadeChance`, document that the local formula is a reference that does not reproduce the payload. The reference's 46 % "melee" is not verified here |
| A8 | Cross-validation covers only main-skill DPS | `reconcile/index.ts:102-112` one check, pairing ninja's highest-DPS skill with PoB's selected skill even when names differ (`dps/main-skill.ts` notes it but does not change the pairing). The export carries a single `TotalDPS`; no per-skill DPS (`pob/analyze.ts:162-168`) | DEFECT + GAP | S1 / S1 | 4 | S | L | **BUILD NOW** (pairing) / **DESIGN ONLY** (all skills) | Compare PoB's selected skill with ninja's same-named skill; when names differ say "not compared". Listing every skill in both sources needs `getFullDps` via the transport (`bridge.ts:179`). The Staggering Palm 12.2k vs 7.3k difference is the reference's config, not in this repo's data |
| A3 | Lowest-value support uses nominal figures | `recommend/damage.ts:378-390` names the lowest `supportValue` ("by the gems' own figures"). `supportValue` (`gems/catalog.ts`) excludes area, so Concentrated Area is "utility" and is never the weakest in code; the +30 % in the evidence is the nominal chip. No gem-removal RPC exists (bridge has only passive node and custom-mods simulation) | DEFECT | S1 / S0 | 5 | S | L | **BUILD NOW** (label, stop naming) / **DESIGN ONLY** (removal simulation) | Nominal path stops naming a weakest gem and says "nominal, not measured". Removal sim needs an injected probe with an unconfirmed addon RPC; interface and design only |
| A5 | Findings 4 and 5 recraft the same suffix | `recommend/gear.ts:232` emits one `gear-swap-<type>` per resistance shortfall, each taking `usable[0]`; no cross-type dedupe (`mergeGearRecommendations` at `:333-348` only drops the generic rec). "Soul League" does not appear in the repo | DEFECT | S1 / S1 | 4 | S | L | **BUILD NOW** | Group by (slot, mod id) into one decision whose options are ordered by closable gap |
| A4 | Ailment immunities read gear lines only | `defense/ailments.ts:44-57` reads active item mod text only. I decoded all 106 PoB `PlayerStat` keys in the fixture: none carries immunity or avoidance | DEFECT | S1 / S1 | 3 | M | L | **BUILD NOW** (tree sources) / **REJECT** (PoB outputs) | Read allocated passive text and ascendancy text through `tree/`. "From PoB outputs" has no verified field; keep unknown, mark not verified here (the reference's PoB shows "cannot be stunned" from a source not in the stat list) |
| A2 | Tree data missing 3 nodes; update to patch 0.5.5 | Data is `PassiveTree-0.5` with no patch/date; PROVENANCE only asserts "unchanged by 0.5.5". `tree/index.ts:240-266` `unresolvedIds` covers the live set only; set1/set2 misses are dropped silently. The source tree (`psg_passive_nodes.json`) is not in the repo or the sandbox; `build-tree.mjs` needs an external checkout. Test covers Athrynas only | GAP | S1 / S1 | 4 | M | L | **DESIGN ONLY** (data update) / **BUILD NOW** (report) | Data cannot be obtained offline, so no refresh. Build: report unresolved ids for all three sets as a core warning, and a test that fails on any unresolved id in every fixture present. Record "version unverified" in PROVENANCE |
| B3 | Provenance label on every number | `model/types.ts:15-24` `Provenance` = ninja / pob-sim / pob-export / estimate; `PobAnalysis.provenance:'pob'` is outside the union; no web component renders a source | GAP | S1 / S1 | 4 | M | M | **BUILD NOW** | Add observed / derived / nominal / unknown, a `ProvenanceBadge`, and apply it to evade, max hits, gem values and implied resistance. Do not retrofit the whole UI (scope) |
| B4 | Golden fixtures for Yykiuy and Athrynas L94 | No Yykiuy anywhere. Repo fixture `athrynas-v43.json` is **level 86**, captured 2026-07-24, not 94. Goldens are patch-based (`golden.test.ts`); no shared loader; no `skipIf` use | GAP | S1 / S1 | 4 | S | L | **BUILD NOW** | Shared loader plus `describe.skipIf(!exists)` tests holding the evidence-pack expectations. The level-94 capture is a different payload from the one in the repo |
| A9 | Elemental max hits imply resistances ~3 below displayed | No implied-resistance code or tests; max hits are read from poe.ninja, never derived | GAP | S2 / S2 | 3 | S | L | **BUILD NOW** | Pure `impliedResistance(pool, maxHit)` returning a range, labelled derived; pool/(1 - res) tested against the fixture. If the fixture cannot establish the pool, return unknown. Inference only, not a correction |
| D1 | Weapon-set-2 skills not read from the PoB export | `model/slots.ts:193` fixed message; `pob/export.ts` does not parse `<Skills>`; `pob/main-skill.ts` reads the main group only | GAP | S2 / S2 | 4 | M | L | **BUILD NOW** | Parse every skill set and group from the export. Map to weapon sets only where the XML states it, otherwise report "PoB skill groups, weapon set not stated". Item-granted skills (Spear Stab etc.) come from the item, not gems |
| A6 | "grants Grants Skill" | No source string produces it; `CharacterNotes.tsx:62` prints ` (grants ${names})` and `model/slots.ts:170-175` takes `grantedSkills[].name` verbatim, so a payload name "Grants Skill: X" would duplicate | DEFECT | S3 / S3 | 1 | S | L | **DEFER** | S3, depends on payload text I do not have; the fix is a one-line prefix strip |
| C1 | Measured per-finding gain (weapon) | `recommend/index.ts` `weaponTierRule` is an item-level-lag heuristic. No item-mutation RPC in the bridge | GAP | S2 / S2 | 5 | L | M | **DESIGN ONLY** | Needs item mutation through the worker (`docs/pob-worker-design.md`) |
| C2 | Anoint ranking | `anointRule` only flags "no anoint" at level 30+ (fixed significance 0.45) | GAP | S2 / S2 | 4 | L | M | **DESIGN ONLY** | Needs measured gain plus an economy source for cost; neither exists |
| C3 | Gem quality / rune / soul-core swaps | `gear/audit.ts` reports empty rune sockets and gem quality; no swap suggestions | GAP | S2 / S2 | 4 | L | M | **DESIGN ONLY** | Needs measurement and costs |
| C4 | Passive suggestions and respec with gold cost | `tree/suggest.ts` (`suggestNodesForStat`) already ranks per point; respec absent; `pob/rank.ts` reports null when PoB shows no change | GAP (suggestions ALREADY PRESENT) | S2 / S2 | 4 | L | M | **DESIGN ONLY** | Specify the "unmeasurable" guard (penetration / conditional / utility nodes excluded from refund plans); no gold data |
| C5 | Unique swaps with per-resistance drop warnings | Absent; depends on B2 | GAP | S2 / S2 | 4 | L | M | **DESIGN ONLY** | Needs a unique-item dataset; the ledger from B2 is the reusable piece |
| C6 | Obtainability filter | Lineage supports are already kept out of swap ranking (`damage.ts` `lineageOptions`, `duplicateFamilyNotes`); trade module says "Prices are not estimated"; bases carry an `obtainable` flag | ALREADY PRESENT (mostly) | S2 / S2 | 3 | M | L | **REJECT** | The reported behaviour (450-divine lineage gem as a primary action) is the reference tool's. No economy source exists, so no prices are shown; prices stay "unpriced" |
| C7 | Mapping/Bossing modes, score, sensitivity | `upgrade/scoring.ts:4` `w_d·ln(D1/D0) + w_s·ln(S1/S0) [+ w_c·ln(C1/C0)]`; survivability = weighted geometric mean of smallest max hit and EHP; `HIT_WEIGHT` mapping 0.25 / bossing 0.75; `recommend/focus.ts`; `pob/sensitivity.ts` with fake-transport tests | ALREADY PRESENT | – / S2 | – | – | – | **REJECT** | Present and tested. Judgement constants are noted in HANDOFF; justification written below |
| D2 | Trade-search builder | `trade/query.ts` has exact / wider / best-value over an injected `TradeStatMap`; `PROVENANCE.md` has no trade mapping; tests are explicit cases, no snapshots | GAP | S2 / S2 | 3 | M | L | **DESIGN ONLY** | No provenanced stat-id mapping exists. Constraints from B2 are the input once built |

### C7 justification on record

Survivability is the weighted geometric mean of the smallest max hit and EHP. One-shot-first fits this app because the observed ceiling is the lowest max hit, which is what ends a run. Mapping weights hits 0.25, bossing 0.75. These are judgement constants, not measured; they stay labelled as such.

## Discovered (not built)

| # | Finding | Sev | Note |
|---|---|---|---|
| X1 | Other poe.ninja fields use `?? 0` (not only evade) | S1 | Sweep `defense/index.ts` for missing values shown as zero |
| X2 | `PobAnalysis.provenance: 'pob'` is outside the `Provenance` union | S3 | Fix inside B3 where touched |
| X3 | `physicalTakenAs` typed but unused | S3 | Dead field |
| X4 | No reader for the export's resistance penalty or enemy level (`pob/config.ts`) | S1 | Needed to prove or disprove the reference's -50 % penalty cause; design in the PoB worker doc |
| X5 | `holdingUp` covers resistances, Spirit and attributes from the PoB export only; movement speed and anoint absent | S2 | Extend when the ledger lands |
| X6 | The web UI never shows `unmappedIds` | S3 | Surfaced only through a recommendation (`unmapped-stat-ids`) |
| X7 | `docs/DATA-REFRESH.md` has no tree-version check | S2 | Add a Royal-Lenience-style guard for the passive tree |
| X8 | Mismatch between the user's "Athrynas L94" and the repo's L86 fixture | S3 | Both stay; the L94 test is pending |

## Build order

S0: B1, B2. S1 (lower effort first): A5, A7, A1, A8, A3, A2 report, B4, A4, B3. S2: A9, D1. One commit per item with tests.
