/**
 * Single import surface for everything the tools use.
 *
 * Keeps tools.ts free of import noise, and makes the boundary explicit: if
 * something is not re-exported here, the tool layer is not reaching into it.
 */

export {
  ATTRIBUTABLE_STATS,
  CANDIDATE_GROUP_LABEL,
  EMPTY_DRAFT,
  NODE_KIND,
  analyzeContent,
  analyzeItem,
  attributionForSlot,
  attributionForStat,
  auditCharacter,
  PobBridge,
  PobBridgeError,
  decodePobExport,
  describePobConfig,
  draftResistances,
  draftStatDelta,
  editPobTree,
  pobDpsAgreement,
  rankAffixCandidates,
  findResistanceSwaps,
  findTierUpgrades,
  itemsCarrying,
  lineKey,
  normalizeItems,
  openSlots,
  parseProfileUrl,
  pathToNode,
  readPlayerStats,
  rankNodesByMeasuredGain,
  resolveAllocation,
  simulateCustomMods,
  simulatePassiveNode,
  statSources,
  suggestNodesForStat,
  summarizeSwaps,
  supportedStats,
  validateByName,
  validateSetup,
  type AttributableStat,
  type GearDraft,
} from '@poe2/core'

import { findMechanic, type Mechanic } from './mechanics.js'

/** Empty query lists everything rather than erroring. */
export function findMechanicSafe(query: string): Mechanic[] {
  return findMechanic(query)
}
