-- ============================================================
-- SIPI - PROPOSTA REVISAO RANKING DE ESCRIVAES
-- ============================================================
-- Objetivo:
-- - Formalizar a pontuacao do ranking de escrivaes.
-- - Somente usuarios com profiles.funcao_institucional = 'escrivao'
--   devem aparecer no ranking.
-- - Relatorio enviado e conclusao valem 2 pontos.
-- - Cadastro e atualizacao valem 1 ponto.
--
-- IMPORTANTE:
-- - SQL revisavel.
-- - Nao executar automaticamente.
-- - Validar nomes reais de schema, tabela e colunas antes de aplicar.
-- - Esta proposta assume a existencia de private.productivity_events
--   e public.list_escrivao_productivity(p_days integer), conforme
--   contrato atual do frontend.
-- ============================================================

-- ============================================================
-- 1. CHECAGENS ANTES DA APLICACAO
-- ============================================================

-- 1.1. Confirmar estrutura de eventos de produtividade.
select
  table_schema,
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema in ('private', 'public')
  and table_name in ('productivity_events', 'auditoria', 'profiles')
order by table_schema, table_name, ordinal_position;

-- 1.2. Conferir tipos de evento existentes.
-- Ajustar nomes abaixo caso a coluna real nao seja event_type.
select
  event_type,
  count(*) as total
from private.productivity_events
group by event_type
order by total desc, event_type;

-- 1.3. Conferir escrivaes habilitados.
select
  id,
  nome,
  email,
  funcao_institucional,
  status_autorizacao
from public.profiles
where funcao_institucional = 'escrivao'
order by nome;

-- 1.4. Conferir assinatura atual da RPC.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'list_escrivao_productivity';

-- ============================================================
-- 2. HELPER DE PONTUACAO
-- ============================================================
-- Padroniza o peso por tipo de evento.
-- Nomes aceitos devem ser ajustados conforme event_type real.

create or replace function public.get_escrivao_productivity_points(p_event_type text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(coalesce(p_event_type, '')) in (
      'relatorio_enviado',
      'enviar_relatorio',
      'inquerito_relatorio_enviado',
      'representacao_relatorio_enviado'
    ) then 2
    when lower(coalesce(p_event_type, '')) in (
      'conclusao',
      'concluido',
      'inquerito_concluido',
      'representacao_concluida',
      'representacao_cumprida'
    ) then 2
    when lower(coalesce(p_event_type, '')) in (
      'cadastro',
      'criacao',
      'inquerito_criado',
      'representacao_criada'
    ) then 1
    when lower(coalesce(p_event_type, '')) in (
      'atualizacao',
      'edicao',
      'inquerito_atualizado',
      'representacao_atualizada'
    ) then 1
    else 0
  end;
$$;

comment on function public.get_escrivao_productivity_points(text)
is 'Peso oficial do ranking de escrivaes: relatorio/conclusao=2, cadastro/atualizacao=1.';

-- ============================================================
-- 3. RPC DO RANKING
-- ============================================================
-- Ajustar nomes de colunas se private.productivity_events usar outro
-- contrato. A ideia esperada:
-- - executor_user_id: usuario que executou a acao.
-- - event_type: tipo operacional do evento.
-- - created_at: data/hora do evento.

create or replace function public.list_escrivao_productivity(p_days integer default 30)
returns table (
  user_id uuid,
  nome text,
  avatar_path text,
  pontos integer,
  cadastros integer,
  atualizacoes integer,
  relatorios_enviados integer,
  conclusoes integer,
  ultima_atividade timestamptz
)
language sql
security definer
set search_path = public, private
as $$
  with params as (
    select greatest(1, least(coalesce(p_days, 30), 365))::integer as days
  ),
  escrivaes as (
    select
      p.id,
      p.nome,
      p.avatar_path
    from public.profiles p
    where p.funcao_institucional = 'escrivao'
      and coalesce(p.status_autorizacao, '') = 'autorizado'
  ),
  eventos as (
    select
      e.executor_user_id,
      lower(coalesce(e.event_type, '')) as event_type,
      e.created_at
    from private.productivity_events e
    cross join params
    where e.created_at >= now() - make_interval(days => params.days)
  )
  select
    s.id as user_id,
    s.nome,
    s.avatar_path,
    coalesce(sum(public.get_escrivao_productivity_points(ev.event_type)), 0)::integer as pontos,
    count(*) filter (
      where ev.event_type in ('cadastro', 'criacao', 'inquerito_criado', 'representacao_criada')
    )::integer as cadastros,
    count(*) filter (
      where ev.event_type in ('atualizacao', 'edicao', 'inquerito_atualizado', 'representacao_atualizada')
    )::integer as atualizacoes,
    count(*) filter (
      where ev.event_type in (
        'relatorio_enviado',
        'enviar_relatorio',
        'inquerito_relatorio_enviado',
        'representacao_relatorio_enviado'
      )
    )::integer as relatorios_enviados,
    count(*) filter (
      where ev.event_type in (
        'conclusao',
        'concluido',
        'inquerito_concluido',
        'representacao_concluida',
        'representacao_cumprida'
      )
    )::integer as conclusoes,
    max(ev.created_at) as ultima_atividade
  from escrivaes s
  left join eventos ev on ev.executor_user_id = s.id
  group by s.id, s.nome, s.avatar_path
  order by
    pontos desc,
    conclusoes desc,
    relatorios_enviados desc,
    cadastros desc,
    s.nome asc;
$$;

revoke all on function public.list_escrivao_productivity(integer) from public;
grant execute on function public.list_escrivao_productivity(integer) to authenticated;

-- ============================================================
-- 4. EVENTOS QUE PRECISAM EXISTIR
-- ============================================================
-- Esta proposta depende de triggers/processos que gravem eventos quando:
-- - inquerito for criado por escrivao: event_type = 'inquerito_criado'
-- - inquerito for atualizado por escrivao: event_type = 'inquerito_atualizado'
-- - relatorio de inquerito for enviado por escrivao: event_type = 'inquerito_relatorio_enviado'
-- - inquerito for concluido por escrivao: event_type = 'inquerito_concluido'
-- - representacao for criada por escrivao: event_type = 'representacao_criada'
-- - representacao for atualizada por escrivao: event_type = 'representacao_atualizada'
-- - representacao for concluida/cumprida por escrivao: event_type = 'representacao_concluida'
--
-- Nao criar pontuacao por nome digitado em campo texto.
-- O executor deve ser auth.uid() / usuario da sessao auditada.

-- ============================================================
-- 5. TESTES MANUAIS APOS APLICAR
-- ============================================================

-- 5.1. Usuario sem funcao escrivao nao deve aparecer.
select * from public.list_escrivao_productivity(30);

-- 5.2. Relatorio enviado deve somar 2 pontos.
-- 5.3. Conclusao deve somar 2 pontos.
-- 5.4. Cadastro deve somar 1 ponto.
-- 5.5. Atualizacao deve somar 1 ponto.
-- 5.6. Eventos fora da janela p_days nao devem entrar.

-- ============================================================
-- 6. ROLLBACK
-- ============================================================

-- drop function if exists public.get_escrivao_productivity_points(text);
-- Restaurar a versao anterior de public.list_escrivao_productivity(integer)
-- a partir do backup/manual do Supabase, se necessario.
