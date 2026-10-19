import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readVersion } from '../api/character.js'

const sse = (chunks, { hang = true } = {}) => ({
  status: 200,
  ok: true,
  headers: { get: () => null },
  body: new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk))
      if (!hang) c.close()
    },
  }),
})

test('reads the version from the first data frame of a stream that never closes', async () => {
  const fetchImpl = async () => sse(['data: {"version":43}\n\n'])
  assert.deepEqual(await readVersion('https://x', undefined, { fetchImpl }), { version: 43 })
})

test('a stream that sends no frame is answered as not-found at the first-frame deadline', async () => {
  const fetchImpl = async () => sse([':\n'])
  const started = Date.now()
  const out = await readVersion('https://x', undefined, { fetchImpl, firstFrameMs: 50 })
  assert.deepEqual(out, { error: 'not-found' })
  assert.ok(Date.now() - started < 1000)
})

test('a frame without a version is not-found', async () => {
  const fetchImpl = async () => sse(['data: {}\n\n'])
  assert.deepEqual(await readVersion('https://x', undefined, { fetchImpl }), { error: 'not-found' })
})
