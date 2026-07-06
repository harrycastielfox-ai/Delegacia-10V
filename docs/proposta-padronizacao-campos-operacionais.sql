-- SIPI - Proposta revisavel de padronizacao de campos operacionais.
--
-- IMPORTANTE:
-- - SQL para revisao manual.
-- - Nao executar automaticamente.
-- - Nao substitui uma migration aplicada.
-- - A proposta preserva campos antigos e cria campos normalizados de transicao.
-- - Aplicar em etapas, validando Dashboard, Central de Pendencias e listas destino.

-- ============================================================
-- 1. CHECAGENS MANUAIS ANTES DA APLICACAO
-- ============================================================

-- Conferir colunas atuais relevantes.
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('inqueritos', 'representacoes', 'profiles')
  and column_name in (
    'tipo',
    'tipo_procedimento_normalizado',
    'categoria_caso',
    'categoria_criminal',
    'relatorio_enviado',
    'relatorio_status',
    'data_relatorio',
    'data_envio_relatorio',
    'elucidado',
    'cvli_elucidado',
    'data_elucidacao',
    'reu_preso',
    'reu_preso_normalizado',
    'medida_protetiva',
    'medida_protetiva_normalizada',
    'prioridade',
    'prioridade_operacional',
    'equipe',
    'equipe_responsavel',
    'escrivao',
    'escrivao_responsavel_id',
    'funcao_institucional',
    'pedido_sigiloso',
    'pedido_sigiloso_normalizado',
    'tipo_normalizado',
    'cumprimento_status'
  )
order by table_name, column_name;

-- Mapear valores livres atuais antes de qualquer backfill.
select 'inqueritos.tipo' as campo, tipo as valor, count(*) as total
from public.inqueritos
where deleted_at is null
group by tipo
order by total desc, valor;

select 'inqueritos.relatorio_enviado' as campo, relatorio_enviado as valor, count(*) as total
from public.inqueritos
where deleted_at is null
group by relatorio_enviado
order by total desc, valor;

select 'inqueritos.elucidado' as campo, elucidado as valor, count(*) as total
from public.inqueritos
where deleted_at is null
group by elucidado
order by total desc, valor;

select 'inqueritos.reu_preso' as campo, reu_preso as valor, count(*) as total
from public.inqueritos
where deleted_at is null
group by reu_preso
order by total desc, valor;

select 'inqueritos.medida_protetiva' as campo, medida_protetiva as valor, count(*) as total
from public.inqueritos
where deleted_at is null
group by medida_protetiva
order by total desc, valor;

select 'representacoes.tipo' as campo, tipo as valor, count(*) as total
from public.representacoes
where deleted_at is null
group by tipo
order by total desc, valor;

select 'profiles.funcao_institucional' as campo, funcao_institucional as valor, count(*) as total
from public.profiles
group by funcao_institucional
order by total desc, valor;

-- ============================================================
-- 2. COLUNAS NORMALIZADAS DE TRANSICAO
-- ============================================================

-- Inqueritos.
alter table public.inqueritos
  add column if not exists tipo_procedimento_normalizado text,
  add column if not exists categoria_criminal text,
  add column if not exists relatorio_status text,
  add column if not exists data_relatorio date,
  add column if not exists cvli_elucidado boolean,
  add column if not exists data_elucidacao date,
  add column if not exists reu_preso_normalizado boolean,
  add column if not exists medida_protetiva_normalizada boolean,
  add column if not exists prioridade_operacional text,
  add column if not exists equipe_responsavel text,
  add column if not exists escrivao_responsavel_id uuid references public.profiles(id) on delete set null;

-- Representacoes.
alter table public.representacoes
  add column if not exists tipo_normalizado text,
  add column if not exists medida_protetiva_normalizada boolean,
  add column if not exists pedido_sigiloso_normalizado boolean,
  add column if not exists cumprimento_status text;

-- Profiles ja possui funcao_institucional no ambiente atual.
-- Esta proposta apenas formaliza os valores aceitos via constraint.

-- ============================================================
-- 3. CONSTRAINTS DE CONTRATO
-- ============================================================

-- As constraints usam NOT VALID para nao quebrar dados legados no momento da aplicacao.
-- Depois do backfill e saneamento, executar VALIDATE CONSTRAINT em uma etapa separada.

alter table public.inqueritos
  add constraint inqueritos_tipo_procedimento_normalizado_check
  check (
    tipo_procedimento_normalizado is null
    or tipo_procedimento_normalizado in ('IP', 'APF', 'TCO', 'BOC', 'AIAI', 'OUTROS')
  ) not valid;

alter table public.inqueritos
  add constraint inqueritos_categoria_criminal_check
  check (
    categoria_criminal is null
    or categoria_criminal in (
      'CVLI',
      'CVP',
      'MIAE',
      'DROGAS',
      'PATRIMONIAL',
      'SEXUAL',
      'VIOLENCIA_DOMESTICA',
      'VIOLENTO',
      'CRIANCA_ADOLESCENTE',
      'PESSOA_IDOSA',
      'TRANSITO',
      'MAE',
      'OUTROS'
    )
  ) not valid;

