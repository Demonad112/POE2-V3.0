import { describe, expect, it } from 'vitest'
import { labelOf, valueLabelInfo, type Provenance } from '../src/model/provenance.js'

describe('labelOf', () => {
  it.each([
    ['ninja', 'observed'],
    ['pob-export', 'observed'],
    ['pob-sim', 'pob-simulated'],
    ['estimate', 'derived'],
    ['derived', 'derived'],
    ['nominal', 'nominal'],
  ] as [Provenance, string][])('maps %s to %s', (p, label) => {
    expect(labelOf(p).label).toBe(label)
  })

  it('treats a missing provenance as unknown, never observed', () => {
    expect(labelOf(undefined).label).toBe('unknown')
    expect(labelOf(null).label).toBe('unknown')
  })

  it('keeps PoB-simulated apart from observed', () => {
    expect(labelOf('pob-sim').text).not.toBe(labelOf('ninja').text)
    expect(valueLabelInfo('pob-simulated').text).toBe('PoB-simulated')
  })
})
