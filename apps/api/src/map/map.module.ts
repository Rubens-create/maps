import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { MapController } from './map.controller'
import { MapService } from './map.service'

@Module({ imports: [DatabaseModule], controllers: [MapController], providers: [MapService] })
export class MapModule {}
