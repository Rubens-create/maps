import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { DatabaseService } from '../database/database.service'

export interface AuthenticatedUser {
  sub: string
  email: string
  jti: string
}

export interface AuthenticatedRequest {
  headers: { authorization?: string }
  user?: AuthenticatedUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required')

    let user: AuthenticatedUser
    try {
      user = await this.jwtService.verifyAsync<AuthenticatedUser>(authorization.slice(7))
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }

    if (!user.sub || !user.jti) throw new UnauthorizedException('Token does not identify an active session')
    const session = await this.database.query(
      `SELECT token_id FROM auth_sessions
       WHERE token_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [user.jti, user.sub],
    )
    if (!session.rows.length) throw new UnauthorizedException('Session is no longer active')

    request.user = user
    return true
  }
}
