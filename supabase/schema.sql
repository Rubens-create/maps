-- ============================================================
-- LUXXIE - Schema do Banco de Dados
-- Execute este SQL no Supabase: SQL Editor → New Query → Run
-- ============================================================

-- 1. Extensão PostGIS (busca geoespacial futura)
create extension if not exists postgis;

-- 2. Tabela principal de imóveis
create table if not exists public.imoveis (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),

  -- Dados do anúncio
  titulo      text        not null,
  descricao   text,
  tipo        text        not null check (tipo in ('Venda', 'Aluguel')),
  preco       numeric(14, 2) not null check (preco > 0),

  -- Características
  quartos     smallint    default 1 check (quartos >= 0),
  banheiros   smallint    default 1 check (banheiros >= 0),
  area        numeric(8, 2)          check (area > 0),
  aceita_pet  boolean     not null default false,

  -- Contato
  whatsapp    text,

  -- Mídia
  foto_capa   text,

  -- Localização
  latitude    double precision not null,
  longitude   double precision not null,
  cidade      text,
  estado      text,
  bairro      text,
  endereco    text,

  -- Anunciante (preenchido automaticamente após Fase 2 - Auth)
  user_id     uuid references auth.users(id) on delete set null
);

-- 3. Índice de localização (melhora busca por região)
create index idx_imoveis_location on public.imoveis (latitude, longitude);
create index idx_imoveis_tipo     on public.imoveis (tipo);
create index idx_imoveis_preco    on public.imoveis (preco);

-- 4. RLS (Row Level Security) — FASE 1: aberto para leitura pública
--    Na Fase 2 (Auth) vamos restringir escrita para usuários autenticados
alter table public.imoveis enable row level security;

-- Qualquer pessoa pode VER imóveis
create policy "Imóveis públicos para leitura"
  on public.imoveis for select
  using (true);

-- Qualquer pessoa pode INSERIR imóveis (por ora, sem login)
-- Na Fase 2 isto será restrito a: auth.uid() = user_id
create policy "Inserção pública temporária"
  on public.imoveis for insert
  with check (true);

-- Somente o dono pode EDITAR (preparado para Fase 2)
create policy "Dono pode editar"
  on public.imoveis for update
  using (auth.uid() = user_id);

-- Somente o dono pode EXCLUIR (preparado para Fase 2)
create policy "Dono pode excluir"
  on public.imoveis for delete
  using (auth.uid() = user_id);

-- 5. Dados de exemplo para testar os pins no mapa
insert into public.imoveis
  (titulo, descricao, tipo, preco, quartos, banheiros, area, aceita_pet, whatsapp, foto_capa, latitude, longitude, cidade, estado)
values
  (
    'Apartamento moderno em Pinheiros',
    'Lindo apto com varanda gourmet, piscina no condomínio e vaga de garagem.',
    'Venda', 680000, 2, 2, 72, true,
    '11999990001',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    -23.5636, -46.6851, 'São Paulo', 'SP'
  ),
  (
    'Casa com quintal em Belo Horizonte',
    'Casa espaçosa com quintal grande, churrasqueira e 3 vagas.',
    'Venda', 420000, 3, 2, 140, true,
    '31999990002',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    -19.9191, -43.9386, 'Belo Horizonte', 'MG'
  ),
  (
    'Studio aconchegante no Centro do Rio',
    'Studio totalmente mobiliado, a 5 minutos do metrô.',
    'Aluguel', 2800, 1, 1, 35, false,
    '21999990003',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    -22.9035, -43.1729, 'Rio de Janeiro', 'RJ'
  ),
  (
    'Cobertura duplex em Miramar - Floripa',
    'Vista para o mar, 2 suítes, terraço privativo.',
    'Aluguel', 5500, 2, 2, 95, false,
    '48999990004',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    -27.5954, -48.5480, 'Florianópolis', 'SC'
  ),
  (
    'Terreno em Alphaville',
    'Terreno plano em condomínio fechado, 600m², documentação ok.',
    'Venda', 890000, 0, 0, 600, false,
    '11999990005',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    -23.4978, -46.8586, 'Barueri', 'SP'
  );
