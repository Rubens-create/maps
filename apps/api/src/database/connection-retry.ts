export interface DatabaseRetryOptions {
  attempts?: number
  delayMs?: number
  wait?: (delayMs: number) => Promise<void>
}

const transientConnectionCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'])

function isTransientConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return transientConnectionCodes.has(String(error.code))
}

export async function retryDatabaseConnection<T>(
  connect: () => Promise<T>,
  options: DatabaseRetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 30)
  const delayMs = options.delayMs ?? 500
  const wait = options.wait ?? ((duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration)))

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await connect()
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt === attempts) throw error
      await wait(delayMs)
    }
  }

  throw new Error('PostgreSQL connection attempts exhausted')
}
