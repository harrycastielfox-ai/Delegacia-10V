-- Expõe uma linha do tempo limitada e segura para usuários autorizados do módulo.
-- Dados privados de perfil permanecem ocultos; somente nome e função são retornados.

create or replace function private.list_vehicle_timeline(
  p_vehicle_id uuid,
  p_limit integer default 100
)
returns table (
  id text,
  event_kind text,
  event_type text,
  occurred_at timestamptz,
  from_location text,
  to_location text,
  notes text,
  details jsonb,
  actor_id uuid,
  actor_name text,
  actor_role text,
  changed_fields text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
    or not (select public.current_user_can_access_vehicles()) then
    raise exception 'vehicle_timeline_permission_denied' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.deleted_at is null
  ) then
    raise exception 'Veiculo nao encontrado ou sem permissao' using errcode = 'P0002';
  end if;

  return query
  with movement_events as (
    select
      'movement:' || m.id::text as id,
      'movement'::text as event_kind,
      m.movement_type::text as event_type,
      m.occurred_at,
      m.from_location,
      m.to_location,
      m.notes,
      coalesce(m.details, '{}'::jsonb) as details,
      m.created_by as actor_id,
      coalesce(nullif(btrim(p.nome), ''), 'Responsavel nao identificado') as actor_name,
      coalesce(
        nullif(btrim(p.funcao_institucional::text), ''),
        nullif(btrim(p.cargo::text), '')
      ) as actor_role,
      array[]::text[] as changed_fields
    from public.vehicle_movements m
    left join public.profiles p on p.id = m.created_by
    where m.vehicle_id = p_vehicle_id
  ),
  audit_events as (
    select
      'audit:' || a.id::text as id,
      'audit'::text as event_kind,
      a.acao::text as event_type,
      a.created_at as occurred_at,
      null::text as from_location,
      null::text as to_location,
      null::text as notes,
      '{}'::jsonb as details,
      a.executor_user_id as actor_id,
      coalesce(nullif(btrim(a.executor_nome), ''), 'Responsavel nao identificado') as actor_name,
      coalesce(
        nullif(btrim(p.funcao_institucional::text), ''),
        nullif(btrim(p.cargo::text), '')
      ) as actor_role,
      array(
        select jsonb_array_elements_text(
          coalesce(a.metadata -> 'changed_fields', '[]'::jsonb)
        )
      ) as changed_fields
    from public.auditoria a
    left join public.profiles p on p.id = a.executor_user_id
    where a.modulo = 'veiculos'
      and a.entidade = 'vehicle'
      and a.entidade_id = p_vehicle_id::text
      and not (
        a.acao = 'update'
        and exists (
          select 1
          from public.vehicle_movements m
          where m.vehicle_id = p_vehicle_id
            and m.created_by is not distinct from a.executor_user_id
            and abs(extract(epoch from (m.created_at - a.created_at))) <= 5
        )
      )
  ),
  timeline as (
    select * from movement_events
    union all
    select * from audit_events
  )
  select
    t.id,
    t.event_kind,
    t.event_type,
    t.occurred_at,
    t.from_location,
    t.to_location,
    t.notes,
    t.details,
    t.actor_id,
    t.actor_name,
    t.actor_role,
    t.changed_fields
  from timeline t
  order by t.occurred_at desc, t.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$function$;

revoke all on function private.list_vehicle_timeline(uuid, integer)
from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.list_vehicle_timeline(uuid, integer) to authenticated;

create or replace function public.list_vehicle_timeline(
  p_vehicle_id uuid,
  p_limit integer default 100
)
returns table (
  id text,
  event_kind text,
  event_type text,
  occurred_at timestamptz,
  from_location text,
  to_location text,
  notes text,
  details jsonb,
  actor_id uuid,
  actor_name text,
  actor_role text,
  changed_fields text[]
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select *
  from private.list_vehicle_timeline(p_vehicle_id, p_limit);
$function$;

revoke all on function public.list_vehicle_timeline(uuid, integer) from public, anon;
grant execute on function public.list_vehicle_timeline(uuid, integer) to authenticated;

comment on function public.list_vehicle_timeline(uuid, integer) is
  'Retorna o historico limitado de um veiculo para usuarios autorizados, sem expor o perfil completo dos responsaveis.';
