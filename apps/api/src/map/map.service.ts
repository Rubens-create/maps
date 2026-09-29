import { Injectable } from '@nestjs/common'
import type { MapBounds, MapResult } from '@luxxie/types'
import { DatabaseService } from '../database/database.service'

interface MapRow {
  kind: 'property' | 'cluster'
  count: number
  latitude: number
  longitude: number
  property: MapResult['items'][number] extends infer _T ? unknown : never
}

@Injectable()
export class MapService {
  constructor(private readonly database: DatabaseService) {}

  async findVisible(bounds: MapBounds): Promise<MapResult> {
    const cellSizeMeters = 40_075_016.686 / 256 / 2 ** bounds.zoom * 48
    const result = await this.database.query<MapRow>(
      `WITH visible AS (
         SELECT id, titulo, tipo, preco::float8 AS preco, location,
                ST_Transform(location, 3857) AS point_3857
         FROM properties
         WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
           AND ST_Intersects(location, ST_MakeEnvelope($1, $2, $3, $4, 4326))
           AND ($6::text IS NULL OR tipo = $6)
       ), grouped AS (
         SELECT floor(ST_X(point_3857) / $5)::bigint AS cell_x,
                floor(ST_Y(point_3857) / $5)::bigint AS cell_y,
                count(*)::integer AS item_count,
                ST_Centroid(ST_Collect(point_3857)) AS center_3857,
                jsonb_agg(jsonb_build_object(
                  'id', id, 'titulo', titulo, 'tipo', tipo, 'preco', preco,
                  'latitude', ST_Y(location), 'longitude', ST_X(location)
                )) AS properties
         FROM visible
         GROUP BY cell_x, cell_y
       )
       SELECT CASE WHEN item_count = 1 THEN 'property' ELSE 'cluster' END AS kind,
              item_count AS count,
              ST_Y(ST_Transform(center_3857, 4326)) AS latitude,
              ST_X(ST_Transform(center_3857, 4326)) AS longitude,
              CASE WHEN item_count = 1 THEN properties -> 0 ELSE NULL END AS property
       FROM grouped
       ORDER BY item_count DESC`,
      [bounds.west, bounds.south, bounds.east, bounds.north, cellSizeMeters, bounds.tipo ?? null],
    )

    return { items: result.rows.map((row) => ({
      kind: row.kind,
      count: row.count,
      latitude: row.latitude,
      longitude: row.longitude,
      ...(row.kind === 'property' ? { property: row.property } : {}),
    })) as MapResult['items'] }
  }
}
