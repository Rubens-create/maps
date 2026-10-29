import { ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import type { UserLocationSettings, UserPreciseLocationInput } from '@luxxie/types'
import type { PoolClient } from 'pg'
import { DatabaseService } from '../database/database.service'

const DEFAULT_LOCATION_TTL_HOURS = 24
const MAX_LOCATION_TTL_HOURS = 8_760
const LOCATION_CLEANUP_INTERVAL_MS = 60 * 60 * 1_000

export function preciseLocationTtlHours(value = process.env.USER_PRECISE_LOCATION_TTL_HOURS): number {
  if (value === undefined || value.trim() === '') return DEFAULT_LOCATION_TTL_HOURS
  const hours = Number(value)
  return Number.isInteger(hours) && hours >= 1 && hours <= MAX_LOCATION_TTL_HOURS
    ? hours
    : DEFAULT_LOCATION_TTL_HOURS
}

@Injectable()
export class UserLocationsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    void this.deleteExpiredLocations().catch(() => undefined)
    this.cleanupTimer = setInterval(() => {
      void this.deleteExpiredLocations().catch(() => undefined)
    }, LOCATION_CLEANUP_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.cleanupTimer = null
  }

  async get(userId: string): Promise<UserLocationSettings> {
    const ttlHours = preciseLocationTtlHours()
    await this.database.query(
      `DELETE FROM user_locations
       WHERE user_id = $1 AND captured_at <= NOW() - ($2 * INTERVAL '1 hour')`,
      [userId, ttlHours],
    )

    const userResult = await this.database.query<{ enabled: boolean; consent_version: number }>(
      'SELECT precise_location_enabled AS enabled, location_consent_version AS consent_version FROM users WHERE id = $1',
      [userId],
    )
    if (!userResult.rows.length) throw new NotFoundException('Usuário não encontrado')

    const enabled = Boolean(userResult.rows[0].enabled)
    const consentVersion = Number(userResult.rows[0].consent_version)
    if (!enabled) return { enabled: false, consentVersion, location: null }

    const locationResult = await this.database.query(
      `SELECT latitude::float8 AS latitude, longitude::float8 AS longitude, captured_at,
              captured_at + ($2 * INTERVAL '1 hour') AS expires_at
       FROM user_locations
       WHERE user_id = $1`,
      [userId, ttlHours],
    )
    const row = locationResult.rows[0]
    if (!row) return { enabled: true, consentVersion, location: null }

    return {
      enabled: true,
      consentVersion,
      location: {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        capturedAt: new Date(row.captured_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
      },
    }
  }

  async save(userId: string, tokenId: string, coordinates: UserPreciseLocationInput): Promise<UserLocationSettings> {
    const ttlHours = preciseLocationTtlHours()
    return this.database.withTransaction(async (transaction) => {
      await this.lockActiveSession(transaction, userId, tokenId)
      const user = await this.lockUserLocationState(transaction, userId)
      this.assertCurrentConsent(user, coordinates.consentVersion)

      let consentVersion = user.consentVersion
      if (!user.enabled) {
        const enabled = await transaction.query<{ consent_version: number }>(
          `UPDATE users
           SET precise_location_enabled = TRUE,
               location_consent_version = location_consent_version + 1
           WHERE id = $1 AND location_consent_version = $2
           RETURNING location_consent_version AS consent_version`,
          [userId, consentVersion],
        )
        if (!enabled.rows.length) throw new ConflictException('A autorização de localização mudou. Recarregue Minha conta e tente novamente.')
        consentVersion = Number(enabled.rows[0].consent_version)
      }

      const location = await this.upsertLocation(transaction, userId, coordinates, ttlHours)
      return { enabled: true, consentVersion, location }
    })
  }

  async refresh(userId: string, tokenId: string, coordinates: UserPreciseLocationInput): Promise<UserLocationSettings> {
    const ttlHours = preciseLocationTtlHours()
    return this.database.withTransaction(async (transaction) => {
      await this.lockActiveSession(transaction, userId, tokenId)
      const user = await this.lockUserLocationState(transaction, userId)
      this.assertCurrentConsent(user, coordinates.consentVersion)
      if (!user.enabled) {
        throw new ConflictException('O salvamento está desativado. Reative-o em Minha conta antes de salvar.')
      }

      const location = await this.upsertLocation(transaction, userId, coordinates, ttlHours)
      return { enabled: true, consentVersion: user.consentVersion, location }
    })
  }

  async delete(userId: string, tokenId: string): Promise<UserLocationSettings> {
    return this.database.withTransaction(async (transaction) => {
      await this.lockActiveSession(transaction, userId, tokenId)
      const user = await this.lockUserLocationState(transaction, userId)
      const disabled = await transaction.query<{ consent_version: number }>(
        `UPDATE users
         SET precise_location_enabled = FALSE,
             location_consent_version = location_consent_version + 1
         WHERE id = $1 AND location_consent_version = $2
         RETURNING location_consent_version AS consent_version`,
        [userId, user.consentVersion],
      )
      if (!disabled.rows.length) throw new ConflictException('A autorização de localização mudou. Recarregue Minha conta e tente novamente.')
      await transaction.query('DELETE FROM user_locations WHERE user_id = $1', [userId])
      return { enabled: false, consentVersion: Number(disabled.rows[0].consent_version), location: null }
    })
  }

  private async lockActiveSession(transaction: PoolClient, userId: string, tokenId: string): Promise<void> {
    const result = await transaction.query(
      `SELECT token_id FROM auth_sessions
       WHERE token_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenId, userId],
    )
    if (!result.rows.length) throw new UnauthorizedException('Sessão encerrada ou expirada')
  }

  private async lockUserLocationState(transaction: PoolClient, userId: string): Promise<{ enabled: boolean; consentVersion: number }> {
    const result = await transaction.query<{ enabled: boolean; consent_version: number }>(
      `SELECT precise_location_enabled AS enabled, location_consent_version AS consent_version
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) throw new NotFoundException('Usuário não encontrado')
    return { enabled: Boolean(row.enabled), consentVersion: Number(row.consent_version) }
  }

  private assertCurrentConsent(
    user: { enabled: boolean; consentVersion: number },
    expectedVersion: number,
  ): void {
    if (user.consentVersion !== expectedVersion) {
      throw new ConflictException('A autorização de localização mudou. Recarregue Minha conta e tente novamente.')
    }
  }

  private async upsertLocation(
    transaction: PoolClient,
    userId: string,
    coordinates: UserPreciseLocationInput,
    ttlHours: number,
  ): Promise<NonNullable<UserLocationSettings['location']>> {
    const result = await transaction.query<{
      latitude: number
      longitude: number
      captured_at: Date | string
      expires_at: Date | string
    }>(
      `INSERT INTO user_locations (user_id, latitude, longitude, captured_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         captured_at = NOW()
       RETURNING latitude::float8 AS latitude, longitude::float8 AS longitude, captured_at,
                 captured_at + ($4 * INTERVAL '1 hour') AS expires_at`,
      [userId, coordinates.latitude, coordinates.longitude, ttlHours],
    )
    const row = result.rows[0]
    if (!row) throw new NotFoundException('Usuário não encontrado')
    return {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      capturedAt: new Date(row.captured_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
    }
  }

  private async deleteExpiredLocations(): Promise<void> {
    await this.database.query(
      `DELETE FROM user_locations
       WHERE captured_at <= NOW() - ($1 * INTERVAL '1 hour')`,
      [preciseLocationTtlHours()],
    )
  }
}
