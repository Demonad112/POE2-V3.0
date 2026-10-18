# Character analyzer audit

Scope: `packages/core`, the `/character` page in `apps/web`, `apps/mcp`, and `services/ninja-proxy`, as of commit `21aa5b3` (before the changes in this branch). Line numbers refer to that commit.

## Baseline

Measured in this session on Node v22.22.0 / npm 10.9.4, after `npm ci`.

| Check | Result | Time |
|---|---|---|
| `npm ci` | 471 packages | 17 s |
| `npm run typecheck` | pass | 12.6 s |
| `npm run lint` | pass | 10.8 s |
| `npm test` (core + web) | pass: core 441 tests / 30 files, web 68 tests / 10 files | 6.4 s |
| `npm test` in `services/ninja-proxy` | pass: 17 tests | 0.4 s |
| `npm run build` (core, then web static export) | pass, 8 static pages | 19.8 s |
| `npm audit --omit=dev` | 0 vulnerabilities (dev dependencies not audited) | n/a |

Nothing failed at baseline. README states "374 tests" for core; the actual count is 441, so that figure is stale (finding I-1).
Static export: `apps/web/out` is 7.1 MB; the largest JS chunk is 228 KB.

## After the changes in this branch

| Check | Before | After |
|---|---|---|
| Core tests | 441 (30 files) | 496 (38 files) |
| Web tests | 68 (10 files) | 72 (11 files) |
| Proxy tests | 17 | 17 |
| Typecheck, lint, `npm run build` | pass | pass |
| MCP build, `scripts/verify-mcp.mjs` (31 tools) | not run at baseline | pass |
| `apps/mcp/TOOLS.md` regeneration | n/a | unchanged |
| Playwright e2e | not run at baseline | **not verified here**: the preinstalled Chromium does not match the version Playwright expects (`chromium_headless_shell-1248` missing). Not installed, per the environment notes. |

No existing test was edited or removed. New code: `constraints/holding-up.ts` (D-1), `upgrade/` (F-1, F-3, G-1, G-2), `trade/query.ts`, `pob/sensitivity.ts` (C-4), `cache/key.ts` (H-1), `progress/migrate.ts` plus its use in `apps/web/src/lib/storage.ts` (H-2 for snapshots), and `test/golden*` (I-2). Findings not addressed here (B-1 to B-7, A-*, C-1 to C-3, E-1, F-2, H-3, I-1, I-3 to I-5) were left for separate changes, as the audit task asked only for reporting on them.

Since fixed in separate changes: B-1 to B-7, H-2, H-3, A-1, A-2, A-7, C-2, C-3, I-1 and the secret-scanning half of I-3 (coverage tooling is still open). I-5: `e2e/a11y.spec.ts` runs axe (WCAG A/AA, serious and critical) on home, character and checklist; it found and fixed an unnamed home link and an underline-less in-text link. Two rules stay excluded and listed in the spec: `nested-interactive` (step checkbox inside `<summary>`) and `color-contrast` (phase-nav captions). C-2: `PobBridge` takes `callBudgetMs` (default 2x `timeoutMs`) and an `AbortSignal`; `rankNodesByMeasuredGain` takes `signal` and `budgetMs` and returns a partial, `halted` report. C-3: `PobBridge.version()`, `RankReport.pobVersion`, and an `expectedPobVersion` option that warns on a mismatch. H-3: the chat key moves to `sessionStorage`; a key left in `localStorage` is carried over once and removed. I-3: a gitleaks job in CI (unverified until it runs on GitHub). B-5 now reads what an item holds up from poe.ninja's breakdown and reports unknown for a resistance the breakdown cannot attribute. H-2 salvages persisted slices across a storage version change. A-2 adds a bounded retry on 429/503 in the proxy and client and lengthens the proxy's edge cache to 300 s; conditional requests (ETag) are not done, because the proxy keeps no state between invocations and the edge cache already absorbs repeat reads.

## Decisions on ambiguous points

1. Branch: the task names `claude/analyzer-mvp-parity`; the session harness named a different branch. The task's explicit name is used.
2. The PR is opened as a draft and is not watched or polled, as instructed.
3. Only one recorded character exists (`packages/core/test/fixtures/athrynas-v43.json`). No more can be recorded without network access. The golden suite therefore uses that one plus four derived variants, labelled as derived.
4. Trade-site stat ids are not in the repo data. The trade query builder takes an injected stat-id map and reports unmapped stats instead of guessing.
5. The PoB bridge has no config-input RPC. Sensitivity runs through an injected probe; anything the probe cannot measure is reported as unknown.
6. A score with missing inputs is `point | range | unknown`. A single number is only produced when every component was measured.
7. Mode and priority weights are judgement constants, declared and overridable, in the same spirit as `thresholds.ts`. They are not data.

