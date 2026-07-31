-- Permite preservar a ausência de situação policial sem atribuir uma
-- classificação que não existe na fonte e expõe esse grupo nos relatórios.

set lock_timeout = '5s';

alter table public.vehicles
  alter column situation drop not null,
  alter column situation drop default;

comment on column public.vehicles.situation is
  'Situação policial atual. Nulo significa que nenhuma situação foi informada.';

do $migration$
declare
  v_actor_id uuid;
begin
  if exists (
    select 1
    from public.vehicles
    where legacy_sheet = 'BASE_VEICULOS'
      and nullif(btrim(legacy_source ->> 'Situacao'), '') is null
      and situation = 'em_investigacao'
  ) then
    select p.id
    into v_actor_id
    from public.profiles p
    where p.status_autorizacao = 'autorizado'
      and p.cargo::text = 'admin'
    order by p.created_at
    limit 1;

    if v_actor_id is null then
      raise exception 'vehicle_situation_cleanup_requires_admin_actor';
    end if;

    perform set_config('request.jwt.claim.sub', v_actor_id::text, true);

    update public.vehicles
    set situation = null
    where legacy_sheet = 'BASE_VEICULOS'
      and nullif(btrim(legacy_source ->> 'Situacao'), '') is null
      and situation = 'em_investigacao';
  end if;
end;
$migration$;

create or replace function public.list_vehicles_page(
  p_limit integer default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null,
  p_vehicle_type text default null,
  p_situation text default null,
  p_occurrence_type text default null,
  p_status text default null,
  p_custody_location text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_pending_identification boolean default null
)
returns table (
  id uuid,
  internal_id text,
  vehicle_type text,
  brand_model text,
  color text,
  plate text,
  situation text,
  occurrence_type text,
  procedure_type text,
  procedure_number text,
  police_report_number text,
  custody_location text,
  storage_location text,
  pending_identification boolean,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with filtered as (
    select v.*
    from public.vehicles v
    where v.deleted_at is null
      and (nullif(btrim(p_search), '') is null
        or v.search_text like '%' || public.normalize_vehicle_search(p_search) || '%')
      and (p_vehicle_type is null or v.vehicle_type = p_vehicle_type)
      and (
        p_situation is null
        or (p_situation = 'nao_informada' and v.situation is null)
        or (p_situation <> 'nao_informada' and v.situation = p_situation)
      )
      and (p_occurrence_type is null or v.occurrence_type = p_occurrence_type)
      and (p_status is null or v.status = p_status)
      and (p_custody_location is null or v.custody_location = p_custody_location)
      and (p_start_date is null or v.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or v.created_at < (p_end_date + 1)::timestamptz)
      and (p_pending_identification is null or v.pending_identification = p_pending_identification)
  ),
  counted as (
    select filtered.*, count(*) over () as matching_total
    from filtered
  )
  select
    c.id, c.internal_id, c.vehicle_type, c.brand_model, c.color, c.plate,
    c.situation, c.occurrence_type, c.procedure_type, c.procedure_number,
    c.police_report_number, c.custody_location, c.storage_location,
    c.pending_identification, c.updated_at, c.matching_total
  from counted c
  where p_cursor_updated_at is null
    or p_cursor_id is null
    or (c.updated_at, c.id) < (p_cursor_updated_at, p_cursor_id)
  order by c.updated_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$function$;

revoke all on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) from public, anon;
grant execute on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) to authenticated;

create or replace function public.vehicle_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with available as (
    select * from public.vehicles where deleted_at is null
  ),
  by_type as (
    select vehicle_type as key, count(*)::bigint as total
    from available group by vehicle_type
  ),
  by_situation as (
    select coalesce(situation, 'nao_informada') as key, count(*)::bigint as total
    from available group by coalesce(situation, 'nao_informada')
  ),
  monthly as (
    select date_trunc('month', created_at) as month, count(*)::bigint as total
    from available
    where created_at >= date_trunc('month', now()) - interval '5 months'
    group by date_trunc('month', created_at)
  )
  select jsonb_build_object(
    'total', (select count(*) from available),
    'seized', (select count(*) from available where situation = 'apreendido'),
    'recovered', (select count(*) from available where situation = 'recuperado'),
    'adulterated', (select count(*) from available where situation = 'adulterado'),
    'pendingIdentification', (select count(*) from available where pending_identification),
    'unassignedSituation', (select count(*) from available where situation is null),
    'releasedTotal', (
      select count(*) from available
      where situation = 'liberado' or release_status in ('liberado', 'devolvido')
    ),
    'releasedThisMonth', (
      select count(*) from available
      where situation = 'liberado'
        and release_date >= date_trunc('month', current_date)::date
    ),
    'withPlate', (select count(*) from available where plate is not null),
    'withProcedure', (
      select count(*) from available
      where procedure_number is not null
        or police_report_number is not null
        or court_process_number is not null
    ),
    'withCustodyLocation', (
      select count(*) from available
      where custody_location is not null or storage_location is not null
    ),
    'byType', coalesce((select jsonb_object_agg(key, total) from by_type), '{}'::jsonb),
    'bySituation', coalesce((select jsonb_object_agg(key, total) from by_situation), '{}'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(month, 'YYYY-MM'), 'total', total) order by month)
      from monthly
    ), '[]'::jsonb)
  );
$function$;

revoke all on function public.vehicle_overview_stats() from public, anon;
grant execute on function public.vehicle_overview_stats() to authenticated;

comment on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) is 'Listagem paginada de veículos, incluindo filtro explícito para situação não informada.';
comment on function public.vehicle_overview_stats() is
  'Resumo consolidado de veículos com cobertura cadastral e situações não informadas.';
