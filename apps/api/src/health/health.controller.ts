import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { DatabaseService } from '../database/database.service'

@ApiTags('Sistema')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Verificar a API e a conexão com o banco' })
  @ApiResponse({ status: 200, description: 'Serviço disponível' })
  async check() {
    await this.database.query('SELECT 1')
    return { status: 'ok', database: 'ok' }
  }
}
