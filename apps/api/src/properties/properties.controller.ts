import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CityPropertiesQuerySchema, PropertyInputSchema } from '@luxxie/schemas'
import type { CityPropertiesQuery, PropertyInput } from '@luxxie/types'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { PropertiesService } from './properties.service'

const propertyBody = {
  type: 'object',
  properties: {
    titulo: { type: 'string', minLength: 3, maxLength: 150 },
    descricao: { type: 'string', nullable: true },
    tipo: { type: 'string', enum: ['Venda', 'Aluguel'] },
    preco: { type: 'number', minimum: 0, exclusiveMinimum: true },
    quartos: { type: 'integer', minimum: 0 },
    banheiros: { type: 'integer', minimum: 0 },
    area: { type: 'number', minimum: 0, exclusiveMinimum: true, nullable: true },
    aceita_pet: { type: 'boolean' },
    whatsapp: { type: 'string', nullable: true },
    foto_capa: { type: 'string', format: 'uri', nullable: true },
    latitude: { type: 'number', minimum: -90, maximum: 90 },
    longitude: { type: 'number', minimum: -180, maximum: 180 },
    cidade: { type: 'string', nullable: true },
    estado: { type: 'string', maxLength: 2, nullable: true },
    bairro: { type: 'string', nullable: true },
    endereco: { type: 'string', nullable: true },
  },
  required: ['titulo', 'tipo', 'preco', 'latitude', 'longitude'],
}

@ApiTags('Imóveis')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar imóveis por cidade e tipo de transação' })
  @ApiQuery({ name: 'cidade', type: String, required: true, description: 'Nome da cidade; comparação sem diferenciar maiúsculas/minúsculas' })
  @ApiQuery({ name: 'tipo', enum: ['Venda', 'Aluguel'], required: false, description: 'Opcional. Venda (compra) ou Aluguel' })
  @ApiResponse({ status: 200, description: 'Imóveis cadastrados na cidade, opcionalmente filtrados por tipo' })
  @ApiResponse({ status: 400, description: 'Cidade ou tipo de transação inválidos' })
  findByCity(@Query(new ZodValidationPipe(CityPropertiesQuerySchema)) query: CityPropertiesQuery) {
    return this.properties.findByCity(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar os detalhes públicos de um imóvel' })
  @ApiResponse({ status: 200, description: 'Detalhes do imóvel' })
  @ApiResponse({ status: 404, description: 'Imóvel não encontrado' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.properties.findById(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar imóvel na conta autenticada' })
  @ApiBody({ schema: propertyBody })
  @ApiResponse({ status: 201, description: 'Imóvel publicado' })
  create(
    @Body(new ZodValidationPipe(PropertyInputSchema)) body: PropertyInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.create(body, request.user!.sub)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir imóvel pertencente à conta autenticada' })
  @ApiResponse({ status: 200, description: 'Imóvel excluído' })
  @ApiResponse({ status: 404, description: 'Imóvel não encontrado ou não pertence à conta' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    await this.properties.delete(id, request.user!.sub)
    return { deleted: true }
  }
}
