import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { FavoritesModule } from './favorites/favorites.module'
import { HealthModule } from './health/health.module'
import { MapModule } from './map/map.module'
import { PropertiesModule } from './properties/properties.module'
import { UploadsModule } from './uploads/uploads.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, PropertiesModule, MapModule, FavoritesModule, UploadsModule, HealthModule],
})
export class AppModule {}
