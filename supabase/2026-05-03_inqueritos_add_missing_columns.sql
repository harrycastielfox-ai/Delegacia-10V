-- Adiciona colunas esperadas pelo payload/tipo de inquéritos no app.
-- Seguro para reexecução.

alter table public.inqueritos
  add column if not exists distrito text,
  add column if not exists delegado_responsavel text,
  add column if not exists motivacao text,
  add column if not exists diligencias_pendentes text,
  add column if not exists representacoes_legais text,
  add column if not exists dias_decorridos text;
