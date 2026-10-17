# PoB mutation, gem removal, trade mapping, per-skill DPS (design only)

Status: **design**. Nothing in this document is implemented. The interfaces are type-only: `packages/core/src/pob/mutation.ts`, `probes.ts`, `support-removal.ts`, `trade-stat-map.ts`, `per-skill-dps.ts`. Extends `docs/pob-worker-design.md` and `docs/analyzer-triage.md` (items A3, A8, C1-C5, D2, X4).

## Rules this design keeps

- Every simulated value is `source: 'pob-sim'` and appears only after `checkBaseline` passed on the **same state** the deltas were taken from. A failing gate yields status `withheld`, never a number.
- A value the data cannot establish is `unknown` or `nominal`, never a guess. A change that applied and moved no stat is `unmeasurable`, which is not "worth zero".
- Ranges, not points, where an input is a range (unique rolls).
- Core stays free of I/O: the probes receive a transport; the web app stays static-export.
- **Assumption** marks anything not read from this repo's code or recorded data: RPC names, parameter and result shapes, PoB stat keys, trade stat ids, PoE2 mechanics. Section "Open assumptions" collects them. Nothing marked so may be relied on before it is checked against the addon source or a recording.

What is verified in this repo: the RPCs in `bridge.ts` (`load_build_direct`, `recalculate`, `get_calcs`, `get_full_dps`, `set_passive_node`, `get_passive_tree`, `reset_tree`, `get_custom_mods`, `set_custom_mods`, `get_stat_breakdown`); the transport is one request per connection; `<Gem enabled="…">` and `<Skill mainActiveSkill="…">` exist in exports (`main-skill.ts`, `skill-groups.ts`); `set_passive_node` auto-paths and deallocation removes dependents (`bridge.ts` header). `get_config_input` / `set_config_input` are used by `bridgeProbe` but **unverified**.

## 0. Shared primitives

All of C1-C5, A3 and A8 need the same four things the transport lacks. Build these first; they are cheap and every later probe rests on them.

| RPC (assumption) | Params | Result | Idempotent | Purpose |
|---|---|---|---|---|
| `snapshot_state` | `scope[]` (`items`, `skills`, `tree`, `config`, `custom-mods`) | `token`, `fingerprint` | yes (re-snapshot returns a new token for the same state) | Restore point and revert proof |
| `restore_state` | `token` | `fingerprint` | yes (restoring twice is the same state) | One-call revert, replaces per-probe undo logic |
| `state_fingerprint` | `scope[]` | `fingerprint` | yes, read-only | Per-scope hash computed in the addon over canonical serialisation. `reverted` is true only when it equals the fingerprint before |
| `get_items` | none | slots with text, sockets, `inActiveWeaponSet`; `activeWeaponSet` | yes, read-only | Source of "what PoB holds"; the readback every mutation is compared against |
| `get_skill_groups` | none | groups, gems (`enabled`, `level`, `quality`), current main selection | yes, read-only | Addressing and readback for gem edits |
| `calc_with_override` | `items?`, `tree?` (add/remove), `stats[]` | `MutationOutcome` | yes, **mutates nothing** | Preferred what-if path. Based on a recollection that PoB's own calculator accepts an override table for item comparison; whether the addon can reach it is **unverified** |
| `apply_step` | one `MutationStep`, `stats[]` | `MutationOutcome` | no (state changes); safe only after `snapshot_state` | Fallback mutate-measure path |
| `batch_measure` | `token`, `items[]` (each a list of steps), `stats[]` | per item: outcome or failure code; `fingerprintAfter` | yes (restores the base state itself) | One connection for N independent measurements |

Existing RPCs still used: `recalculate`, `get_calcs`, `set_passive_node`, `get_passive_tree`.

**Two execution modes**, recorded in every result as `mode`:

- `override`: `calc_with_override`. Nothing is changed, so there is nothing to revert. `reverted` is true by construction; the fingerprint is still compared before and after as a tripwire.
- `mutate-revert`: `snapshot_state`, N × (`apply_step`, read), `restore_state`, `state_fingerprint`. `reverted` is true only when the fingerprint equals the one before. A mismatch is failure `revert-failed`: the run stops, no later reading is used, and the message tells the user their PoB window is modified (same rule as `simulatePassiveNode`).

