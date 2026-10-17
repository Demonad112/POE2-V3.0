import { describe, expect, it } from 'vitest'
import type { Analysis } from '@poe2/core'
import { changedFor, characterNotes, FOCUS_CHOICES, focusOf } from '../src/lib/characterNotes'

const inactiveSet = {
  activeSet: 1,
  inactiveSet: 2,
  activeSetAssumed: true,
  items: [],
  skills: { status: 'unknown', reason: 'no markers' },
} as never

describe('focus choices', () => {
  it('maps Default to no focus so the order is unchanged', () => {
    expect(focusOf('default')).toBeNull()
    expect(focusOf('mapping')).toBe('mapping')
    expect(focusOf('bossing')).toBe('bossing')
    expect(FOCUS_CHOICES.map((c) => c.value)).toEqual(['default', 'mapping', 'bossing'])
  })
})

describe('characterNotes', () => {
  it('reports every ailment as unknown when no gear proves immunity', () => {
    const n = characterNotes({ items: [], dps: { skills: [], primary: null }, inactiveSet } as never)
    expect(n.ailments).toHaveLength(7)
    expect(n.ailments.every((a) => a.status === 'unknown')).toBe(true)
    expect(n.mainSkill).toBeNull()
    expect(n.primaryInInactiveSet).toBeNull()
  })

  it('does not claim the primary skill is inactive when the payload has no set markers', () => {
    const n = characterNotes({ items: [], dps: { skills: [], primary: { name: 'Spark' } }, inactiveSet } as never)
    expect(n.primaryInInactiveSet).toBeNull()
  })
})

describe('changedFor', () => {
  it('is unavailable without two snapshots', () => {
    const analysis = { identity: { account: 'a', name: 'n' }, defense: { resistances: [] } } as unknown as Analysis
    expect(changedFor(analysis, []).available).toBe(false)
  })
})
