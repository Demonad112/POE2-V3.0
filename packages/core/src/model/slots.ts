/**
 * Equipment slots and weapon-set resolution.
 *
 * CORRECTNESS RULE (V1 got this wrong twice): weapon sets 1 and 2 are
 * ALTERNATES, not additions. Exactly one is live, chosen by
 * `charModel.useSecondWeaponSet`. Stats from the inactive set must never be
 * credited to the live build.
 *
 * Items carry a numeric `itemSlot`, not PoE1's string `inventoryId`.
 */

import type { CharModel, NinjaItem } from './types.js'

/** Which weapon set a slot belongs to. */
export type WeaponSet = 1 | 2

export interface SlotDef {
  id: number
  label: string
  /** Undefined for slots that exist in both sets (armour, jewellery, belt). */
  weaponSet?: WeaponSet
}

/**
 * Observed on live charModels. Ids 10, 12, 13, 14 have not been seen and are
 * deliberately absent — an unknown id yields `null`, never a guessed label.
 */
export const SLOTS: Readonly<Record<number, SlotDef>> = Object.freeze({
  1: { id: 1, label: 'Helmet' },
  2: { id: 2, label: 'Gloves' },
  3: { id: 3, label: 'Body Armour' },
  4: { id: 4, label: 'Amulet' },
  5: { id: 5, label: 'Boots' },
  6: { id: 6, label: 'Off Hand', weaponSet: 1 },
  7: { id: 7, label: 'Main Hand', weaponSet: 1 },
  8: { id: 8, label: 'Ring 1' },
  9: { id: 9, label: 'Ring 2' },
  11: { id: 11, label: 'Belt' },
  15: { id: 15, label: 'Main Hand', weaponSet: 2 },
  16: { id: 16, label: 'Off Hand', weaponSet: 2 },
})

/** Slot ids belonging to each weapon set. */
export const WEAPON_SET_SLOTS: Readonly<Record<WeaponSet, readonly number[]>> = Object.freeze({
  1: Object.freeze([6, 7]),
  2: Object.freeze([15, 16]),
})

export function slotDef(id: number): SlotDef | null {
  return SLOTS[id] ?? null
}

/** Human label for a slot id, or `Slot {id}` when unrecognised. Never guessed. */
export function slotLabel(id: number): string {
  return SLOTS[id]?.label ?? `Slot ${id}`
}

/** Which set is live. Defaults to set 1 when the flag is absent. */
export function activeWeaponSet(model: Pick<CharModel, 'useSecondWeaponSet'>): WeaponSet {
  return model.useSecondWeaponSet === true ? 2 : 1
}

export function isWeaponSlot(id: number): boolean {
  return slotDef(id)?.weaponSet !== undefined
}

/**
 * True when this slot's item contributes to the live build: every non-weapon
 * slot, plus the weapon slots of the active set only.
 */
export function isSlotActive(id: number, active: WeaponSet): boolean {
  const set = slotDef(id)?.weaponSet
  return set === undefined || set === active
}

export interface EquippedItem {
  slotId: number
  slotLabel: string
  weaponSet?: WeaponSet
  /** False for items in the inactive weapon set. */
  active: boolean
  name: string
  baseType: string
  /** Item level. Null when poe.ninja omitted it — never defaulted to 0. */
  itemLevel: number | null
  rarity: string
  corrupted: boolean
  /** Every mod line, flattened, in a stable order. */
  mods: string[]
  raw: NinjaItem
}

const FRAME_TYPE_RARITY: Readonly<Record<number, string>> = Object.freeze({
  0: 'Normal',
  1: 'Magic',
  2: 'Rare',
  3: 'Unique',
  4: 'Gem',
  5: 'Currency',
})

const MOD_KEYS = [
  'enchantMods',
  'implicitMods',
  'explicitMods',
  'craftedMods',
  'fracturedMods',
  'desecratedMods',
  'runeMods',
  'bondedMods',
  'utilityMods',
] as const

/**
 * Normalize `charModel.items` into a flat, set-aware list.
 *
 * Reads through `item.itemData` — ilvl/name/rarity are nested there, not on
 * the wrapper.
 */
