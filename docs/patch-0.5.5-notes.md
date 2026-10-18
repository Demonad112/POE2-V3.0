# Patch 0.5.5 notes used by the analyzer

Source for every value below: the official 0.5.5 patch notes,
<https://www.pathofexile.com/forum/view-thread/4000864> (release 2026-09-04).
Values were extracted from that page on 2026-10-16 with a summarising fetch, not
copied from the raw HTML: re-check a number against the thread before relying on
it for anything beyond a display note.

## Soul Cores

- **Limit of 1** (verified, official notes): Jiquani, Opiloti, Puhuarte,
  Ticaba, Topotante, Tzamoto, Xopec, Zalatl. Table: `SOUL_CORE_LIMITS`
  (`packages/core/src/gear/audit.ts`). The notes do not say whether the limit
  counts across equipped items only; the audit counts active gear and lets a
  `Limit` property on the item override the table.
- **Changed values**: `SOUL_CORE_VALUE_CHANGES` in the same file, shown in the
  audit as "value changed in 0.5.5". Display only; nothing scores from it.
- **Not recorded**: the 17 new cores (13 "Jiquani's Soul Core of ...", 4
  "Atziri's Soul Core of ..."). Their effects are not in the notes the analyzer
  could read, so they stay `unknown`. A third-party report (playnews.gg) says
  they appear only in the Steam item-filter block with no effects; not verified.

## Bosses

The Arbiter of Ash (Fire Resistance, Cold Vulnerability), the Arbiter of
Divinity (Lightning Resistance, Fire Vulnerability), Omniphobia and the Raven
Trickster no longer have All Elemental Resistances. Already reflected in
`apps/web/src/data/bosses.ts`. The page does not use the word "pinnacle".

## Weapon sets (bug fixes)

- Skills from an alternate Weapon Set could be used without the weapon swap.
- Auras and Support Gems from an inactive Weapon Set still applied.
- A Unique-item-granted skill could be used with non-Unique weapons equipped in
  another Weapon Set.

Relevance: an old character export can show an inactive set's skills as in use.
The analyzer already excludes the inactive set (`item.active`).

## Not verified

- Whether the Limit counts per character or per item type. Checked 2026-10-18: secondary coverage (PlayNews) says a second equipped Jiquani core stops counting but does not give the scope; the poe2wiki "Soul cores" page says per character but may predate 0.5.5. Neither is official, so it stays unverified.
- Effects of the 17 new cores. Checked 2026-10-18: PlayNews reports they shipped with no published effect, so there is nothing to read until GGG publishes them.
- Hotfix 0.5.5c (2026-09-18). Checked 2026-10-18 against secondary news only (no official post found): quest and boss blockers (Legacy of the Precursors, Act 4 island, three bosses) and crash fixes. Nothing reported touching stats, cores or the passive tree. Official notes not read.
