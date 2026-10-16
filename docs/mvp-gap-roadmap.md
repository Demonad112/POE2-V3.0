# Gap roadmap against the reference tool

The reference (PoE MVP) is described only from its public pages. Items marked (inferred) are guesses, not confirmed behaviour. Nothing here copies its code, text or branding; the proposals are this repo's own designs.

Effort: S = a day or less, M = a few days, L = needs infrastructure or an external dependency.
"Fits rules?" refers to the repo rules: no invented numbers, nothing recomputed that poe.ninja computed, simulated values labelled `pob-sim`, pure core, static web.

## A. Pure core logic (no PoB transport, no server)

Ranked by value per effort.

| # | Capability | Reference behaviour | This repo today | Gap | Proposal | Effort | Risk | Fits rules? |
|---|---|---|---|---|---|---|---|---|
| 1 | "What each item is holding up" | Resists that would drop under cap, Spirit needed, attributes needed, movement speed, anoint, item defences | Pieces exist but are split: attribution (`model/attribution.ts`), attribute and Spirit audit from the PoB export (`gear/audit.ts`), overcap in `defense` | No unified typed map; no per-item "minimum to keep"; anoint missing | `constraints/holding-up.ts` (built in this branch) | S | Low | Yes: arithmetic on poe.ninja or PoB-export figures, each tagged by source |
| 2 | Typed report schema for upgrade cards | Cards with gain, trade-off line, keep/needed/replaces, caveats, not-evaluated list | `Recommendation` has trade-off, evidence, provenance; no DPS/survivability split, no assumptions, no not-evaluated list | Schema | `upgrade/types.ts`, observed vs PoB-simulated enforced by a discriminated union (built) | S | Low | Yes: a simulated card cannot be built without PoB version and config hash |
| 3 | Trade search builder with three variants | Exact target, Wider, Best value | None | Builder | `trade/query.ts` with an injected stat-id map (built) | S | Medium: query shape and stat ids are not verified against the live trade site | Yes, with unmapped stats reported rather than guessed |
| 4 | Mode and priority scoring | Mapping vs Bossing, three priorities; formula unpublished | Rank by hand-set significance over cost | Scoring | Log-ratio score, explicit survivability definition (built) | S | Medium: mode and priority weights are judgement | Yes: weights declared as judgement; no-data gives range or unknown |
| 5 | Sensitivity ranges (beats the reference) | Point estimates (inferred) | Config is parsed but never varied | Range under toggled conditions | `pob/sensitivity.ts` over an injected probe (built) | M | Medium: the config RPC is unverified | Yes: labelled `pob-sim`, unknown when not measurable |
| 6 | Content-hash cache key and versioned storage | Content-keyed cache, 7-day retention | None; storage resets on version change | Key and migration | `analysisCacheKey`, `migrateSnapshots` (built) | S | Low | Yes |
| 7 | Golden regression suite (beats the reference, which shows none) | Not visible | One recorded fixture, behavioural tests | Fixtures plus expected outputs | Recorded plus derived goldens run in the normal `npm test` (built) | S | Low | Yes |
| 8 | Data age on the report | Caveats shown | `updatedUtc` captured, never shown | UI | Show profile age and warn when old | S | Low | Yes |
| 9 | Zero-for-unknown cleanup | n/a | B-1, B-2, B-3 in the audit | Bug | Make unknown resists, life and snapshot figures `null` end to end | M | Medium: changes types used across web and MCP | Yes, and required by "never invent a number" |
| 10 | Defences checklist | Resists under cap, max-hit risk, freeze exposure, immunities | Resists, max hit, one-shot ratio exist; freeze exposure and ailment immunities do not | Two checks | Read ailment-immunity stats from the payload if present; otherwise "unknown" | S | Medium: field names unverified | Yes if read from payload only |
| 11 | Ladder comparison table | "What, ladder uses it %, for you" | Quartile bands for DPS, EHP, pool only | Per-item and per-gem usage | Needs the ladder rows to carry gear and skills; the proxy decodes only some columns | M | Medium | Yes: observed figures only |
| 12 | Better primary-skill selection | Uses the exported main skill | Highest total DPS (B-4) | Selection | Prefer the skill PoB marks as main when the export is present | S | Medium | Yes |

## B. Needs the PoB transport or a server worker

