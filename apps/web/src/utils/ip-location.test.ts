import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeLocationCache, type LocationStorage } from './location-cache.js'
import { getApproximateLocationByIp } from './ip-location.js'

class MemoryStorage implements LocationStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

const cacheKey = 'luxxie.ip-estimate.v1'
const dayMs = 24 * 60 * 60 * 1_000
let storage: MemoryStorage

describe('IP location cache and provider fallback', () => {
  beforeEach(() => {
    storage = new MemoryStorage()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'))
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reuses an unexpired IP estimate without contacting GeoJS', async () => {
    writeLocationCache(storage, cacheKey, 'ip', { latitude: -23.55, longitude: -46.63 }, dayMs)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(getApproximateLocationByIp()).resolves.toMatchObject({ latitude: -23.55, longitude: -46.63 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes an expired IP estimate and replaces its cached coordinates', async () => {
    writeLocationCache(storage, cacheKey, 'ip', { latitude: 1, longitude: 2 }, 1_000)
    vi.advanceTimersByTime(1_001)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ latitude: '-25.4', longitude: '-49.2' }),
    }))

    await expect(getApproximateLocationByIp()).resolves.toMatchObject({ latitude: -25.4, longitude: -49.2 })
    const cached = JSON.parse(storage.getItem(cacheKey) ?? '{}') as Record<string, unknown>
    expect(cached).toMatchObject({ source: 'ip', latitude: -25.4, longitude: -49.2 })
    expect(cached).not.toHaveProperty('ip')
  })

  it('rejects GeoJS failure without poisoning the cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    await expect(getApproximateLocationByIp()).rejects.toThrow('503')
    expect(storage.getItem(cacheKey)).toBeNull()
  })
})
