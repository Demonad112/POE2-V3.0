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
