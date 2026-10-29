import { describe, expect, it, vi } from 'vitest'
import { requestPositionIfAllowed } from './geolocation.js'

describe('requestPositionIfAllowed', () => {
  it('does not call GPS when the browser permission is already denied', async () => {
    const requestPosition = vi.fn().mockResolvedValue({ coords: {} })

    await expect(requestPositionIfAllowed(async () => true, requestPosition)).resolves.toEqual({ status: 'denied' })
    expect(requestPosition).not.toHaveBeenCalled()
  })

  it('keeps GPS denial or unavailability non-fatal after permission was not denied', async () => {
    const failure = new Error('geolocation denied')
    const requestPosition = vi.fn().mockRejectedValue(failure)

    await expect(requestPositionIfAllowed(async () => false, requestPosition)).resolves.toEqual({
      status: 'unavailable',
      error: failure,
    })
    expect(requestPosition).toHaveBeenCalledOnce()
  })

  it('still tries GPS when permission-state inspection is unsupported', async () => {
    const position = { coords: { latitude: 1, longitude: 2 } }
    const requestPosition = vi.fn().mockResolvedValue(position)

    await expect(requestPositionIfAllowed(async () => { throw new Error('permissions API unavailable') }, requestPosition))
      .resolves.toEqual({ status: 'available', position })
  })
})
