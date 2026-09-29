import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

export interface AuthenticatedUser {
  sub: string
  email: string
}

export interface AuthenticatedRequest {
  headers: { authorization?: string }
  user?: AuthenticatedUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required')

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(authorization.slice(7))
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
