import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { LoginSchema, RegisterSchema } from '@luxxie/schemas'
import type { LoginInput, RegisterInput } from '@luxxie/types'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'

const registerBody = {
  type: 'object',
  properties: {
    nome: { type: 'string', minLength: 2, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    senha: { type: 'string', minLength: 8, maxLength: 72 },
  },
  required: ['nome', 'email', 'senha'],
}

const loginBody = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    senha: { type: 'string', minLength: 1, maxLength: 72 },
  },
  required: ['email', 'senha'],
}

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Criar conta e receber token Bearer' })
  @ApiBody({ schema: registerBody })
  @ApiResponse({ status: 201, description: 'Conta criada' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  register(@Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput) {
    return this.auth.register(body)
  }

  @Post('login')
  @ApiOperation({ summary: 'Entrar e receber token Bearer' })
  @ApiBody({ schema: loginBody })
  @ApiResponse({ status: 201, description: 'Autenticação concluída' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput) {
    return this.auth.login(body)
  }
}
