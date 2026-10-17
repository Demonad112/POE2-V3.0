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

---

## 3. D2: trade-query stat mapping and snapshot tests (spec)

No network is used in this task or in the tests this spec describes. No trade stat id is stated here: every id is *to be captured*.

Interfaces: `packages/core/src/pob/trade-stat-map.ts` (`TradeStatMapEntry`, `TradeStatMapFile`, `UnverifiedPolicy`, `ResolvedTradeStatMap`, `TradeVariantCompleteness`, `TradeStatsSnapshot`, `TradeQuerySnapshotCase`). It sits under `pob/` only because this task is limited to that folder; it moves next to `trade/query.ts` when built.

```ts
interface TradeStatMapEntry {
  internalId: string; tradeId: string | null; category: TradeStatCategory
  verified: boolean            // false by default
  evidence: { snapshotId: string; tradeText: string } | null
  valueTransform: { scale: number; offset: number } | null
  coverageNote: string | null
}
interface TradeStatMapFile { schemaVersion: 1; gameVersion: string | null; snapshotId: string | null; entries: Record<string, TradeStatMapEntry> }
// resolution (not implemented): TradeStatMapFile + UnverifiedPolicy -> ResolvedTradeStatMap { map, excluded, includedUnverified }
```

`buildTradeQueries(target, map: TradeStatMap)` already takes a flat `Record<internalId, tradeId>` and reports `unmapped`. This spec keeps that signature: the file is *resolved* into that record, so the existing builder and its tests do not change. What is new is only provenance (`verified`, `evidence`) and the completeness flags in section 3.3.

### 3.1 Where it lives

| Artefact | Path (proposed) | Notes |
|---|---|---|
| Mapping table | `packages/data/curated/trade-stat-map.json` | Hand-maintained plus captured ids. Deliberately **not** under `generated/` (no script regenerates it, and a data refresh must not overwrite verification state). `PROVENANCE.md` gets a section naming the snapshot id and game version |
| Recorded stats snapshot | `packages/core/test/fixtures/trade/stats-snapshot.json` | `TradeStatsSnapshot`; trimmed to the entries the map names. Committed in the later fixtures task, not here |
| Query samples | `packages/core/test/fixtures/trade/saved-query-*.json` | One real query JSON per shape, saved from the site by the owner, to check the query shape |
| Expected queries | `packages/core/test/golden/trade/*.json` | Snapshot-test outputs (section 3.4) |
| Capture procedure | `docs/DATA-REFRESH.md` section (to be added) | Manual steps; no script in CI |

The core receives the resolved map by injection, as today (`TradeStatMap`). Loading the JSON is the caller's I/O (web: static import; MCP: file read).

### 3.2 Stats needed (internal ids; trade ids to be captured)

Internal ids below are present in this repo: the first four come from `RESIST_STAT` (`gear/analyze.ts`); the rest were found by search in `packages/data/generated/mods.json`. Trade ids are `null` for all.

