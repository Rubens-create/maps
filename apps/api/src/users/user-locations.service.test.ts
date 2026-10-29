import { describe, expect, it, vi } from 'vitest'
import type { DatabaseService } from '../database/database.service.js'
import { preciseLocationTtlHours, UserLocationsService } from './user-locations.service.js'

const userId = '9b2a6ef4-0f4a-4c6d-a0bc-d9af67a12f31'
const tokenId = 'f17eb819-9674-4768-bc02-c7b3dc59d807'
const locationRow = {
  latitude: -23.55,
  longitude: -46.63,
  captured_at: new Date('2026-10-01T12:00:00.000Z'),
  expires_at: new Date('2026-10-02T12:00:00.000Z'),
  consent_version: 4,
}

describe('UserLocationsService', () => {
  it('uses a configurable 24-hour default validity', () => {
    expect(preciseLocationTtlHours(undefined)).toBe(24)
    expect(preciseLocationTtlHours('6')).toBe(6)
    expect(preciseLocationTtlHours('0')).toBe(24)
  })

  it('returns only the authenticated account location and its validity window', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ enabled: true, consent_version: 4 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [locationRow], rowCount: 1 })
    const service = new UserLocationsService({ query } as unknown as DatabaseService)

    const settings = await service.get(userId)

    expect(settings).toMatchObject({
      enabled: true,
      consentVersion: 4,
      location: {
        latitude: -23.55,
        longitude: -46.63,
        capturedAt: '2026-10-01T12:00:00.000Z',
        expiresAt: '2026-10-02T12:00:00.000Z',
      },
    })
    expect(query.mock.calls.every(([, values]) => values?.[0] === userId)).toBe(true)
  })

  it('does not return an expired location and preserves the disabled preference after deletion', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ enabled: false, consent_version: 5 }], rowCount: 1 })
    const service = new UserLocationsService({ query } as unknown as DatabaseService)

    await expect(service.get(userId)).resolves.toEqual({
      enabled: false,
      consentVersion: 5,
      location: null,
    })
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[0]?.[0]).toMatch(/DELETE FROM user_locations[\s\S]*captured_at <= NOW\(\)/i)
  })

  it('purges expired account coordinates instead of exposing them as reusable data', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ enabled: true, consent_version: 6 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const service = new UserLocationsService({ query } as unknown as DatabaseService)

    await expect(service.get(userId)).resolves.toEqual({
      enabled: true,
      consentVersion: 6,
      location: null,
    })
    expect(query.mock.calls[0]?.[0]).toMatch(/DELETE FROM user_locations[\s\S]*NOW\(\) - \(\$2 \* INTERVAL '1 hour'\)/i)
    expect(query.mock.calls[0]?.[1]).toEqual([userId, 24])
  })

  it('saves coordinates under the supplied account id and current consent version', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ token_id: tokenId }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ enabled: true, consent_version: 4 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [locationRow], rowCount: 1 })
    const database = {
      query: vi.fn(),
      withTransaction: vi.fn(async (work: (client: { query: typeof query }) => Promise<unknown>) => work({ query })),
    }
    const service = new UserLocationsService(database as unknown as DatabaseService)

    const settings = await service.save(userId, tokenId, {
      latitude: -23.55,
      longitude: -46.63,
      consentVersion: 4,
    })

    expect(settings.enabled).toBe(true)
    expect(settings.consentVersion).toBe(4)
    expect(settings.location).toMatchObject({ latitude: -23.55, longitude: -46.63 })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('auth_sessions'), [tokenId, userId])
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_locations'), expect.arrayContaining([userId, -23.55, -46.63]))
  })

  it('deletes the saved coordinates and disables automatic re-saving for that account', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ token_id: tokenId }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ enabled: true, consent_version: 4 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ consent_version: 5 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    const database = {
      query: vi.fn(),
      withTransaction: vi.fn(async (work: (client: { query: typeof query }) => Promise<unknown>) => work({ query })),
    }
    const service = new UserLocationsService(database as unknown as DatabaseService)

    const settings = await service.delete(userId, tokenId)

    expect(settings).toEqual({ enabled: false, consentVersion: 5, location: null })
    expect(query).toHaveBeenCalledWith(expect.stringMatching(/precise_location_enabled\s*=\s*false/i), [userId, 4])
    expect(query).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM user_locations/i), [userId])
  })
})