**Mutation sanity check (all probes).** Every mutating call returns what PoB now holds (`items`, `skills`, `treeEffect`). The probe compares it with the request. A difference is `readback-mismatch` and the measurement is discarded. This catches silent addon failures such as an item PoB parsed into a different base.

**Cost model.** Time per `recalculate` is **not measured** (assumption: the first implementation must time it on the pinned PoB and record the figure in this doc). Cost is therefore stated in RPC calls per measured candidate:

| Path | Calls per candidate | Fixed per run |
|---|---|---|
| `override` | 1 (`calc_with_override`) | 1 baseline `get_calcs`, 2 fingerprints |
| `mutate-revert`, per-step RPCs | 3 to 4 (`apply_step`; `get_calcs` if the step result lacks stats; one revert step) | 1 snapshot, 1 restore, 2 fingerprints, 1 baseline |
| `batch_measure` | 1 connection for N; per-candidate work happens in the addon | 1 snapshot, 2 fingerprints, 1 baseline |

Every probe request carries an optional `ProbeBudget { maxRpcCalls, maxWallMs }`. Exhausting it returns what was measured with `partial: true` (as `rankNodesByMeasuredGain` does) and the rest listed as `unmeasured` with reason `budget-exhausted`.

**Common failure codes** (`MutationFailureCode`): `rpc-unsupported` (the expected state until the addon is extended; degrades the finding to its current nominal/unknown form), `invalid-item-text`, `readback-mismatch`, `slot-conflict`, `wrong-weapon-set`, `socket-count`, `unknown-socketable`, `gem-mismatch`, `value-out-of-range`, `node-not-found`, `main-skill-changed`, `revert-failed`, `baseline-failed`, `budget-exhausted`, `timeout`, `aborted`.

**Baseline gate, common to all probes.** `ninjaBaselineExpectations(stats, mainSkillDps)` evaluated on `get_calcs` of the loaded, unmutated build, once per `fingerprintBefore`. The probe's `fingerprintBefore` must equal the fingerprint of the build the analysis ran on (the cache key's PoB commit and config hash are carried in `UpgradeReport`); otherwise the probe returns `withheld: 'measured build differs from analysed build'`. Probe-specific additions are listed per section.

---

## 1. C1-C5: item, gem, rune, anoint, respec and unique mutations

Interfaces: `ItemChangeRequest`, `ItemChange`, `UniqueSwap`, `ItemMeasurement`, `RangedItemMeasurement`, `AnointRequest`, `AnointBatchRequest`, `AnointRanking`, `RespecPlan`, `RespecRequest`, `RespecMeasurement`, `ProbeResult<D>` in `mutation.ts`; `ItemChangeProbe`, `AnointProbe`, `RespecProbe` in `probes.ts`.

```ts
interface ItemChangeProbe { measureItemChange(r: ItemChangeRequest): Promise<ProbeResult<ItemMeasurement | RangedItemMeasurement>> }
interface AnointProbe { measureAnoint(r: AnointRequest): Promise<ProbeResult<AnointMeasurement>>; measureAnoints(r: AnointBatchRequest): Promise<AnointRanking> }
interface RespecProbe { measureRespec(r: RespecRequest): Promise<ProbeResult<RespecMeasurement>> }
```

### 1.1 Mapping from finding to probe and RPC

| Finding | Probe call | `ItemChange.kind` / plan | RPCs (preferred path first) |
|---|---|---|---|
| C1 weapon / affix | `measureItemChange` | `replace-mod`, or `swap-unique`/`set` of a whole item | `calc_with_override{items}`; else `snapshot_state`, `apply_step{set_item}`, read, `restore_state` |
| C3 gem quality / level | `measureItemChange` | `set-gem-quality`, `set-gem-level` | `apply_step{set_gem_field}` (gem fields are not overridable; there is no override path) |
| C3 rune / soul core | `measureItemChange` | `swap-socketable` | `calc_with_override{items}` with the item text rewritten; else `set_item` |
| C2 anoint | `measureAnoint(s)` | `set-anoint` on the amulet | as C1 (an anoint is an item-text enchant line; **assumption**) |
| C4 respec | `measureRespec` | `RespecPlan { remove, add }` | `calc_with_override{tree}`; else `set_passive_node` (exists) with tree-diff, or `apply_step{tree}` |
| C5 unique swap | `measureItemChange` | `swap-unique` | as C1 |

### 1.2 Per-RPC semantics

