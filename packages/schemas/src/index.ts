import { z } from 'zod'

export const MapBoundsSchema = z.object({
  west: z.coerce.number().finite().min(-180).max(180),
  south: z.coerce.number().finite().min(-90).max(90),
  east: z.coerce.number().finite().min(-180).max(180),
  north: z.coerce.number().finite().min(-90).max(90),
  zoom: z.coerce.number().int().min(0).max(22),
  tipo: z.enum(['Venda', 'Aluguel']).optional(),
  precoMaiorQue: z.coerce.number().finite().nonnegative().optional(),
  precoMenorQue: z.coerce.number().finite().positive().optional(),
  quartos: z.coerce.number().int().min(1).max(100).optional(),
  banheiros: z.coerce.number().int().min(1).max(100).optional(),
  areaMin: z.coerce.number().finite().positive().optional(),
  aceitaPet: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).refine(({ west, south, east, north }) => west < east && south < north, {
  message: 'Bounding box coordinates must be ordered west-to-east and south-to-north',
}).refine(({ precoMaiorQue, precoMenorQue }) => (
  precoMaiorQue === undefined || precoMenorQue === undefined || precoMaiorQue < precoMenorQue
), {
  message: 'The minimum price must be lower than the maximum price',
  path: ['precoMenorQue'],
})

export type MapBounds = z.infer<typeof MapBoundsSchema>
export type MapPropertyFilters = Pick<MapBounds,
  'precoMaiorQue' | 'precoMenorQue' | 'quartos' | 'banheiros' | 'areaMin' | 'aceitaPet'
>

export const PropertyMapItemSchema = z.object({
  id: z.number().int().positive(),
  titulo: z.string(),
  tipo: z.enum(['Venda', 'Aluguel']),
  preco: z.number().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type PropertyMapItem = z.infer<typeof PropertyMapItemSchema>

export const MapResultItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('property'),
    count: z.literal(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    property: PropertyMapItemSchema,
  }),
  z.object({
    kind: z.literal('cluster'),
    count: z.number().int().min(2),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
])

export type MapResultItem = z.infer<typeof MapResultItemSchema>

export const MapResultSchema = z.object({
  items: z.array(MapResultItemSchema),
})

export type MapResult = z.infer<typeof MapResultSchema>

export const RegisterSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  senha: z.string().min(8).max(72),
})

export const LoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  senha: z.string().min(1).max(72),
})

export const PropertyInputSchema = z.object({
  titulo: z.string().trim().min(3).max(150),
  descricao: z.string().trim().max(10000).nullable().optional(),
  tipo: z.enum(['Venda', 'Aluguel']),
  preco: z.number().finite().positive(),
  quartos: z.number().int().min(0).max(100).optional(),
  banheiros: z.number().int().min(0).max(100).optional(),
  area: z.number().finite().positive().nullable().optional(),
  aceita_pet: z.boolean().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  foto_capa: z.url().nullable().optional(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  cidade: z.string().trim().max(100).nullable().optional(),
  estado: z.string().trim().max(2).nullable().optional(),
  bairro: z.string().trim().max(100).nullable().optional(),
  endereco: z.string().trim().max(255).nullable().optional(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type PropertyInput = z.infer<typeof PropertyInputSchema>
