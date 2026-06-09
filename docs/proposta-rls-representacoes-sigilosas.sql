-- SIPI - Proposta revisavel para RLS de representacoes sigilosas
--
-- IMPORTANTE:
-- - Este arquivo e apenas documentacao tecnica/proposta.
-- - Nao foi executado automaticamente.
-- - Revise e aplique manualmente no Supabase SQL Editor somente quando aprovado.
-- - Esta proposta nao cria migration versionada.
-- - Esta proposta nao altera frontend.
-- - Esta proposta assume:
--   - pedido_sigiloso = 'Sim' => representacao sigilosa.
--   - pedido_sigiloso IS NULL => representacao nao sigilosa.
--   - valores diferentes de 'Sim' nao sao tratados como sigilosos por esta proposta.
--
-- Regras desejadas:
-- - SELECT de nao sigilosas: usuario autorizado e cargo diferente de membro.
-- - SELECT de sigilosas: admin, delegado ou atlas_access autorizados.
-- - INSERT comum: usuario autorizado e cargo diferente de membro.
-- - INSERT sigilosa: admin, delegado ou atlas_access autorizados.
-- - UPDATE comum: usuario autorizado e cargo diferente de membro.
-- - UPDATE sigilosa: admin, delegado ou atlas_access autorizados.
-- - SOFT DELETE: via UPDATE de deleted_at, respeitando a mesma regra da linha antiga.

-- ============================================================
-- 1. CHECAGENS MANUAIS ANTES DE APLICAR
-- ============================================================
-- Execute primeiro estas consultas para confirmar o contrato atual.

-- 1.1. Conferir colunas essenciais de public.representacoes.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'representacoes'
  and column_name in (
    'id',
    'pedido_sigiloso',
    'deleted_at',
    'created_at',
    'updated_at'
  )
order by ordinal_position;

-- 1.2. Conferir valores reais de pedido_sigiloso antes de aplicar.
-- Esperado para esta proposta:
-- - 'Sim' para sigilosa.
-- - null para nao sigilosa.
-- Se aparecerem valores como 'Nao', 'Não', 'true', 'false' ou vazio,
-- revisar normalizacao/backfill antes ou aceitar que apenas 'Sim' sera sigilosa.
select
  pedido_sigiloso,
  count(*) as total
from public.representacoes
group by pedido_sigiloso
order by total desc, pedido_sigiloso;

-- 1.3. Conferir profiles/cargos/status existentes.
select
  cargo,
  status_autorizacao,
  count(*) as total
from public.profiles
group by cargo, status_autorizacao
order by cargo, status_autorizacao;

-- 1.4. Conferir se RLS ja esta ativa na tabela.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'representacoes';

-- 1.5. Conferir policies ja existentes.
-- ATENCAO:
-- Policies permissivas antigas continuam valendo junto com as novas,
-- pois policies permissive sao combinadas com OR.
-- Se existir alguma policy ampla em public.representacoes, revise/remova
-- manualmente antes de considerar a seguranca final como valida.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'representacoes'
order by policyname;

-- 1.6. Conferir privilegios atuais da tabela.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'representacoes'
order by grantee, privilege_type;

-- ============================================================
-- 2. APLICACAO PROPOSTA
-- ============================================================
-- Aplique somente depois de revisar as checagens acima.

begin;

-- 2.1. Habilita RLS real na tabela.
alter table public.representacoes enable row level security;

-- 2.2. Helper: identifica se o valor de pedido_sigiloso representa sigilo.
-- Premissa aprovada: somente 'Sim' e sigilosa.
create or replace function public.representacao_is_sigilosa(p_pedido_sigiloso text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(p_pedido_sigiloso, ''))) = 'sim';
$$;

comment on function public.representacao_is_sigilosa(text) is
  'Retorna true somente quando pedido_sigiloso representa sigilo ativo no SIPI.';

-- 2.3. Helper: usuario autenticado, autorizado e nao membro.
-- Equivale a regra atual geral de Representacoes no frontend.
create or replace function public.current_user_can_access_representacoes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status_autorizacao = 'autorizado'
      and p.cargo <> 'membro'
  );
$$;

comment on function public.current_user_can_access_representacoes() is
  'Autoriza acesso geral a representacoes para perfis autorizados e nao membros.';

-- 2.4. Helper: usuario autenticado, autorizado e com acesso a sigilo.
create or replace function public.current_user_can_access_representacoes_sigilosas()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status_autorizacao = 'autorizado'
      and p.cargo in ('admin', 'delegado', 'atlas_access')
  );
