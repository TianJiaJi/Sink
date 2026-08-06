import { describe, expect, it } from 'vitest'
import { getLinkStatus } from '../../app/utils/link-status'

describe('getLinkStatus', () => {
  it('returns disabled when disabled is true', () => {
    expect(getLinkStatus({ disabled: true })).toBe('disabled')
  })

  it('returns expired when expiration is in the past', () => {
    expect(getLinkStatus({ expiration: Math.floor(Date.now() / 1000) - 100 })).toBe('expired')
  })

  it('returns capped when clickCount reaches maxClicks', () => {
    expect(getLinkStatus({ maxClicks: 3, clickCount: 3 })).toBe('capped')
    expect(getLinkStatus({ maxClicks: 3, clickCount: 5 })).toBe('capped')
  })

  it('returns limited when restrictions are set but not yet triggered', () => {
    expect(getLinkStatus({ expiration: Math.floor(Date.now() / 1000) + 3600 })).toBe('limited')
    expect(getLinkStatus({ maxClicks: 3, clickCount: 1 })).toBe('limited')
  })

  it('returns active when there are no restrictions', () => {
    expect(getLinkStatus({})).toBe('active')
  })

  it('prioritizes disabled over expired', () => {
    expect(getLinkStatus({ disabled: true, expiration: Math.floor(Date.now() / 1000) - 100 })).toBe('disabled')
  })
})
