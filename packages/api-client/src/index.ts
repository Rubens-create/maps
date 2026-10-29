import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  MapBounds,
  MapResult,
  Property,
  PropertyInput,
  PropertyMapItem,
  RegisterInput,
  UserLocationSettings,
  UserPreciseLocationInput,
} from '@luxxie/types'

export const AUTH_TOKEN_STORAGE_KEY = 'luxxie.access-token'
export const AUTH_SESSION_CHANGED_EVENT = 'luxxie:auth-session-changed'
let authRevision = 0
let authOperationGeneration = 0
let lastObservedToken: string | null | undefined

function dispatchAuthSessionChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event(AUTH_SESSION_CHANGED_EVENT))
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (lastObservedToken === undefined) {
    lastObservedToken = token
  } else if (lastObservedToken !== token) {
    lastObservedToken = token
    authRevision += 1
    authOperationGeneration += 1
    dispatchAuthSessionChanged()
  }
  return token
}

function saveToken(token: string): void {
  const previousToken = getToken()
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  lastObservedToken = token
  if (previousToken !== token) {
    authRevision += 1
    authOperationGeneration += 1
    dispatchAuthSessionChanged()
  }
}

function removeToken(expectedToken?: string): boolean {
  if (typeof window === 'undefined') return false
  const currentToken = getToken()
  if (expectedToken !== undefined && currentToken !== expectedToken) return false
  if (currentToken === null) return false
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  lastObservedToken = null
  authRevision += 1
  authOperationGeneration += 1
  dispatchAuthSessionChanged()
  return true
}

export function clearToken(): void {
  authOperationGeneration += 1
  removeToken()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_TOKEN_STORAGE_KEY) return
    lastObservedToken = event.newValue
    authRevision += 1
    authOperationGeneration += 1
    dispatchAuthSessionChanged()
  })
}

async function request<T>(path: string, init: RequestInit = {}, tokenOverride?: string | null): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const token = tokenOverride === undefined ? getToken() : tokenOverride
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...init, headers })
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) removeToken(token)
    const errorPayload = payload as {
      message?: string | string[]
      issues?: Array<{ path?: string; message?: string }>
    } | null
    const message = Array.isArray(errorPayload?.message)
      ? errorPayload.message.join(', ')
      : errorPayload?.message ?? `Falha na API (${response.status})`
    const issues = errorPayload?.issues
      ?.filter((issue): issue is { path?: string; message: string } => typeof issue.message === 'string')
      .map(({ path, message: issueMessage }) => path ? `${path}: ${issueMessage}` : issueMessage)
      .join('; ')
    throw new ApiError(issues ? `${message} (${issues})` : message, response.status)
  }

  return payload as T
}

async function authenticate(path: '/auth/register' | '/auth/login', input: RegisterInput | LoginInput): Promise<AuthUser> {
  const operationGeneration = ++authOperationGeneration
  const result = await request<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify(input),
  }, null)
  getToken()
  if (operationGeneration !== authOperationGeneration) {
    void request('/auth/logout', { method: 'POST' }, result.accessToken).catch(() => undefined)
    throw new ApiError('A autenticação foi cancelada porque a sessão mudou.', 409)
  }
  saveToken(result.accessToken)
  return result.user
}

async function requestForCurrentSession<T>(path: string, init: RequestInit = {}, expectedRevision?: number): Promise<T> {
  const token = getToken()
  const revision = authRevision
  if (!token) throw new ApiError('Sessão não autenticada.', 401)
  if (expectedRevision !== undefined && expectedRevision !== revision) {
    throw new ApiError('A sessão mudou. Atualize a página e tente novamente.', 401)
  }

  const payload = await request<T>(path, init, token)
  if (getToken() !== token || authRevision !== revision) {
    throw new ApiError('A sessão mudou durante a operação.', 401)
  }
  return payload
}

export const api = {
  register: (input: RegisterInput) => authenticate('/auth/register', input),
  login: (input: LoginInput) => authenticate('/auth/login', input),
  async logout(): Promise<void> {
    authOperationGeneration += 1
    const token = getToken()
    if (!token) return
    removeToken(token)
    try {
      await request('/auth/logout', { method: 'POST' }, token)
    } catch {
      // A sessão é removida do navegador mesmo se a revogação remota estiver indisponível.
    }
  },

  authSessionRevision(): number {
    getToken()
    return authRevision
  },

  hasAuthToken(): boolean {
    return getToken() !== null
  },

  isAuthSessionCurrent(revision: number): boolean {
    getToken()
    return authRevision === revision
  },

  async currentUser(): Promise<AuthUser | null> {
    const token = getToken()
    if (!token) return null
    const revision = authRevision
    try {
      const user = await request<AuthUser>('/users/me', {}, token)
      return getToken() === token && authRevision === revision ? user : null
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },

  searchMap(bounds: MapBounds, signal?: AbortSignal): Promise<MapResult> {
    const params = new URLSearchParams({
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
      north: String(bounds.north),
      zoom: String(bounds.zoom),
    })
    if (bounds.tipo) params.set('tipo', bounds.tipo)
    if (bounds.precoMaiorQue !== undefined) params.set('precoMaiorQue', String(bounds.precoMaiorQue))
    if (bounds.precoMenorQue !== undefined) params.set('precoMenorQue', String(bounds.precoMenorQue))
    if (bounds.quartos !== undefined) params.set('quartos', String(bounds.quartos))
    if (bounds.banheiros !== undefined) params.set('banheiros', String(bounds.banheiros))
    if (bounds.areaMin !== undefined) params.set('areaMin', String(bounds.areaMin))
    if (bounds.aceitaPet !== undefined) params.set('aceitaPet', String(bounds.aceitaPet))
    return request<MapResult>(`/map/properties?${params}`, { signal })
  },

  getProperty(id: number): Promise<Property> {
    return request<Property>(`/properties/${id}`)
  },

  createProperty(input: PropertyInput): Promise<Property> {
    return request<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  myProperties(): Promise<Property[]> {
    return request<Property[]>('/users/me/properties')
  },

  myLocationSettings(expectedRevision?: number): Promise<UserLocationSettings> {
    return requestForCurrentSession<UserLocationSettings>('/users/me/location', {}, expectedRevision)
  },

  saveMyLocation(input: UserPreciseLocationInput, expectedRevision?: number): Promise<UserLocationSettings> {
    return requestForCurrentSession<UserLocationSettings>('/users/me/location', {
      method: 'PUT',
      body: JSON.stringify(input),
    }, expectedRevision)
  },

  refreshMyLocation(input: UserPreciseLocationInput, expectedRevision?: number): Promise<UserLocationSettings> {
    return requestForCurrentSession<UserLocationSettings>('/users/me/location/refresh', {
      method: 'POST',
      body: JSON.stringify(input),
    }, expectedRevision)
  },

  deleteMyLocation(expectedRevision?: number): Promise<UserLocationSettings> {
    return requestForCurrentSession<UserLocationSettings>('/users/me/location', { method: 'DELETE' }, expectedRevision)
  },

  listFavorites(): Promise<Property[]> {
    return request<Property[]>('/favorites')
  },

  addFavorite(propertyId: number): Promise<{ favoritado: true }> {
    return request<{ favoritado: true }>(`/favorites/${propertyId}`, { method: 'POST' })
  },

  removeFavorite(propertyId: number): Promise<{ favoritado: false }> {
    return request<{ favoritado: false }>(`/favorites/${propertyId}`, { method: 'DELETE' })
  },

  deleteProperty(id: number): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/properties/${id}`, { method: 'DELETE' })
  },
}

export type { PropertyMapItem }
