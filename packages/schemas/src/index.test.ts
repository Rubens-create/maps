import { describe, expect, it } from 'vitest'
import { MapBoundsSchema } from './index.js'

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
})
