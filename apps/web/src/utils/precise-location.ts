import {
  cacheTtlMsFromHours,
  readLocationCache,
  writeLocationCache,
  type CachedLocation,
  type Coordinates,
  type LocationStorage,
} from './location-cache'

export type { Coordinates } from './location-cache'

const cacheKey = 'luxxie.location.precise.v1'
const cacheTtlMs = cacheTtlMsFromHours(import.meta.env.VITE_ANONYMOUS_PRECISE_LOCATION_CACHE_HOURS)

function getBrowserStorage(): LocationStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getAnonymousPreciseLocation(): CachedLocation | null {
  const storage = getBrowserStorage()
  return storage ? readLocationCache(storage, cacheKey, 'gps') : null
}

export function saveAnonymousPreciseLocation(coordinates: Coordinates): CachedLocation | null {
  const storage = getBrowserStorage()
  return storage ? writeLocationCache(storage, cacheKey, 'gps', coordinates, cacheTtlMs) : null
}

export function deleteAnonymousPreciseLocation(): void {
  const storage = getBrowserStorage()
  if (!storage) return
  try {
    storage.removeItem(cacheKey)
  } catch {
    // Local storage may be blocked by the browser.
  }
}