| RPC / step | Revert and idempotency | Failure modes it can raise |
|---|---|---|
| `set_item {slot, text}` | Revert = `restore_state(token)`. Applying the same text twice is a no-op. `text: null` empties the slot | `invalid-item-text` (parse yields no base or no mods; the addon must say which), `slot-conflict`, `wrong-weapon-set`, `socket-count` |
| `set_gem_field {group, gem, expectName, field, value}` | Revert = restore. Same value twice is a no-op. `expectName` must equal the gem's `nameSpec` or the call fails, so an index shift cannot edit the wrong gem | `gem-mismatch`, `value-out-of-range` (level above PoB's max, quality outside range; the bound is read from the addon's error, not hard-coded here) |
| `set_item` with a socketable change | Done by rewriting the item text; PoB reads inserted socketables from item text (**assumption**; the PoE2 export format for runes / soul cores has not been verified here) | `socket-count`, `unknown-socketable` |
| `tree {add, remove}` | Revert = restore. `remove` also removes dependents; `add` auto-paths. Both are reported in `treeEffect` | `node-not-found`; `unmeasurable` when nothing changed |
| `batch_measure` | Each item starts from the base state and the addon restores between items; the final `fingerprintAfter` is checked once | per item: any of the above; the batch fails as a whole only on `revert-failed` or `timeout` |

### 1.3 Failure handling for the hard cases

- **Invalid item text.** The probe never repairs text. PoB's parse result is the authority: no base type, a base different from the one requested, or zero parsed mods is `invalid-item-text` and the candidate is listed `unmeasured` with the addon's message. Item text is built from the equipped item's own text with one line changed (`replace-mod`), so it normally round-trips; whole-item text (unique swaps) comes from a dataset the repo does not have.
- **Slot conflicts and two-hand vs dual-wield.** An edit that changes hand-type touches more than one slot. The request therefore carries every edit plus `clears` (slots this change empties). Nothing is emptied implicitly. If the addon's own rules would empty a slot not listed in `clears`, or reject the placement, the result is `slot-conflict` and names the slot. The result lists `changedSlots`, so the card can say "also removes your off-hand".
- **Weapon sets.** `weaponSet: 'active'` is the only measurable value. An edit on the other set's slots changes nothing in `TotalDPS` and is `wrong-weapon-set`; it stays `unknown` (consistent with `inactiveSetFromPob`, which already reports that set from the export without simulating it). Switching PoB's active set to measure the other one is a mutation of its own and is out of scope here.
- **Socket count.** `swap-socketable` is validated against `ItemSlotReadback.sockets.count` before any call; a socket index at or above the count, or an unknown count (`null`), is `socket-count`. Unknown count never defaults to "enough".
- **Unique rolls.** A unique with `rollRanges` is measured twice (all-min, all-max) and returned as `RangedItemMeasurement`; the card shows the range. With `rolls: 'explicit'` the roll came from the user's choice and a single measurement is returned. A unique with no stated ranges and `rolls: 'max'` is shown as an upper bound only, labelled as such.
- **Same item.** If the change yields item text identical to the equipped text, the probe returns `unmeasurable` without calling the addon.
- **No effect.** Applied, readback matches, and no gated stat moved: `unmeasurable` with the reason. Never a zero delta.

### 1.4 Mapping onto the existing probe shapes

- `ItemChangeProbe.measureItemChange(slot, {kind, detail:string}, expected)` becomes one structured request. The old `detail: string` could not carry a socket index, a gem address or multi-slot edits, and nothing implements it, so it is replaced rather than kept.
- `AnointProbe.measureAnoint(notableNodeId, expected)` gains the amulet slot and node name; a batch form `measureAnoints` ranks candidates under a budget.
- `MeasuredResult` (`baselineFailed: string | null`) is replaced by `ProbeResult<D>`, whose `withheld` status carries the reason and `baselineGate` carries the full `BaselineGateResult`. `MeasuredDelta` is kept unchanged and extended by `ItemMeasurement`.
- `ItemMeasurement.ledger` carries before/after for each `LedgerStat` PoB reported, so C5 passes real before/after totals to `applyLedger` instead of inferring them. A `LedgerStat` PoB did not report is absent, and the ledger then reports that stat as unchecked rather than OK.

### 1.5 C2 anoint

