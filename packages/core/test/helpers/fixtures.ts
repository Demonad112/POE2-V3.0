import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unwrapCharModel } from '../../src/analyze.js'
import type { CharModel } from '../../src/model/types.js'

const dir = fileURLToPath(new URL('../fixtures/', import.meta.url))

/** Every captured payload in test/fixtures, by file name. */
export function fixtureFiles(): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []
}

/**
 * The first fixture whose name matches, or null when it has not been committed.
 * Tests built on a capture that may not be in the repository use this with
 * `describe.skipIf(!found)` so they stay pending, not red, until it lands.
 */
export function findFixture(pattern: RegExp): { file: string; raw: unknown; model: CharModel } | null {
  const file = fixtureFiles().find((f) => pattern.test(f))
  if (!file) return null
  const raw = JSON.parse(readFileSync(dir + file, 'utf8')) as unknown
  return { file, raw, model: unwrapCharModel(raw) }
}
