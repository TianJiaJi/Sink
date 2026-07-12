import { describe, expect, it } from 'vitest'
import { fetchWithAuth } from '../utils'

describe('/api/logs/events', () => {
  it('returns events data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/events?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toBeInstanceOf(Array)
  })
})

describe('/api/logs/locations', () => {
  it('returns locations data with valid auth', async () => {
    const response = await fetchWithAuth('/api/logs/locations?slug=0')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })
})