## Findings

Type: B = bug, R = risk, M = missing feature, I = improvement.

### A. Ingest and proxy

| ID | Sev | Type | Finding | Evidence |
|---|---|---|---|---|
| A-1 | Med | R | No descriptive `User-Agent` or contact on any upstream request. | `services/ninja-proxy/api/character.js:36,102`; `api/ladder.js:262,278`; `packages/core/src/ninja/client.ts:117` |
| A-2 | Med | M | No conditional requests (ETag / If-None-Match), no retry, no backoff. Edge cache `s-maxage=120` is shorter than poe.ninja's roughly 5-minute refresh, so the proxy can hit upstream more often than needed. **Fixed:** retry and backoff, and `s-maxage=300`, landed earlier. Conditional requests now exist on the versioned model URL: the proxy revalidates with `If-None-Match` (`revalidatingFetch`, per-instance cache of 16) and passes `ETag` on (304 to a matching `If-None-Match`); the direct client keeps its last 8 models. **Unverified:** whether poe.ninja sends an `ETag` on this endpoint. Without one, nothing is cached and behaviour is unchanged. | `_upstream.js`; `character.js`; `client.ts` |
| A-3 | Low | R | `/api/ladder` fetches have no timeout or abort signal (the character handler has a 20 s one). A stalled upstream holds the function open. Error bodies echo `String(err)` / `err.message`. **Fixed (verified in code 2026-10-18):** `ladder.js` aborts after `TIMEOUT_MS`; both handlers return fixed error messages and log the raw error. | `ladder.js:271-340`; `character.js:113-119` |
| A-4 | Low | R | CORS is `*` and there is no rate limiting or input length limit. Not an open relay: the upstream host is hardcoded (`character.js:20`) and path segments are `encodeURIComponent`ed (`:80`); ladder query values go through `URLSearchParams`. Account handling replaces only the first `#` (`:82`). **Partly fixed (verified in code 2026-10-18):** `badQueryParam` rejects overlong or repeated params on both handlers. CORS `*` and no rate limit remain by design (public data). | `character.js:24,75-86` |
| A-5 | Med | R | Upstream JSON is cast, not validated. Drift in required fields surfaces as odd downstream values rather than an error. `unwrapCharModel` accepts any object. **Fixed (verified in code 2026-10-18):** `unwrapCharModel` runs `assertCharModelShape` (list, object and number fields must be the right kind when present) and the client raises `bad-response` on unexpected shapes. Deeper per-field validation is not done. | `client.ts:89,219`; `analyze.ts:93-135` |
| A-6 | Low | I | `NinjaError` reason `'cors'` is used for every network failure, including server-side. The message is correct for proxy mode but the reason code is misleading. **Fixed (verified in code 2026-10-18):** network failures now use `'network'`; `'cors'` stays in the union for compatibility. | `client.ts:38,169-180` |
| A-7 | Med | M | Data age is captured (`identity.updatedUtc`, snapshots) but no part of `apps/web/src` displays it, so a stale profile is not visible to the user. | grep of `apps/web/src` for `updatedUtc` returns nothing |

A private or unindexed profile is handled: a frame with no version becomes a 404 with a "check the profile is public" message (`character.js:92-96`, `client.ts:157-159`).

### B. Analyzer correctness

| ID | Sev | Type | Finding | Evidence |
|---|---|---|---|---|
| B-1 | High | B | A resistance missing from the payload is coerced to 0, producing an invented shortfall of the full cap (75 points). The build score then lists "Uncapped elemental resistance" as critical. `missing[]` only tracks max-hit keys. This breaks the "never invent a number" rule on partial data. **Fixed in #38** (`test/unknown-is-null.test.ts`). | `defense/index.ts:120-128,103`; `score/index.ts:159` |
| B-2 | Med | B | Same coercion for life and energy shield: a partial payload yields a pool of 0 and a "thin pool, critical" weakness. **Fixed in #38** (`test/unknown-is-null.test.ts`). | `defense/index.ts:133-134`; `score/index.ts:145` |
| B-3 | Med | B | Snapshots store unknown values as 0, and `diffSnapshots` treats 0 as real, so a partial import followed by a full one reports gains that never happened. `compareSnapshots` handles zero-as-unknown for three fields only. **Fixed in #38** (`test/unknown-is-null.test.ts`). | `progress/index.ts:65,72,79,84`; `:176-194` vs `:281,304` |
| B-4 | Med | R | The "primary" skill is the highest-total-DPS named hit skill, not the skill the player uses. `totalDps = dps + dotDps`; whether poe.ninja's `dps` already includes ailment damage is unverified here. | `dps/index.ts:112,142-149` | **Fixed:** `analyzeDps` prefers the PoB export's main skill (by name, hit skills only) and falls back to highest total DPS; `DpsSummary.primarySource` says which.
| B-5 | Med | R | Two sources of truth for what an item holds up. `resistancesFrom` counts only mods that carry an id, so rune, implicit and enchant resistance is invisible to `removalDeficits`; `model/attribution.ts` reads poe.ninja's breakdowns and sees all of it. | `gear/replace.ts:113-132` vs `model/attribution.ts` |
| B-6 | Low | I | Offence grade values (0.5 / 0.4 / 0.28 / 0.15) and the tier cutoffs live in `score/index.ts`, although `thresholds.ts` states that every judgement constant lives there. | `score/index.ts:48-50,118-125` |
| B-7 | Low | R | `analyzeFromPob` assumes a 75% cap (disclosed in `gaps`) and tags results `provenance: 'pob'`, which is not a member of the `Provenance` union (`'ninja' | 'pob-sim' | 'pob-export' | 'estimate'`). | `pob/analyze.ts:54,118,194`; `model/types.ts:14-23` |

