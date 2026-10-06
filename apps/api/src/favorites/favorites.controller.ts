import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { FavoritesService } from './favorites.service'

@ApiTags('Favoritos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar imóveis favoritos da conta autenticada' })
  @ApiResponse({ status: 200, description: 'Lista de imóveis favoritos' })
  list(@Req() request: AuthenticatedRequest) {
    return this.favorites.list(request.user!.sub)
  }

  @Post(':propertyId')
  @ApiOperation({ summary: 'Adicionar imóvel aos favoritos da conta autenticada' })
  @ApiResponse({ status: 201, description: 'Imóvel favoritado' })
  @ApiResponse({ status: 404, description: 'Imóvel não encontrado' })
  add(@Param('propertyId', ParseIntPipe) propertyId: number, @Req() request: AuthenticatedRequest) {
    return this.favorites.add(request.user!.sub, propertyId)
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remover imóvel dos favoritos da conta autenticada' })
  @ApiResponse({ status: 200, description: 'Imóvel removido dos favoritos' })
  remove(@Param('propertyId', ParseIntPipe) propertyId: number, @Req() request: AuthenticatedRequest) {
    return this.favorites.remove(request.user!.sub, propertyId)
  }
}
