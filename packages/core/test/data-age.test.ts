import { describe, expect, it } from 'vitest'
import { dataAge } from '../src/dataage/index.js'

const now = new Date('2026-01-10T12:00:00Z')

describe('dataAge', () => {
  it('is unknown, not fresh or stale, without a timestamp', () => {
    for (const v of [null, undefined, '', 'not a date']) {
      expect(dataAge(v, now)).toEqual({ hours: null, stale: null, label: 'update time unknown' })
    }
  })

  it('is unknown for a timestamp ahead of the clock', () => {
    expect(dataAge('2026-01-11T00:00:00Z', now).stale).toBeNull()
  })

  it('reports whole hours and fresh data', () => {
    const a = dataAge('2026-01-10T09:30:00Z', now)
    expect(a.hours).toBe(2)
    expect(a.stale).toBe(false)
    expect(a.label).toBe('updated 2 h ago')
  })

  it('flags stale data at the threshold and switches to days', () => {
    expect(dataAge('2026-01-09T12:00:00Z', now).stale).toBe(true)
    expect(dataAge('2026-01-05T12:00:00Z', now).label).toBe('updated 5 d ago')
  })
})