| # | Capability | Reference behaviour | This repo today | Gap | Proposal | Effort | Risk | Fits rules? |
|---|---|---|---|---|---|---|---|---|
| 13 | Affix ablation | Remove each affix in PoB, measure loss | Passive node simulation only | Item-level mutation | Needs an item RPC or custom-mod stand-in; design in `pob-worker-design.md` | L | High | Yes if labelled `pob-sim` |
| 14 | Candidate generation | Every rollable mod, best that fit free slots, one per family | Mod pools exist in `mod-tiers.json`; no simulation | Generator plus simulation | Greedy baseline as in the reference ignores interactions; instead evaluate pairs for the top few candidates and re-simulate the final item together | L | High | Yes |
| 15 | Simulate the finished example item | Against current gear | None | Simulation | As 13 | L | High | Yes |
| 16 | Support gems in every socket | Grouped by family | Static review (`recommend/damage.ts`) | Measured gain | PoB loop per support | L | Medium | Yes |
| 17 | Passive notables per point, respec plans | Per-point value, gold cost | Per-point PoB ranking exists (`pob/rank.ts`); no respec or gold | Respec | Extend with refund-and-take pairs | M | Medium | Yes; gold cost only if the data carries it |
| 18 | Anoints, runes, soul cores, gem level and quality, uniques, jewels | Evaluated | Only audits | Evaluators | Each as a PoB loop | L | Medium | Yes |
| 19 | Job queue, position display, result cache, retention | About 54 s per analysis in their example | None | Server | Design only (`pob-worker-design.md`); static hosting cannot run it | L | High | No for the static site; yes as a separate service |

## C. Do not build

| Capability | Why not |
|---|---|
| Recomputing DPS from poe.ninja inputs | Violates "never recompute what poe.ninja computed". |
| Grading damage without a ladder sample | Violates the range-not-grade rule. |
| Flask and charm "rules" presented as measured gains | PoB cannot measure them; a rule table would look like data. If added, label as rule-based, not simulated. |
| Crowdsourced price samples from a browser extension | Needs a collection backend and user data; out of scope for a static site, and the data would be unverified. |
| Copying reference wording, report layout or branding | Not permitted; this repo's cards are its own design. |
| Crediting a keystone because it is allocated | Violates the keystone rule. |

## Where this design aims to beat the reference's likely weaknesses

| Reference weakness (inferred) | This repo |
|---|---|
| Greedy one-mod-at-a-time candidates ignore interactions and breakpoints | Final item re-simulated as a whole; breakpoints come from `holding-up` minimums, which become hard `and` filters in the trade query |
| Slot gains not additive | Log-ratio score; `combineScores` adds slot gains and states they are not jointly simulated |
| Point estimates | Sensitivity ranges through the probe |
| No visible accuracy suite | Golden fixtures in CI (limited to one recorded character today) |
| Hand-maintained exclusions | `NotEvaluated` entries carry a reason derived at run time |

## Recommended sequencing

1. Items 1 to 7 (this branch).
2. Item 9 (types for unknown values) and item 8 (data age), since both protect the "never invent" rule on real user data.
3. Item 12 and item 10.
4. Decide on a worker (item 19) using `pob-worker-design.md`; only then items 13 to 18, in this order: 17, 16, 13/15, 14, 18.
5. Item 11 once the proxy decodes gear and skill columns.

## D. Additive plan items 5-10 (appended)

All additive: new optional fields or pure functions, unknown stays `null`/`unknown`, no existing output or golden changed. Items 1-4 of the same plan are in their own PR.

| Plan # | Addition | Where | Status | Limits |
|---|---|---|---|---|
| 5 | Ailment immunity, freeze exposure | `defense/` | Merged (#39) | Not wired into defence output; no freeze exposure; field names unverified |
| 6 | Main skill from the export, next to the current primary | `dps` summary | Merged (#40) | Matches skills by name only |
| 7 | Skills/auras in the inactive weapon set | `model/slots.ts` | Open (#41) | Does not flag a primary skill in the inactive set; payload field unverified |
| 8 | Mapping / Bossing focus view | `recommend/focus.ts`, `FOCUS_CATEGORY_WEIGHTS` in `thresholds.ts` | Core only | Weights are judgement; no web toggle yet; default order unchanged |
| 9 | Changed since last report | `progress/changed.ts` over `latestDiff` | Core only | Needs two stored snapshots, else `available: false`; no web panel yet |
| 10 | Duplicate-family note | `DamageReview.familyNotes` | Core only | Explains why a same-family support is not suggested; the existing filter is unchanged; not shown in the web yet |
