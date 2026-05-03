-- Proposta inicial de schema Supabase para o SIPI.
-- Não executar automaticamente sem validação funcional e jurídica da equipe.

create extension if not exists pgcrypto;

create table if not exists public.inqueritos (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text unique,
  numero_ppe text,
  numero_fisico text,
  numero_bo text,
  tipo text,
  tipificacao text,
  gravidade text,
  prioridade text,
  situacao text,
  status_diligencias text,
  data_fato date,
  data_instauracao date,
  prazo date,
  bairro text,
  vitima text,
  investigado text,
  reu_preso text,
  elucidado text,
  houve_arma_fogo text,
  arma_utilizada text,
  faccao text,
  nome_faccao text,
  equipe text,
  escrivao text,
  relatorio_enviado text,
  data_envio_relatorio date,
  medida_protetiva text,
  numero_processo_medida text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz null
);

create table if not exists public.representacoes (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text unique,
  inquerito_id uuid references public.inqueritos(id),
  numero_ppe text,
  processo_judicial text,
  tipo text,
  data_representacao date,
  responsavel text,
  vitima text,
  investigado text,
  autor_preso text,
  resumo_fatos text,
  fundamentacao text,
  objetivo text,
  diligencias_relacionadas text,
  status text,
  data_envio_judiciario date,
  data_decisao_judicial date,
  observacoes_decisao text,
  data_cumprimento date,
  equipe_cumprimento text,
  resultado_cumprimento text,
  observacoes_cumprimento text,
  prioridade_operacional text,
  pedido_sigiloso text,
  observacoes_internas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz null
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text,
  entidade_id uuid,
  acao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario text,
  created_at timestamptz default now()
);
