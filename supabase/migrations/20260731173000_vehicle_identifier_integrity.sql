-- Padroniza identificadores de veiculos e impede duplicidades ativas.
-- Identificadores com status pericial diferente de "informado" permanecem livres
-- para registrar clonagem, adulteracao, supressao ou leitura inconclusiva.

create or replace function public.normalize_vehicle_identifier(
  p_value text,
  p_digits_only boolean default false
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $function$
  select nullif(
    case
      when p_digits_only then regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g')
      else upper(regexp_replace(coalesce(p_value, ''), '[^A-Za-z0-9]', '', 'g'))
    end,
    ''
  );
$function$;

revoke all on function public.normalize_vehicle_identifier(text, boolean) from public, anon;
grant execute on function public.normalize_vehicle_identifier(text, boolean) to authenticated, service_role;

create or replace function private.normalize_vehicle_identifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.plate := public.normalize_vehicle_identifier(new.plate);
  new.renavam := public.normalize_vehicle_identifier(new.renavam, true);
  new.engine_number := public.normalize_vehicle_identifier(new.engine_number);
  new.chassis := public.normalize_vehicle_identifier(new.chassis);
  return new;
end;
$function$;

revoke all on function private.normalize_vehicle_identifiers() from public, anon, authenticated, service_role;

drop trigger if exists before_prepare_normalize_vehicle_identifiers on public.vehicles;
create trigger before_prepare_normalize_vehicle_identifiers
before insert or update of plate, renavam, engine_number, chassis on public.vehicles
for each row execute function private.normalize_vehicle_identifiers();

-- A tabela ainda nao possui cadastros em producao, mas a atualizacao deixa a
-- migracao segura caso dados tenham sido inseridos entre a verificacao e a aplicacao.
update public.vehicles
set
  plate = public.normalize_vehicle_identifier(plate),
  renavam = public.normalize_vehicle_identifier(renavam, true),
  engine_number = public.normalize_vehicle_identifier(engine_number),
  chassis = public.normalize_vehicle_identifier(chassis)
where
  plate is distinct from public.normalize_vehicle_identifier(plate)
  or renavam is distinct from public.normalize_vehicle_identifier(renavam, true)
  or engine_number is distinct from public.normalize_vehicle_identifier(engine_number)
  or chassis is distinct from public.normalize_vehicle_identifier(chassis);

drop index if exists public.vehicles_plate_lookup_idx;
drop index if exists public.vehicles_chassis_lookup_idx;
drop index if exists public.vehicles_renavam_lookup_idx;

create unique index if not exists vehicles_plate_unique_active_idx
  on public.vehicles (plate)
  where deleted_at is null and plate is not null and plate_status = 'informado';

create unique index if not exists vehicles_renavam_unique_active_idx
  on public.vehicles (renavam)
  where deleted_at is null and renavam is not null and renavam_status = 'informado';

create unique index if not exists vehicles_engine_number_unique_active_idx
  on public.vehicles (engine_number)
  where deleted_at is null and engine_number is not null and engine_status = 'informado';

create unique index if not exists vehicles_chassis_unique_active_idx
  on public.vehicles (chassis)
  where deleted_at is null and chassis is not null and chassis_status = 'informado';

create or replace function public.find_vehicle_identifier_conflicts(
  p_plate text default null,
  p_renavam text default null,
  p_engine_number text default null,
  p_chassis text default null,
  p_exclude_vehicle_id uuid default null
)
returns table (
  id uuid,
  internal_id text,
  vehicle_type text,
  brand_model text,
  situation text,
  identifier_kind text,
  identifier_value text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with requested as (
    select
      public.normalize_vehicle_identifier(p_plate) as plate,
      public.normalize_vehicle_identifier(p_renavam, true) as renavam,
      public.normalize_vehicle_identifier(p_engine_number) as engine_number,
      public.normalize_vehicle_identifier(p_chassis) as chassis
  ), conflicts as (
    select
      v.id, v.internal_id, v.vehicle_type, v.brand_model, v.situation,
      'plate'::text as identifier_kind, v.plate as identifier_value,
      v.updated_at
    from public.vehicles v
    cross join requested r
    where v.deleted_at is null
      and v.plate_status = 'informado'
      and r.plate is not null
      and v.plate = r.plate
      and (p_exclude_vehicle_id is null or v.id <> p_exclude_vehicle_id)

    union all

    select
      v.id, v.internal_id, v.vehicle_type, v.brand_model, v.situation,
      'renavam'::text, v.renavam, v.updated_at
    from public.vehicles v
    cross join requested r
    where v.deleted_at is null
      and v.renavam_status = 'informado'
      and r.renavam is not null
      and v.renavam = r.renavam
      and (p_exclude_vehicle_id is null or v.id <> p_exclude_vehicle_id)

    union all

    select
      v.id, v.internal_id, v.vehicle_type, v.brand_model, v.situation,
      'engine_number'::text, v.engine_number, v.updated_at
    from public.vehicles v
    cross join requested r
    where v.deleted_at is null
      and v.engine_status = 'informado'
      and r.engine_number is not null
      and v.engine_number = r.engine_number
      and (p_exclude_vehicle_id is null or v.id <> p_exclude_vehicle_id)

    union all

    select
      v.id, v.internal_id, v.vehicle_type, v.brand_model, v.situation,
      'chassis'::text, v.chassis, v.updated_at
    from public.vehicles v
    cross join requested r
    where v.deleted_at is null
      and v.chassis_status = 'informado'
      and r.chassis is not null
      and v.chassis = r.chassis
      and (p_exclude_vehicle_id is null or v.id <> p_exclude_vehicle_id)
  )
  select
    c.id, c.internal_id, c.vehicle_type, c.brand_model, c.situation,
    c.identifier_kind, c.identifier_value
  from conflicts c
  order by c.updated_at desc, c.id, c.identifier_kind
  limit 12;
$function$;

revoke all on function public.find_vehicle_identifier_conflicts(text, text, text, text, uuid)
  from public, anon;
grant execute on function public.find_vehicle_identifier_conflicts(text, text, text, text, uuid)
  to authenticated, service_role;

comment on function public.find_vehicle_identifier_conflicts(text, text, text, text, uuid) is
  'Retorna conflitos de placa, Renavam, motor ou chassi visiveis ao usuario pelas politicas RLS.';
