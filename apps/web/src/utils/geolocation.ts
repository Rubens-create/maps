export type PrecisePositionResult<T> =
  | { status: 'denied' }
  | { status: 'available'; position: T }
  | { status: 'unavailable'; error: unknown }

export async function requestPositionIfAllowed<T>(
  permissionIsDenied: () => Promise<boolean>,
  requestPosition: () => Promise<T>,
): Promise<PrecisePositionResult<T>> {
  try {
    if (await permissionIsDenied()) return { status: 'denied' }
  } catch {
    // If the Permissions API is unavailable, let the browser's geolocation call decide.
  }

  try {
    return { status: 'available', position: await requestPosition() }
  } catch (error) {
    return { status: 'unavailable', error }
  }
}
