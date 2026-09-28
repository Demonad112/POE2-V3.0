import { describe, expect, it } from 'vitest'
import { importPath, importUrl } from '../src/lib/recentCharacters'

const ninja = 'https://poe.ninja/poe2/profile/Acc-1/league/character/Name'

describe('import links', () => {
  it('encodes the poe.ninja URL into the in-app path', () => {
    expect(importPath(ninja)).toBe(`/character/?import=${encodeURIComponent(ninja)}`)
    expect(new URLSearchParams(importPath(ninja).split('?')[1]).get('import')).toBe(ninja)
  })

  it('builds an absolute link to share', () => {
    expect(importUrl(ninja, 'https://example.github.io')).toMatch(/^https:\/\/example\.github\.io\/.*character\/\?import=https%3A%2F%2Fpoe\.ninja/)
  })
})
