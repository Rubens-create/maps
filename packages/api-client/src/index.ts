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
} from '@luxxie/types'

const tokenStorageKey = 'luxxie.access-token'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(tokenStorageKey)
}

function saveToken(token: string): void {
  window.localStorage.setItem(tokenStorageKey, token)
}

export function clearToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(tokenStorageKey)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...init, headers })
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) clearToken()
    const errorPayload = payload as { message?: string | string[] } | null
    const message = Array.isArray(errorPayload?.message)
      ? errorPayload.message.join(', ')
      : errorPayload?.message ?? `Falha na API (${response.status})`
    throw new ApiError(message, response.status)
  }

  return payload as T
}

async function authenticate(path: '/auth/register' | '/auth/login', input: RegisterInput | LoginInput): Promise<AuthUser> {
  const result = await request<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  saveToken(result.accessToken)
  return result.user
}

export const api = {
  register: (input: RegisterInput) => authenticate('/auth/register', input),
  login: (input: LoginInput) => authenticate('/auth/login', input),
  logout: (): void => clearToken(),

  async currentUser(): Promise<AuthUser | null> {
    if (!getToken()) return null
    try {
      return await request<AuthUser>('/users/me')
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

  deleteProperty(id: number): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/properties/${id}`, { method: 'DELETE' })
  },
}

export type { PropertyMapItem }
