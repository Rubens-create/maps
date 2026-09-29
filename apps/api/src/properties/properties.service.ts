import { Injectable, NotFoundException } from '@nestjs/common'
import type { PropertyInput } from '@luxxie/types'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class PropertiesService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: PropertyInput, userId: string) {
    const result = await this.database.query(
      `INSERT INTO properties (
         titulo, descricao, tipo, preco, quartos, banheiros, area, aceita_pet,
         whatsapp, foto_capa, location, cidade, estado, bairro, endereco, user_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         ST_SetSRID(ST_MakePoint($11, $12), 4326), $13, $14, $15, $16, $17
       )
       RETURNING id, created_at, titulo, descricao, tipo, preco::float8 AS preco,
                 quartos, banheiros, area::float8 AS area, aceita_pet, whatsapp, foto_capa,
                 ST_Y(location) AS latitude, ST_X(location) AS longitude,
                 cidade, estado, bairro, endereco`,
      [
        input.titulo, input.descricao ?? null, input.tipo, input.preco,
        input.quartos ?? 1, input.banheiros ?? 1, input.area ?? null,
        input.aceita_pet ?? false, input.whatsapp ?? null, input.foto_capa ?? null,
        input.longitude, input.latitude, input.cidade ?? null, input.estado ?? null,
        input.bairro ?? null, input.endereco ?? null, userId,
      ],
    )
    return result.rows[0]
  }

  async findById(id: number) {
    const result = await this.database.query(
      `SELECT id, created_at, titulo, descricao, tipo, preco::float8 AS preco,
              quartos, banheiros, area::float8 AS area, aceita_pet, whatsapp, foto_capa,
              ST_Y(location) AS latitude, ST_X(location) AS longitude,
              cidade, estado, bairro, endereco
       FROM properties WHERE id = $1`,
      [id],
    )
    if (!result.rowCount) throw new NotFoundException('Imóvel não encontrado')
    return result.rows[0]
  }

  async delete(id: number, userId: string): Promise<void> {
    const result = await this.database.query(
      'DELETE FROM properties WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    )
    if (!result.rowCount) throw new NotFoundException('Imóvel não encontrado')
  }
}
