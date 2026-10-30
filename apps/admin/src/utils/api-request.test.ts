import { describe, expect, it } from 'vitest'
import { buildApiRequestBody, buildApiRequestUrl, sanitizeApiResponse } from './api-request'

describe('API request playground helpers', () => {
  it('builds a typed request body and omits empty optional fields', () => {
    const body = buildApiRequestBody({
      required: ['titulo', 'preco', 'aceita_pet'],
      properties: {
        titulo: { type: 'string' },
        preco: { type: 'number' },
        aceita_pet: { type: 'boolean' },
        quartos: { type: 'integer' },
        cidade: { type: 'string' },
      },
    }, {
      titulo: 'Casa de teste',
      preco: '1250.5',
      aceita_pet: 'false',
      quartos: '',
      cidade: '',
    })

    expect(body).toEqual({ titulo: 'Casa de teste', preco: 1250.5, aceita_pet: false })
  })

  it('marks required body fields and supports explicit null for nullable optionals', () => {
    const schema = {
      required: ['email'],
      properties: {
        email: { type: 'string' },
        descricao: { type: 'string', nullable: true },
      },
    }

    expect(() => buildApiRequestBody(schema, { email: '' })).toThrow('email é obrigatório')
    expect(buildApiRequestBody(schema, { email: 'dev@example.com' }, ['descricao']))
      .toEqual({ email: 'dev@example.com', descricao: null })
  })

  it('encodes path and query values and skips blank optional filters', () => {
    const url = buildApiRequestUrl(
      'https://luxxie.example',
      '/api/properties/{id}',
      [
        { name: 'id', in: 'path', required: true },
        { name: 'tipo', in: 'query' },
        { name: 'zoom', in: 'query', required: true },
      ],
      { 'path:id': 'apt/42', 'query:tipo': '', 'query:zoom': '12' },
    )

    expect(url).toBe('https://luxxie.example/api/properties/apt%2F42?zoom=12')
  })

  it('rejects a request when a required parameter is missing', () => {
    expect(() => buildApiRequestUrl(
      'https://luxxie.example',
      '/api/map/properties',
      [{ name: 'west', in: 'query', required: true }],
      {},
    )).toThrow('west é obrigatório')
  })

  it('does not allow an OpenAPI path to send requests outside the current API origin', () => {
    expect(() => buildApiRequestUrl(
      'https://luxxie.example',
      'https://attacker.example/collect',
      [],
      {},
    )).toThrow('A rota precisa pertencer à API deste painel')
  })

  it('redacts tokens and passwords recursively from response previews', () => {
    expect(sanitizeApiResponse({
      accessToken: 'secret-token',
      user: { senha: 'secret-password', nome: 'Pessoa' },
      nested: [{ authorization: 'Bearer secret-token', value: 3 }],
    })).toEqual({
      accessToken: '[redigido]',
      user: { senha: '[redigido]', nome: 'Pessoa' },
      nested: [{ authorization: '[redigido]', value: 3 }],
    })
  })
})
