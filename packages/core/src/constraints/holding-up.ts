/**
 * What each equipped item is holding up.
 *
 * One typed map that answers "what breaks if this item goes": resistances that
 * would fall under their cap, the minimum an item (or its replacement) must
 * still provide, the item's defensive contribution, its anoint, and the
 * build-wide Spirit and attribute headroom.
 *
 * Nothing is estimated. Every part is arithmetic on figures that already exist
 * and each part names where its figures came from:
 *
 *  - `ninja`      poe.ninja's character sheet and per-stat breakdowns.
 *  - `pob-export` the Path of Building export poe.ninja embeds. Absent export
 *                 means absent figures, with the reason stated.
 *
 * A value the payload does not carry is `null` with `known: false` or a
 * `reason`, never 0. (The defence summary coerces missing resistances to 0;
 * this module looks at the raw stats so it can tell "absent" from "zero".)
 */

import type { DefenseSummary } from '../defense/index.js'
import { auditAttributes, auditSpirit, type AttributeHeadroom, type SpiritReport } from '../gear/audit.js'
import { stripModMarkup } from '../gear/analyze.js'
import type { AttributableStat, AttributionReport } from '../model/attribution.js'
import type { EquippedItem } from '../model/slots.js'
import type { CharModel } from '../model/types.js'

export type HoldingSource = 'ninja' | 'pob-export'

export interface ResistanceSlack {
  type: 'fire' | 'cold' | 'lightning' | 'chaos'
  /** False when the payload carried no figure for this resistance. */
  known: boolean
  value: number | null
  max: number | null
  /** Points above the cap that could be given up with nothing dropping below it. */
  slack: number | null
  /** Points below the cap. */
  short: number | null
  source: 'ninja'
}

export interface ItemHold {
  stat: AttributableStat
  label: string
  /** Flat amount the item grants. */
  flat: number
  /** What the sheet loses with the item removed, cap applied. */
  loss: number
  /** True when removal drops a capped stat below its cap. */
  dropsBelowCap: boolean
  /**
   * For a capped stat: how much of it the item (or its replacement) must still
   * provide so the sheet does not get worse, given the other sources. For a
   * stat at its cap that is the amount needed to stay capped, 0 when the
   * overcap already covers the loss; for a stat still short of its cap it is
   * the item's whole contribution. Null for uncapped stats, which have no
   * breakpoint.
   */
  minToKeep: number | null
  source: 'ninja'
}

export interface ItemHolds {
  slotId: number
  slotLabel: string
  itemName: string
  active: boolean
  holds: ItemHold[]
  /** Enchant lines on the amulet (the anoint). Empty when none or not an amulet. */
  anoint: string[]
}

export interface HoldingUpMap {
  resistances: ResistanceSlack[]
  items: ItemHolds[]
  spirit: { value: SpiritReport | null; reason: string | null; source: 'pob-export' }
  attributes: { value: AttributeHeadroom[]; reason: string | null; source: 'pob-export' }
  movementSpeed: {
    value: number | null
    /** Per-item movement speed is not attributable: poe.ninja's breakdown for it is not checkable. */
    perItem: 'unknown'
    source: 'ninja'
  }
}

const AMULET_SLOT = 4
const RESISTANCES = ['fire', 'cold', 'lightning', 'chaos'] as const

export interface HoldingUpInput {
  model: Pick<CharModel, 'defensiveStats'>
  defense: DefenseSummary
  attribution: AttributionReport
  items: EquippedItem[]
  pobStats: Record<string, number> | null
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function holdingUp(input: HoldingUpInput): HoldingUpMap {
  const stats = (input.model.defensiveStats ?? {}) as Record<string, unknown>

  const resistances: ResistanceSlack[] = RESISTANCES.map((type) => {
    const summary = input.defense.resistances.find((r) => r.type === type)
    if (!finite(stats[`${type}Resistance`]) || !summary) {
      return { type, known: false, value: null, max: null, slack: null, short: null, source: 'ninja' as const }
    }
    return {
      type,
      known: true,
      value: summary.value,
      max: summary.max,
      slack: summary.overCap,
      short: summary.underCap,
      source: 'ninja' as const,
    }
  })

  const statOf = (stat: AttributableStat) => input.attribution.stats.find((s) => s.stat === stat)

  const items: ItemHolds[] = input.attribution.items.map((row) => {
    const holds: ItemHold[] = row.contributions.map((c) => {
      const sheet = statOf(c.stat)
      return {
        stat: c.stat,
        label: c.label,
        flat: c.flat,
        loss: c.loss,
        dropsBelowCap: c.dropsBelowCap,
        minToKeep: !sheet || sheet.cap === null ? null : Math.max(0, sheet.total - c.withoutUncapped),
        source: 'ninja' as const,
      }
    })
    const equipped = input.items.find((i) => i.slotId === row.slotId)
    const anoint =
      row.slotId === AMULET_SLOT
        ? (equipped?.raw.itemData?.enchantMods ?? []).filter((l): l is string => typeof l === 'string').map(stripModMarkup)
        : []
    return { slotId: row.slotId, slotLabel: row.slotLabel, itemName: row.itemName, active: row.active, holds, anoint }
  })

  // An amulet with an anoint but no attributed stats still needs its row.
  for (const item of input.items) {
    if (item.slotId !== AMULET_SLOT || items.some((r) => r.slotId === AMULET_SLOT)) continue
    const anoint = (item.raw.itemData?.enchantMods ?? [])
      .filter((l): l is string => typeof l === 'string')
      .map(stripModMarkup)
    if (anoint.length)
      items.push({ slotId: item.slotId, slotLabel: item.slotLabel, itemName: item.name, active: item.active, holds: [], anoint })
  }
  items.sort((a, b) => a.slotId - b.slotId)

  const noExport = 'No Path of Building export was attached, and poe.ninja alone does not report this.'
  const spirit = input.pobStats ? auditSpirit(input.pobStats) : null
  const attributes = auditAttributes(input.pobStats)

  return {
    resistances,
    items,
    spirit: {
      value: spirit,
      reason: spirit ? null : input.pobStats ? 'The export carries no Spirit / SpiritUnreserved figures.' : noExport,
      source: 'pob-export',
    },
    attributes: {
      value: attributes,
      reason: attributes.length ? null : input.pobStats ? 'The export carries no attribute requirement figures.' : noExport,
      source: 'pob-export',
    },
    movementSpeed: {
      value: finite(stats.movementSpeed) ? stats.movementSpeed : null,
      perItem: 'unknown',
      source: 'ninja',
    },
  }
}
