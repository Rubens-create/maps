-- DADOS FICTÍCIOS SOMENTE PARA DESENVOLVIMENTO LOCAL.
-- Não executar em produção. Este usuário de seed tem uma senha aleatória não guardada.
BEGIN;

INSERT INTO users (id, full_name, email, password_hash)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Usuário de demonstração',
  'seed-data@luxxie.invalid',
  '$2b$12$hRPazYmW.k/29xU3shiCMO.bBBKDCkB.cj9KM3kJXPpkzWkrQBkq2'
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

DELETE FROM properties
WHERE user_id = '00000000-0000-4000-8000-000000000001';

INSERT INTO properties (
  titulo, descricao, tipo, preco, quartos, banheiros, area, aceita_pet,
  whatsapp, foto_capa, location, cidade, estado, bairro, endereco, user_id
)
VALUES
  ('DEMO - Apartamento em Pinheiros', 'Anúncio fictício para visualizar os marcadores do mapa.', 'Venda', 890000, 2, 2, 78, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-46.6810, -23.5640), 4326), 'São Paulo', 'SP', 'Pinheiros', 'Rua de demonstração, 100', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Studio na Vila Mariana', 'Studio fictício perto do metrô, usado apenas em desenvolvimento.', 'Aluguel', 3200, 1, 1, 38, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-46.6340, -23.5890), 4326), 'São Paulo', 'SP', 'Vila Mariana', 'Avenida de demonstração, 200', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa em Moema', 'Casa fictícia com quintal e duas vagas.', 'Venda', 1450000, 3, 3, 180, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-46.6620, -23.6010), 4326), 'São Paulo', 'SP', 'Moema', 'Alameda de demonstração, 300', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Tatuapé', 'Apartamento fictício para teste de filtro por aluguel.', 'Aluguel', 2800, 2, 1, 64, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-46.5760, -23.5400), 4326), 'São Paulo', 'SP', 'Tatuapé', 'Rua de demonstração, 400', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento em Campinas', 'Imóvel fictício no interior paulista.', 'Aluguel', 2600, 2, 2, 70, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-47.0608, -22.9056), 4326), 'Campinas', 'SP', 'Centro', 'Rua de demonstração, 500', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa em Santos', 'Casa fictícia a poucas quadras da praia.', 'Venda', 780000, 3, 2, 130, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-46.3360, -23.9670), 4326), 'Santos', 'SP', 'Gonzaga', 'Avenida de demonstração, 600', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento em Copacabana', 'Anúncio fictício para testar marcadores no Rio de Janeiro.', 'Aluguel', 5200, 2, 2, 82, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-43.1866, -22.9711), 4326), 'Rio de Janeiro', 'RJ', 'Copacabana', 'Rua de demonstração, 700', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa na Tijuca', 'Casa fictícia com varanda.', 'Venda', 650000, 3, 2, 115, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-43.2322, -22.9249), 4326), 'Rio de Janeiro', 'RJ', 'Tijuca', 'Rua de demonstração, 800', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Studio em Niterói', 'Studio fictício para visualização de anúncios de aluguel.', 'Aluguel', 1900, 1, 1, 32, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-43.1096, -22.9028), 4326), 'Niterói', 'RJ', 'Icaraí', 'Rua de demonstração, 900', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento na Savassi', 'Apartamento fictício em Belo Horizonte.', 'Venda', 550000, 2, 2, 74, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-43.9364, -19.9386), 4326), 'Belo Horizonte', 'MG', 'Savassi', 'Rua de demonstração, 110', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa em Contagem', 'Casa fictícia em condomínio residencial.', 'Aluguel', 2600, 3, 2, 105, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-44.0536, -19.9317), 4326), 'Contagem', 'MG', 'Eldorado', 'Avenida de demonstração, 120', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento na Asa Sul', 'Imóvel fictício próximo ao centro de Brasília.', 'Aluguel', 4000, 2, 2, 90, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-47.9218, -15.8267), 4326), 'Brasília', 'DF', 'Asa Sul', 'Quadra de demonstração, 130', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa no Lago Norte', 'Casa fictícia com jardim.', 'Venda', 1650000, 4, 3, 240, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-47.8587, -15.7289), 4326), 'Brasília', 'DF', 'Lago Norte', 'Conjunto de demonstração, 140', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Batel', 'Apartamento fictício em Curitiba.', 'Venda', 720000, 2, 2, 86, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-49.2769, -25.4411), 4326), 'Curitiba', 'PR', 'Batel', 'Rua de demonstração, 150', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Centro de Curitiba', 'Anúncio fictício para teste de aluguel.', 'Aluguel', 2800, 2, 1, 62, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-49.2733, -25.4284), 4326), 'Curitiba', 'PR', 'Centro', 'Avenida de demonstração, 160', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Centro de Florianópolis', 'Imóvel fictício na capital catarinense.', 'Venda', 850000, 2, 2, 92, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-48.5480, -27.5954), 4326), 'Florianópolis', 'SC', 'Centro', 'Rua de demonstração, 170', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa nos Ingleses', 'Casa fictícia para testar navegação do mapa.', 'Aluguel', 3400, 3, 2, 125, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-48.3970, -27.4300), 4326), 'Florianópolis', 'SC', 'Ingleses', 'Servidão de demonstração, 180', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento em Moinhos de Vento', 'Apartamento fictício em Porto Alegre.', 'Aluguel', 3500, 2, 2, 80, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-51.2018, -30.0277), 4326), 'Porto Alegre', 'RS', 'Moinhos de Vento', 'Rua de demonstração, 190', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Casa no Menino Deus', 'Casa fictícia com pátio.', 'Venda', 720000, 3, 2, 140, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-51.2280, -30.0530), 4326), 'Porto Alegre', 'RS', 'Menino Deus', 'Avenida de demonstração, 210', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento na Barra', 'Anúncio fictício em Salvador.', 'Venda', 680000, 2, 2, 88, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-38.5324, -13.0106), 4326), 'Salvador', 'BA', 'Barra', 'Rua de demonstração, 220', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento em Boa Viagem', 'Apartamento fictício para teste de filtro.', 'Aluguel', 2400, 2, 1, 66, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-34.9010, -8.1198), 4326), 'Recife', 'PE', 'Boa Viagem', 'Avenida de demonstração, 230', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Meireles', 'Imóvel fictício em Fortaleza.', 'Venda', 950000, 3, 2, 105, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-38.5267, -3.7319), 4326), 'Fortaleza', 'CE', 'Meireles', 'Rua de demonstração, 240', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Setor Oeste', 'Anúncio fictício em Goiânia.', 'Aluguel', 2300, 2, 2, 72, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-49.2648, -16.6869), 4326), 'Goiânia', 'GO', 'Setor Oeste', 'Rua de demonstração, 250', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Studio em Adrianópolis', 'Studio fictício em Manaus.', 'Venda', 430000, 1, 1, 45, false, NULL, NULL, ST_SetSRID(ST_MakePoint(-60.0160, -3.1010), 4326), 'Manaus', 'AM', 'Adrianópolis', 'Rua de demonstração, 260', '00000000-0000-4000-8000-000000000001'),
  ('DEMO - Apartamento no Umarizal', 'Imóvel fictício em Belém.', 'Aluguel', 2100, 2, 1, 68, true, NULL, NULL, ST_SetSRID(ST_MakePoint(-48.4860, -1.4430), 4326), 'Belém', 'PA', 'Umarizal', 'Travessa de demonstração, 270', '00000000-0000-4000-8000-000000000001');

COMMIT;
