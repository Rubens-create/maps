import { Global, Module } from '@nestjs/common'
import { Pool } from 'pg'
import { DATABASE_POOL } from './database.constants'
import { DatabaseService } from './database.service'

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL
        if (!connectionString) throw new Error('DATABASE_URL is required')
        return new Pool({ connectionString, max: 10 })
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
