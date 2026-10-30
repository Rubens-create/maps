export type {
  CityPropertiesQuery,
  MapBounds,
  MapResult,
  MapResultItem,
  MapPropertyFilters,
  PropertyMapItem,
  LoginInput,
  PropertyInput,
  RegisterInput,
  UserPreciseLocationInput,
} from '@luxxie/schemas'

export type PropertyType = 'Venda' | 'Aluguel'

export interface AuthUser {
  id: string
  nome: string
  email: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AuthUser
}

export interface PreciseLocation {
  latitude: number
  longitude: number
  capturedAt: string
  expiresAt: string
}

export interface UserLocationSettings {
  enabled: boolean
  consentVersion: number
  location: PreciseLocation | null
}

export interface Property {
  id: number
  created_at: string
  titulo: string
  descricao: string | null
  tipo: PropertyType
  preco: number
  quartos: number | null
  banheiros: number | null
  area: number | null
  aceita_pet: boolean
  whatsapp: string | null
  foto_capa: string | null
  latitude: number
  longitude: number
  cidade: string | null
  estado: string | null
  bairro: string | null
  endereco: string | null
  user_id?: string | null
}
