import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'
import { decodePobExport } from '../src/pob/export.js'
import { inactiveSetFromPob, pobSkillsInWeaponSet, readPobSkillGroups } from '../src/pob/skill-groups.js'
import { inactiveSetReport } from '../src/model/slots.js'

const gem = (name: string, id = 'Skill') => `<Gem skillId="${id}" nameSpec="${name}" enabled="true"/>`
const xml = (groups: string, items = '') => `
<Items activeItemSet="1"><ItemSet id="1">
  <Slot name="Weapon 1" itemId="11"/><Slot name="Weapon 1 Swap" itemId="13"/><Slot name="Gloves" itemId="20"/>${items}
</ItemSet></Items>
<Skills activeSkillSet="1"><SkillSet id="1">${groups}</SkillSet><SkillSet id="2"><Skill enabled="true">${gem('Other Set Skill')}</Skill></SkillSet></Skills>`

describe('readPobSkillGroups', () => {
  const groups = readPobSkillGroups(
    xml(`
      <Skill enabled="true" label="main" mainActiveSkill="1">${gem('Flicker Strike')}${gem('Close Combat', 'SupportCloseCombat')}</Skill>
      <Skill enabled="true" source="Item:13:Spear">${gem('Spear Stab')}</Skill>
      <Skill enabled="true" source="Item:11:Quarterstaff">${gem('Quarterstaff Strike')}</Skill>
      <Skill enabled="true" source="Item:99:Mystery">${gem('Unplaced')}</Skill>
      <Skill enabled="true" source="Tree:5817">${gem('Tree Skill')}</Skill>
      <Skill enabled="false">${gem('Disabled')}</Skill>
      <Skill enabled="true" slot="Weapon 1 Swap">${gem('Slot Skill')}</Skill>`),
  )

  it('reads gems and supports, in every skill set', () => {
    expect(groups[0]).toMatchObject({ skills: ['Flicker Strike'], supports: ['Close Combat'], source: 'gems', weaponSet: null, skillSet: '1' })
    expect(groups.some((g) => g.skillSet === '2' && g.skills[0] === 'Other Set Skill' && !g.activeSkillSet)).toBe(true)
  })

  it('ties an item-granted group to the weapon set of the item’s slot', () => {
    expect(groups.find((g) => g.skills[0] === 'Spear Stab')).toMatchObject({ weaponSet: 2, source: 'item' })
    expect(groups.find((g) => g.skills[0] === 'Quarterstaff Strike')?.weaponSet).toBe(1)
    expect(groups.find((g) => g.skills[0] === 'Slot Skill')?.weaponSet).toBe(2)
  })

  it('leaves a group untied when the export does not say, rather than assuming set 1', () => {
    expect(groups.find((g) => g.skills[0] === 'Unplaced')?.weaponSet).toBeNull()
    expect(groups.find((g) => g.skills[0] === 'Tree Skill')).toMatchObject({ weaponSet: null, source: 'tree' })
  })

  it('lists only enabled skills of the active skill set for a weapon set', () => {
    expect(pobSkillsInWeaponSet(groups, 2)).toEqual(['Spear Stab', 'Slot Skill'])
    expect(pobSkillsInWeaponSet(groups, 1)).toEqual(['Quarterstaff Strike'])
  })
})

describe('inactiveSetFromPob', () => {
  const base = inactiveSetReport({ useSecondWeaponSet: false, items: [], skills: [] })

  it('fills the inactive set from the export and marks it partial', () => {
    const groups = readPobSkillGroups(xml(`<Skill enabled="true" source="Item:13:Spear">${gem('Spear Stab')}</Skill>`))
    const r = inactiveSetFromPob(base, groups)
    expect(r.skills).toEqual({ status: 'known', names: ['Spear Stab'], source: 'pob-export', partial: true })
  })

  it('stays unknown, saying the export was read and was silent', () => {
    const groups = readPobSkillGroups(xml(`<Skill enabled="true">${gem('Flicker Strike')}</Skill>`))
    const r = inactiveSetFromPob(base, groups)
    expect(r.skills.status).toBe('unknown')
    expect(r.skills.status === 'unknown' && r.skills.reason).toMatch(/Neither the payload nor the attached Path of Building export/)
  })
})

describe('on the recorded export', () => {
  const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
  it('reads every skill group and ties none to a weapon set it does not state', async () => {
    const groups = readPobSkillGroups(await decodePobExport(unwrapCharModel(raw).pathOfBuildingExport!))
    expect(groups).toHaveLength(12)
    expect(groups.map((g) => g.skills).flat()).toContain('Ice Shot')
    expect(groups.every((g) => g.weaponSet === null)).toBe(true)
    expect(groups.find((g) => g.source === 'tree')?.sourceRaw).toBe('Tree:5817')
  })

  it('surfaces the groups and keeps the inactive set unknown with the new reason', async () => {
    const a = await analyzeCharacter(raw)
    expect(a.pobSkillGroups).toHaveLength(12)
    expect(a.inactiveSet.skills.status).toBe('unknown')
  })
})
