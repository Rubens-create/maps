import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseService } from '../database/database.service.js'
import { UserLocationsService } from './user-locations.service.js'

const userId = '9b2a6ef4-0f4a-4c6d-a0bc-d9af67a12f31'
const tokenId = 'f17eb819-9674-4768-bc02-c7b3dc59d807'
const point = { latitude: -23.55, longitude: -46.63 }
const locationRow = {
  latitude: point.latitude,
  longitude: point.longitude,
  captured_at: new Date('2026-10-01T12:00:00.000Z'),
  expires_at: new Date('2026-10-02T12:00:00.000Z'),
  consent_version: 4,
}

type TestQuery = (sql: string, values?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>

function serviceWithTransaction(responses: Array<{ rows: unknown[]; rowCount: number }>) {
  const query = vi.fn<TestQuery>(async () => responses.shift() ?? { rows: [], rowCount: 0 })
  const client: { query: TestQuery } = { query }
  const database = {
    query: vi.fn(),
    withTransaction: vi.fn(async (work: (transaction: { query: TestQuery }) => Promise<unknown>) => work(client)),
  }
  return { service: new UserLocationsService(database as unknown as DatabaseService), query, database }
}

function createSerializedLocationDatabase() {
  const state: { enabled: boolean; consentVersion: number; location: typeof locationRow | null } = {
    enabled: true,
    consentVersion: 0,
    location: null,
  }
  let releaseInsert!: () => void
  let reportInsertStarted!: () => void
  const insertStarted = new Promise<void>((resolve) => { reportInsertStarted = resolve })
  const insertGate = new Promise<void>((resolve) => { releaseInsert = resolve })
  let transactionQueue = Promise.resolve()

  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (/SELECT token_id FROM auth_sessions/i.test(sql)) {
      return { rows: [{ token_id: tokenId }], rowCount: 1 }
    }
    if (/SELECT precise_location_enabled AS enabled/i.test(sql)) {
      return { rows: [{ enabled: state.enabled, consent_version: state.consentVersion }], rowCount: 1 }
    }
    if (/INSERT INTO user_locations/i.test(sql)) {
      reportInsertStarted()
      await insertGate
      state.location = {
        ...locationRow,
        latitude: Number(values[1]),
        longitude: Number(values[2]),
        consent_version: state.consentVersion,
      }
      return { rows: [state.location], rowCount: 1 }
    }
    if (/precise_location_enabled\s*=\s*false/i.test(sql)) {
      state.enabled = false
      state.consentVersion += 1
      return { rows: [{ consent_version: state.consentVersion }], rowCount: 1 }
    }
    if (/DELETE FROM user_locations/i.test(sql)) {
      state.location = null
      return { rows: [], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  })
  const database = {
    query: vi.fn(),
    withTransaction: vi.fn(async (work: (client: { query: typeof query }) => Promise<unknown>) => {
      const previous = transactionQueue
      let releaseTransaction!: () => void
      transactionQueue = new Promise<void>((resolve) => { releaseTransaction = resolve })
      await previous
      try {
        return await work({ query })
      } finally {
        releaseTransaction()
      }
    }),
  }

  return {
    service: new UserLocationsService(database as unknown as DatabaseService),
    state,
    insertStarted,
    releaseInsert,
  }
}

describe('UserLocationsService write authorization and consent races', () => {
  it('does not write an old automatic fix after consent was disabled and its version advanced', async () => {
    const { service, query } = serviceWithTransaction([
      { rows: [{ token_id: tokenId }], rowCount: 1 },
      { rows: [{ enabled: false, consent_version: 8 }], rowCount: 1 },
    ])

    await expect(service.refresh(userId, tokenId, { ...point, consentVersion: 7 }))
      .rejects.toBeInstanceOf(ConflictException)
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[0]?.[0]).toMatch(/auth_sessions[\s\S]*FOR UPDATE/i)
    expect(query.mock.calls[1]?.[0]).toMatch(/users[\s\S]*FOR UPDATE/i)
  })

  it('lets an in-flight refresh finish before deletion, then leaves storage disabled and empty', async () => {
    const { service, state, insertStarted, releaseInsert } = createSerializedLocationDatabase()

    const pendingRefresh = service.refresh(userId, tokenId, { ...point, consentVersion: 0 })
    await insertStarted
    const pendingDelete = service.delete(userId, tokenId)
    releaseInsert()

    await expect(pendingRefresh).resolves.toMatchObject({ enabled: true, consentVersion: 0 })
    await expect(pendingDelete).resolves.toMatchObject({ enabled: false, consentVersion: 1, location: null })
    expect(state).toMatchObject({ enabled: false, consentVersion: 1, location: null })
  })

  it('does not re-enable storage when an automatic refresh uses the current version after deletion', async () => {
    const { service, query } = serviceWithTransaction([
      { rows: [{ token_id: tokenId }], rowCount: 1 },
      { rows: [{ enabled: false, consent_version: 8 }], rowCount: 1 },
    ])

    await expect(service.refresh(userId, tokenId, { ...point, consentVersion: 8 }))
      .rejects.toBeInstanceOf(ConflictException)
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls.some(([sql]) => /INSERT INTO user_locations/i.test(sql))).toBe(false)
  })

  it('rejects a location write when the originating login session has been revoked', async () => {
    const { service, query } = serviceWithTransaction([
      { rows: [], rowCount: 0 },
    ])

    await expect(service.refresh(userId, tokenId, { ...point, consentVersion: 2 }))
      .rejects.toBeInstanceOf(UnauthorizedException)
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0]?.[0]).toMatch(/revoked_at IS NULL[\s\S]*FOR UPDATE/i)
  })

  it('re-enables storage and writes atomically only for a current explicit account update', async () => {
    const { service, query } = serviceWithTransaction([
      { rows: [{ token_id: tokenId }], rowCount: 1 },
      { rows: [{ enabled: false, consent_version: 3 }], rowCount: 1 },
      { rows: [{ enabled: true, consent_version: 4 }], rowCount: 1 },
      { rows: [locationRow], rowCount: 1 },
    ])

    const result = await service.save(userId, tokenId, { ...point, consentVersion: 3 })

    expect(result).toMatchObject({ enabled: true, consentVersion: 4, location: point })
    expect(query).toHaveBeenCalledTimes(4)
    expect(query.mock.calls[2]?.[0]).toMatch(/precise_location_enabled[\s\S]*location_consent_version/i)
    expect(query.mock.calls[3]?.[0]).toMatch(/INSERT INTO user_locations/i)
  })

  it('deletes coordinates and advances the consent version while holding the session lock', async () => {
    const { service, query } = serviceWithTransaction([
      { rows: [{ token_id: tokenId }], rowCount: 1 },
      { rows: [{ enabled: true, consent_version: 4 }], rowCount: 1 },
      { rows: [{ consent_version: 5 }], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ])

    const result = await service.delete(userId, tokenId)

    expect(result).toEqual({ enabled: false, consentVersion: 5, location: null })
    expect(query).toHaveBeenCalledTimes(4)
    expect(query.mock.calls[2]?.[0]).toMatch(/precise_location_enabled\s*=\s*false[\s\S]*location_consent_version/i)
    expect(query.mock.calls[3]?.[0]).toMatch(/DELETE FROM user_locations/i)
  })
})
