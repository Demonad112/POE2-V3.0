import { describe, expect, it } from 'vitest'
import { applyLedger, resistanceTotals, type LedgerTotals } from '../src/constraints/ledger.js'

const totals: LedgerTotals = {
  fireResistance: { value: 83, floor: 75, source: 'test' },
  coldResistance: { value: 69, floor: 75, source: 'test' },
  spirit: { value: 3, floor: 0, source: 'test' },
  strength: { value: 95, floor: 90, source: 'test' },
  movementSpeed: { value: 30, floor: null, source: 'test' },
  chaosResistance: { value: null, floor: 75, source: 'test' },
}

describe('applyLedger', () => {
  it('passes a change that stays on its floors', () => {
    const r = applyLedger(totals, [{ id: 'a', label: 'a', deltas: { fireResistance: -8 } }])
    expect(r.violations).toEqual([])
    expect(r.after.fireResistance).toEqual({ min: 75, max: 75 })
  })

  it('catches two individually safe changes that break the cap together', () => {
    const a = { id: 'a', label: 'a', deltas: { fireResistance: -5 } }
    const b = { id: 'b', label: 'b', deltas: { fireResistance: -5 } }
    expect(applyLedger(totals, [a]).violations).toEqual([])
    expect(applyLedger(totals, [b]).violations).toEqual([])
    const both = applyLedger(totals, [a, b])
    expect(both.violations).toHaveLength(1)
    expect(both.violations[0]).toMatchObject({ stat: 'fireResistance', kind: 'breaks-floor', afterWorst: 73, changes: ['a', 'b'] })
  })

  it('judges a ranged delta by its worst case', () => {
    const r = applyLedger(totals, [{ id: 'a', label: 'a', deltas: { coldResistance: { min: 3, max: 9 } } }])
    expect(r.after.coldResistance).toEqual({ min: 72, max: 78 })
    // Already below the cap and not made worse, so no violation.
    expect(r.violations).toEqual([])
  })

  it('flags making an existing shortfall worse', () => {
    const r = applyLedger(totals, [{ id: 'a', label: 'a', deltas: { coldResistance: -2 } }])
    expect(r.violations[0]).toMatchObject({ stat: 'coldResistance', kind: 'worsens-shortfall' })
  })

  it('checks Spirit, attributes and movement speed', () => {
    const r = applyLedger(totals, [
      { id: 'a', label: 'a', deltas: { spirit: -4, strength: -6, movementSpeed: -10 } },
    ])
    expect(r.violations.map((v) => [v.stat, v.kind]).sort()).toEqual([
      ['movementSpeed', 'lowers'],
      ['spirit', 'breaks-floor'],
      ['strength', 'breaks-floor'],
    ])
  })

  it('does not assume safety for a total it does not know', () => {
    const r = applyLedger(totals, [{ id: 'a', label: 'a', deltas: { chaosResistance: -10 } }])
    expect(r.violations).toEqual([])
    expect(r.after.chaosResistance).toBeNull()
    expect(r.unchecked).toEqual([expect.objectContaining({ stat: 'chaosResistance', changes: ['a'] })])
  })

  it('does not fabricate a violation for a stat it has no entry for', () => {
    const r = applyLedger({}, [{ id: 'a', label: 'a', deltas: { strength: -50 } }])
    expect(r.violations).toEqual([])
    expect(r.unchecked).toHaveLength(1)
  })
})

describe('resistanceTotals', () => {
  it('uses the real uncapped total, capped value plus over-cap', () => {
    const t = resistanceTotals({
      resistances: [
        { type: 'fire', value: 75, max: 75, overCap: 8, underCap: 0, capped: true },
        { type: 'chaos', value: null, max: 75, overCap: null, underCap: null, capped: null },
      ],
    })
    expect(t.fireResistance).toMatchObject({ value: 83, floor: 75 })
    expect(t.chaosResistance?.value).toBeNull()
  })
})