| Internal id | Purpose (ledger stat) | Trade id | Note |
|---|---|---|---|
| `base_fire_damage_resistance_%` | fire resistance, **must-keep** (today's `constraintsFromHoldingUp` emits only resistances) | to be captured | single-resistance trade stat; a hybrid "Fire and Cold" affix is a different trade stat (`coverageNote`) |
| `base_cold_damage_resistance_%` | cold | to be captured | same |
| `base_lightning_damage_resistance_%` | lightning | to be captured | same |
| `base_chaos_damage_resistance_%` | chaos | to be captured | same |
| `base_resist_all_elements_%` | all-elements resistance | to be captured | one trade stat for the all-elements line |
| `base_maximum_life` | wanted | to be captured | |
| `base_maximum_mana` | wanted | to be captured | |
| `base_maximum_energy_shield` | wanted | to be captured | |
| `base_spirit` | Spirit (ledger `spirit`) | to be captured | `base_spirit_from_equipment` also exists; which one the item mod uses is to be checked in the data |
| `base_movement_velocity_+%` | movement speed (ledger `movementSpeed`) | to be captured | |
| `additional_strength`, `additional_dexterity`, `additional_intelligence` | attributes | to be captured | hybrid ids (`additional_strength_and_dexterity`, …) are separate stats |
| Pseudo "total resistance" stats | optional, would match hybrids | to be captured, or marked absent | **Assumption:** the PoE2 trade site has such pseudo stats; not verified. If absent, the hybrid limitation stays documented |

Not needed now, but the same table would take them: rune and soul-core stat lines, item level, rarity, socket filters (these are filter groups, not stat ids).

### 3.3 How a missing mapping degrades

| Case | Behaviour |
|---|---|
| No entry for the internal id | Excluded; listed in `unmapped` with reason `no-entry` (existing behaviour, new reason code) |
| Entry with `tradeId: null` | Excluded; reason `no-trade-id` |
| Entry with `verified: false` | Policy `exclude` (**default**): excluded, reason `unverified`. Policy `include-flagged`: used, listed in `includedUnverified`, and the variant's `assumptions` gets "stat id not verified against a recorded snapshot" |
| Wanted stat excluded | Query still built without it; `unmapped` names it (existing) |
| **Must-keep stat excluded** | The query would admit items that break a resistance cap. The variant sets `mustKeepComplete: false` and lists `droppedMustKeep`. The UI must not present it as a safe search; whether to hide it or label it is an owner decision |
| All stats excluded | The variant has an empty `stats` array and `allVerified: true` vacuously; the builder must report `mustKeepComplete`/`unmapped` so the UI shows "cannot build" instead of an open search. The caller treats zero filters as not buildable |
| Value units differ | `valueTransform` applied to `min`; absent means identity. Not assumed to be needed |

A variant's `allVerified` is true only when every filter used came from a `verified: true` entry. The default flow therefore never shows a wrong-id search as verified.

`verified: true` is set only by a human after the schema test passes (below); a script never flips it.

### 3.4 Snapshot-test plan

Fixtures are *recorded*, never fetched by a test. Recording procedure (owner, once per game version, outside CI):

1. Open the trade site's item-search page for the game; save the stats listing response (the endpoint is an **assumption**: the PoE2 trade site's stats listing, to be read from the browser's network tab, not guessed here) as raw JSON.
2. Run a one-off trimming step that keeps only entries whose text matches the stats in 3.2 and writes `stats-snapshot.json` with `snapshotId` (content hash), `capturedAt`, `sourceUrl`, `gameVersion`.
3. For each shape, build a search on the site by hand, copy its saved query JSON (the "search JSON" the site exposes) into `saved-query-*.json`.
4. Fill `tradeId`, `category`, `evidence` for each entry; leave `verified: false`.
5. Run the tests below; after review set `verified: true` for the entries that pass.

Tests (all offline, deterministic, no timestamps in outputs):

| Test | Input | Expected |
|---|---|---|
| Map schema | `trade-stat-map.json` + snapshot | every entry's `internalId` equals its key; `schemaVersion` is 1; `verified: true` implies `evidence` present and the snapshot contains `tradeId` with text equal to `evidence.tradeText`; `verified: false` is allowed and listed; no duplicate `tradeId` across two different internal ids unless `coverageNote` explains it |
| Resolution | map file with entries: verified, unverified, null id, absent | `exclude` policy: only the verified id in `map`, the other three in `excluded` with their reasons; `include-flagged`: verified and unverified in `map`, unverified in `includedUnverified` |
| Query snapshot, exact/wider/best-value | `TradeTarget` cases below, resolved map | each case's three variants equal the committed `golden/trade/<case>.json` (`toMatchFileSnapshot`), keys in builder order |
| Shape check | `saved-query-*.json` vs builder output for the equivalent target | same top-level keys (`query.status.option`, `query.stats[].type/filters/value`, `sort`), same group nesting. This is what turns the shape from an assumption into a recorded fact |
| Completeness flags | must-keep unmapped | `mustKeepComplete: false`, `droppedMustKeep` names it, variant JSON omits the filter |
| Safety property | any case | every `filters[].id` is a value of the resolved map; no id appears that is not in the snapshot |

Query cases (inputs):

1. One resistance must-keep (fire 15), no wanted: three variants collapse to one `and` group.
2. Two resistance must-keeps from `constraintsFromHoldingUp` on the committed Athrynas fixture for one ring slot, plus life wanted.
3. Three wanted mods (life, ES, movement speed) with one must-keep: checks `count` minimums 2 and 1.
4. One wanted mod unmapped: query built, `unmapped` lists it.
5. One must-keep unmapped: `mustKeepComplete: false`.
6. One unverified entry: `exclude` vs `include-flagged` outputs differ as in 3.3.
7. Base type given: `query.type` set.
8. Empty target: no filters; the builder's current behaviour is pinned.

New golden files are created only by the later fixtures task. This task changes no golden.

### 3.5 Baseline expectations and failure behaviour

D2 simulates nothing, so `checkBaseline` does not apply. The equivalent gate is the snapshot: a mapping is trusted only while `verified` is true **and** its `snapshotId` equals the committed snapshot's. A game-version change makes the snapshot stale; the schema test then fails until the owner re-records (the version is stored in `gameVersion` so the failure message can say why). No price is estimated, as today.

### 3.6 Risk and estimate

- Risk: low-medium. A wrong id silently searches for the wrong stat, hence `verified: false` by default, exclusion of unverified entries by default, and the visible must-keep completeness flag. The query shape and the stats endpoint are unverified until the owner records them. Hybrid affixes fall outside single-stat filters.
- Estimate: schema, resolution and flags **S**; recording and verifying the map **S** (manual, owner); snapshot tests **S**; optional pseudo-stat support **M** (depends on what the site offers).

---

## 4. A8: full per-skill PoB DPS

Interfaces: `packages/core/src/pob/per-skill-dps.ts` (`SkillSelection`, `PerSkillDpsRequest`, `PerSkillReading`, `PerSkillComparison`, `PerSkillDpsReport`, `PerSkillDpsProbe`, `ConfigValue`, `ConfigComparison`, `ConfigReadbackResult`), `ConfigReadback` in `probes.ts`.

```ts
interface PerSkillDpsProbe { measurePerSkillDps(r: PerSkillDpsRequest): Promise<ProbeResult<PerSkillDpsReport>> }
interface ConfigReadback  { readConfig(names: readonly string[]): Promise<ConfigReadbackResult> }
```

Today, verified in code: the export carries one `TotalDPS`; `reconcile` pairs it with poe.ninja's figure for the export's main skill and reports "not compared" when names differ (A8 pairing, built). The recorded export has `FullDPS = 0` and `FullDotDPS = 0`, and its 12 `<Skill>` groups all carry `includeInFullDPS="nil"`: PoB's FullDPS output is empty unless groups are flagged.

### 4.1 Two ways to obtain per-skill DPS

| | (b) Selection iteration (**default**) | (a) `get_full_dps` RPC |
|---|---|---|
| Mechanism | For each skill: `apply_step{set_main_selection{group, activeIndex, skillPart}}`, `recalculate`, read `TotalDPS`/`TotalDotDPS`/`main`; restore the original selection at the end | One call to the existing `getFullDps()` |
| Per-skill figure | Yes, same stat as the baseline gate checks | Unknown. The reply shape has never been recorded; the bridge method exists but nothing in the repo calls it. **Assumption:** it lists skills only for groups with `includeInFullDPS` |
| Needs mutation | Selection only (`mainSocketGroup`, `mainActiveSkill`, part) | None for the call; but the recorded groups are unflagged, so it returns nothing until flags are set, which is itself a mutation |
| Cost | About 3 RPC calls per skill plus 5 fixed | 1 call, if flags are set |
| Fits the gate | Yes: every reading is a `TotalDPS` that `checkBaseline` already knows how to check for the baseline skill | No: FullDPS is a sum under PoB's own rules (stacking, shared-hit handling), not comparable to one skill's `dps` |
| Use | Per-skill table and comparison | Optional cross-check of the sum (`fullDps` field), never a per-skill source |

Decision in this design: **(b) is the per-skill path; (a) is a cross-check only** and runs only if the owner asks for it (see "Decision needed").

### 4.2 Procedure (select-iterate)

1. `snapshot_state{skills}`, `state_fingerprint`, `get_skill_groups` (groups, enabled active gems, current `main`).
2. `get_calcs`; `checkBaseline(expected, stats)`. This gates the **export's main skill**: Life, defences and `TotalDPS` for that skill against poe.ninja. Fail: `withheld`, no selection has been switched.
3. Build the skill list (`'ninja-listed'`: skills poe.ninja lists that PoB also has enabled; `'all-enabled'`: every enabled active gem in every enabled group).
4. For each skill: switch selection, `recalculate`, read `TotalDPS`, `TotalDotDPS`, `main`. If `main` differs from the request: reading `selection-readback-mismatch`.
5. The reading for the export's own main selection must reproduce the baseline `TotalDPS` within the gate tolerance, else the whole run is `failed: readback-mismatch` (the iteration is not taking effect).
6. `restore_state`; `state_fingerprint` must equal step 1, else `failed: revert-failed`.

Skills PoB cannot compute in the active state are **not** forced:

- Tied to the inactive weapon set (`PobSkillGroup.weaponSet` from D1 differs from the active set), or granted by an item not in the active set: `needs-weapon-set-swap`, `hitDps: null`.
- Buff or aura with no damage output: `no-damage-output` (poe.ninja gives `dps: 0` and a `dotDps` for these, `NinjaSkillDps` in `model/types.ts`). Not zero DPS.
- Skill with several parts: the part PoB defaults to is measured and `skillPart: null` is recorded; `partCount` is stored when the addon says. A multi-part skill with no way to tell which part poe.ninja used pairs as `ambiguous`.

### 4.3 Cost

With s skills read: 3·s + 5 RPC calls on the per-step path; one connection with `batch_measure`. The recorded export has 12 groups; `'ninja-listed'` reduces s to the skills poe.ninja actually reports. Wall time per `recalculate` is unmeasured. A `ProbeBudget` applies; exhaustion returns `partial: true` with the remaining skills `unmeasured`, never an invented value.

### 4.4 Reconciling with poe.ninja

Pairing rules (extending the A8 pairing already built in `reconcile`):

| Rule | Detail |
|---|---|
| Key | Skill name, trimmed, case-insensitive exact match. poe.ninja entries without `name` (meta/trigger setups, per `NinjaSkillDps`) are `ambiguous` |
| Repeated names | Two PoB readings or two poe.ninja entries with one name: `ambiguous` |
| Hit | PoB `TotalDPS` against poe.ninja `dps` |
| DoT | PoB `TotalDotDPS` against poe.ninja `dotDps`, as a separate comparison (`basis: 'dot'`) |
| Absent on one side | `not-in-ninja` / `not-in-pob`, shown, never filled |
| Tolerance | `agrees` within the gate's tolerance (1 % or 1 unit); `minor` up to 5 %; `diverges` above 5 %. 5 % is the figure from the triage note; it is a judgement threshold, not a measured one |
| Divergence | Shown with both numbers and the config differences (`ConfigReadback`), not corrected. The cause is not asserted: poe.ninja's per-skill figure comes from its own calculation and the repo cannot establish its configuration |
| Main skill | Must also agree with the existing reconcile check; a conflict between the two is a defect in the probe, not a finding |

Every PoB number is `source: 'pob-sim'`; every poe.ninja number stays `observed`. They are shown side by side, never averaged.

A divergence on a **non-main** skill does not by itself withhold the main skill's figures: the gate already passed on the main skill. It lowers confidence in the per-skill table, which says so.

### 4.5 `ConfigReadback`: names and states

`get_config_input` / `set_config_input` are used by `bridgeProbe` (`sensitivity.ts`) but have **never been verified** against the addon. Needed:

| Input | Why | Status of the name |
|---|---|---|
| `misc_buffMode` | EFFECTIVE vs COMBAT changes every figure | present in the recorded export |
| `conditionEnemyChilled`, `conditionEnemyIgnited`, `conditionEnemyBleeding`, `conditionBeenHitRecently`, `conditionCritRecently`, `conditionMoving` | conditionals the recorded export sets | present in the recorded export |
| `multiplierNearbyEnemies`, `multiplierNearbyRareOrUniqueEnemies`, `DisableEHPGainOnBlock` | present in the recorded export | present in the recorded export |
| `skill_number` | present in the recorded export | meaning not verified |
| Enemy is boss / boss type | `BOSS_KEYS` in `pob/config.ts` lists `enemyIsBoss`, `conditionEnemyBoss`, `enemyIsBossType`, `bossSkillEffect` | **not seen** in the recorded export; names are guesses, to be captured |
| Enemy level, enemy resistance and the resistance penalty | the reference tool's failure cause (triage X4) | **names unknown**, to be captured from a live PoB Configuration tab |
| Skill part | selection state, not a config input in the export | taken from the `main` readback, not from `ConfigReadback` |

The export lists only inputs that are set. So "absent from the export" means *default*, and the live value for that input must also read *default* (or the PoB default must be known). `ConfigValue` keeps `set`, `default` and `unreadable` apart; an `unreadable` input is never `equal`, and a failed gate then reports "configuration could not be compared" instead of blaming a stat.

### 4.6 PoB-side requirement

`snapshot_state`/`restore_state`/`state_fingerprint` (scope `skills`; `mainSocketGroup` must be inside it), `get_skill_groups` with the current selection, `apply_step{set_main_selection}` returning `main`, `get_config_input`. Optionally `get_full_dps` with a known shape. All **assumptions**.

### 4.7 Baseline expectations that gate it

`ninjaBaselineExpectations(stats, mainSkillDps)` with `mainSkillDps` set, evaluated on the unmutated build. Per-skill readings are then compared, not gated: a non-main skill has no gate of its own beyond the poe.ninja comparison, which is the point of the table. A run whose main-skill reading fails to reproduce the baseline is `failed`.

### 4.8 Failure and `unknown` behaviour

| Condition | Result |
|---|---|
| Gate fails | `withheld`; no per-skill table |
| Addon lacks `set_main_selection` | `failed: rpc-unsupported`; today's single-skill pairing stays |
| Selection does not take | that reading `selection-readback-mismatch` (or whole run `failed` if it is the baseline skill) |
| Weapon set or item not active | `needs-weapon-set-swap`, no number |
| Buff or aura | `no-damage-output` |
| Multi-part, part unknown | measured default part, comparison `ambiguous` |
| `FullDPS` is 0 | reported as 0 with `groupsIncluded: 0`, never summed from parts |
| Revert not proven | `failed: revert-failed`; table discarded |

### 4.9 Test plan

Fake transport; no fixtures committed here.

- Gate failure: no `set_main_selection` call.
- Iteration order, restore of the original selection, and fingerprint equality; a restore that leaves a different selection fails.
- Baseline reproduction: the export-main reading equals the baseline within tolerance; otherwise `failed`.
- Comparison table: scripted pairs for `agrees` (1 %), `minor` (3 %), `diverges` (8 %), `not-in-ninja`, `not-in-pob`, duplicate name `ambiguous`, unnamed poe.ninja skill `ambiguous`, DoT basis.
- Buff skill (`dps: 0`, `dotDps` present): `no-damage-output` hit, DoT compared.
- `FullDPS = 0`: reported as 0, no inference.
- Config comparison: set/default/unreadable combinations; unreadable never `equal`.
- Fixtures needed later: `get_skill_groups` and `get_calcs` under at least two selections; one multi-part skill; one aura; one `get_full_dps` reply from a build with flagged groups; a live `get_config_input` reply for each name above.

### 4.10 Risk and estimate

- Risk: medium. Switching the selection touches the user's `mainSocketGroup`; revert is proven by fingerprint. Per-skill config effects (stages, parts, charges) may make PoB's non-main figures differ from poe.ninja's for reasons the repo cannot see; the table reports differences, never a cause.
- Estimate: probe **M** (after section 0 and `set_main_selection`); config readback verification and names **S** (needs one live session); comparison table and reconcile integration **S**.

---

## 5. Open assumptions

Nothing below was checked against the addon, a live PoB, or the trade site. Each must be verified or recorded before the dependent code is written.

| # | Assumption | Used by |
|---|---|---|
| 1 | The addon can be extended with `snapshot_state`, `restore_state`, `state_fingerprint`, `get_items`, `get_skill_groups`, `apply_step`, `batch_measure` (all names, params, results) | all |
| 2 | The addon can reach PoB's calculator override (`calc_with_override`) for items and tree nodes without mutating | C1-C5 |
| 3 | `get_calcs` returns the cost keys seen in the export's `PlayerStat` list (`ManaCost`, `SoulCost`, `Spirit`, …) | A3 |
| 4 | An anoint is an enchant line "Allocates <notable>" on the amulet; runes and soul cores are insertable by rewriting item text | C2, C3 |
| 5 | A hybrid item or a weapon-type change can be expressed as several slot edits applied atomically, and PoB rejects or empties the conflicting slot in a way the addon can report | C1, C5 |
| 6 | Weapon-set and ascendancy passive points are separate pools that `set_passive_node` does not address | C4 |
| 7 | `get_full_dps` lists skills per group only for groups with `includeInFullDPS`; its reply shape is unknown | A8 |
| 8 | `get_config_input` / `set_config_input` exist and behave as `bridgeProbe` assumes; names for enemy level, resistance penalty and boss type are unknown | X4, A8 |
| 9 | `mainSocketGroup` is part of what a `skills` fingerprint covers and is restored by `restore_state` | A3, A8 |
| 10 | `recalculate` cost per call is small enough for 15 to 50 calls per report (**unmeasured**) | all |
| 11 | The trade site has a stats listing the owner can record, a saved-query JSON the owner can copy, and (optionally) pseudo total-resistance stats; no trade stat id is known | D2 |
| 12 | The unique-item and anoint-recipe datasets that C2/C5 need can be sourced; neither is in the repo | C2, C5 |
| 13 | poe.ninja's per-skill `dps` is comparable to PoB `TotalDPS` for the same-named skill | A8 |

## 6. Decision needed from owner

1. **Addon route.** Extend the existing community addon, fork it, or run a PoB headless wrapper? (`docs/pob-worker-design.md` lists the options; assumption 1 and 2 depend on it.)
2. **Override-first or mutate-first.** Require `calc_with_override` (no revert risk, may not exist) before items work, or accept `mutate-revert` with fingerprint proof from day one?
3. **Interaction threshold** for flagging supports (`synergy` size), and whether `all-pairs` is the default up to 6 supports.
4. **Cost vs damage** for supports: show both side by side (as designed) or define a ranking rule between them?
5. **Forced selection** when a removal changes the main skill: report only (as designed) or re-measure with the original selection forced?
6. **Must-keep unmapped** trade filters: hide the query, or show it labelled "not a safe search"? And whether `include-flagged` unverified ids may ever be user-visible.
7. **Recording duty** for D2: who records the trade stats snapshot and saved queries, and per game version or per league?
8. **Divergence tolerance** for per-skill DPS: keep 1 % / 5 %, or set others?
9. **Unmeasurable respec nodes**: refuse to refund them always (as designed), or allow when `ConfigReadback` shows the config models the condition?
10. **Datasets** for unique swaps and anoint recipes: source and ownership. Until they exist C2 and C5 are interface-only.
11. **Gold and price sources**: none exist; costs remain `unpriced` / `unknown` unless one is chosen.
12. **Per-skill scope**: `'ninja-listed'` only, or all enabled skills including those with no poe.ninja counterpart?

## 7. Recommended build order

| Step | Build | Why now | Size | Unlocks |
|---|---|---|---|---|
| 0 | Decision 1; **record** `get_calcs`, `get_skill_groups`-equivalent and a config readback from a live PoB (fixtures task) | Everything depends on verifying assumptions 1-3, 8-10 | S | all |
| 1 | D2 mapping schema, resolution, tests, owner records snapshot | No PoB needed, offline, independent; removes a dead end early | S + owner time | trade search for existing findings |
| 2 | Section 0 primitives: snapshot / restore / fingerprint, readbacks | Every probe's revert proof | M | 3-7 |
| 3 | `ConfigReadback` (verify `get_config_input`) | Cheap; lets the baseline gate say why it failed | S | explains gate failures, A8 |
| 4 | A3 `SupportRemovalProbe` + analyzer wiring | Smallest mutation (one field), highest-value finding; replaces a nominal label | M + S | A3 |
| 5 | A8 `set_main_selection` + per-skill table | Reuses step 2-3; no new item semantics | M | A8 |
| 6 | C3 gem quality/level (`set_gem_field` already exists from step 4) | Almost free after A3 | S | C3 part |
| 7 | Item mutation (`calc_with_override` or `set_item`): C1, then C3 runes/soul cores | Largest addon work; needs socket and weapon-set handling | L | C1, C3 |
| 8 | C2 anoint ranking | Item mutation plus candidate list | M | C2 |
| 9 | C5 unique swap | Needs the unique dataset | M + dataset L | C5 |
| 10 | C4 respec | Largest search space, weapon-set pools, no gold data | L | C4 |
| 11 | `batch_measure` | Optimisation; add once real call counts are known | M | cost of 4-10 |

Each step ships with its fake-transport tests first and its recorded-fixture tests when the fixtures exist; nothing is shown to users until its gate and revert proof pass on a recorded build.
