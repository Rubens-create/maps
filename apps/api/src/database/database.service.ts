import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import { Pool, QueryResult, QueryResultRow } from 'pg'
import { DATABASE_POOL } from './database.constants'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  query<Row extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(sql, values)
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }
}
