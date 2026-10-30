import { describe, expect, it } from 'vitest'
import { CityPropertiesQuerySchema, MapBoundsSchema, UserPreciseLocationInputSchema } from './index.js'

describe('MapBoundsSchema', () => {
  it('parses numeric query values and keeps a valid viewport', () => {
    expect(MapBoundsSchema.parse({ west: '-47.9', south: '-23.7', east: '-46.4', north: '-23.3', zoom: '12' })).toEqual({
      west: -47.9,
      south: -23.7,
      east: -46.4,
      north: -23.3,
      zoom: 12,
    })
  })

  it('rejects inverted bounds', () => {
    expect(() => MapBoundsSchema.parse({ west: '10', south: '-10', east: '-10', north: '10', zoom: '5' })).toThrow()
  })

  it('keeps the optional sale type filter in the viewport query', () => {
    expect(MapBoundsSchema.parse({ west: '-47.9', south: '-23.7', east: '-46.4', north: '-23.3', zoom: '12', tipo: 'Aluguel' })).toMatchObject({
      zoom: 12,
      tipo: 'Aluguel',
    })
  })

  it('parses property filters from map query values', () => {
    expect(MapBoundsSchema.parse({
      west: '-47.9', south: '-23.7', east: '-46.4', north: '-23.3', zoom: '12',
      precoMaiorQue: '250000', precoMenorQue: '900000', quartos: '2',
      banheiros: '1', areaMin: '80', aceitaPet: 'true',
    })).toMatchObject({
      precoMaiorQue: 250000,
      precoMenorQue: 900000,
      quartos: 2,
      banheiros: 1,
      areaMin: 80,
      aceitaPet: true,
    })
  })

  it('rejects a price minimum that is not below the maximum', () => {
    expect(() => MapBoundsSchema.parse({
      west: '-47.9', south: '-23.7', east: '-46.4', north: '-23.3', zoom: '12',
      precoMaiorQue: '900000', precoMenorQue: '250000',
    })).toThrow()
  })
})

describe('UserPreciseLocationInputSchema', () => {
  it('requires valid coordinates and the current location-consent version', () => {
    expect(UserPreciseLocationInputSchema.parse({ latitude: -23.55, longitude: -46.63, consentVersion: 0 })).toEqual({
      latitude: -23.55,
      longitude: -46.63,
      consentVersion: 0,
    })
    expect(() => UserPreciseLocationInputSchema.parse({ latitude: -23.55, longitude: -46.63 })).toThrow()
    expect(() => UserPreciseLocationInputSchema.parse({ latitude: 0, longitude: 0, consentVersion: -1 })).toThrow()
  })

  it('rejects invalid coordinates and caller-supplied identity fields', () => {
    expect(() => UserPreciseLocationInputSchema.parse({ latitude: 91, longitude: 0, consentVersion: 0 })).toThrow()
    expect(() => UserPreciseLocationInputSchema.parse({ latitude: 0, longitude: 181, consentVersion: 0 })).toThrow()
    expect(() => UserPreciseLocationInputSchema.parse({ latitude: 0, longitude: 0, consentVersion: 0, userId: 'other-user' })).toThrow()
  })
})

describe('CityPropertiesQuerySchema', () => {
  it('trims city names and accepts the optional sale or rent filter', () => {
    expect(CityPropertiesQuerySchema.parse({ cidade: '  Campinas  ', tipo: 'Aluguel' })).toEqual({
      cidade: 'Campinas',
      tipo: 'Aluguel',
    })
    expect(CityPropertiesQuerySchema.parse({ cidade: 'Campinas' })).toEqual({ cidade: 'Campinas' })
  })

  it('rejects empty city names and unsupported transaction types', () => {
    expect(() => CityPropertiesQuerySchema.parse({ cidade: '  ' })).toThrow()
    expect(() => CityPropertiesQuerySchema.parse({ cidade: 'Campinas', tipo: 'Compra' })).toThrow()
  })
})
