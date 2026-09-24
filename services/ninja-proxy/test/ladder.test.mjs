// Regression test for the ladder decoder, against a REAL captured response.
//
// This is the fixture that caught the bug: the decoder had never run against
// live traffic before, only against scripts/mock-proxy.mjs — which was
// written from the same understanding of the schema, so it could not have
// caught a misunderstanding shared by both. The fixture below is one page of
// poe.ninja's PoE2 builds search, captured 2026-09-24 for the "Runes of
// Aldur" league, decoded with `curl` and a standalone copy of this exact
// parser before the fix landed — that run returned zero columns, because the
// live schema had moved from field 5 to field 12. This test pins the fix
// against the same bytes so a future re-drift is caught here first.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { decodeSearchResponse, findSnapshot, toNumber, summarise } from '../api/ladder.js'

const fixturePath = fileURLToPath(new URL('./fixtures/builds-search-runes-of-aldur.bin', import.meta.url))
const bytes = new Uint8Array(readFileSync(fixturePath))

test('decodes columns from the live field-12 layout, not the old field-5 one', () => {
  const decoded = decodeSearchResponse(bytes)
  assert.ok(decoded.columns.length > 0, 'expected at least one column — the pre-fix decoder found zero')
  assert.ok(decoded.columns.includes('dps.total'))
  assert.ok(decoded.columns.includes('ehp__str'))
  assert.ok(decoded.columns.includes('life'))
  assert.ok(decoded.columns.includes('energyshield'))
  assert.ok(decoded.columns.includes('level'))
})

test('reports a plausible total and one full page of rows', () => {
  const decoded = decodeSearchResponse(bytes)
  assert.equal(typeof decoded.total, 'number')
  assert.ok(decoded.total > 0)
  assert.equal(decoded.rows.length, 100, 'poe.ninja returns exactly one page of 100 rows')
})

test('a packed numeric column (level) decodes to plausible values, not garbage', () => {
  const decoded = decodeSearchResponse(bytes)
  const levels = decoded.rows.map((r) => r.level)
  // Top-of-ladder sample: essentially all level 100, per the file's own
  // long-standing caveat about what this endpoint can and cannot answer.
  assert.ok(levels.every((l) => typeof l === 'number' && l >= 1 && l <= 100))
  assert.ok(levels.filter((l) => l === 100).length > 90)
})

test('a display-string column (dps.total) parses through toNumber into plausible DPS figures', () => {
  const decoded = decodeSearchResponse(bytes)
  const dpsValues = decoded.rows.map((r) => toNumber(r['dps.total'])).filter((v) => v !== null)
  assert.ok(dpsValues.length > 50, 'most top-of-ladder builds should report a DPS figure')
  for (const v of dpsValues) assert.ok(v > 0 && v < 1e9, `implausible DPS value: ${v}`)
})

test('summarise() over the fixture produces an ordered, sane band', () => {
  const decoded = decodeSearchResponse(bytes)
  const dps = summarise(decoded.rows.map((r) => toNumber(r['dps.total'])))
  assert.ok(dps)
  assert.ok(dps.p25 <= dps.median && dps.median <= dps.p75 && dps.p75 <= dps.max)

  const ehp = summarise(decoded.rows.map((r) => toNumber(r.ehp__str)))
  assert.ok(ehp)
  assert.ok(ehp.p25 <= ehp.median && ehp.median <= ehp.p75 && ehp.p75 <= ehp.max)

  const pool = summarise(decoded.rows.map((r) => (toNumber(r.life) ?? 0) + (toNumber(r.energyshield) ?? 0)))
  assert.ok(pool)
  assert.ok(pool.p25 <= pool.median && pool.median <= pool.p75 && pool.p75 <= pool.max)
})

test('finds a snapshot by slug first, then by display name', () => {
  const versions = [
    { url: 'forbiddenrites', name: 'Forbidden Rites', version: 'a' },
    { url: 'forbiddenriteshc', name: 'HC Forbidden Rites', version: 'b' },
  ]
  assert.equal(findSnapshot(versions, 'forbiddenriteshc').version, 'b')
  // A wrongly-derived slug still resolves if the caller sent the display name.
  assert.equal(findSnapshot(versions, 'hc forbidden rites').version, 'b')
  assert.equal(findSnapshot([{ url: 'x', displayName: 'Some League', version: 'c' }], 'Some League').version, 'c')
  assert.equal(findSnapshot(versions, 'hcforbiddenrites', 'HC Forbidden Rites').version, 'b')
  assert.equal(findSnapshot(versions, 'hcforbiddenrites'), null)
  assert.equal(findSnapshot(undefined, 'forbiddenrites'), null)
})
