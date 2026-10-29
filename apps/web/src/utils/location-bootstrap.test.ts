import { describe, expect, it, vi } from 'vitest'
import type { Coordinates } from './location-cache.js'
import { runLocationStages } from './location-bootstrap.js'

const approximate: Coordinates = { latitude: -23.55, longitude: -46.63 }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('location bootstrap regression cases', () => {
  it('continues to GPS after GeoJS fails and treats denied GPS as a non-fatal fallback', async () => {
    const events: string[] = []
    const result = await runLocationStages({
      approximate: Promise.reject(new Error('GeoJS unavailable')),
      isCurrent: () => true,
      requestPrecise: async () => {
        events.push('gps-requested')
        throw new Error('GPS permission denied')
      },
      onPreciseFailure: () => events.push('gps-unavailable'),
    })

    expect(result).toBeNull()
    expect(events).toEqual(['gps-requested', 'gps-unavailable'])
  })

  it('centers by IP before attempting GPS and keeps that result when GPS is denied', async () => {
    const events: string[] = []
    await runLocationStages({
      approximate: Promise.resolve(approximate),
      isCurrent: () => true,
      onApproximate: () => events.push('center-ip'),
      requestPrecise: async () => {
        events.push('gps-requested')
        throw new Error('GPS permission denied')
      },
      onPreciseFailure: () => events.push('gps-unavailable'),
    })

    expect(events).toEqual(['center-ip', 'gps-requested', 'gps-unavailable'])
  })

  it('does not center or request GPS when the user pans while IP is pending', async () => {
    const ip = deferred<Coordinates | null>()
    const events: string[] = []
    let current = true
    const pending = runLocationStages({
      approximate: ip.promise,
      isCurrent: () => current,
      onApproximate: () => events.push('center-ip'),
      requestPrecise: async () => {
        events.push('gps-requested')
        return approximate
      },
    })

    current = false
    ip.resolve(approximate)
    await expect(pending).resolves.toBeNull()
    expect(events).toEqual([])
  })

  it('discards a GPS result that arrives after the user manually changed the map', async () => {
    const gps = deferred<Coordinates>()
    const events: string[] = []
    let current = true
    const pending = runLocationStages({
      approximate: Promise.resolve(approximate),
      isCurrent: () => current,
      onApproximate: () => events.push('center-ip'),
      requestPrecise: () => gps.promise,
    })

    await vi.waitFor(() => expect(events).toContain('center-ip'))
    current = false
    gps.resolve({ latitude: 10, longitude: 20 })

    await expect(pending).resolves.toBeNull()
    expect(events).toEqual(['center-ip'])
  })
})
