-- ============================================================
-- LUXXIE - Segurança Definitiva (Fase 2)
-- Execute este SQL no Supabase: SQL Editor → New Query → Run
-- ============================================================

-- 1. Garante que o RLS está ativo (já ativamos na Fase 1, mas reforçando)
alter table public.imoveis enable row level security;

-- 2. Apagar as políticas antigas da Fase 1 (se existirem)
drop policy if exists "Imóveis públicos para leitura" on public.imoveis;
drop policy if exists "Inserção pública temporária" on public.imoveis;
drop policy if exists "Dono pode editar" on public.imoveis;
drop policy if exists "Dono pode excluir" on public.imoveis;

-- 3. RECRIAR POLÍTICAS DEFINITIVAS DE SEGURANÇA

-- [LEITURA]: Qualquer pessoa pode VER os imóveis (público)
create policy "Qualquer pessoa pode ver os imóveis"
  on public.imoveis for select
  using (true);

-- [CRIAÇÃO]: Apenas usuários LOGADOS podem INSERIR propriedades
-- O banco vai forçar que o user_id passado seja o mesmo do cara logado (auth.uid())
create policy "Apenas logados podem anunciar"
  on public.imoveis for insert
  with check (auth.uid() = user_id);

-- [EDIÇÃO]: Somente o DONO do anúncio (onde user_id é o dele) pode ALTERAR
create policy "Apenas dono pode editar"
  on public.imoveis for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- [EXCLUSÃO]: Somente o DONO do anúncio pode DELETAR
create policy "Apenas dono pode excluir"
  on public.imoveis for delete
  using (auth.uid() = user_id);

-- 4. VINCULAR IMÓVEIS DE TESTE EXISTENTES (Se você quiser apagar, rode: delete from public.imoveis;)
-- Como os 5 imóveis da Fase 1 não tem dono (user_id = null), eles ficarão "órfãos".
-- Se quiser vincular eles ao seu primeiro usuário criado, rode a query abaixo (descomente as linhas):
--
-- UPDATE public.imoveis
-- SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
-- WHERE user_id IS NULL;