alter table public.inqueritos
  add constraint inqueritos_relatorio_status_check
  check (
    relatorio_status is null
    or relatorio_status in ('pendente', 'relatado', 'enviado')
  ) not valid;

alter table public.inqueritos
  add constraint inqueritos_prioridade_operacional_check
  check (
    prioridade_operacional is null
    or prioridade_operacional in ('baixa', 'media', 'alta', 'urgente')
  ) not valid;

alter table public.representacoes
  add constraint representacoes_tipo_normalizado_check
  check (
    tipo_normalizado is null
    or tipo_normalizado in (
      'prisao_preventiva',
      'prisao_temporaria',
      'busca_apreensao',
      'medida_protetiva',
      'interceptacao',
      'quebra_sigilo',
      'representacao',
      'outros'
    )
  ) not valid;

alter table public.representacoes
  add constraint representacoes_cumprimento_status_check
  check (
    cumprimento_status is null
    or cumprimento_status in ('pendente', 'cumprido', 'parcial', 'indeferido', 'cancelado')
  ) not valid;

alter table public.profiles
  add constraint profiles_funcao_institucional_check
  check (
    funcao_institucional is null
    or funcao_institucional in ('juiz', 'delegado', 'escrivao', 'investigador', 'agente_policia')
  ) not valid;

-- ============================================================
-- 4. BACKFILL INICIAL SUGERIDO
-- ============================================================

-- Revisar os resultados antes de executar UPDATE.
-- Os updates abaixo sao conservadores e deixam null quando nao houver certeza.

update public.inqueritos
set tipo_procedimento_normalizado = case
  when upper(trim(coalesce(tipo, ''))) = 'IP' then 'IP'
  when upper(trim(coalesce(tipo, ''))) like '%INQUERITO%' then 'IP'
  when upper(trim(coalesce(tipo, ''))) = 'APF' then 'APF'
  when upper(trim(coalesce(tipo, ''))) like '%FLAGRANTE%' then 'APF'
  when upper(trim(coalesce(tipo, ''))) = 'TCO' then 'TCO'
  when upper(trim(coalesce(tipo, ''))) like '%TERMO CIRCUNSTANCIADO%' then 'TCO'
  when upper(trim(coalesce(tipo, ''))) = 'BOC' then 'BOC'
  when upper(trim(coalesce(tipo, ''))) like '%BOLETIM DE OCORRENCIA CIRCUNSTANCIADO%' then 'BOC'
  when upper(trim(coalesce(tipo, ''))) = 'AIAI' then 'AIAI'
  when upper(trim(coalesce(tipo, ''))) like '%ATO INFRACIONAL%' then 'AIAI'
  else tipo_procedimento_normalizado
end
where tipo_procedimento_normalizado is null;

update public.inqueritos
set relatorio_status = case
  when data_envio_relatorio is not null then 'enviado'
  when lower(trim(coalesce(relatorio_enviado, ''))) in ('sim', 's', 'true', 't', '1', 'yes', 'y', 'ok') then 'enviado'
  when lower(coalesce(situacao, '')) like '%relat%' then 'relatado'
  else coalesce(relatorio_status, 'pendente')
end
where relatorio_status is null;

update public.inqueritos
set cvli_elucidado = case
  when lower(trim(coalesce(elucidado, ''))) in ('sim', 's', 'true', 't', '1', 'yes', 'y', 'ok') then true
  when lower(trim(coalesce(elucidado, ''))) in ('nao', 'n', 'false', 'f', '0', 'no') then false
  else cvli_elucidado
end
where cvli_elucidado is null;

update public.inqueritos
set reu_preso_normalizado = case
  when lower(trim(coalesce(reu_preso, ''))) in ('sim', 's', 'true', 't', '1', 'yes', 'y', 'ok', 'preso') then true
  when lower(trim(coalesce(reu_preso, ''))) in ('nao', 'n', 'false', 'f', '0', 'no') then false
  else reu_preso_normalizado
end
where reu_preso_normalizado is null;

update public.inqueritos
set medida_protetiva_normalizada = case
  when lower(trim(coalesce(medida_protetiva, ''))) in ('sim', 's', 'true', 't', '1', 'yes', 'y', 'ok', 'ativa') then true
  when lower(trim(coalesce(medida_protetiva, ''))) in ('nao', 'n', 'false', 'f', '0', 'no') then false
  else medida_protetiva_normalizada
end
where medida_protetiva_normalizada is null;

update public.representacoes
set pedido_sigiloso_normalizado = case
  when pedido_sigiloso = 'Sim' then true
  when pedido_sigiloso is null then false
  else pedido_sigiloso_normalizado
end
where pedido_sigiloso_normalizado is null;

update public.representacoes
set medida_protetiva_normalizada = case
  when lower(coalesce(tipo, '')) like '%protetiv%' then true
  else coalesce(medida_protetiva_normalizada, false)
end
where medida_protetiva_normalizada is null;

