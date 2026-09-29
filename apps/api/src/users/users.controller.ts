import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { DatabaseService } from '../database/database.service'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly database: DatabaseService) {}

  @Get('me')
  @ApiOperation({ summary: 'Consultar o usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados básicos da conta' })
  async me(@Req() request: AuthenticatedRequest) {
    const result = await this.database.query(
      'SELECT id, full_name AS nome, email FROM users WHERE id = $1',
      [request.user!.sub],
    )
    if (!result.rowCount) throw new UnauthorizedException('Usuário não existe mais')
    return result.rows[0]
  }

  @Get('me/properties')
  @ApiOperation({ summary: 'Listar os anúncios da conta autenticada' })
  @ApiResponse({ status: 200, description: 'Lista de anúncios do usuário' })
  async myProperties(@Req() request: AuthenticatedRequest) {
    const result = await this.database.query(
      `SELECT id, created_at, titulo, descricao, tipo, preco::float8 AS preco,
              quartos, banheiros, area::float8 AS area, aceita_pet, whatsapp, foto_capa,
              ST_Y(location) AS latitude, ST_X(location) AS longitude,
              cidade, estado, bairro, endereco
       FROM properties WHERE user_id = $1 ORDER BY created_at DESC`,
      [request.user!.sub],
    )
    return result.rows
  }
}
