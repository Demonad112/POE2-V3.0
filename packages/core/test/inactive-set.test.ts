import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { inactiveSetReport } from '../src/model/slots.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const recorded = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8')) as { charModel?: Record<string, unknown> }
const model = (recorded.charModel ?? recorded) as Parameters<typeof inactiveSetReport>[0]

const weapon = (itemSlot: number, name: string, grantedSkills: unknown[] = []) => ({ itemSlot, itemData: { name, grantedSkills } })
const skill = (name: string, weaponSet?: number) => ({ dps: [{ name }], ...(weaponSet === undefined ? {} : { weaponSet }) })

describe('inactiveSetReport', () => {
  it('lists the inactive set items and says skills are unknown on the recorded character', () => {
    const r = inactiveSetReport(model)
    expect(r.activeSet).toBe(1)
    expect(r.inactiveSet).toBe(2)
    expect(r.items.map((i) => i.slotLabel).sort()).toEqual(['Main Hand', 'Off Hand'])
    expect(r.skills.status).toBe('unknown')
  })

  it('marks the active set as assumed only when the flag is absent', () => {
    const { useSecondWeaponSet: _drop, ...rest } = model as Record<string, unknown>
    expect(inactiveSetReport(rest as never).activeSetAssumed).toBe(true)
    expect(inactiveSetReport({ ...model, useSecondWeaponSet: false }).activeSetAssumed).toBe(false)
    expect(inactiveSetReport({ ...model, useSecondWeaponSet: true }).activeSetAssumed).toBe(false)
  })

  it('flips when the second set is live', () => {
    const r = inactiveSetReport({ ...model, useSecondWeaponSet: true })
    expect(r.activeSet).toBe(2)
    expect(r.items.map((i) => i.name)).toEqual(expect.arrayContaining(['Loath Bane', 'Brood Dart']))
  })

  it('names granted skills of inactive-set items', () => {
    const r = inactiveSetReport({
      items: [weapon(15, 'Staff', [{ name: 'Spark' }, 'not-an-object', null]), weapon(7, 'Bow')],
      skills: [],
    } as never)
    expect(r.items).toEqual([{ slotLabel: 'Main Hand', name: 'Staff', grantedSkills: ['Spark'] }])
  })

  it('lists inactive-set skills only when every named skill carries a marker', () => {
    const r = inactiveSetReport({ items: [], skills: [skill('Ice Shot', 1), skill('Spark', 2)] } as never)
    expect(r.skills).toEqual({ status: 'known', names: ['Spark'] })
  })

  it('stays unknown when only some skills carry a marker, or a marker is invalid', () => {
    expect(inactiveSetReport({ items: [], skills: [skill('Ice Shot', 1), skill('Spark')] } as never).skills.status).toBe('unknown')
    expect(inactiveSetReport({ items: [], skills: [skill('Ice Shot', 3)] } as never).skills.status).toBe('unknown')
    expect(inactiveSetReport({ items: [], skills: [] } as never).skills.status).toBe('unknown')
  })
})

describe('analyzeCharacter inactiveSet', () => {
  it('is attached to the analysis', async () => {
    const a = await analyzeCharacter(recorded)
    expect(a.inactiveSet.inactiveSet).toBe(2)
    expect(a.inactiveSet.skills.status).toBe('unknown')
  })
})
