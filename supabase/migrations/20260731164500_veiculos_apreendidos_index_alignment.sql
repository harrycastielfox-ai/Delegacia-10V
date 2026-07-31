-- Alinha o ultimo indice de chave estrangeira identificado pelo advisor.
create index if not exists vehicles_updated_by_idx
  on public.vehicles (updated_by)
  where deleted_at is null and updated_by is not null;
