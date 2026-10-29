import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './index.js'

const tokenKey = 'luxxie.access-token'
const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value) },
  removeItem: (key: string) => { values.delete(key) },
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('API auth session races', () => {
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not publish a current-user response after logout', async () => {
    const userRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn((url: string | URL | Request, _init?: RequestInit) => (
      String(url).endsWith('/users/me')
        ? userRequest.promise
        : Promise.resolve(jsonResponse(null, 204))
    ))
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'session-before-logout')

    const pendingUser = api.currentUser()
    await api.logout()
    userRequest.resolve(jsonResponse({ id: 'old-user', nome: 'Usuário antigo', email: 'old@example.test' }))

    await expect(pendingUser).resolves.toBeNull()
  })

  it('surfaces validation issue paths instead of hiding them behind the generic API message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      message: 'Request validation failed',
      issues: [{ path: 'consentVersion', message: 'Expected number, received undefined' }],
    }, 400)))

    await expect(api.register({ nome: 'Test User', email: 'test@example.test', senha: 'example-password' }))
      .rejects.toThrow('consentVersion: Expected number, received undefined')
  })

  it('does not restore an authentication response that arrives after logout', async () => {
    const loginRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn((url: string | URL | Request) => (
      String(url).endsWith('/auth/login')
        ? loginRequest.promise
        : Promise.resolve(jsonResponse(null, 204))
    ))
    vi.stubGlobal('fetch', fetchMock)

    const pendingLogin = api.login({ email: 'user@example.test', senha: 'password' })
    await api.logout()
    loginRequest.resolve(jsonResponse({
      accessToken: 'late-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: 'late-user', nome: 'Usuário atrasado', email: 'user@example.test' },
    }))

    await expect(pendingLogin).rejects.toThrow()
    expect(storage.getItem(tokenKey)).toBeNull()
  })

  it('does not send a location write if its captured auth revision is stale', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'session-A')
    const expectedRevision = api.authSessionRevision()
    storage.setItem(tokenKey, 'session-B')

    await expect(api.refreshMyLocation({ latitude: -23.55, longitude: -46.63, consentVersion: 2 }, expectedRevision))
      .rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores a location response that completes after logout', async () => {
    const locationRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn((url: string | URL | Request) => (
      String(url).endsWith('/location/refresh')
        ? locationRequest.promise
        : Promise.resolve(jsonResponse(null, 204))
    ))
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'session-before-location-save')
    const revision = api.authSessionRevision()

    const pendingLocation = api.refreshMyLocation({
      latitude: -23.55,
      longitude: -46.63,
      consentVersion: 2,
    }, revision)
    await api.logout()
    locationRequest.resolve(jsonResponse({ enabled: true, consentVersion: 2, location: null }))

    await expect(pendingLocation).rejects.toMatchObject({ status: 401 })
    expect(storage.getItem(tokenKey)).toBeNull()
  })

  it('does not apply a pending account-A write after the browser switches to account B', async () => {
    const locationRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn((_url: string | URL | Request, _init?: RequestInit) => locationRequest.promise)
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'account-A-session')
    const revisionA = api.authSessionRevision()

    const pendingWrite = api.refreshMyLocation({
      latitude: -23.55,
      longitude: -46.63,
      consentVersion: 1,
    }, revisionA)
    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(requestHeaders.get('Authorization')).toBe('Bearer account-A-session')

    storage.setItem(tokenKey, 'account-B-session')
    expect(api.authSessionRevision()).not.toBe(revisionA)
    locationRequest.resolve(jsonResponse({ enabled: true, consentVersion: 1, location: null }))

    await expect(pendingWrite).rejects.toMatchObject({ status: 401 })
    expect(storage.getItem(tokenKey)).toBe('account-B-session')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not publish account A after a pending current-user request sees account B', async () => {
    const currentUserRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn(() => currentUserRequest.promise)
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'account-A-session')

    const pendingUser = api.currentUser()
    storage.setItem(tokenKey, 'account-B-session')
    api.authSessionRevision()
    currentUserRequest.resolve(jsonResponse({ id: 'account-A', nome: 'A', email: 'a@example.test' }))

    await expect(pendingUser).resolves.toBeNull()
    expect(storage.getItem(tokenKey)).toBe('account-B-session')
  })

  it('does not let a late 401 from the old session clear a newer login', async () => {
    const oldUserRequest = deferred<ReturnType<typeof jsonResponse>>()
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const path = String(url)
      if (path.endsWith('/users/me')) return oldUserRequest.promise
      if (path.endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse({
          accessToken: 'new-session-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          user: { id: 'new-user', nome: 'Usuário novo', email: 'new@example.test' },
        }))
      }
      return Promise.resolve(jsonResponse(null, 204))
    })
    vi.stubGlobal('fetch', fetchMock)
    storage.setItem(tokenKey, 'old-session-token')

    const pendingOldUser = api.currentUser()
    await api.logout()
    await api.login({ email: 'new@example.test', senha: 'password' })
    oldUserRequest.resolve(jsonResponse({ message: 'expired' }, 401))

    await expect(pendingOldUser).resolves.toBeNull()
    expect(storage.getItem(tokenKey)).toBe('new-session-token')
  })
})
