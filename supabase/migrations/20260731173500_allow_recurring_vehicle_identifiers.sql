-- Um mesmo veiculo pode retornar a custodia em momentos diferentes.
-- Mantem a deteccao de conflitos como aviso no frontend, sem impedir o registro.

drop index if exists public.vehicles_plate_unique_active_idx;
drop index if exists public.vehicles_renavam_unique_active_idx;
drop index if exists public.vehicles_engine_number_unique_active_idx;
drop index if exists public.vehicles_chassis_unique_active_idx;

create index if not exists vehicles_plate_lookup_idx
  on public.vehicles (plate)
  where deleted_at is null and plate is not null;

create index if not exists vehicles_renavam_lookup_idx
  on public.vehicles (renavam)
  where deleted_at is null and renavam is not null;

create index if not exists vehicles_engine_number_lookup_idx
  on public.vehicles (engine_number)
  where deleted_at is null and engine_number is not null;

create index if not exists vehicles_chassis_lookup_idx
  on public.vehicles (chassis)
  where deleted_at is null and chassis is not null;
