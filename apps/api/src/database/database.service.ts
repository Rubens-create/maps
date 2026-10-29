import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
import { DATABASE_POOL } from './database.constants'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  query<Row extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(sql, values)
  }

  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }
}
