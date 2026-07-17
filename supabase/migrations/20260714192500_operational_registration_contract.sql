-- Contrato operacional dos cadastros SIPI.
-- Mantem PPE repetido permitido: ocorrencias restauradas ou relacionadas sao validas.

alter table public.inqueritos
  add column if not exists origem_registro text;

alter table public.inqueritos
  drop constraint if exists inqueritos_origem_registro_check;

alter table public.inqueritos
  add constraint inqueritos_origem_registro_check
  check (
    origem_registro is null
    or origem_registro in ('novo', 'restaurado', 'relacionado', 'migrado')
  ) not valid;

comment on column public.inqueritos.origem_registro is
  'Origem operacional da ocorrencia. PPE repetido nao implica duplicidade invalida.';

alter table public.representacoes
  add column if not exists justificativa_sem_inquerito text;

comment on column public.representacoes.justificativa_sem_inquerito is
  'Justificativa obrigatoria na interface quando nao houver inquerito formalmente vinculado.';

create index if not exists inqueritos_numero_ppe_active_idx
  on public.inqueritos (numero_ppe)
  where deleted_at is null;

create index if not exists representacoes_inquerito_id_active_idx
  on public.representacoes (inquerito_id)
  where deleted_at is null;
