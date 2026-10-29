import { Body, Controller, Delete, Get, Header, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UserPreciseLocationInputSchema } from '@luxxie/schemas'
import type { UserPreciseLocationInput } from '@luxxie/types'
import { DatabaseService } from '../database/database.service'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { UserLocationsService } from './user-locations.service'

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly database: DatabaseService,
    private readonly locations: UserLocationsService,
  ) {}

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

  @Get('me/location')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar preferência e última localização precisa da conta' })
  @ApiResponse({ status: 200, description: 'Preferência e localização válida da conta' })
  myLocation(@Req() request: AuthenticatedRequest) {
    return this.locations.get(request.user!.sub)
  }

  @Put('me/location')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Atualizar localização precisa autorizada da conta' })
  @ApiResponse({ status: 200, description: 'Localização atualizada com prazo de validade' })
  saveMyLocation(
    @Body(new ZodValidationPipe(UserPreciseLocationInputSchema)) body: UserPreciseLocationInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locations.save(request.user!.sub, request.user!.jti, body)
  }

  @Post('me/location/refresh')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Atualizar localização após consentimento já ativo' })
  @ApiResponse({ status: 200, description: 'Localização atualizada sem alterar a preferência de consentimento' })
  refreshMyLocation(
    @Body(new ZodValidationPipe(UserPreciseLocationInputSchema)) body: UserPreciseLocationInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locations.refresh(request.user!.sub, request.user!.jti, body)
  }

  @Delete('me/location')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Excluir localização precisa e desativar o salvamento automático' })
  @ApiResponse({ status: 200, description: 'Localização excluída' })
  deleteMyLocation(@Req() request: AuthenticatedRequest) {
    return this.locations.delete(request.user!.sub, request.user!.jti)
  }
}
