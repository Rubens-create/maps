import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import type { LoginInput, RegisterInput } from '@luxxie/types'
import { DatabaseService } from '../database/database.service'

interface UserRow {
  id: string
  full_name: string
  email: string
  password_hash: string
}

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService, private readonly jwt: JwtService) {}

  async register(input: RegisterInput) {
    const passwordHash = await hash(input.senha, 12)
    let result
    try {
      result = await this.database.query<UserRow>(
        'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, password_hash',
        [input.nome, input.email, passwordHash],
      )
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Este e-mail já está cadastrado')
      throw error
    }
    return this.issueToken(result.rows[0])
  }

  async login(input: LoginInput) {
    const result = await this.database.query<UserRow>(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = $1',
      [input.email],
    )
    const user = result.rows[0]
    if (!user || !(await compare(input.senha, user.password_hash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos')
    }
    return this.issueToken(user)
  }

  private async issueToken(user: UserRow) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email })
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: user.id, nome: user.full_name, email: user.email },
    }
  }
}
