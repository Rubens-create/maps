import 'reflect-metadata'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { Client } from 'pg'
import { retryDatabaseConnection } from './connection-retry'

dotenv.config({ path: resolve(__dirname, '../../../../.env') })

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const client = await retryDatabaseConnection(async () => {
    const candidate = new Client({ connectionString })
    try {
      await candidate.connect()
      return candidate
    } catch (error) {
      await candidate.end().catch(() => undefined)
      throw error
    }
  })
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    const directory = resolve(__dirname, '../../../../database/migrations')
    const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
    for (const name of files) {
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
      if (rowCount) continue

      await client.query('BEGIN')
      try {
        await client.query(await readFile(resolve(directory, name), 'utf8'))
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
        await client.query('COMMIT')
        process.stdout.write(`Applied ${name}\n`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.end()
  }
}

migrate().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
