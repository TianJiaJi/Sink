import { describe, expect, it, vi } from 'vitest'
import { pickAbVariant } from '../../server/utils/ab-routing'

describe('pickAbVariant', () => {
  it('returns the only variant when there is one', () => {
    expect(pickAbVariant([{ url: 'https://a.example', weight: 1 }])).toBe('https://a.example')
  })

  it('picks the first variant when random lands at the low end', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickAbVariant([
      { url: 'https://a.example', weight: 1 },
      { url: 'https://b.example', weight: 1 },
    ])).toBe('https://a.example')
    vi.restoreAllMocks()
  })

  it('picks the last variant when random lands at the high end', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(pickAbVariant([
      { url: 'https://a.example', weight: 1 },
      { url: 'https://b.example', weight: 1 },
    ])).toBe('https://b.example')
    vi.restoreAllMocks()
  })

  it('respects weights over a large sample (9:1 split)', () => {
    let aHits = 0
    for (let i = 0; i < 1000; i++) {
      if (pickAbVariant([
        { url: 'https://a.example', weight: 9 },
        { url: 'https://b.example', weight: 1 },
      ]) === 'https://a.example') {
        aHits++
      }
    }
    // Expect ~900, allow generous slack for randomness
    expect(aHits).toBeGreaterThan(800)
    expect(aHits).toBeLessThan(1000)
  })

  it('returns empty string for empty input', () => {
    expect(pickAbVariant([])).toBe('')
  })
})