export function normalizeItems(model: Pick<CharModel, 'items' | 'useSecondWeaponSet'>): EquippedItem[] {
  const active = activeWeaponSet(model)
  const items = Array.isArray(model.items) ? model.items : []

  return items
    .filter((it): it is NinjaItem => !!it && typeof it.itemSlot === 'number')
    .map((it) => {
      const d = it.itemData ?? {}
      const def = slotDef(it.itemSlot)
      const mods: string[] = []
      for (const key of MOD_KEYS) {
        const list = d[key]
        if (Array.isArray(list)) {
          for (const m of list) if (typeof m === 'string' && m) mods.push(m)
        }
      }

      const item: EquippedItem = {
        slotId: it.itemSlot,
        slotLabel: slotLabel(it.itemSlot),
        active: isSlotActive(it.itemSlot, active),
        name: d.name || d.typeLine || d.baseType || '',
        baseType: d.typeLine || d.baseType || '',
        itemLevel: typeof d.ilvl === 'number' ? d.ilvl : null,
        rarity: d.rarity ?? FRAME_TYPE_RARITY[d.frameType ?? -1] ?? 'Normal',
        corrupted: d.corrupted === true,
        mods,
        raw: it,
      }
      if (def?.weaponSet !== undefined) item.weaponSet = def.weaponSet
      return item
    })
    .sort((a, b) => a.slotId - b.slotId)
}

export interface InactiveSetReport {
  activeSet: WeaponSet
  inactiveSet: WeaponSet
  /** True when the payload had no `useSecondWeaponSet` flag, so set 1 is a default, not a reading. */
  activeSetAssumed: boolean
  /** Items sitting in the inactive set. They do not count towards the live build. */
  items: { slotLabel: string; name: string; grantedSkills: string[] }[]
  /**
   * Skills in the inactive set. `known` only when every named skill carries an
   * explicit weapon-set marker; the recorded capture carries none, so this is
   * normally `unknown`, never an empty "none".
   */
  skills: { status: 'known'; names: string[] } | { status: 'unknown'; reason: string }
}

const grantedSkillNames = (item: EquippedItem): string[] =>
  (item.raw.itemData?.grantedSkills ?? []).flatMap((g) => {
    const name = (g as { name?: unknown } | null)?.name
    return typeof name === 'string' && name ? [name] : []
  })

/** Report what sits in the inactive weapon set, so it is not mistaken for part of the live build. */
export function inactiveSetReport(model: Pick<CharModel, 'items' | 'useSecondWeaponSet' | 'skills'>): InactiveSetReport {
  const activeSet = activeWeaponSet(model)
  const inactiveSet: WeaponSet = activeSet === 1 ? 2 : 1
  const items = normalizeItems(model)
    .filter((i) => !i.active)
    .map((i) => ({ slotLabel: i.slotLabel, name: i.name, grantedSkills: grantedSkillNames(i) }))

  const named = (Array.isArray(model.skills) ? model.skills : []).flatMap((s) => {
    const name = s?.dps?.[0]?.name
    return typeof name === 'string' && name.trim() ? [{ name: name.trim(), set: s.weaponSet }] : []
  })
  const marked = named.length > 0 && named.every((s) => s.set === 1 || s.set === 2)
  const skills: InactiveSetReport['skills'] = marked
    ? { status: 'known', names: named.filter((s) => s.set === inactiveSet).map((s) => s.name) }
    : {
        status: 'unknown',
        reason: 'The payload does not say which weapon set each skill belongs to, so skills in the inactive set cannot be listed.',
      }
  return { activeSet, inactiveSet, activeSetAssumed: typeof model.useSecondWeaponSet !== 'boolean', items, skills }
}

/**
 * A sentence when the analyzer's primary skill is listed in the inactive weapon
 * set, else null. Null also when the payload does not say which set each skill
 * is in: absence of a marker is not evidence the skill is live.
 */
export function primarySkillInInactiveSet(primary: string | null, report: Pick<InactiveSetReport, 'skills' | 'inactiveSet'>): string | null {
  if (!primary || report.skills.status !== 'known') return null
  const norm = (s: string) => s.trim().toLowerCase()
  if (!report.skills.names.some((n) => norm(n) === norm(primary))) return null
  return `${primary} is the highest-damage skill, but the payload places it in weapon set ${report.inactiveSet}, which is not the active set. Its damage may not apply to the live build.`
}

/** Only the items that contribute to the live build. */
export function activeItems(model: Pick<CharModel, 'items' | 'useSecondWeaponSet'>): EquippedItem[] {
  return normalizeItems(model).filter((i) => i.active)
}