Checked and fine: crit chance (percent) and multiplier (ratio) are handled correctly in `effectiveCritMultiplier` (`recommend/offence.ts:74-81`); keystone effects are applied only when visible in the character's stats (`keystones/index.ts`, covered by `keystones.test.ts`); the build score returns a range, not a grade, when no ladder sample exists (`score/index.ts:309-312`); weapon-set alternates are handled (`model/slots.ts`).

### C. PoB integration

| ID | Sev | Type | Finding | Evidence |
|---|---|---|---|---|
| C-1 | High | M | The only PoB transport is TCP to a desktop Path of Building with a community addon, one request per connection. It is sequential, mutates the user's open build, and cannot run from the static site. About six RPCs per simulated node. | `pob/bridge.ts:43,321-399`; `apps/mcp/src/pob-transport.ts`; `pob/rank.ts:14-20` |
| C-2 | Med | R | Port fallback applies the full per-call timeout to each of four ports, so an unreachable PoB costs about 20 s per RPC. No cancellation (`AbortSignal`) and no overall budget in `rankNodesByMeasuredGain`. | `bridge.ts:101,119`; `rank.ts:94` |
| C-3 | Med | R | No version pinning. `ping` can report `pob_version`, but nothing records it or compares it with the data version in `PROVENANCE.md` or with the export. | `bridge.ts:75` |
| C-4 | Med | M | The saved PoB config is parsed and described (`pob/config.ts:145-210`) but cannot be toggled on a live PoB, so no sensitivity range across enemy conditions is possible today. | `config.ts`; bridge has no config RPC |
| C-5 | n/a | answer | Long-lived worker: feasible. The bridge already follows load once, mutate, recalculate, diff, revert (`bridge.ts:166-176,408-459`). Per-item mutation RPCs are not in the bridge, so item-level simulation would use custom mods as a stand-in or need an addon extension. Headless PoB is a design option, not verified here. See `docs/pob-worker-design.md`. | |

### D. Constraint model

Partly present, not unified. Per-item loss and "drops below cap" exist (`model/attribution.ts:131-153`); attribute headroom and spare Spirit exist but only from the PoB export (`gear/audit.ts:199,242`); resist overcap is in `defense`. Missing: a single typed map, anoint, movement speed, and a "minimum to keep" per item. Addressed in this branch by `packages/core/src/constraints/holding-up.ts` (D-1, Med, M).

### E. Upgrade search

Present: resistance swaps (`gear/analyze.ts:443`), tier upgrades (`:594`), replacement planner (`gear/replace.ts:205`), affix candidate ranking (`gear/workbench.ts:184`), support-gem review (`recommend/damage.ts:225`), passive node ranking via PoB (`pob/rank.ts`), family exclusion in candidate choice (`replace.ts` `excludeGroups`). Mod pools come from `packages/data/generated/mod-tiers.json`, sourced from PoB 0.5.5 data per `PROVENANCE.md`.
Missing (all M, all need the PoB transport or a worker): affix ablation, simulated candidate generation, anoint enumeration, rune and soul-core evaluation (only limits are audited, `gear/audit.ts:310`), gem level and quality gain, unique swaps, jewel evaluation. E-1, Med.

### F. Scoring

