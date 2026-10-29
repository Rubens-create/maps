export type LocationSource = 'ip' | 'gps'

export interface Coordinates {
  latitude: number
  longitude: number
  accuracyKm?: number
}

export interface CachedLocation extends Coordinates {
  source: LocationSource
  capturedAt: number
  expiresAt: number
}

export interface LocationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function cacheTtlMsFromHours(value: string | undefined, fallbackHours = 24): number {
  const hours = value === undefined || value.trim() === '' ? fallbackHours : Number(value)
  if (!Number.isInteger(hours) || hours < 1 || hours > 8_760) return fallbackHours * 60 * 60 * 1_000
  return hours * 60 * 60 * 1_000
}

function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.latitude === 'number'
    && Number.isFinite(candidate.latitude)
    && candidate.latitude >= -90
    && candidate.latitude <= 90
    && typeof candidate.longitude === 'number'
    && Number.isFinite(candidate.longitude)
    && candidate.longitude >= -180
    && candidate.longitude <= 180
    && (candidate.accuracyKm === undefined || (
      typeof candidate.accuracyKm === 'number'
      && Number.isFinite(candidate.accuracyKm)
      && candidate.accuracyKm >= 0
    ))
}

function removeSafely(storage: LocationStorage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // A blocked browser storage must not prevent the map from working.
  }
}

export function readLocationCache(
  storage: LocationStorage,
  key: string,
  expectedSource: LocationSource,
  now = Date.now(),
): CachedLocation | null {
  try {
    const serialized = storage.getItem(key)
    if (!serialized) return null
    const cached: unknown = JSON.parse(serialized)
    if (typeof cached !== 'object' || cached === null) {
      removeSafely(storage, key)
      return null
    }

    const candidate = cached as Record<string, unknown>
    const coordinates = isCoordinates(candidate) ? candidate : null
    const isValid = coordinates !== null
      && candidate.source === expectedSource
      && typeof candidate.capturedAt === 'number'
      && Number.isFinite(candidate.capturedAt)
      && candidate.capturedAt <= now
      && typeof candidate.expiresAt === 'number'
      && Number.isFinite(candidate.expiresAt)
      && candidate.expiresAt > now
      && candidate.expiresAt > candidate.capturedAt

    if (!isValid || !coordinates) {
      removeSafely(storage, key)
      return null
    }

    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      ...(coordinates.accuracyKm !== undefined ? { accuracyKm: coordinates.accuracyKm } : {}),
      source: expectedSource,
      capturedAt: candidate.capturedAt as number,
      expiresAt: candidate.expiresAt as number,
    }
  } catch {
    removeSafely(storage, key)
    return null
  }
}

export function writeLocationCache(
  storage: LocationStorage,
  key: string,
  source: LocationSource,
  coordinates: Coordinates,
  ttlMs: number,
  now = Date.now(),
): CachedLocation | null {
  if (!isCoordinates(coordinates) || !Number.isFinite(ttlMs) || ttlMs <= 0) return null
  const cached: CachedLocation = {
    ...coordinates,
    source,
    capturedAt: now,
    expiresAt: now + ttlMs,
  }
  try {
    storage.setItem(key, JSON.stringify(cached))
    return cached
  } catch {
    return null
  }
}