$$;

comment on function public.current_user_can_access_representacoes_sigilosas() is
  'Autoriza acesso a representacoes sigilosas para admin, delegado e atlas_access autorizados.';

-- 2.5. Permissoes das funcoes auxiliares.
revoke all on function public.representacao_is_sigilosa(text) from public;
revoke all on function public.current_user_can_access_representacoes() from public;
revoke all on function public.current_user_can_access_representacoes_sigilosas() from public;

grant execute on function public.representacao_is_sigilosa(text) to authenticated;
grant execute on function public.current_user_can_access_representacoes() to authenticated;
grant execute on function public.current_user_can_access_representacoes_sigilosas() to authenticated;

-- 2.6. Privilegios de tabela.
-- RLS decide quais linhas passam. A tabela continua sem DELETE fisico para o app.
revoke all on public.representacoes from anon;
revoke delete on public.representacoes from authenticated;

grant select, insert, update on public.representacoes to authenticated;

-- 2.7. Remove policies antigas conhecidas e policies desta proposta, se ja existirem.
-- Estas policies antigas foram observadas em public.representacoes e podem
-- invalidar a RLS nova, pois policies permissivas sao combinadas com OR.
drop policy if exists "Permitir leitura publica de representacoes" on public.representacoes;
drop policy if exists "Permitir atualizacao publica de representacoes" on public.representacoes;
drop policy if exists "dev_read_representacoes" on public.representacoes;
drop policy if exists "representacoes_select_authenticated" on public.representacoes;
drop policy if exists "representacoes_insert_authenticated" on public.representacoes;
drop policy if exists "representacoes_update_authenticated" on public.representacoes;

drop policy if exists representacoes_select_rls on public.representacoes;
drop policy if exists representacoes_insert_rls on public.representacoes;
drop policy if exists representacoes_update_rls on public.representacoes;

-- ATENCAO:
-- Se houver outras policies antigas amplas listadas na checagem 1.5, alem das
-- removidas explicitamente acima, elas devem ser revisadas/removidas manualmente.
-- Do contrario, podem continuar permitindo acesso indevido por OR.

-- 2.8. SELECT:
-- - Nao sigilosas: perfil autorizado e nao membro.
-- - Sigilosas: admin/delegado/atlas_access autorizados.
-- - Soft deleted: nao aparecem.
create policy representacoes_select_rls
on public.representacoes
for select
to authenticated
using (
  deleted_at is null
  and (
    (
      not public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes()
    )
    or (
      public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes_sigilosas()
    )
  )
);

-- 2.9. INSERT:
-- - Representacao comum: perfil autorizado e nao membro.
-- - Representacao sigilosa: admin/delegado/atlas_access autorizados.
-- - Nao permite inserir registro ja soft deleted.
create policy representacoes_insert_rls
on public.representacoes
for insert
to authenticated
with check (
  deleted_at is null
  and (
    (
      not public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes()
    )
    or (
      public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes_sigilosas()
    )
  )
);

-- 2.10. UPDATE e SOFT DELETE:
-- USING avalia a linha antiga.
-- WITH CHECK avalia a linha nova.
--
-- Resultado:
-- - Usuario comum autorizado pode editar linha comum e mante-la comum.
-- - Usuario comum autorizado nao consegue transformar linha comum em sigilosa.
-- - Usuario comum autorizado nao consegue editar/soft-delete linha sigilosa.
-- - Admin/delegado/atlas_access autorizado pode editar/soft-delete sigilosa.
-- - Linhas ja soft deleted nao podem ser atualizadas pelo app.
create policy representacoes_update_rls
on public.representacoes
for update
to authenticated
using (
  deleted_at is null
  and (
    (
      not public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes()
    )
    or (
      public.representacao_is_sigilosa(pedido_sigiloso)
      and public.current_user_can_access_representacoes_sigilosas()
    )
  )
)
with check (
  (
    not public.representacao_is_sigilosa(pedido_sigiloso)
    and public.current_user_can_access_representacoes()
  )
  or (
    public.representacao_is_sigilosa(pedido_sigiloso)
    and public.current_user_can_access_representacoes_sigilosas()
  )
);

commit;

-- ============================================================
-- 3. CHECAGENS MANUAIS DEPOIS DE APLICAR
-- ============================================================

