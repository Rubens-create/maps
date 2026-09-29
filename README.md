# Luxxie

Monorepo TypeScript com frontend Vue 3/Vite e API NestJS, organizado em workspaces npm.

## Estrutura

- `apps/web`: experiência pública de busca e mapa.
- `apps/admin`: dashboard para login, publicação e gestão de anúncios.
- `apps/api`: API NestJS com autenticação JWT, usuários, imóveis e mapa.
- `packages/schemas`: schemas Zod compartilhados e validação em runtime.
- `packages/types`: tipos compartilhados inferidos dos schemas.
- `packages/api-client`: cliente HTTP compartilhado pelos dois frontends.
- `packages/ui`: tokens CSS compartilhados.
- `database/migrations`: migrações SQL para PostgreSQL 18/PostGIS.
- `docker`: imagens de `web`, `admin` e API e configuração Nginx; produção roteada pelo Traefik do Coolify.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e configure os valores locais.
2. Inicie o stack completo: `docker compose up --build -d`.
3. Opcionalmente carregue os anúncios fictícios: `npm run db:seed:dev`.
4. Abra o app público em `http://localhost:8081`, o dashboard em `http://localhost:8082` e a documentação em qualquer um dos hosts em `/docs`.
5. Para HMR, use `npm run dev:web` (porta 5173) e `npm run dev:admin` (porta 5174); o Vite encaminha `/api` para a API em `http://localhost:3011`.
6. Checagem de tipos/build: `npm run typecheck` e `npm run build`.
7. Testes: `npm test`.

O Compose aplica as migrações antes de iniciar a API e mantém o PostgreSQL em volume. Para rodar o backend fora do Docker, use `docker compose up -d db`, `npm run db:migrate` e `npm run dev:api`.

## API

- `GET /api/health`
- `POST /api/auth/register` e `POST /api/auth/login`
- `GET /api/map/properties?west=...&south=...&east=...&north=...&zoom=...&tipo=...`
- `GET /api/properties/:id`
- `POST /api/properties` e `DELETE /api/properties/:id` (Bearer token)
- `GET /api/users/me` e `GET /api/users/me/properties` (Bearer token)

A tela do mapa consulta novamente após movimento/zoom, com debounce e cancelamento de pedidos antigos. A API limita a consulta à bounding box visível, aplica filtros no banco e agrupa pontos próximos conforme o zoom.

## Produção

O overlay `docker-compose.prod.yml` é para o servidor separado gerenciado pelo Coolify. Ele mantém API e banco em rede interna e disponibiliza os serviços `web` e `admin` na porta interna 80 para o Traefik do Coolify. Configure um domínio para cada frontend, HTTPS no Coolify, `VITE_WEB_URL`, `WEB_ORIGIN` com as duas origens HTTPS, `POSTGRES_PASSWORD` e `JWT_SECRET`. Aponte o DNS para o servidor e aplique as migrações antes de subir a nova versão:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api node dist/database/migrate.js
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Dados e seed

Os dados antigos do Supabase eram de teste e não foram importados. Crie novas contas e anúncios pela aplicação; eles serão gravados no PostgreSQL.

`database/seeds/development.sql` contém apenas registros fictícios para desenvolvimento local. Não execute esse seed no ambiente de produção.
