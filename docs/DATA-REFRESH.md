# Data refresh runbook: a new PoE2 patch

What to do, in order, when a patch lands. Where each file comes from and what
its build checks is in [`packages/data/PROVENANCE.md`](../packages/data/PROVENANCE.md);
this page is the checklist. Guide text (checklist steps, strategies, tier lists)
has its own sources and precedence in [`GUIDE_CONTENT.md`](GUIDE_CONTENT.md).

`npm test` includes `apps/web/test/dataSanity.test.ts`, which fails if the data
and the site disagree on the patch, if a file is truncated, or if a gear slot
loses its affixes. Run it after every step below.

## 0. Before the patch: know what changed

Read the patch notes for anything touching:

- **Affixes or item bases:** new or removed mods, retiered ladders, new bases → step 2.
- **The Atlas tree:** new, renamed or moved nodes → step 3.
- **The passive tree:** a new tree version (GGG export's `tree` name changes) → step 4.
- **Support gems:** new supports or changed support effects → step 5.
- **Monster damage or map area levels:** → step 6.

Nothing listed? You may only need step 1 and step 7.

## 1. Bump the patch in one place

`apps/web/src/lib/constants.ts`:

- `CURRENT_PATCH`: the new patch number.
- `LEAGUES`: the challenge leagues now live, newest first.

Bumping the patch also brings back the patch banner for everyone who closed it,
which is intended: the dismissal is stored per patch.

`dataSanity.test.ts` will now fail on `mod-tiers.json` and `bases.json` until
step 2 regenerates them for the new patch. That is the reminder.

## 2. Affix tiers and bases (`mod-tiers.json`, `bases.json`)

Source: a Path of Building 2 checkout (PathOfBuilding-PoE2), once it has
exported the new patch's data. Look for an "Export 0.x.y data" commit;
PROVENANCE.md names the commit used last time.

1. Update the checkout to that commit.
2. In `packages/data/scripts/build-mod-tiers-pob.mjs`, change the two
   `gameVersion: '0.5.5'` stamps to the new patch.
3. Run from the repository root:

   ```bash
   POB2_DIR=/path/to/PathOfBuilding-PoE2 npm run build:mod-tiers:pob -w @poe2/data
   ```

4. The build fails on any mod whose carried-over stat range disagrees with
   PoB's own text. Read each failure: a genuinely retiered mod means the stat
   ids need refreshing from RePoE-fork first (`npm run build:mod-tiers -w @poe2/data`
   when `repoe-fork.github.io` is reachable), then re-run step 3.
5. Update the counts in PROVENANCE.md ("Mods kept", "Removed", bases totals).

## 3. Atlas tree (`atlas-tree.json`)

Source: poe2db's planner data, `https://poe2db.tw/data/atlas-skill-tree/<tag>/data_us.json`.

1. In `packages/data/scripts/build-atlas-tree.mjs`:
   - `SOURCE`: poe2db's tag (currently `4.5`) is its own data version, not the
     game patch. Check the planner page's network requests for the current one.
   - The freshness check refuses data without **Royal Lenience** (new in 0.5.5).
     Swap it for a node that is new in the new patch, so an old file can't pass.
   - `treeName: 'Atlas-0.5.5'`: the new patch.
2. Delete `packages/data/generated/.cache/` and run
   `npm run build:atlas-tree -w @poe2/data`.
3. `apps/web/test/atlasTree.test.ts` fails for every guide entry whose
   `treeNodes` name no longer exists. Fix the names in `apps/web/src/data/`
   (atlasTree, trapNodes) against the new tree; don't delete the check.

## 4. Passive tree (`passive-tree.json`)

Only when the game ships a new tree version. Source: `data/psg_passive_nodes.json`
in Demonad112/poe2-mcp.

```bash
node packages/data/scripts/build-tree.mjs /path/to/poe2-mcp/data/psg_passive_nodes.json
```

Class starts and ascendancies are checked by `dataSanity.test.ts`; the build
script's three corrections (directed edges, the self-loop, ascendancy detection)
are described in PROVENANCE.md, so re-verify them if the source format changed.

## 5. Support gems (`pob-skills.json`)

From the same PoB checkout as step 2:

```bash
POB2_DIR=/path/to/PathOfBuilding-PoE2 npm run build:pob-skills -w @poe2/data
```

## 6. Monster stats (`monster-stats.json`)

Needs RePoE-fork: `npm run build:monster-stats -w @poe2/data`. If it is
unreachable, keep the current file and note that in PROVENANCE.md.

## 7. Patch-specific wording in the app

These name the patch in text and are not driven by `CURRENT_PATCH`. Update or
re-source them:

- `TIER_LIST_PATCH` in `apps/web/src/data/strategies.ts`: the patch the
  farming tier ranks were sourced on. It labels the home card, the dashboard
  intro and the tier badges. Change it only once the ranks themselves are
  re-sourced; until then the dashboard says they are not yet re-checked for
  the new patch.
- `apps/web/src/components/AuditPanel.tsx` / `packages/core/src/gear/audit.ts`:
  the `patch-0.5.5` limit source.

Find the rest with `grep -rn "0\.5\.5" apps packages --include=*.ts --include=*.tsx`.

## 8. Verify and ship

```bash
npm run typecheck && npm run lint && npm test
npm run tools -w @poe2/mcp && git diff --exit-code apps/mcp/TOOLS.md
GITHUB_ACTIONS=true npm run build && npm run e2e -w @poe2/web
```

- Import a real character for the new patch and open every panel.
- The service worker's cache version is a hash of every shipped data file
  (`apps/web/next.config.ts`), so returning visitors pick up the new data on
  their next visit. No manual bump is needed.
- Update the "Freshness" section at the top of PROVENANCE.md.
