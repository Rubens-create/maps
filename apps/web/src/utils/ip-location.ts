import { cacheTtlMsFromHours, readLocationCache, writeLocationCache, type Coordinates, type LocationStorage } from './location-cache'

export type { Coordinates } from './location-cache'

interface GeoJsResponse {
  latitude?: unknown
  longitude?: unknown
  accuracy?: unknown
}

const cacheKey = 'luxxie.ip-estimate.v1'
const cacheTtlMs = cacheTtlMsFromHours(import.meta.env.VITE_IP_LOCATION_CACHE_HOURS)
const ipLocationUrl = 'https://get.geojs.io/v1/ip/geo.json'
const requestTimeoutMs = 5_000

function getBrowserStorage(): LocationStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function parseGeoJsResponse(value: GeoJsResponse): Coordinates | null {
  const latitude = typeof value.latitude === 'string' && value.latitude.trim() !== ''
    ? Number(value.latitude)
    : value.latitude
  const longitude = typeof value.longitude === 'string' && value.longitude.trim() !== ''
    ? Number(value.longitude)
    : value.longitude
  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    return null
  }
  return {
    latitude,
    longitude,
    ...(typeof value.accuracy === 'number' && value.accuracy > 0 ? { accuracyKm: value.accuracy } : {}),
  }
}

export async function getApproximateLocationByIp(signal?: AbortSignal): Promise<Coordinates> {
  if (signal?.aborted) throw new DOMException('Location lookup cancelled', 'AbortError')
  const storage = getBrowserStorage()
  const cached = storage ? readLocationCache(storage, cacheKey, 'ip') : null
  if (cached) return { latitude: cached.latitude, longitude: cached.longitude, accuracyKm: cached.accuracyKm }

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(ipLocationUrl, { signal: controller.signal })
    if (!response.ok) throw new Error(`IP geolocation failed with status ${response.status}`)

    const result = await response.json() as GeoJsResponse
    const location = parseGeoJsResponse(result)
    if (!location) throw new Error('IP geolocation returned invalid coordinates')
    if (signal?.aborted) throw new DOMException('Location lookup cancelled', 'AbortError')

    if (storage) writeLocationCache(storage, cacheKey, 'ip', location, cacheTtlMs)
    return location
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
