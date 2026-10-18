/**
 * Drifted poe.ninja payloads must fail loudly (audit A-5, A-6). A wrong-kind
 * field or a non-list character response must not be read as "no data".
 */

import { describe, expect, it } from 'vitest'
import { unwrapCharModel } from '../src/analyze.js'
import { NinjaClient, NinjaError, type FetchLike, type ResponseLike } from '../src/ninja/client.js'

function jsonResponse(body: unknown, status = 200): ResponseLike {
  return { ok: status < 400, status, text: async () => JSON.stringify(body), json: async () => body }
}

function clientReturning(body: unknown): NinjaClient {
  const fetch: FetchLike = async () => jsonResponse(body)
  return new NinjaClient({ fetch, proxyBaseUrl: 'https://proxy.example', retries: 0 })
}

describe('unwrapCharModel shape checks', () => {
  it('accepts absent and null fields as unknown', () => {
    expect(() => unwrapCharModel({ charModel: { name: 'A', items: null, jewels: undefined } })).not.toThrow()
    expect(() => unwrapCharModel({ name: 'A', level: null })).not.toThrow()
  })

  it('accepts the envelope and a bare model', () => {
    const model = unwrapCharModel({ type: 'character', charModel: { name: 'A', level: 90 } })
    expect(model.name).toBe('A')
    expect(unwrapCharModel({ name: 'B', items: [] }).name).toBe('B')
  })

  it('throws when a list field is not a list', () => {
    expect(() => unwrapCharModel({ items: { 0: {} } })).toThrow(/"items" is not a list/)
    expect(() => unwrapCharModel({ charModel: { skills: 'Cyclone' } })).toThrow(/"skills" is not a list/)
  })

  it('throws when an object field is not an object', () => {
    expect(() => unwrapCharModel({ defensiveStats: [1, 2] })).toThrow(/"defensiveStats" is not an object/)
    expect(() => unwrapCharModel({ breakdowns: 'none' })).toThrow(/"breakdowns" is not an object/)
  })

  it('throws when the envelope charModel is a list or a primitive', () => {
    expect(() => unwrapCharModel({ type: 'character', charModel: [] })).toThrow(/charModel that is not an object/)
    expect(() => unwrapCharModel({ type: 'character', charModel: 'x' })).toThrow(/charModel that is not an object/)
  })

  it('throws when a numeric field is a string', () => {
    expect(() => unwrapCharModel({ level: '90' })).toThrow(/"level" is not a number/)
  })
})

describe('NinjaClient response shape', () => {
  it('rejects a non-list character list rather than returning an empty list', async () => {
    // The direct path reads the version stream first, then the profile list.
    const fetch: FetchLike = async (url) =>
      url.includes('/events/')
        ? { ok: true, status: 200, text: async () => 'data: {"version":5}\n', json: async () => ({}) }
        : jsonResponse({ error: 'gone' })
    const client = new NinjaClient({ fetch, retries: 0 })
    await expect(client.listCharacters('Name#1234')).rejects.toMatchObject({ reason: 'bad-response' })
  })

  it('rejects a non-object character model from the proxy', async () => {
    const client = clientReturning(['not', 'an', 'object'])
    await expect(client.fetchCharacter('Name#1234', 'Runes of Aldur', 'Char')).rejects.toMatchObject({
      reason: 'bad-response',
    })
  })

  it('reports a network failure with reason network, not cors', async () => {
    const fetch: FetchLike = async () => {
      throw new TypeError('Failed to fetch')
    }
    const client = new NinjaClient({ fetch, proxyBaseUrl: 'https://proxy.example', retries: 0 })
    await expect(client.fetchCharacter('Name#1234', 'Runes of Aldur', 'Char')).rejects.toMatchObject({
      reason: 'network',
    })
  })
})
