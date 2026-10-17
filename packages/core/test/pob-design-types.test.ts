import { describe, expectTypeOf, it } from 'vitest'
import type { ItemChangeProbe, AnointProbe, ConfigReadback, RespecProbe } from '../src/pob/probes.js'
import type {
  ConfigReadbackResult,
  ConfigValue,
  PerSkillComparison,
  PerSkillDpsProbe,
  PerSkillDpsReport,
  PerSkillReading,
} from '../src/pob/per-skill-dps.js'
import type {
  ItemChangeRequest,
  ItemMeasurement,
  MutationFailureCode,
  PobMutationRpc,
  ProbeResult,
  RangedItemMeasurement,
  RespecMeasurement,
} from '../src/pob/mutation.js'
import type {
  SupportRemovalEntry,
  SupportRemovalProbe,
  SupportRemovalReport,
  SupportValueLabel,
} from '../src/pob/support-removal.js'
import type {
  ResolvedTradeStatMap,
  TradeStatMapEntry,
  TradeVariantCompleteness,
  UnverifiedPolicy,
} from '../src/pob/trade-stat-map.js'
import type { TradeStatMap } from '../src/trade/query.js'

// Compile-time checks of the design-only shapes (docs/pob-mutation-design.md).
// Nothing here runs a probe: no implementation exists.
describe('mutation probe shapes (types only)', () => {
  it('only a measured result carries a delta', () => {
    type R = ProbeResult<ItemMeasurement>
    expectTypeOf<Extract<R, { status: 'measured' }>['delta']>().toEqualTypeOf<ItemMeasurement>()
    expectTypeOf<Extract<R, { status: 'unmeasurable' }>['delta']>().toEqualTypeOf<null>()
    expectTypeOf<Extract<R, { status: 'withheld' }>['delta']>().toEqualTypeOf<null>()
    expectTypeOf<Extract<R, { status: 'failed' }>['delta']>().toEqualTypeOf<null>()
  })

  it('every simulated result is labelled pob-sim', () => {
    expectTypeOf<ProbeResult<ItemMeasurement>['source']>().toEqualTypeOf<'pob-sim'>()
  })

  it('probe signatures', () => {
    expectTypeOf<ItemChangeProbe['measureItemChange']>().parameter(0).toEqualTypeOf<ItemChangeRequest>()
    expectTypeOf<ItemChangeProbe['measureItemChange']>().returns.resolves.toEqualTypeOf<
      ProbeResult<ItemMeasurement | RangedItemMeasurement>
    >()
    expectTypeOf<RespecProbe['measureRespec']>().returns.resolves.toEqualTypeOf<ProbeResult<RespecMeasurement>>()
    expectTypeOf<AnointProbe['measureAnoints']>().returns.resolves.toHaveProperty('cost').toEqualTypeOf<'unpriced'>()
  })

  it('gold cost is never a number', () => {
    expectTypeOf<RespecMeasurement['goldCost']>().toEqualTypeOf<'unknown'>()
  })

  it('failure codes include the unsupported-RPC degrade path', () => {
    expectTypeOf<'rpc-unsupported'>().toMatchTypeOf<MutationFailureCode>()
    expectTypeOf<keyof PobMutationRpc>().toMatchTypeOf<string>()
  })

  it('rpc names stay behind the assumed surface', () => {
    expectTypeOf<PobMutationRpc['restore_state']['params']>().toEqualTypeOf<{ token: string }>()
  })
})

describe('support removal shapes (types only)', () => {
  it('a delta exists only for a measured entry', () => {
    expectTypeOf<SupportRemovalEntry['metric']>().toEqualTypeOf<{ before: number; after: number } | null>()
    expectTypeOf<SupportRemovalEntry['outcome']>().toEqualTypeOf<
      'measured' | 'no-measurable-effect' | 'main-skill-changed' | 'breaks-skill' | 'unmeasured'
    >()
  })

  it('the probe returns the common envelope', () => {
    expectTypeOf<SupportRemovalProbe['measureRemovals']>().returns.resolves.toEqualTypeOf<ProbeResult<SupportRemovalReport>>()
  })

  it('a support value is simulated, nominal or unknown, nothing else', () => {
    expectTypeOf<SupportValueLabel>().toEqualTypeOf<'pob-sim' | 'nominal' | 'unknown'>()
  })
})

describe('trade stat mapping shapes (types only)', () => {
  it('an id can be absent but is never an empty placeholder', () => {
    expectTypeOf<TradeStatMapEntry['tradeId']>().toEqualTypeOf<string | null>()
    expectTypeOf<TradeStatMapEntry['verified']>().toEqualTypeOf<boolean>()
  })

  it('a resolved map feeds the existing builder unchanged', () => {
    expectTypeOf<ResolvedTradeStatMap['map']>().toMatchTypeOf<TradeStatMap>()
  })

  it('unverified entries are excluded unless the caller opts in', () => {
    expectTypeOf<UnverifiedPolicy>().toEqualTypeOf<'exclude' | 'include-flagged'>()
    expectTypeOf<TradeVariantCompleteness['mustKeepComplete']>().toEqualTypeOf<boolean>()
  })
})

describe('per-skill DPS and config shapes (types only)', () => {
  it('a reading carries a number only as a nullable field', () => {
    expectTypeOf<PerSkillReading['hitDps']>().toEqualTypeOf<number | null>()
    expectTypeOf<PerSkillComparison['status']>().toMatchTypeOf<string>()
  })

  it('config states are kept apart', () => {
    expectTypeOf<ConfigValue['state']>().toEqualTypeOf<'set' | 'default' | 'unreadable'>()
    expectTypeOf<ConfigReadback['readConfig']>().returns.resolves.toEqualTypeOf<ConfigReadbackResult>()
  })

  it('the per-skill probe returns the common envelope', () => {
    expectTypeOf<PerSkillDpsProbe['measurePerSkillDps']>().returns.resolves.toEqualTypeOf<ProbeResult<PerSkillDpsReport>>()
  })
})
