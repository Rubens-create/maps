import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { MapBoundsSchema } from '@luxxie/schemas'
import type { MapBounds } from '@luxxie/types'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { MapService } from './map.service'

@ApiTags('Mapa')
@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('properties')
  @ApiOperation({ summary: 'Buscar imóveis na área visível; agrupa pontos conforme o zoom' })
  @ApiQuery({ name: 'west', type: Number, required: true, description: 'Longitude mínima' })
  @ApiQuery({ name: 'south', type: Number, required: true, description: 'Latitude mínima' })
  @ApiQuery({ name: 'east', type: Number, required: true, description: 'Longitude máxima' })
  @ApiQuery({ name: 'north', type: Number, required: true, description: 'Latitude máxima' })
  @ApiQuery({ name: 'zoom', type: Number, required: true, minimum: 0, maximum: 22 })
  @ApiQuery({ name: 'tipo', enum: ['Venda', 'Aluguel'], required: false })
  @ApiQuery({ name: 'precoMaiorQue', type: Number, required: false })
  @ApiQuery({ name: 'precoMenorQue', type: Number, required: false })
  @ApiQuery({ name: 'quartos', type: Number, required: false, description: 'Quantidade exata de quartos' })
  @ApiQuery({ name: 'banheiros', type: Number, required: false, description: 'Quantidade exata de banheiros' })
  @ApiQuery({ name: 'areaMin', type: Number, required: false })
  @ApiQuery({ name: 'aceitaPet', enum: ['true', 'false'], required: false })
  @ApiResponse({ status: 200, description: 'Pontos ou agrupamentos dentro do bounding box' })
  findVisible(@Query(new ZodValidationPipe(MapBoundsSchema)) bounds: MapBounds) {
    return this.map.findVisible(bounds)
  }
}
