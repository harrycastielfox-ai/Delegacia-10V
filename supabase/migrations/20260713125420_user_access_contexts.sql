-- SIPI - ultimo contexto conhecido de acesso por usuario.
-- A tabela nao possui policies de leitura/escrita direta. Toda operacao passa
-- pelas funcoes controladas abaixo; o endereco IP fica reservado para captura
-- confiavel em uma Edge Function, sem aceitar valor informado pelo navegador.

create table if not exists public.user_access_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  observed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  device_label text,
  operating_system text,
  browser text,
  device_type text,
  timezone text,
  language text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  location_observed_at timestamptz,
  country text,
  region text,
  city text,
  street text,
  source text not null default 'login',
  constraint user_access_contexts_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint user_access_contexts_longitude_check
    check (longitude is null or longitude between -180 and 180),
  constraint user_access_contexts_accuracy_check
    check (accuracy_meters is null or accuracy_meters >= 0),
  constraint user_access_contexts_source_check
    check (source in ('login', 'precise_location', 'trusted_gateway'))
);

comment on table public.user_access_contexts is
  'Ultimo contexto conhecido de acesso do usuario ao SIPI.';
comment on column public.user_access_contexts.ip_address is
  'Reservado para captura por infraestrutura confiavel; nunca aceito do cliente.';
comment on column public.user_access_contexts.location_observed_at is
  'Momento em que o usuario autorizou a captura da localizacao precisa.';

alter table public.user_access_contexts enable row level security;

revoke all on table public.user_access_contexts from public;
revoke all on table public.user_access_contexts from anon;
revoke all on table public.user_access_contexts from authenticated;

create or replace function public.register_own_access_context(
  p_user_agent text default null,
  p_device_label text default null,
  p_operating_system text default null,
  p_browser text default null,
  p_device_type text default null,
  p_timezone text default null,
  p_language text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_precise_location boolean := p_latitude is not null and p_longitude is not null;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'incomplete_coordinates' using errcode = '22023';
  end if;

  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception 'invalid_latitude' using errcode = '22023';
  end if;

  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception 'invalid_longitude' using errcode = '22023';
  end if;

  if p_accuracy_meters is not null and p_accuracy_meters < 0 then
    raise exception 'invalid_accuracy' using errcode = '22023';
  end if;

  insert into public.user_access_contexts (
    user_id,
    observed_at,
    user_agent,
    device_label,
    operating_system,
    browser,
    device_type,
    timezone,
    language,
    latitude,
    longitude,
    accuracy_meters,
    location_observed_at,
    source
  )
  values (
    v_user_id,
    now(),
    left(nullif(btrim(p_user_agent), ''), 1024),
    left(nullif(btrim(p_device_label), ''), 160),
    left(nullif(btrim(p_operating_system), ''), 120),
    left(nullif(btrim(p_browser), ''), 120),
    left(nullif(btrim(p_device_type), ''), 60),
    left(nullif(btrim(p_timezone), ''), 120),
    left(nullif(btrim(p_language), ''), 40),
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    case when v_has_precise_location then now() else null end,
    case when v_has_precise_location then 'precise_location' else 'login' end
  )
  on conflict (user_id) do update
  set
    observed_at = excluded.observed_at,
    user_agent = excluded.user_agent,
    device_label = excluded.device_label,
    operating_system = excluded.operating_system,
    browser = excluded.browser,
    device_type = excluded.device_type,
    timezone = excluded.timezone,
    language = excluded.language,
    latitude = case
      when v_has_precise_location then excluded.latitude
      else public.user_access_contexts.latitude
    end,
    longitude = case
      when v_has_precise_location then excluded.longitude
      else public.user_access_contexts.longitude
    end,
    accuracy_meters = case
      when v_has_precise_location then excluded.accuracy_meters
      else public.user_access_contexts.accuracy_meters
    end,
    location_observed_at = case
      when v_has_precise_location then excluded.location_observed_at
      else public.user_access_contexts.location_observed_at
    end,
    source = case
      when v_has_precise_location then excluded.source
      else public.user_access_contexts.source
    end;
end;
$$;

create or replace function public.get_latest_user_access_context(p_user_id uuid)
returns table (
  user_id uuid,
  observed_at timestamptz,
  ip_address text,
  device_label text,
  operating_system text,
  browser text,
  device_type text,
  timezone text,
  language text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  location_observed_at timestamptz,
  country text,
  region text,
  city text,
  street text,
  source text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester_cargo text;
  v_requester_function text;
  v_requester_status text;
begin
  if v_requester_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select p.cargo, p.funcao_institucional, p.status_autorizacao
    into v_requester_cargo, v_requester_function, v_requester_status
  from public.profiles p
  where p.id = v_requester_id;

  if v_requester_status is distinct from 'autorizado' then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  if v_requester_id <> p_user_id
     and coalesce(v_requester_cargo, '') not in ('admin', 'delegado')
     and coalesce(v_requester_function, '') <> 'juiz' then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
  select
    c.user_id,
    c.observed_at,
    c.ip_address::text,
    c.device_label,
    c.operating_system,
    c.browser,
    c.device_type,
    c.timezone,
    c.language,
    c.latitude,
    c.longitude,
    c.accuracy_meters,
    c.location_observed_at,
    c.country,
    c.region,
    c.city,
    c.street,
    c.source
  from public.user_access_contexts c
  where c.user_id = p_user_id;
end;
$$;

revoke all on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision, double precision
) from public;
grant execute on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision, double precision
) to authenticated;

revoke all on function public.get_latest_user_access_context(uuid) from public;
grant execute on function public.get_latest_user_access_context(uuid) to authenticated;
