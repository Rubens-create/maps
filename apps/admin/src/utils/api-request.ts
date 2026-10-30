export interface ApiRequestParameter {
  name: string
  in: string
  required?: boolean
}

export interface ApiBodyFieldSchema {
  type?: string
  format?: string
  enum?: unknown[]
  nullable?: boolean
}

export interface ApiBodySchema {
  properties?: Record<string, ApiBodyFieldSchema>
  required?: string[]
}

export function buildApiRequestBody(
  schema: ApiBodySchema,
  values: Record<string, string>,
  explicitNulls: string[] = [],
): Record<string, unknown> {
  const required = new Set(schema.required ?? [])
  const body: Record<string, unknown> = {}

  for (const [name, field] of Object.entries(schema.properties ?? {})) {
    if (explicitNulls.includes(name)) {
      if (!field.nullable) throw new Error(`${name} não aceita null`)
      body[name] = null
      continue
    }

    const raw = values[name] ?? ''
    if (!raw.trim()) {
      if (required.has(name)) throw new Error(`${name} é obrigatório`)
      continue
    }

    let value: unknown = raw
    if (field.type === 'number' || field.type === 'integer') {
      const numeric = Number(raw)
      if (!Number.isFinite(numeric) || (field.type === 'integer' && !Number.isInteger(numeric))) {
        throw new Error(`${name} precisa ser ${field.type === 'integer' ? 'um inteiro' : 'um número'} válido`)
      }
      value = numeric
    } else if (field.type === 'boolean') {
      if (raw !== 'true' && raw !== 'false') throw new Error(`${name} precisa ser true ou false`)
      value = raw === 'true'
    } else if (field.type === 'array' || field.type === 'object') {
      try {
        value = JSON.parse(raw) as unknown
      } catch {
        throw new Error(`${name} precisa conter JSON válido`)
      }
      if (field.type === 'array' && !Array.isArray(value)) throw new Error(`${name} precisa ser uma lista JSON`)
      if (field.type === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) {
        throw new Error(`${name} precisa ser um objeto JSON`)
      }
    }

    if (field.enum?.length && !field.enum.includes(value)) {
      throw new Error(`${name} precisa corresponder a uma das opções disponíveis`)
    }
    body[name] = value
  }

  for (const name of required) {
    if (!(name in body)) throw new Error(`${name} é obrigatório`)
  }

  return body
}

export function buildApiRequestUrl(
  origin: string,
  path: string,
  parameters: ApiRequestParameter[],
  values: Record<string, string>,
): string {
  let resolvedPath = path

  for (const parameter of parameters.filter((item) => item.in === 'path')) {
    const value = values[`path:${parameter.name}`]?.trim()
    if (!value) throw new Error(`${parameter.name} é obrigatório`)
    resolvedPath = resolvedPath.replaceAll(`{${parameter.name}}`, encodeURIComponent(value))
  }

  if (/[{}]/.test(resolvedPath)) throw new Error('Preencha os parâmetros de caminho obrigatórios')

  const base = new URL(origin)
  const url = new URL(resolvedPath, base)
  if (url.origin !== base.origin || (url.pathname !== '/api' && !url.pathname.startsWith('/api/'))) {
    throw new Error('A rota precisa pertencer à API deste painel')
  }

  for (const parameter of parameters.filter((item) => item.in === 'query')) {
    const value = values[`query:${parameter.name}`] ?? ''
    if (!value.trim()) {
      if (parameter.required) throw new Error(`${parameter.name} é obrigatório`)
      continue
    }
    url.searchParams.set(parameter.name, value)
  }

  return url.toString()
}

export function sanitizeApiResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeApiResponse)
  if (value === null || typeof value !== 'object') return value

  const sensitiveNames = new Set([
    'token',
    'accesstoken',
    'refreshtoken',
    'bearertoken',
    'password',
    'senha',
    'authorization',
    'secret',
    'clientsecret',
    'apikey',
  ])

  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '')
    return [key, sensitiveNames.has(normalizedKey) ? '[redigido]' : sanitizeApiResponse(item)]
  }))
}
