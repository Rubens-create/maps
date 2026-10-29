import { describe, expect, it, vi } from 'vitest'
import { DatabaseService } from './database.service.js'

describe('DatabaseService.withTransaction', () => {
  it('commits and releases the checked-out client after successful work', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    const pool = { connect: vi.fn().mockResolvedValue(client), end: vi.fn() }
    const database = new DatabaseService(pool as never)

    await database.withTransaction(async (transaction) => transaction.query('SELECT 1'))

    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'SELECT 1', 'COMMIT'])
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('rolls back and releases the client when transactional work fails', async () => {
    const failure = new Error('database failure')
    const client = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === 'SELECT 1') return Promise.reject(failure)
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
    const database = new DatabaseService({ connect: vi.fn().mockResolvedValue(client) } as never)

    await expect(database.withTransaction(async (transaction) => transaction.query('SELECT 1'))).rejects.toBe(failure)
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'SELECT 1', 'ROLLBACK'])
    expect(client.release).toHaveBeenCalledOnce()
  })
})
