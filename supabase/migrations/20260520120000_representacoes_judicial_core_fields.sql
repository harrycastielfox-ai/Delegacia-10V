alter table public.representacoes
  add column if not exists vara_juizo text,
  add column if not exists prazo_concedido_dias integer,
  add column if not exists data_vencimento date,
  add column if not exists equipe_responsavel text,
  add column if not exists acompanhamento_especial boolean default false;
