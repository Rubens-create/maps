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
- `GET /api/properties?cidade=Campinas&tipo=Aluguel` (tipo opcional: `Venda` para compra ou `Aluguel`; cidade sem distinção entre maiúsculas/minúsculas)
- `GET /api/properties/:id`
- `POST /api/properties` com Bearer token
- `DELETE /api/properties/:id` com Bearer token
- `GET /api/users/me/properties` com Bearer token
- `GET /api/favorites`, `POST /api/favorites/:propertyId` e `DELETE /api/favorites/:propertyId` com Bearer token
- `POST /api/auth/logout` revoga a sessão Bearer atual
- `GET`, `PUT` e `DELETE /api/users/me/location`, além de `POST /api/users/me/location/refresh`, com Bearer token; as gravações usam a versão de consentimento e a validade é configurada por `USER_PRECISE_LOCATION_TTL_HOURS` (24 horas por padrão)

A migração de sessões invalida tokens emitidos antes da versão com `jti`; usuários podem precisar entrar novamente após a implantação.

A busca do mapa exige bounding box e retorna propriedades individuais ou agrupamentos por célula espacial conforme o zoom. As consultas selecionam somente os campos usados pelo mapa.
