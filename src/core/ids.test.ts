import { describe, expect, it } from 'vitest'
import { createDeterministicIdSource, projectIdSchema, toStepId } from './ids'

describe('ids', () => {
  it('the deterministic source yields the same valid sequence every time', () => {
    const a = createDeterministicIdSource('t')
    const b = createDeterministicIdSource('t')
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
    expect(first[0]).toBe('t00000000000000000001')
    for (const id of first) expect(projectIdSchema.safeParse(id).success).toBe(true)
  })

  it('refuses malformed ids as programmer errors', () => {
    expect(() => toStepId('short')).toThrow(/pattern/i)
    expect(() => toStepId('a b'.padEnd(21, 'x'))).toThrow(/pattern/i)
  })
})