-- 3.1. Confirmar RLS ativa.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'representacoes';

-- 3.2. Confirmar policies instaladas.
select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'representacoes'
order by policyname;

-- 3.3. Confirmar helpers.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'representacao_is_sigilosa',
    'current_user_can_access_representacoes',
    'current_user_can_access_representacoes_sigilosas'
  )
order by p.proname;

-- ============================================================
-- 4. TESTES MANUAIS FUNCIONAIS
-- ============================================================
-- Execute pela aplicacao e/ou por chamadas autenticadas com usuarios reais.

-- 4.1. Usuario sipi_access autorizado.
-- Esperado:
-- - SELECT lista somente nao sigilosas.
-- - SELECT por ID de sigilosa retorna vazio/sem permissao.
-- - INSERT com pedido_sigiloso null funciona.
-- - INSERT com pedido_sigiloso = 'Sim' falha.
-- - UPDATE em comum funciona, desde que permaneca comum.
-- - UPDATE em comum alterando pedido_sigiloso para 'Sim' falha.
-- - UPDATE ou soft delete em sigilosa falha.

-- 4.2. Usuario atlas_access autorizado.
-- Esperado:
-- - SELECT lista nao sigilosas e sigilosas.
-- - INSERT com pedido_sigiloso = 'Sim' funciona.
-- - UPDATE em sigilosa funciona.
-- - Soft delete em sigilosa funciona.

-- 4.3. Usuario delegado autorizado.
-- Esperado igual a atlas_access para sigilosas.

-- 4.4. Usuario admin autorizado.
-- Esperado igual a delegado para sigilosas.

-- 4.5. Usuario membro autorizado.
-- Esperado:
-- - SELECT nao retorna representacoes.
-- - INSERT falha.
-- - UPDATE falha.

-- 4.6. Usuario aguardando ou bloqueado.
-- Esperado:
-- - SELECT nao retorna representacoes.
-- - INSERT falha.
-- - UPDATE falha.

-- 4.7. Telas que precisam ser testadas depois da aplicacao:
-- - /representacoes
-- - /nova-representacao
-- - /representacoes/$representacaoId
-- - /representacoes/$representacaoId/editar
-- - /alertas
-- - /alertas/sigilosas
-- - /
--
-- Observacao:
-- Dashboard, Alertas e Sidebar usam listRepresentacoes().
-- Depois da RLS, perfis sem acesso a sigilo deverao ver apenas contagens
-- derivadas das representacoes que podem realmente acessar.

-- ============================================================
-- 5. IMPACTO EM AUDITORIA
-- ============================================================
-- - A auditoria ja usa RPCs proprias e permissao para admin/delegado.
-- - Eventos de representacoes sigilosas podem continuar apontando para
--   /representacoes/$id; a abertura do link passara a depender da RLS.
-- - Tentativas negadas por RLS nao sao registradas automaticamente.
-- - Para auditoria transacional futura, considerar RPCs de escrita para
--   representacoes que facam update/insert/soft delete e log_auditoria
--   na mesma transacao.
-- - Metadados de auditoria de representacoes sigilosas devem evitar expor
--   nomes de vitima/investigado a perfis que nao possam acessar sigilo.

-- ============================================================
-- 6. ROLLBACK
-- ============================================================
-- Use somente se precisar remover esta proposta depois de aplicada.
-- Este rollback remove as policies e helpers desta proposta.
-- Ele nao restaura as policies antigas inseguras removidas na aplicacao.
-- Se alguma policy antiga precisar voltar por motivo operacional, recrie-a
-- manualmente somente depois de nova revisao de seguranca.
-- Ele tambem nao desativa RLS por padrao, para evitar reabrir dados sensiveis.

begin;

drop policy if exists representacoes_select_rls on public.representacoes;
drop policy if exists representacoes_insert_rls on public.representacoes;
drop policy if exists representacoes_update_rls on public.representacoes;

revoke execute on function public.representacao_is_sigilosa(text) from authenticated;
revoke execute on function public.current_user_can_access_representacoes() from authenticated;
revoke execute on function public.current_user_can_access_representacoes_sigilosas() from authenticated;

drop function if exists public.representacao_is_sigilosa(text);
drop function if exists public.current_user_can_access_representacoes();
drop function if exists public.current_user_can_access_representacoes_sigilosas();

-- Opcional e nao recomendado sem revisao:
-- alter table public.representacoes disable row level security;

commit;
