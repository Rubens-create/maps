import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseService } from '../database/database.service'
import { PropertiesService } from './properties.service'

describe('PropertiesService.findByCity', () => {
  const query = vi.fn()
  let service: PropertiesService

  beforeEach(() => {
    query.mockReset()
    query.mockResolvedValue({ rows: [{ id: 7, cidade: 'Campinas', tipo: 'Aluguel' }], rowCount: 1 })
    service = new PropertiesService({ query } as unknown as DatabaseService)
  })

  it('filters by city and the requested sale-or-rent type using SQL parameters', async () => {
    const result = await service.findByCity({ cidade: 'Campinas', tipo: 'Aluguel' })

    expect(result).toEqual([{ id: 7, cidade: 'Campinas', tipo: 'Aluguel' }])
    expect(query).toHaveBeenCalledWith(expect.stringContaining('LOWER(BTRIM(cidade)) = LOWER($1)'), ['Campinas', 'Aluguel'])
  })

  it('leaves type unfiltered when the optional query parameter is omitted', async () => {
    await service.findByCity({ cidade: 'Campinas' })

    expect(query).toHaveBeenCalledWith(expect.stringContaining('($2::text IS NULL OR tipo = $2)'), ['Campinas', null])
  })
})
