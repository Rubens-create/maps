import { describe, expect, it } from 'vitest'
import { cacheTtlMsFromHours, readLocationCache, writeLocationCache, type LocationStorage } from './location-cache.js'

class MemoryStorage implements LocationStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const dayMs = 24 * 60 * 60 * 1_000

describe('location cache', () => {
  it('uses configurable cache validity with a 24-hour default', () => {
    expect(cacheTtlMsFromHours(undefined)).toBe(dayMs)
    expect(cacheTtlMsFromHours('6')).toBe(6 * 60 * 60 * 1_000)
    expect(cacheTtlMsFromHours('0')).toBe(dayMs)
  })

  it('reuses a valid location only until its configured expiry', () => {
    const storage = new MemoryStorage()
    const saved = writeLocationCache(storage, 'ip-location', 'ip', {
      latitude: -23.55,
      longitude: -46.63,
      accuracyKm: 20,
    }, dayMs, 1_000)

    expect(saved?.expiresAt).toBe(1_000 + dayMs)
    expect(readLocationCache(storage, 'ip-location', 'ip', 1_000 + dayMs - 1)).toMatchObject({
      latitude: -23.55,
      longitude: -46.63,
      source: 'ip',
    })
    expect(readLocationCache(storage, 'ip-location', 'ip', 1_000 + dayMs)).toBeNull()
    expect(storage.getItem('ip-location')).toBeNull()
  })

  it('does not reuse a cache entry from a different location source', () => {
    const storage = new MemoryStorage()
    writeLocationCache(storage, 'location', 'gps', { latitude: 10, longitude: 20 }, dayMs, 2_000)

    expect(readLocationCache(storage, 'location', 'ip', 2_001)).toBeNull()
    expect(storage.getItem('location')).toBeNull()
  })

  it('removes malformed entries and never stores an IP address', () => {
    const storage = new MemoryStorage()
    storage.setItem('location', '{invalid')
    expect(readLocationCache(storage, 'location', 'gps', 3_000)).toBeNull()
    expect(storage.getItem('location')).toBeNull()

    writeLocationCache(storage, 'ip-location', 'ip', { latitude: 1, longitude: 2 }, dayMs, 3_000)
    const entry = JSON.parse(storage.getItem('ip-location') ?? '{}') as Record<string, unknown>
    expect(entry).not.toHaveProperty('ip')
  })
})
