import { describe, expect, it } from 'vitest'
import { sparkline } from '../src/lib/sparkline'

describe('sparkline', () => {
  it('scales the lowest value to the bottom and the highest to the top', () => {
    const s = sparkline([10, 20, 30], 100, 40, 4)
    expect(s.points).toEqual([
      { x: 4, y: 36 },
      { x: 50, y: 20 },
      { x: 96, y: 4 },
    ])
    expect(s.segments).toEqual(['M4 36 L50 20 L96 4'])
    expect([s.min, s.max]).toEqual([10, 30])
  })

  it('breaks the line at a gap instead of drawing it to zero', () => {
    const s = sparkline([10, null, 30, 40], 100, 40)
    expect(s.points[1]).toBeNull()
    expect(s.segments).toHaveLength(2)
    expect(s.segments[0]).toMatch(/^M\S+ \S+$/)
  })

  it('draws a flat series at mid-height', () => {
    const s = sparkline([5, 5, 5], 100, 40)
    expect(s.points.every((p) => p?.y === 20)).toBe(true)
  })

  it('centres a single point and survives an all-missing series', () => {
    expect(sparkline([7], 100, 40).points[0]).toEqual({ x: 50, y: 20 })
    expect(sparkline([null, null], 100, 40)).toMatchObject({ segments: [], min: null, max: null })
  })
})
