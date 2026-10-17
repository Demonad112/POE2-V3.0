import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { analyzeDps } from '../src/dps/index.js'
import { mainSkillNote } from '../src/dps/main-skill.js'
import { decodePobExport } from '../src/pob/export.js'
import { readPobMainSkill } from '../src/pob/main-skill.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const gem = (skillId: string, nameSpec: string, extra = '') => `<Gem skillId="${skillId}" nameSpec="${nameSpec}" ${extra}/>`
const doc = (mainSocketGroup: string, groups: string[], activeSkillSet = '1') =>
  `<PathOfBuilding><Build mainSocketGroup="${mainSocketGroup}"/><Skills activeSkillSet="${activeSkillSet}"><SkillSet id="1">${groups.join('')}</SkillSet></Skills></PathOfBuilding>`
const group = (mainActiveSkill: string, ...gems: string[]) => `<Skill mainActiveSkill="${mainActiveSkill}">${gems.join('')}</Skill>`

describe('readPobMainSkill', () => {
  it('picks the active gem of the marked group, skipping supports', () => {
    const xml = doc('2', [
      group('1', gem('A', 'Bow Shot')),
      group('1', gem('SupportX', 'Fork'), gem('B', 'Ice Shot'), gem('SupportY', 'Rapid')),
    ])
    expect(readPobMainSkill(xml)).toEqual({ group: 2, name: 'Ice Shot' })
  })

  it('treats nil mainActiveSkill as the first active gem and honours an explicit index', () => {
    expect(readPobMainSkill(doc('1', [group('nil', gem('A', 'First'), gem('B', 'Second'))]))?.name).toBe('First')
    expect(readPobMainSkill(doc('1', [group('2', gem('A', 'First'), gem('B', 'Second'))]))?.name).toBe('Second')
  })

  it('counts a self-closing empty group so later group numbers do not shift', () => {
    const xml = doc('3', [group('1', gem('A', 'First')), '<Skill mainActiveSkill="nil" label=""/>', group('1', gem('B', 'Third'))])
    expect(readPobMainSkill(xml)).toEqual({ group: 3, name: 'Third' })
  })

  it('returns null, never a guess, when anything is missing', () => {
    expect(readPobMainSkill('<PathOfBuilding></PathOfBuilding>')).toBeNull()
    expect(readPobMainSkill(doc('nil', [group('1', gem('A', 'X'))]))).toBeNull()
    expect(readPobMainSkill(doc('5', [group('1', gem('A', 'X'))]))).toBeNull()
    expect(readPobMainSkill(doc('1', [group('3', gem('A', 'X'))]))).toBeNull()
  })

  it('reads the recorded character: group 4 is Ice Shot', async () => {
    const raw = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8')) as { charModel?: { pathOfBuildingExport: string }; pathOfBuildingExport?: string }
    const code = raw.charModel?.pathOfBuildingExport ?? raw.pathOfBuildingExport ?? ''
    expect(readPobMainSkill(await decodePobExport(code))).toEqual({ group: 4, name: 'Ice Shot' })
  })
})

describe('mainSkillNote', () => {
  const skill = (name: string, totalDps: number) => ({ name, totalDps }) as never
  const dps = (primary: string | null, skills: [string, number][]) =>
    ({ skills: skills.map(([n, d]) => skill(n, d)), primary: primary ? skill(primary, 1) : null }) as never

  it('is null when the export names no main skill', () => {
    expect(mainSkillNote(dps('Snipe', []), null)).toBeNull()
  })

  it('agrees when both name the same skill, ignoring case', () => {
    const n = mainSkillNote(dps('Ice Shot', [['Ice Shot', 100]]), 'ice shot')!
    expect(n.agrees).toBe(true)
    expect(n.exportMainTotalDps).toBe(100)
  })

  it('flags an export main skill that is not the primary', () => {
    const n = mainSkillNote(dps('Snipe', [['Snipe', 200], ['Ice Shot', 100]]), 'Ice Shot')!
    expect(n.agrees).toBe(false)
    expect(n.primary).toBe('Snipe')
    expect(n.message).toContain('still uses Snipe')
  })

  it('reports unknown agreement and DPS when it cannot compare', () => {
    const n = mainSkillNote(dps(null, []), 'Ice Shot')!
    expect(n.agrees).toBeNull()
    expect(n.exportMainTotalDps).toBeNull()
  })
})

describe('analyzeDps preferredSkill', () => {
  const model = (...entries: [string, number][]) =>
    ({ skills: entries.map(([name, dps]) => ({ dps: [{ name, dps }], allGems: [] })) }) as never

  it('prefers the named hit skill over a higher-DPS one', () => {
    const d = analyzeDps(model(['Snipe', 200], ['Ice Shot', 100]), { preferredSkill: 'ice shot' })
    expect(d.primary?.name).toBe('Ice Shot')
    expect(d.primarySource).toBe('export-main')
  })

  it('falls back to the highest-DPS hit skill when the name is absent or not a hit', () => {
    expect(analyzeDps(model(['Snipe', 200]), { preferredSkill: 'Ice Shot' }).primary?.name).toBe('Snipe')
    expect(analyzeDps(model(['Snipe', 200])).primarySource).toBe('highest-dps')
  })
})

describe('analyzeCharacter main skill', () => {
  it('makes the export main skill primary on the recorded character', async () => {
    const raw = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8'))
    const a = await analyzeCharacter(raw)
    expect(a.dps.mainSkill?.exportMain).toBe('Ice Shot')
    expect(a.dps.primary?.name).toBe('Ice Shot')
    expect(a.dps.primarySource).toBe('export-main')
    expect(a.dps.mainSkill?.agrees).toBe(true)
  })
})