update public.representacoes
set cumprimento_status = case
  when data_cumprimento is not null then 'cumprido'
  when lower(coalesce(resultado_cumprimento, '')) like '%parcial%' then 'parcial'
  when lower(coalesce(status, '')) like '%indefer%' then 'indeferido'
  when lower(coalesce(status, '')) like '%cumpr%' then 'cumprido'
  else coalesce(cumprimento_status, 'pendente')
end
where cumprimento_status is null;

-- ============================================================
-- 5. INDICES RECOMENDADOS
-- ============================================================

create index if not exists inqueritos_tipo_norm_idx
  on public.inqueritos (tipo_procedimento_normalizado)
  where deleted_at is null;

create index if not exists inqueritos_categoria_criminal_idx
  on public.inqueritos (categoria_criminal)
  where deleted_at is null;

create index if not exists inqueritos_relatorio_status_idx
  on public.inqueritos (relatorio_status)
  where deleted_at is null;

create index if not exists inqueritos_escrivao_responsavel_idx
  on public.inqueritos (escrivao_responsavel_id)
  where deleted_at is null;

create index if not exists representacoes_tipo_norm_idx
  on public.representacoes (tipo_normalizado)
  where deleted_at is null;

create index if not exists representacoes_sigilo_norm_idx
  on public.representacoes (pedido_sigiloso_normalizado)
  where deleted_at is null;

-- ============================================================
-- 6. VALIDACAO POS-BACKFILL
-- ============================================================

select tipo_procedimento_normalizado, count(*)
from public.inqueritos
where deleted_at is null
group by tipo_procedimento_normalizado
order by count(*) desc;

select relatorio_status, count(*)
from public.inqueritos
where deleted_at is null
group by relatorio_status
order by count(*) desc;

select categoria_criminal, count(*)
from public.inqueritos
where deleted_at is null
group by categoria_criminal
order by count(*) desc;

select
  count(*) filter (where reu_preso_normalizado is true) as reu_preso_sim,
  count(*) filter (where reu_preso_normalizado is false) as reu_preso_nao,
  count(*) filter (where reu_preso_normalizado is null) as reu_preso_sem_mapeamento,
  count(*) filter (where medida_protetiva_normalizada is true) as medida_protetiva_sim,
  count(*) filter (where medida_protetiva_normalizada is false) as medida_protetiva_nao,
  count(*) filter (where medida_protetiva_normalizada is null) as medida_protetiva_sem_mapeamento
from public.inqueritos
where deleted_at is null;

-- Validar constraints somente depois de revisar valores null/legados.
-- alter table public.inqueritos validate constraint inqueritos_tipo_procedimento_normalizado_check;
-- alter table public.inqueritos validate constraint inqueritos_categoria_criminal_check;
-- alter table public.inqueritos validate constraint inqueritos_relatorio_status_check;
-- alter table public.inqueritos validate constraint inqueritos_prioridade_operacional_check;
-- alter table public.representacoes validate constraint representacoes_tipo_normalizado_check;
-- alter table public.representacoes validate constraint representacoes_cumprimento_status_check;
-- alter table public.profiles validate constraint profiles_funcao_institucional_check;

-- ============================================================
-- 7. ROLLBACK TECNICO
-- ============================================================

-- Usar rollback apenas antes de o frontend depender destes campos.
-- Depois que telas consumirem os novos campos, rollback exige ajuste de codigo.

-- drop index if exists public.inqueritos_tipo_norm_idx;
-- drop index if exists public.inqueritos_categoria_criminal_idx;
-- drop index if exists public.inqueritos_relatorio_status_idx;
-- drop index if exists public.inqueritos_escrivao_responsavel_idx;
-- drop index if exists public.representacoes_tipo_norm_idx;
-- drop index if exists public.representacoes_sigilo_norm_idx;

-- alter table public.inqueritos drop constraint if exists inqueritos_tipo_procedimento_normalizado_check;
-- alter table public.inqueritos drop constraint if exists inqueritos_categoria_criminal_check;
-- alter table public.inqueritos drop constraint if exists inqueritos_relatorio_status_check;
-- alter table public.inqueritos drop constraint if exists inqueritos_prioridade_operacional_check;
-- alter table public.representacoes drop constraint if exists representacoes_tipo_normalizado_check;
-- alter table public.representacoes drop constraint if exists representacoes_cumprimento_status_check;
-- alter table public.profiles drop constraint if exists profiles_funcao_institucional_check;

-- alter table public.inqueritos
--   drop column if exists tipo_procedimento_normalizado,
--   drop column if exists categoria_criminal,
--   drop column if exists relatorio_status,
--   drop column if exists data_relatorio,
--   drop column if exists cvli_elucidado,
--   drop column if exists data_elucidacao,
--   drop column if exists reu_preso_normalizado,
--   drop column if exists medida_protetiva_normalizada,
--   drop column if exists prioridade_operacional,
--   drop column if exists equipe_responsavel,
--   drop column if exists escrivao_responsavel_id;

-- alter table public.representacoes
--   drop column if exists tipo_normalizado,
--   drop column if exists medida_protetiva_normalizada,
--   drop column if exists pedido_sigiloso_normalizado,
--   drop column if exists cumprimento_status;
