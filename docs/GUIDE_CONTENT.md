# Guide content: sources and patch updates

The endgame guide (checklist, Atlas planner, dashboard) is hand-written data in
`apps/web/src/data/*.ts`. Every record carries a `SourceRef`; this file says
how those sources rank and how to update them when a patch lands.

## Source precedence

Highest first. When two sources disagree, the higher one wins and the lower one
is kept as a `note` (or a `KNOWN_CONFLICTS` entry in `sourceMeta.ts`).

| # | `sourceDoc` | What it is | Helper |
|---|---|---|---|
| 1 | `patch-0.5.5` | Official patch notes | `patchSource()` |
| 2 | `creator-videos-0.5.5` | Creators playing the current patch (Fubgun, Lazy Exile) | `videoSource(citations)` |
| 3 | `creator-videos-0.5` | 0.5.x creator guides (Asmodeus, Scorpius, MyleSwi, Spud) | `video05Source(citations)` |
| 4 | `atlas-tree-fundamentals`, `strategy-guide` | The original 0.5.4 digests | `atlasSource()`, `strategySource()` |
| 5 | `community-digest-0.5.5` | AI-compiled web research | `digestSource(note)` |

Rules:

- `digestSource()` takes no overrides and always returns `unverified`. The
  digests mixed in PoE1 mechanics (spell suppression, 6-links) and pre-0.5.5
  rules, so nothing rests on them alone.
- Video claims carry `citations` as `"<youtubeId>@mm:ss"`. `SourceFlag` renders
  them as timestamped links, so a player can check the exact moment.
- Names the auto-captions may have garbled are `verified: "unverified"` with a
  note saying so.

## Progress-safe editing

Checklist progress is stored in localStorage by step `id`, and action items by
`${stepId}::${index}`.

- Never rename a step, cluster or strategy `id`.
- On an existing step, only **append** to `actionItems`. Inserting or
  reordering shifts every saved tick below it.
- `order`, titles, descriptions and `tips` are free to change.

## When a new patch lands

1. Bump `CURRENT_PATCH` / `LEAGUES` in `apps/web/src/lib/constants.ts`.
2. Add a `patch-X.Y.Z` source doc and helper; don't overwrite the old one.
3. Grep the data for every mechanic the notes touch. For each hit, correct the
   text, switch its source to the new patch helper, and mark anything the notes
   leave unclear `unverified` with a note.
4. Re-rank `strategies.ts` only from a source dated to the new patch. Until
   then, keep ranks but label return figures "pre-X.Y.Z".
5. When creator videos for the patch appear, add a `creator-videos-X.Y.Z` doc
   and flip matching `unverified` records to `confirmed` with citations.
6. Check `KNOWN_CONFLICTS` still describes live disagreements.
7. `npm run typecheck && npm run lint && npm test && npm run build -w @poe2/web`.