- Candidates come from the caller (a notable list with the oil recipe is a dataset the repo does not have). The probe ranks; it does not enumerate.
- Each candidate is `set-anoint` on the amulet: item text plus an enchant line "Allocates <notable>" (**assumption**: PoB represents an anoint as an enchant line; it must be confirmed on a recorded export with an anointed amulet). An existing anoint is replaced, and the result notes which.
- A candidate already allocated by the tree is `unmeasurable: 'already allocated'`.
- `pointsCost` is read from the tree diff (`treeEffect.added`), expected 0; not assumed.
- Ranking order: measured entries by `scoreUpgrade` for the selected mode (`w_d·ln + w_s·ln`), highest first; ties by `notableNodeId` for determinism. `AnointRanking.cost` is always `'unpriced'`: there is no price source.
- Cost per candidate: 1 call on the override path; the whole list is one `batch_measure` on the fallback path. With K candidates the fixed cost is the baseline and fingerprints, the variable cost is K.

### 1.6 C4 respec

- `RespecPlan { remove, add }` is one reallocation. The probe measures the **joint** delta of the plan; it never sums per-node deltas (nodes interact, e.g. a notable that scales another).
- Budget: `maxNetPoints` and `freePoints`. `netPoints = pointsSpent - pointsRefunded - freePoints` is computed from the tree diff, including `orphaned` (dependents removed with a refunded node) and `autoPathed` (nodes taken to reach an added node). A plan whose measured `netPoints` exceeds the budget is `withheld: 'over point budget'`; it is not trimmed.
- **Unmeasurable guard (from triage C4).** Before a refund is credited, each node in `remove` is also removed alone. If no gated stat moves, that node goes in `unmeasurableRemovals` (penetration, conditional or utility effects that PoB's config does not exercise) and the plan is `unmeasurable`. The refund is not presented as free. The exception is when `ConfigReadback` shows the config models the condition, which is a decision for the owner (see "Decision needed").
- Weapon-set passive points and ascendancy points are different pools in PoE2. The existing `set_passive_node` takes neither. Nodes belonging to them are excluded from `remove`/`add` candidates, and the result for them is `unknown` (**assumption** about the pools; check against the tree data and addon).
- `goldCost` is the literal `'unknown'`: the repo has no gold data.
- The plan search (which nodes to try) is an orchestrator on top, using `suggestNodesForStat` for additions. It is behaviour and not specified beyond: candidates in, plans measured under a budget, best by `scoreUpgrade`.

### 1.7 Ordering and dependencies

| Order | Unit | Unlocks | Needs |
|---|---|---|---|
| 0 | `snapshot_state`, `restore_state`, `state_fingerprint` | revert proof for everything below | addon change |
| 1 | `get_items`, `get_skill_groups`, readbacks | mutation sanity check; gem addressing | addon change |
| 2 | `get_config_input` / `set_config_input` verified | `ConfigReadback` (X4), explains gate failures, per-skill config (A8) | verify or add |
| 3 | `set_gem_field` | A3 support removal; C3 quality/level | 0, 1 |
| 4 | `set_main_selection` | A8 per-skill DPS; A3 main-skill-change detection | 0, 1 |
| 5 | `set_item` / `calc_with_override{items}` | C1 weapon/affix, C3 rune/soul core, C5 unique, C2 anoint | 0, 1 |
| 6 | tree via `calc_with_override{tree}` or `apply_step{tree}` | C4 respec | 0; `set_passive_node` exists |
| 7 | `batch_measure` | cost reduction for 3-6 | 0 |
| data | unique dataset, anoint recipes, gold, prices | C5 and C2 candidate lists, costs | not in repo |

| Finding | Hard needs | Without them |
|---|---|---|
| A3 | 0, 1, 3 (+4 for selection check) | stays nominal |
| A8 | 0, 1, 4 (+2) | main-skill pairing only |
| C3 quality/level | 0, 1, 3 | audit report only |
| C1, C3 rune/soul core | 0, 1, 5 | `weaponTierRule` heuristic only |
| C2 | 0, 1, 5, candidate list | "no anoint" flag only |
| C5 | 0, 1, 5, unique dataset; `applyLedger` exists | none |
| C4 | 0, 1, 6, gold data for cost | `suggestNodesForStat` only |

### 1.8 Baseline expectations that gate it

- Common: `ninjaBaselineExpectations` including Life, Energy shield, Evasion, four uncapped resistances, five maximum hits and main-skill `TotalDPS`. Zero expectations is not a pass (as now).
- C1/C3/C5 additionally pass `extraStats` for the ledger (Spirit, attributes). They do not gate, they are reported; an unreported ledger stat becomes unchecked.
- C4: the baseline must also include the resistances, because a respec can drop one; the ledger runs on the measured after-state.
- Item-specific sanity: the readback of the mutated slot equals the request; for `replace-mod` the stat the line grants moved by a plausible direction. A stat that moved the wrong way is reported in `warnings`, not corrected.

### 1.9 Failure / unknown behaviour

| Condition | Result |
|---|---|
| Gate fails | `withheld`, reason from `checkBaseline`, no deltas |
| Addon lacks the method | `failed: rpc-unsupported`; finding stays in its current form |
| Readback differs | `failed: readback-mismatch` |
| Fingerprint differs after restore | `failed: revert-failed`; batch stops; user told their PoB is modified |
| No stat moved | `unmeasurable` |
| Budget exhausted | partial ranking, rest `unmeasured: budget-exhausted` |
| Cost source missing | cost `unpriced`; gold `unknown` |

### 1.10 Test plan

No fixtures are committed by this task. Needed later (a separate task records them):

- A recorded PoB reply for each assumed RPC against a pinned PoB commit (`snapshot_state`, `get_items`, `get_skill_groups`, `apply_step` success and each failure code). Until recorded, tests use a **fake transport** like `sensitivity.test.ts`.
- With the fake transport, assert: gate failure yields `withheld` and zero mutating calls; readback mismatch discards the delta; a restore that returns a different fingerprint stops the run; `clears` omitted for a 2H into Weapon 1 gives `slot-conflict`; socket index >= count gives `socket-count` with no RPC; a ranged unique returns both ends; respec `netPoints` includes orphaned and auto-pathed nodes; a no-effect removal makes the plan `unmeasurable`.
- Type-level test: `test/pob-design-types.test.ts` (compile-time shapes only; added with this design).
- Recorded fixtures needed: an export with an anointed amulet; an export with socketed runes and a soul core; a two-hander build and a dual-wield build; a unique with ranged rolls.

### 1.11 Risk and estimate

- Risk: high. The addon changes are the dependency (licence, maintenance, an unverified override path). Silent state corruption is the worst failure, hence fingerprint proof and readback on every call. Item text for runes / soul cores / anoints in PoE2 exports is unverified. Wall-clock cost is unmeasured.
- Estimate: shared primitives **M**; C1 + C3 rune/quality **L**; C2 anoint **M** (after C1); C4 respec **L**; C5 unique **M** (after C1, plus the dataset, which is a separate **L**).

---

## 2. A3: gem-removal simulation (`SupportRemovalProbe`)

Interfaces: `packages/core/src/pob/support-removal.ts` (`SupportRemovalRequest`, `SupportRemovalEntry`, `SupportInteraction`, `SupportRemovalReport`, `SupportRemovalProbe`, `SupportValueLabel`, `SupportMeasurementRejection`), `ProbeResult` from `mutation.ts`.

```ts
interface SupportRemovalProbe {
  measureRemovals(request: SupportRemovalRequest): Promise<ProbeResult<SupportRemovalReport>>
}
```

This replaces the sketch `measureRemoval(skill, support, expected): MeasuredResult`: a single-gem call cannot report interactions, cost-side effects or a changed selection, and re-doing the baseline per call multiplies cost.

### 2.1 What is mutated

One field: **`enabled` on one `<Gem>` of one `<Skill>` group**, in the active SkillSet. Both attributes appear in the recorded export (`<Skill … enabled="true" mainActiveSkill="1">`, `<Gem … nameSpec="Mobility" enabled="true" count="1"/>`), and `readPobMainSkill` / `readPobSkillGroups` already treat `enabled="false"` as "not socketed". Mutation: `apply_step{ op:'set_gem_field', group, gem, expectName, field:'enabled', value:false }` (**assumption**: method and params).

Why this field and not the alternatives:

| Alternative | Rejected because |
|---|---|
| Delete the gem from the group | Shifts every later gem index and can shift `mainActiveSkill`; restoring exact order is a second source of error |
| Disable the whole `<Skill>` group | Removes the skill, not the support |
| `count` | Not a supported "off" state for a support; means multiple copies |
| `enableGlobal1/2` | Present in the export (global effect toggles); their meaning for supports was not verified |

The addon must check `expectName` against the gem at `(group, gem)` and fail with `gem-mismatch` otherwise. Revert is `restore_state` (or setting `enabled:true`); the fingerprint of the `skills` scope proves it.

Group scope in the first version: the group the export marks main (`mainSocketGroup`). Supports in other groups say nothing about the headline `TotalDPS`; measuring them needs A8's selection switch (section 5) and is a later extension. The request still carries `group` so that extension needs no interface change.

### 2.2 Procedure (one report)

1. `snapshot_state{skills}`; `state_fingerprint`; read `get_skill_groups` (gems and current `main`).
2. `get_calcs`; run `checkBaseline(expected, stats)` including `TotalDPS`. Fail: return `withheld` with the gate reason; **no mutating call has been made**.
3. For each support (leave-one-out): disable it; `recalculate`; read the metric, the cost stats (`SupportCostStat`), and `main`; re-enable.
4. Interactions (below), then `restore_state`, then `state_fingerprint` must equal step 1; otherwise `failed: revert-failed`.
5. Return one `SupportRemovalReport`.

Cost: with n supports, leave-one-out is n measurements; all pairs add n(n-1)/2. Typical n = 5 gives 5 plus 10. On the override-less path each measurement is about 3 RPC calls (`apply_step` disable, read, re-enable), so a full report is about 3·(n + n(n-1)/2) + 5 fixed calls (45 + 5 at n = 5). With `batch_measure` it is one connection. Wall time per `recalculate` is unmeasured (see section 0).

### 2.3 Interaction effects

Leave-one-out gives each support's **marginal** value given all the others are present. It is not its standalone value. Two supports that scale each other (one only matters when the other is socketed) each show a marginal delta that includes the other's contribution, and the sum of marginals does not equal the loss from removing both.

- `interactions: 'all-pairs'`: for n ≤ 6 (15 pairs) disable each pair and compute `synergy = ln(both/base) − ln(a/base) − ln(b/base)`. Zero means independent. `|synergy|` above a threshold sets `flagged` (threshold is an owner decision; not invented here).
- `interactions: { top: k }`: pairs among the k supports with the largest marginal delta. `interactionCoverage` is `'partial'`, and the report says so.
- `interactions: 'none'`: `interactionCoverage: 'none'`. Entries are labelled "marginal given the others, interactions not measured". They are never labelled "standalone value".
- A flagged pair is displayed as a pair. Neither gem is named "lowest value" on its own figure.
- Removal of an unflagged support is still a *single-change* measurement: it does not predict the effect of removing two at once. The card says "removing this one".

### 2.4 Minus-cost and cost-side supports

A support can have a cost multiplier below 100 % or a reservation effect. Its value is then efficiency, and its DPS delta is about zero. A DPS-only probe would call it worthless.

- Alongside `TotalDPS` the probe reads `ManaCost`, `ManaPerSecondCost`, `LifeCost`, `ESCost`, `SoulCost`, `Spirit`, `SpiritUnreserved`, `Speed` (`SupportCostStat`). These keys exist in the recorded export's `PlayerStat` list; that the live `get_calcs` returns the same keys is **assumed**.
- `cost[]` carries before and after for each. `costOnly` is true when the DPS delta is inside the gate tolerance and a cost stat moved outside it.
- Cost and damage are **never** merged into one number. The card shows both. Which one outranks the other is an owner decision.
- A support whose value is only cost, with no stat moved at all (for example a Spirit effect PoB does not model), is `no-measurable-effect`, not valueless.

### 2.5 When removal changes the main-skill selection

`TotalDPS` belongs to the selected active skill and part. A removal can change that (the support grants or converts a skill, the selected gem becomes invalid, or the addon re-picks the default). Comparing `TotalDPS` across two different skills is meaningless.

- After every removal read `main: MainSelectionReadback { group, activeIndex, skillPart, skillName }` and compare with step 1.
- Different: outcome `main-skill-changed`, `metric: null`, no delta shown, both skill names in `reason`. The removal is not retried with the old selection forced; whether to force it is an owner decision.
- `TotalDPS` is 0 or the skill is unusable: outcome `breaks-skill`. The support is *required*; it is not shown as a large measured gain from keeping it.
- An addon that cannot report `main` makes the whole probe `failed: rpc-unsupported` for this feature (the selection cannot be verified, so no number is trusted).

### 2.6 Replacing "nominal, not measured"

Current state, verified in code: `reviewDamage` (`recommend/damage.ts`) names no lowest-value support and pushes the note "Support values are nominal (each gem's own figures), not measured on this build, so no support is named as the lowest-value one. Removing each in Path of Building would measure it." Nominal `supportValue` stays as the fallback.

The labels change only when a measurement is **injected**. `reviewDamage` would accept an optional `SupportMeasurementInput { report }` (not wired in this task). A report is used for a given support only when every condition holds; otherwise the existing text is kept and the first failing condition is recorded as a `SupportMeasurementRejection`:

| Condition | Rejection if false |
|---|---|
| a report was injected | `no-report` |
| `report.status === 'measured'` | `status-not-measured` |
| `baselineGate.ok` | `baseline-gate-failed` |
| `reverted` | `not-reverted` |
| `fingerprintBefore` equals the analysed build's (same PoB commit, config hash, content) | `build-differs-from-analysed` |
| `report.group` is the analysed main group | `group-not-the-analysed-main-group` |
| the gem is in `entries` | `gem-not-in-report` |
| its outcome is `measured` or `no-measurable-effect` | `entry-unmeasured` / `main-skill-changed` |
| the report is not `partial` for the claim being made | `partial-report` |

When all hold: the support's figure is labelled `pob-sim` (`SupportValueLabel`), with the DPS change, the cost changes and the interaction coverage. A **lowest-value support** may be named only when (a) every enabled offensive support in the group has a measured entry, (b) none is in a flagged interaction, and (c) the naming states "least DPS lost when removed (this build, this configuration)". Otherwise the text is "lowest among those measured" or, with no qualifying report, the nominal note as today. The nominal path is never relabelled `pob-sim`.

The measurement is under the export's own configuration (conditionals on). That is stated on the card; a sensitivity range (`measureSensitivity`) can bracket it later but is not required.

### 2.7 PoB-side requirement

`snapshot_state`/`restore_state`/`state_fingerprint` (scope `skills`), `get_skill_groups` with per-gem `enabled`, `apply_step{set_gem_field}` with `expectName`, and a main-selection readback. All **assumptions**; none exist in the addon today (the bridge has passive-node and custom-mod simulation only).

### 2.8 Baseline expectations that gate it

`ninjaBaselineExpectations(stats, mainSkillDps)` with `mainSkillDps` set. A report without a `TotalDPS` expectation is refused (`withheld`): the delta is a DPS delta and the baseline DPS must reproduce poe.ninja's figure for that skill. Additional per-entry sanity: after re-enabling, `TotalDPS` equals the baseline within the gate's absolute tolerance, else `revert-failed`.

### 2.9 Failure and `unknown` behaviour

| Condition | Result |
|---|---|
| Gate fails | `withheld`; nominal text stays |
| `rpc-unsupported` | `failed`; nominal text stays |
| `gem-mismatch` | that entry `unmeasured`, others continue |
| Selection changed | entry `main-skill-changed`, no delta |
| Budget ends | `partial: true`; unmeasured entries listed; no lowest-value naming |
| Revert not proven | `failed: revert-failed`; entire report discarded |

### 2.10 Test plan

Fake transport with scripted replies, no live PoB; no fixtures committed here.

- Gate failure: zero mutating calls; `withheld`.
- Leave-one-out arithmetic: scripted `TotalDPS` per removal gives the entries; entries ordered as requested.
- Interaction: scripted values where `both ≠ a·b` flag a pair; independence gives synergy ≈ 0 and `flagged: false`.
- Minus-cost support: DPS unchanged, `ManaCost` lower: `costOnly: true`, outcome not `no-measurable-effect` for cost.
- Selection change: scripted `main` differs: `main-skill-changed`, `metric: null`.
- `TotalDPS` 0: `breaks-skill`.
- Revert: scripted fingerprint mismatch: `failed: revert-failed`.
- Consumer rules (when wired): each `SupportMeasurementRejection` row is one test; a stale fingerprint keeps the nominal note byte-for-byte.
- Needed recorded fixtures (later task): `get_skill_groups` and `get_calcs` for a build with a minus-cost support and one with a skill-converting support; the golden for the nominal path must remain unchanged when no report is injected.

### 2.11 Risk and estimate

- Risk: medium. The mutation is small and reversible; the real risks are an addon that returns stale `get_calcs` after a gem toggle (caught by the cost and `TotalDPS` readbacks and the post-restore equality) and wall time for pairs (budgeted).
- Estimate: probe **M** after the section 0 primitives and `set_gem_field`; analyzer wiring and wording **S**.
