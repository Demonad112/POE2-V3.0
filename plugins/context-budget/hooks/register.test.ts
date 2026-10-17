import { test, expect } from 'claude-code/testing'
import { DEFAULT_FOCUS } from './register'

test('a focus the person typed is left alone', async ($, on) => {
  let seen: string | undefined
  on('session.compact', (_$, e) => {
    seen = e.instructions
    return { skip: 'test' }
  })
  await $.session.compact({ instructions: 'only the plan' })
  expect(seen).toBe('only the plan')
})

test('default focus names paths and the next step', () => {
  expect(DEFAULT_FOCUS).toContain('file paths')
  expect(DEFAULT_FOCUS).toContain('next step')
})
