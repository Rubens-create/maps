import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { UsersController } from './users.controller'
import { UserLocationsService } from './user-locations.service'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [UserLocationsService],
})
export class UsersModule {}
