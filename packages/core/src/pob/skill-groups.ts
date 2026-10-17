/**
 * Every skill group in a Path of Building export, with the weapon set it is
 * tied to where the export says so.
 *
 * `readPobMainSkill` reads one skill. This reads all of them, in every
 * `<SkillSet>`, so skills on the inactive weapon set (including skills granted
 * by a weapon) are listed from the export instead of "the payload does not say".
 *
 * PoB's `<SkillSet>` is a saved loadout of gem groups, NOT a weapon set; the two
 * are never conflated. A group is tied to a weapon set only by what the XML
 * states:
 *
 *  - a `slot` attribute naming a weapon slot ("Weapon 1 Swap" is weapon set 2);
 *  - a `source="Item:<id>…"` attribute whose item id sits in a weapon slot of the
 *    item set. The `source` format is read from PoB's own convention and is
 *    UNVERIFIED against a recorded export here (the committed one has only a
 *    `Tree:` source); an id it cannot place leaves the group untied.
 *
 * Anything else has `weaponSet: null`: not stated, not "set 1".
 *
 * Regex-based so it runs identically in Node and the browser.
 */

import type { InactiveSetReport } from '../model/slots.js'

export type PobSkillSource = 'gems' | 'tree' | 'item' | 'other'

export interface PobSkillGroup {
  /** 1-based position within its skill set. */
  index: number
  skillSet: string | null
  /** True for the skill set PoB has active. */
  activeSkillSet: boolean
  enabled: boolean
  label: string
  source: PobSkillSource
  /** The raw `source` attribute, when present. */
  sourceRaw: string | null
  /** Enabled non-support gems, in order. */
  skills: string[]
  supports: string[]
  /** 1 or 2 when the export ties the group to a weapon set; null when it does not say. */
  weaponSet: 1 | 2 | null
  weaponSetBasis: string | null
}

function attrOf(tag: string, name: string): string | null {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null
}

/** Weapon set a slot name belongs to, or null for a non-weapon slot. */
function weaponSetOfSlot(slot: string): 1 | 2 | null {
  if (!/^Weapon \d/.test(slot)) return null
  return /\bSwap\b/i.test(slot) ? 2 : 1
}

export function readPobSkillGroups(xml: string): PobSkillGroup[] {
  const skillsTag = /<Skills\b[^>]*>/.exec(xml)?.[0] ?? ''
  const activeId = attrOf(skillsTag, 'activeSkillSet')

  // Item ids placed in each weapon slot of the item set PoB has active.
  const itemSets = [...xml.matchAll(/<ItemSet\b([^>]*)>([\s\S]*?)<\/ItemSet>/g)]
  const activeItemSet = attrOf(/<Items\b[^>]*>/.exec(xml)?.[0] ?? '', 'activeItemSet')
  const itemSet = itemSets.find((s) => attrOf(s[1] ?? '', 'id') === activeItemSet) ?? itemSets[0]
  const setOfItem = new Map<string, { set: 1 | 2; slot: string }>()
  for (const slot of (itemSet?.[2] ?? '').matchAll(/<Slot\b([^>]*)\/?>/g)) {
    const name = attrOf(slot[1] ?? '', 'name') ?? ''
    const id = attrOf(slot[1] ?? '', 'itemId')
    const set = weaponSetOfSlot(name)
    if (set && id && id !== '0') setOfItem.set(id, { set, slot: name })
  }

  const groups: PobSkillGroup[] = []
  for (const set of xml.matchAll(/<SkillSet\b([^>]*)>([\s\S]*?)<\/SkillSet>/g)) {
    const id = attrOf(set[1] ?? '', 'id')
    let index = 0
    for (const g of (set[2] ?? '').matchAll(/<Skill\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Skill>)/g)) {
      index += 1
      const tag = g[1] ?? ''
      const gems = [...(g[2] ?? '').matchAll(/<Gem\b([^>]*)>/g)].map((m) => m[1] ?? '')
      const enabled = gems.filter((x) => attrOf(x, 'enabled') !== 'false')
      const isSupport = (x: string) => (attrOf(x, 'skillId') ?? '').startsWith('Support')
      const name = (x: string) => attrOf(x, 'nameSpec')?.trim() ?? ''

      const sourceRaw = attrOf(tag, 'source')
      const source: PobSkillSource = !sourceRaw
        ? 'gems'
        : sourceRaw.startsWith('Tree:')
          ? 'tree'
          : sourceRaw.startsWith('Item:')
            ? 'item'
            : 'other'

      let weaponSet: 1 | 2 | null = null
      let weaponSetBasis: string | null = null
      const slot = attrOf(tag, 'slot')
      const bySlot = slot ? weaponSetOfSlot(slot) : null
      if (slot && bySlot) {
        weaponSet = bySlot
        weaponSetBasis = `The export links this group to ${slot}.`
      } else if (source === 'item') {
        const itemId = /^Item:(\d+)/.exec(sourceRaw ?? '')?.[1]
        const placed = itemId ? setOfItem.get(itemId) : undefined
        if (placed) {
          weaponSet = placed.set
          weaponSetBasis = `Granted by the item in ${placed.slot}.`
        }
      }

      groups.push({
        index,
        skillSet: id,
        activeSkillSet: id === activeId || (activeId === null && groups.every((x) => x.skillSet === id)),
        enabled: attrOf(tag, 'enabled') !== 'false',
        label: attrOf(tag, 'label') ?? '',
        source,
        sourceRaw,
        skills: enabled.filter((x) => !isSupport(x)).map(name).filter(Boolean),
        supports: enabled.filter(isSupport).map(name).filter(Boolean),
        weaponSet,
        weaponSetBasis,
      })
    }
  }
  return groups
}

/** Names of enabled skills the export ties to the given weapon set. Empty when none are tied to it. */
export function pobSkillsInWeaponSet(groups: readonly PobSkillGroup[], set: 1 | 2): string[] {
  const names = groups
    .filter((g) => g.enabled && g.activeSkillSet && g.weaponSet === set)
    .flatMap((g) => g.skills)
  return [...new Set(names)]
}

/**
 * Fill the inactive set's skills from the export when the payload could not.
 *
 * The result is `partial`: only skills the export ties to the inactive set are
 * named, and a group it does not tie to any set may belong there too. When the
 * export ties nothing to the inactive set the report stays `unknown`, with the
 * reason updated to say the export was read and was silent.
 */
export function inactiveSetFromPob(report: InactiveSetReport, groups: readonly PobSkillGroup[]): InactiveSetReport {
  if (report.skills.status === 'known') return report
  const names = pobSkillsInWeaponSet(groups, report.inactiveSet)
  if (names.length) return { ...report, skills: { status: 'known', names, source: 'pob-export', partial: true } }
  const live = groups.filter((g) => g.enabled && g.activeSkillSet)
  return {
    ...report,
    skills: {
      status: 'unknown',
      reason:
        `Neither the payload nor the attached Path of Building export ties a skill to weapon set ${report.inactiveSet} ` +
        `(${live.length} skill group${live.length === 1 ? '' : 's'} read, none linked to a weapon slot), so skills in the inactive set cannot be listed.`,
    },
  }
}