| ID | Sev | Type | Finding | Evidence |
|---|---|---|---|---|
| F-1 | Med | M | No Mapping / Bossing modes or priority weights. Added, now on `main` (`upgrade/scoring.ts`). | |
| F-2 | Med | I | Recommendations rank by `significance / cost weight`; several significances are hand-picked constants (e.g. 0.45), against the comment that they are never hand-tuned. **Fixed:** anoint is now 1 notable over the allocated passive count (impact `null` when the count is missing); the free `+0.15` bonus is gone and the free preference sits in `COST_WEIGHT` (free 0.5); one-shot is `1 - 1/ratio`; weapon lag is `gap / median ilvl`. All significances are in [0,1]. Remaining scale choices: resistance `underCap / max`, gear `slots / capacity` and `closesShortfall / RESIST_CAP`, offence projected-gain share (all already stat-scale ratios). `COST_WEIGHT` values are documented preferences, not significances. | `recommend/index.ts`; `recommend/types.ts:54-57`; `test/recommend-significance.test.ts` |
| F-3 | Med | M | Gains are not combinable across slots. A log-ratio score makes multiplicative gains additive; implemented as `combineScores`, explicitly labelled as not jointly simulated. | |

### G. Report and trust UX

Present: trade-off, evidence, provenance, rationale per recommendation (`recommend/types.ts:70-86`); `unresolved` and `suppressed` lists; PoB export for reproduction (`poe2_get_pob_code`). Gaps: no stated assumptions per recommendation (G-1, Low), no "not evaluated" list with reasons beyond `unresolved` (G-2, Low), no data-age display (A-7). The upgrade report schema in this branch carries all three.

### H. Performance and ops

| ID | Sev | Type | Finding | Evidence |
|---|---|---|---|---|
| H-1 | Med | M | No content-keyed cache for analyses. Added `analysisCacheKey`. | |
| H-2 | Med | B | A persisted-state version mismatch resets all progress (checklist, Atlas, snapshots) with no migration. Snapshots have no schema field. | `apps/web/src/lib/storage.ts:4,31` |
| H-3 | Low | R | Optional chat API key is stored in `localStorage` (disclosed in the file). Any XSS on the origin could read it. | `components/Chat.tsx:85` |
| H-4 | Low | I | Bundle: 7.1 MB export, 228 KB largest chunk; large JSON (`mods.json` 3.5 MB, `mod-tiers.json` 2.2 MB) is lazily loaded per the design notes. Not profiled further here. | measured above |

### I. Quality and security

| ID | Sev | Type | Finding |
|---|---|---|---|
| I-1 | Low | I | README test count is stale (374 vs 441). |
| I-2 | Med | M | One recorded fixture only; no golden outputs. Added, now on `main` (1 recorded + 4 derived). |
| I-3 | Low | M | No coverage tooling and no secret scanning in CI. |
| I-4 | Low | M | Web and MCP both import core, so analysis logic is shared (README invariant holds). Fixed: `poe2_constraint_map` exposes the constraint map and a ledger check of proposed changes (31 tools, `TOOLS.md` regenerated). Upgrade-card scoring (`scoreUpgrade`) still needs before/after profiles the server does not build, so it is not exposed. |
| I-5 | Low | M | Accessibility: 44 source files use `aria-` or `role=`; there is no automated a11y check (no axe) in the e2e suite. Not audited manually here. |
| I-6 | none | ok | Secrets: no `.env`, key or pem file is tracked (`git ls-files`); a pattern search found only code identifiers (`apiKey` fields, "token" in parsers). |

## Severity ranking

1. B-1 invented resistance shortfall on partial data (High)
2. C-1 PoB access limited to a desktop instance, sequential and mutating (High)
3. B-2 / B-3 other zero-for-unknown paths (Med)
4. H-2 whole-state reset on storage version change (Med)
5. A-1 / A-2 / A-7 polite-client and data-age gaps (Med)
6. B-4, B-5, C-2, C-3, C-4, F-2 (Med)
7. Remaining Low items

Top five for the PR: B-1, C-1, H-2, A-1/A-2, B-3.

## Not verified here

- Any live behaviour of poe.ninja, pathofexile.com, poemvp.com or the trade site (no live calls were made).
- Behaviour of a real Path of Building and its addon, including whether a config-input RPC exists.
- Whether poe.ninja's per-skill `dps` already includes damage over time (B-4).
- Full `npm audit` including dev dependencies.

## Addendum: additive plan items 5-10

Appended; nothing above is changed. None of these alters gem logic, damage logic, `upgrade/scoring.ts`, existing recommendations or goldens.

- Items 5-7 (ailment immunity, main skill, inactive weapon set): merged or open as separate PRs; payload field names for immunities and weapon sets remain unverified against a live capture.
- Item 8 `focusView`: re-orders a copy of the recommendations by declared per-category multipliers; the scores themselves are not modified.
- Item 9 `changedSinceLastReport`: reuses `diffSnapshots` via `latestDiff`; one snapshot gives `available: false`, never an invented baseline.
- Item 10 `familyNotes`: informational; supports of an already-used family are still excluded from candidates exactly as before.
