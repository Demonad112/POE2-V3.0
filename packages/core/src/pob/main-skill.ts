/**
 * The skill a Path of Building export marks as the main one.
 *
 * `<Build mainSocketGroup="N">` picks the Nth `<Skill>` group of the active
 * `<SkillSet>`; that group's `mainActiveSkill` picks which of its active (non
 * support) gems is selected. Regex-based for the same reason as `readPlayerStats`:
 * it must run identically in Node and the browser.
 *
 * Returns null whenever any step cannot be resolved. A guessed main skill would
 * be worse than none, so every missing piece means "unknown".
 */

export interface PobMainSkill {
  /** 1-based socket group PoB marks as main. */
  group: number
  /** The selected active gem's name in that group. */
  name: string
}

function attrOf(tag: string, name: string): string | null {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null
}

export function readPobMainSkill(xml: string): PobMainSkill | null {
  const group = Number(attrOf(/<Build\b[^>]*>/.exec(xml)?.[0] ?? '', 'mainSocketGroup'))
  if (!Number.isInteger(group) || group < 1) return null

  const skillsTag = /<Skills\b[^>]*>/.exec(xml)?.[0] ?? ''
  const setId = attrOf(skillsTag, 'activeSkillSet')
  const sets = [...xml.matchAll(/<SkillSet\b([^>]*)>([\s\S]*?)<\/SkillSet>/g)]
  const set = sets.find((s) => attrOf(s[1] ?? '', 'id') === setId) ?? sets[0]
  if (!set) return null

  const groups = [...(set[2] ?? '').matchAll(/<Skill\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Skill>)/g)]
  const chosen = groups[group - 1]
  if (!chosen) return null

  // PoB writes "nil" for the default, which is the first active skill.
  const raw = attrOf(chosen[1] ?? '', 'mainActiveSkill')
  const index = raw === null || raw === 'nil' ? 1 : Number(raw)
  if (!Number.isInteger(index) || index < 1) return null

  const active = [...(chosen[2] ?? '').matchAll(/<Gem\b([^>]*)>/g)]
    .map((g) => g[1] ?? '')
    .filter((g) => !(attrOf(g, 'skillId') ?? '').startsWith('Support') && attrOf(g, 'enabled') !== 'false')
  const name = attrOf(active[index - 1] ?? '', 'nameSpec')?.trim()
  return name ? { group, name } : null
}
