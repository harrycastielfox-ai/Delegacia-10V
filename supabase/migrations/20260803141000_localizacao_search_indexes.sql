-- Busca parcial usada nos cadastros operacionais. O pg_trgm já é utilizado
-- pelo módulo de veículos; manter a declaração idempotente torna esta
-- migração independente em instalações novas.
create extension if not exists pg_trgm with schema extensions;

create index if not exists localizacao_pessoas_nome_trgm_idx
  on public.localizacao_pessoas using gin (lower(nome) extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists localizacao_pessoas_apelido_trgm_idx
  on public.localizacao_pessoas using gin (lower(apelido) extensions.gin_trgm_ops)
  where deleted_at is null and apelido is not null;

create index if not exists localizacao_pessoas_telefone_trgm_idx
  on public.localizacao_pessoas using gin (telefone extensions.gin_trgm_ops)
  where deleted_at is null and telefone is not null;

create index if not exists localizacao_pessoas_bo_trgm_idx
  on public.localizacao_pessoas using gin (numero_bo extensions.gin_trgm_ops)
  where deleted_at is null and numero_bo is not null;

create index if not exists localizacao_pessoas_procedimento_trgm_idx
  on public.localizacao_pessoas using gin (numero_procedimento extensions.gin_trgm_ops)
  where deleted_at is null and numero_procedimento is not null;

create index if not exists localizacao_enderecos_logradouro_trgm_idx
  on public.localizacao_enderecos using gin (lower(logradouro) extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists localizacao_enderecos_bairro_trgm_idx
  on public.localizacao_enderecos using gin (lower(bairro) extensions.gin_trgm_ops)
  where deleted_at is null and bairro is not null;

create index if not exists localizacao_enderecos_referencia_trgm_idx
  on public.localizacao_enderecos using gin (lower(ponto_referencia) extensions.gin_trgm_ops)
  where deleted_at is null and ponto_referencia is not null;

create index if not exists localizacao_diligencias_codigo_trgm_idx
  on public.localizacao_diligencias using gin (codigo extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists localizacao_diligencias_equipe_trgm_idx
  on public.localizacao_diligencias using gin (lower(equipe_nome) extensions.gin_trgm_ops)
  where deleted_at is null;
