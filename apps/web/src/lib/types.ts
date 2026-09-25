import type { CharacterSnapshot } from "@poe2/core";

export type SourceDoc =
  | "atlas-tree-fundamentals"
  | "strategy-guide"
  | "patch-0.5.5"
  | "creator-videos-0.5.5"
  | "creator-videos-0.5"
  | "community-digest-0.5.5";
export type Verification = "confirmed" | "unverified" | "conflicting";

export interface SourceRef {
  sourceDoc: SourceDoc;
  asOfPatch: string;
  verified: Verification;
  note?: string;
  /**
   * Video timestamps backing the claim, as `"<youtubeId>@mm:ss"`. Rendered as
   * links so a player can check the exact moment a creator says it.
   */
  citations?: string[];
}

export type RoadmapPhase =
  | "campaign-end"
  | "precursor-fortress"
  | "arbiter-of-ash"
  | "t11-checkpoint"
  | "arbiter-of-divinity-loop"
  | "full-tree"
  | "masters-and-mechanics"
  | "juiced-farming";

export interface RoadmapStep {
  id: string;
  order: number;
  phase: RoadmapPhase;
  title: string;
  description: string;
  /**
   * Checkable sub-steps. Progress is stored by index, so on an existing step
   * only ever append to this list — never insert or reorder.
   */
  actionItems?: string[];
  /** Non-checkable pointers and warnings shown under the description. */
  tips?: string[];
  benchmarkGateIds?: string[];
  relatedMistakeIds?: string[];
  source: SourceRef;
}

export type BenchmarkSeverity = "soft-guideline" | "hard-gate";

export interface BenchmarkGate {
  id: string;
  label: string;
  severity: BenchmarkSeverity;
  appliesBeforeStepId?: string;
  source: SourceRef;
}

export type Stage = "roadmap" | "atlas" | "dashboard";

export interface CommonMistake {
  id: string;
  title: string;
  description: string;
  appliesToStage: Stage[];
  relatedMechanics?: Mechanic[];
  source: SourceRef;
}

export type Mechanic =
  | "breach"
  | "abyss"
  | "delirium"
  | "ritual"
  | "expedition";

export type AtlasClusterGroup =
  | "early-progression"
  | "memory-fork"
  | "mechanic-subtree"
  | "general";

export interface AtlasCluster {
  id: string;
  name: string;
  /** Recommended allocation sequence within its group — NOT a spatial/pixel position. */
  order: number;
  group: AtlasClusterGroup;
  mechanic?: Mechanic;
  description: string;
  parentClusterId?: string;
  pointCost?: number;
  killGated?: boolean;
  source: SourceRef;
}

export type MemoryForkBranchId = "top-left" | "top-right" | "top";

export interface MemoryFork {
  id: string;
  branch: MemoryForkBranchId;
  title: string;
  nodes: string[];
  description: string;
  source: SourceRef;
}

export type RiskTier = "low" | "medium" | "high";
export type InvestmentTier = "low" | "medium" | "high";

export type StrategyTier = "S" | "A" | "B" | "C";

export interface FarmingStrategy {
  id: string;
  name: string;
  /** Creator tier placement for the current patch; absent = not ranked by any current-patch source. */
  tier?: StrategyTier;
  mechanics: Mechanic[];
  atlasSetup: string;
  investment: InvestmentTier;
  expectedReturn: string;
  risk: RiskTier;
  leagueStartViable: boolean;
  lateGameViable: boolean;
  rank: number;
  source: SourceRef;
}

export interface FragmentCost {
  itemName: string;
  quantity: number;
}

export interface PinnacleBoss {
  id: string;
  name: string;
  mechanic?: Mechanic | "trial" | "apex";
  hpFloor?: string;
  fragmentCost: FragmentCost[];
  gatingRequirements: string[];
  notes?: string;
  source: SourceRef;
}

export type BudgetTier = "league-start" | "mid" | "high";

export interface MetaBuild {
  id: string;
  name: string;
  ascendancy: string;
  playratePercent?: number;
  budgetTier: BudgetTier;
  role: string;
  source: SourceRef;
}

export interface AtlasTrapNode {
  id: string;
  node: string;
  affects: string;
  problem: string;
  /** When to skip it — "always" when there's no build it helps. */
  avoidIf: string;
  severity: "avoid" | "situational" | "optional";
  source: SourceRef;
}

export interface Biome {
  id: string;
  name: string;
  /** What the biome's passives push. */
  gives: string;
  recommendedPick: string;
  source: SourceRef;
}

export interface PrimerFact {
  id: string;
  topic: string;
  detail: string;
  source: SourceRef;
}

export interface TierBreakpoint {
  tier: string;
  areaLevel: string;
  unlocks: string;
  purpose: string;
  source: SourceRef;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  /** Where in the app it matters, e.g. a checklist step id. */
  seeStepId?: string;
}

export interface CurrencyMilestone {
  id: string;
  label: string;
  description: string;
  source: SourceRef;
}

export interface PersistedState {
  version: number;
  checklist: {
    completedStepIds: string[];
    completedActionItemKeys: string[];
    /** Hide ticked-off steps. Optional: older payloads simply lack it. */
    hideCompleted?: boolean;
    /** Highest Waystone tier completed, for the Waystone planner. 0 = none yet. */
    highestTier?: number;
  };
  atlas: {
    allocatedClusterIds: string[];
    allocatedForkIds: string[];
  };
  dashboard: {
    lastQuizAnswers: Record<string, string>;
    pinnedStrategyId?: string;
  };
  /**
   * Character history.
   *
   * Deliberately its own slice, and deliberately only snapshots: a stored
   * analysis would be hundreds of kilobytes and would put real pressure on a
   * budget shared with checklist and Atlas progress. Keeping it separate also
   * means a schema change here can never discard those.
   *
   * Added without a version bump on purpose — the reader merges over defaults,
   * so an older payload missing this key gets the empty history rather than
   * being discarded wholesale along with everything the player has ticked off.
   */
  character: {
    snapshots: CharacterSnapshot[];
  };
  /**
   * Saved replacement plans. Optional and unversioned, like `hideCompleted`:
   * the reader merges over defaults, so older payloads just lack it.
   */
  gear?: {
    shoppingList: ShoppingEntry[];
  };
  gems?: {
    /**
     * Highest support gem tier the player can cut. `null` = no limit, chosen
     * explicitly; absent = default to the highest tier already socketed.
     */
    maxSupportTier?: number | null;
  };
  updatedAt: string;
}

/**
 * One saved replacement: a snapshot of the plan's text, never a live reference
 * to an analysed item — it has to read correctly after the character is
 * re-imported, or after the gear it describes is gone.
 */
export interface ShoppingEntry {
  id: string;
  characterName: string;
  slotLabel: string;
  itemName: string;
  baseType: string;
  ilvlNeeded: number | null;
  /** "T1 +(41-45)% to Cold Resistance", best first. */
  lines: string[];
  /** Follow-up steps on other items, in order. */
  followUps: string[];
  createdAt: string;
  done: boolean;
}
