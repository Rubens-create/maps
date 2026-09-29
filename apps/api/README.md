# Luxxie API

API HTTP em NestJS/TypeScript. A documentação OpenAPI/Swagger fica em `/docs` e o JSON OpenAPI em `/docs-json`.

## Rodar localmente

1. Copie `.env.example` para `.env` na raiz e defina `DATABASE_URL`, `JWT_SECRET`, `PORT` e `WEB_ORIGIN`.
2. Inicie o PostgreSQL com PostGIS: `docker compose up -d db`.
3. Aplique as migrações: `npm run db:migrate`.
4. Rode a API: `npm run dev:api`.

## Endpoints principais

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/map/properties?west=...&south=...&east=...&north=...&zoom=...`
- `GET /api/properties/:id`
- `POST /api/properties` com Bearer token
- `DELETE /api/properties/:id` com Bearer token
- `GET /api/users/me/properties` com Bearer token

A busca do mapa exige bounding box e retorna propriedades individuais ou agrupamentos por célula espacial conforme o zoom. As consultas selecionam somente os campos usados pelo mapa.
