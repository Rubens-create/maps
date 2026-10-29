import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseService } from '../database/database.service.js'
import { JwtAuthGuard } from './jwt-auth.guard.js'

const userId = '9b2a6ef4-0f4a-4c6d-a0bc-d9af67a12f31'
const tokenId = 'f17eb819-9674-4768-bc02-c7b3dc59d807'

function contextFor(request: unknown) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never
}

describe('JwtAuthGuard session validity', () => {
  it('accepts a verified token only when its server-side session is active', async () => {
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue({ sub: userId, email: 'a@example.test', jti: tokenId }) }
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ token_id: tokenId }], rowCount: 1 }) }
    const request = { headers: { authorization: 'Bearer signed-token' } }
    const guard = new JwtAuthGuard(jwtService as never, database as unknown as DatabaseService)

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
    expect(request).toHaveProperty('user.jti', tokenId)
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('auth_sessions'), [tokenId, userId])
  })

  it('rejects a token whose session was revoked by logout', async () => {
    const jwtService = { verifyAsync: vi.fn().mockResolvedValue({ sub: userId, email: 'a@example.test', jti: tokenId }) }
    const database = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const guard = new JwtAuthGuard(jwtService as never, database as unknown as DatabaseService)

    await expect(guard.canActivate(contextFor({ headers: { authorization: 'Bearer signed-token' } })))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })
})
