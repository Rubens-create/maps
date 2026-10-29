import type { Coordinates } from './location-cache'

export interface LocationStageOptions<T> {
  approximate: Promise<Coordinates | null>
  isCurrent: () => boolean
  onApproximate?: (location: Coordinates) => void
  requestPrecise: () => Promise<T | null>
  onPreciseFailure?: (error: unknown) => void
}

export async function runLocationStages<T>(options: LocationStageOptions<T>): Promise<T | null> {
  let approximate: Coordinates | null = null
  try {
    approximate = await options.approximate
  } catch {
    // Approximate lookup is optional; GPS is still attempted when the flow is current.
  }

  if (!options.isCurrent()) return null
  if (approximate) options.onApproximate?.(approximate)
  if (!options.isCurrent()) return null

  try {
    const precise = await options.requestPrecise()
    return options.isCurrent() ? precise : null
  } catch (error) {
    if (options.isCurrent()) options.onPreciseFailure?.(error)
    return null
  }
}
