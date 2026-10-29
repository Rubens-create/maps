import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseService } from '../database/database.service.js'
import { AuthService } from './auth.service.js'

describe('AuthService server-side sessions', () => {
  it('persists a token id before issuing a JWT that carries the same id', async () => {
    const database = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', full_name: 'A User', email: 'a@example.test', password_hash: 'hash' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    }
    const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') }
    const service = new AuthService(database as unknown as DatabaseService, jwt as never)

    const result = await service.register({ nome: 'A User', email: 'a@example.test', senha: 'example-password' })

    expect(result.accessToken).toBe('signed-token')
    const sessionId = database.query.mock.calls[2]?.[1]?.[0]
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(database.query.mock.calls[2]?.[0]).toMatch(/INSERT INTO auth_sessions/i)
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'a@example.test' },
      { jwtid: sessionId },
    )
  })

  it('revokes only the supplied current user session on logout', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ token_id: 'token-1' }], rowCount: 1 }) }
    const service = new AuthService(database as unknown as DatabaseService, {} as never)

    await expect(service.logout('user-1', 'token-1')).resolves.toEqual({ loggedOut: true })
    expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE auth_sessions[\s\S]*revoked_at/i), ['token-1', 'user-1'])
  })

  it('rejects logout for a session that no longer exists', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const service = new AuthService(database as unknown as DatabaseService, {} as never)

    await expect(service.logout('user-1', 'revoked-token')).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
