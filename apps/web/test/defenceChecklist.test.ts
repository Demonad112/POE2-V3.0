import { describe, expect, it } from 'vitest'
import { defenceChecklist, EHP_OVERSTATEMENT_WARN } from '../src/lib/defenceChecklist'

const res = (type: string, value: number | null, max = 75) => ({
  type,
  value,
  max,
  underCap: value === null ? null : Math.max(0, max - value),
  overCap: value === null ? null : Math.max(0, value - max),
  capped: value === null ? null : value >= max,
})
const make = (over: Record<string, unknown> = {}, ailments?: unknown[]) =>
  ({
    defense: {
      resistances: [res('fire', 75), res('cold', 60), res('lightning', null)],
      lowestMaximumHit: 4200,
      lowestMaximumHitType: 'chaos',
      ehpOverstatementRatio: 1.2,
      ...over,
    },
    items: [],
    ailments,
  }) as never
const byId = (checks: ReturnType<typeof defenceChecklist>, id: string) => checks.find((c) => c.id === id)!

describe('defenceChecklist', () => {
  it('passes a capped resistance, fails an under-cap one and reports unknown for a missing one', () => {
    const c = defenceChecklist(make())
    expect(byId(c, 'res-fire').status).toBe('pass')
    expect(byId(c, 'res-cold')).toMatchObject({ status: 'fail', detail: '60/75%, 15 under cap.' })
    expect(byId(c, 'res-lightning').status).toBe('unknown')
  })

  it('notes over-cap points as reallocatable', () => {
    const c = defenceChecklist(make({ resistances: [res('fire', 90)] }))
    expect(byId(c, 'res-fire').detail).toContain('15 over cap')
  })

  it('warns only when EHP overstates the one-shot threshold past the limit', () => {
    expect(byId(defenceChecklist(make()), 'max-hit').status).toBe('pass')
    const c = defenceChecklist(make({ ehpOverstatementRatio: EHP_OVERSTATEMENT_WARN + 0.5 }))
    expect(byId(c, 'max-hit').status).toBe('warn')
  })

  it('reports an unknown maximum hit as unknown, never a pass', () => {
    expect(byId(defenceChecklist(make({ lowestMaximumHit: null })), 'max-hit').status).toBe('unknown')
  })

  it('never reads missing ailment proof as exposure', () => {
    const c = defenceChecklist(
      make({}, [
        { ailment: 'freeze', status: 'immune', sources: [{ slotLabel: 'Helmet', itemName: 'Frost Ward', line: 'Cannot be Frozen' }] },
        { ailment: 'shock', status: 'unknown', reason: 'x' },
      ]),
    )
    expect(byId(c, 'ail-freeze')).toMatchObject({ status: 'pass', detail: 'Immune: Frost Ward.' })
    expect(byId(c, 'ail-shock').status).toBe('unknown')
    expect(byId(c, 'ail-ignite').status).toBe('unknown')
    expect(c.some((x) => x.id.startsWith('ail-') && x.status === 'fail')).toBe(false)
  })
})
