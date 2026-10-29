import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationStorage } from './location-cache.js'
import { deleteAnonymousPreciseLocation, getAnonymousPreciseLocation, saveAnonymousPreciseLocation } from './precise-location.js'

class MemoryStorage implements LocationStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

const cacheKey = 'luxxie.location.precise.v1'
const dayMs = 24 * 60 * 60 * 1_000
let storage: MemoryStorage

describe('anonymous precise-location retention', () => {
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

  it('reuses a GPS fix while valid, then removes it after the configured default TTL', () => {
    saveAnonymousPreciseLocation({ latitude: -23.55, longitude: -46.63, accuracyKm: 0.04 })
    expect(getAnonymousPreciseLocation()).toMatchObject({ source: 'gps', latitude: -23.55, longitude: -46.63 })

    vi.advanceTimersByTime(dayMs)

    expect(getAnonymousPreciseLocation()).toBeNull()
    expect(storage.getItem(cacheKey)).toBeNull()
  })

  it('deletes a visitor GPS cache explicitly without touching another source', () => {
    saveAnonymousPreciseLocation({ latitude: 10, longitude: 20 })

    deleteAnonymousPreciseLocation()

    expect(getAnonymousPreciseLocation()).toBeNull()
  })
})
