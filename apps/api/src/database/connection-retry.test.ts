import { describe, expect, it, vi } from 'vitest'
import { retryDatabaseConnection } from './connection-retry.js'

describe('retryDatabaseConnection', () => {
  it('retries a refused connection while PostgreSQL is still initializing', async () => {
    const connect = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))
      .mockResolvedValue('connected')
    const wait = vi.fn().mockResolvedValue(undefined)

    await expect(retryDatabaseConnection(connect, { attempts: 3, delayMs: 10, wait })).resolves.toBe('connected')
    expect(connect).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledTimes(1)
  })

  it('does not retry permanent authentication errors', async () => {
    const connect = vi.fn().mockRejectedValue(Object.assign(new Error('bad password'), { code: '28P01' }))
    const wait = vi.fn().mockResolvedValue(undefined)

    await expect(retryDatabaseConnection(connect, { attempts: 5, delayMs: 10, wait })).rejects.toThrow('bad password')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })
})
