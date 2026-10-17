# PoB worker design (not built)

Purpose: describe how item-level simulation, affix ablation and candidate generation could run as a service. Nothing here exists in the repo. The static site cannot host it; the core only defines the interfaces.

## Why a worker

Today's bridge (`packages/core/src/pob/bridge.ts`) talks to a desktop PoB over TCP, one request per connection, mutating the user's open build (audit C-1). A service would own its own PoB instances instead.

## Components

1. **Worker process**: a PoB engine that loads one build, then answers calculations. Options, none verified here:
   - the desktop PoB plus the community addon, run under a virtual display (heavy, proven protocol);
   - a headless Lua runtime using PoB's own headless wrapper, if the PoE2 fork ships one (lighter; must be checked against the pinned PoB commit).
2. **Protocol**: reuse the existing newline-delimited JSON-RPC methods (`load_build_direct`, `set_custom_mods`, `recalculate`, `get_calcs`). Needed additions, not present in the addon today: a config-input setter (for sensitivity) and item mutation (for ablation). Both must be confirmed against the addon source before use.
3. **Session model**: load the build once per job, mutate, recalculate, diff, revert, and verify the revert as `simulateCustomMods` does now. Never share a worker between two jobs at the same time.
4. **Queue**: FIFO with a visible position. Each job holds `{cacheKey, request, state, position, createdAt}`. Workers pull jobs; the position is recomputed on each poll.
5. **Cancellation and timeouts**: per-RPC timeout (as now), per-job budget, and an `AbortSignal` passed through the orchestrators. A hung worker is killed and the job fails with a reason; partial results are returned flagged as partial, as `rankNodesByMeasuredGain` does.
6. **API**: `POST /jobs` (returns job id or the cached result), `GET /jobs/:id` (state, position, partial results). CORS and rate limits as for the ninja proxy, plus a request size cap.

## Cache key and retention

Key = SHA-256 of canonical JSON of: character content (with volatile timestamps removed), PoB config, PoB commit, game data version, engine version. This is `analysisCacheKey` in core. An unchanged character hits the cache without queueing. Retention is a policy choice (the reference's 7 days is a reasonable starting point); results are not user data and can be dropped at any time.

## Result contract

Results use the `UpgradeReport` types in core: every simulated card has `source: 'pob-sim'` with `pobVersion` and `configHash`; anything not measured appears in `notEvaluated` with a reason.

## Risks

- Addon extension needed for items and config; licence and maintenance of that addon.
- PoB and game data must be pinned together or caches silently go stale (audit C-3).
- Cost: simulation count grows with candidate count; interaction-aware search multiplies it. A budget per job is mandatory.

## Measured recommendations (design only, from `docs/analyzer-triage.md`)

Interfaces: `packages/core/src/pob/probes.ts`. Nothing implements them.

| Item | Needs | Output | Notes |
|---|---|---|---|
| A3 support value | `SupportRemovalProbe`: disable one gem, recalc, restore | DPS delta per support, `pob-sim` | Replaces the nominal figures. Until then `reviewDamage` names no lowest-value support |
| A8 every skill | `getFullDps` per skill (exists in `bridge.ts`) | PoB DPS per skill beside poe.ninja's | Compare the skills present in both; flag >5 % |
| C1 weapon / item | `ItemChangeProbe` (item mutation; not in the addon today) | DPS and survivability components separately | Totals must reconcile with the score `w_d·ln + w_s·ln` |
| C2 anoint | `AnointProbe` plus an economy source for cost | Ranked options, gain, DPS/survivability split | Cost stays "unpriced" without a price source |
| C3 gem and rune | `ItemChangeProbe`, gem quality/level, rune swaps | Measured gain, costed | Main skill first (14 gems under 20 % quality on the evidence character) |
| C4 respec | Node simulation (exists: `simulatePassiveNode`) plus gold costs | Best nearby notables per point | **Unmeasurable guard:** a node whose removal shows no change (penetration, conditional, utility) is labelled unmeasurable and never refunded, unless the config models the condition. PoB's own refund of Storm Swell / Storm Surge is this failure |
| C5 unique swap | `ItemChangeProbe` plus a unique dataset | Gain, with per-resistance drop from `applyLedger` | Ledger already built |
| X4 config | `ConfigReadback` | Resistance penalty, enemy level/conditions of the live PoB vs the export | Lets `checkBaseline` say *why* it failed. Unverified RPC names |

Every result passes `checkBaseline` first. A failing baseline withholds all deltas and names the stat.

### Tree data (A2)

`passive-tree.json` is `PassiveTree-0.5` with no patch or date. Refreshing it needs the matching `psg_passive_nodes.json`, which is not in the repository and could not be fetched offline. Steps: obtain the file for patch 0.5.5, run `build-tree.mjs`, record the patch in `PROVENANCE.md`, remove the `KNOWN_DATA_GAPS` entry in `tree.test.ts`.

### Trade search (D2)

`trade/query.ts` builds Exact / Wider / Best value from an injected `TradeStatMap`. No provenanced stat-id map exists; building one needs the trade site's stats endpoint (not callable here). Encode the `applyLedger` floors as the must-keep filters once it does.
