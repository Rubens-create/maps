import { Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class FavoritesService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: string) {
    const result = await this.database.query(
      `SELECT p.id, p.created_at, p.titulo, p.descricao, p.tipo, p.preco::float8 AS preco,
              p.quartos, p.banheiros, p.area::float8 AS area, p.aceita_pet, p.whatsapp, p.foto_capa,
              ST_Y(p.location)::float8 AS latitude, ST_X(p.location)::float8 AS longitude,
              p.cidade, p.estado, p.bairro, p.endereco
       FROM favorites f
       JOIN properties p ON p.id = f.property_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC, p.created_at DESC`,
      [userId],
    )
    return result.rows
  }

  async add(userId: string, propertyId: number): Promise<{ favoritado: true }> {
    try {
      await this.database.query(
        `INSERT INTO favorites (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING`,
        [userId, propertyId],
      )
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new NotFoundException('Imóvel não encontrado')
      }
      throw error
    }
    return { favoritado: true }
  }

  async remove(userId: string, propertyId: number): Promise<{ favoritado: false }> {
    await this.database.query(
      'DELETE FROM favorites WHERE user_id = $1 AND property_id = $2',
      [userId, propertyId],
    )
    return { favoritado: false }
  }
}
