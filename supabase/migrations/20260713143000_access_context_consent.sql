-- SIPI - registra o aceite institucional junto ao ultimo contexto de acesso.
-- Aplicar depois de 20260713125420_user_access_contexts.sql.

alter table public.user_access_contexts
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists access_context_consent boolean not null default false;

drop function if exists public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision, double precision
);

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
  p_accuracy_meters double precision default null,
  p_terms_version text default null,
  p_access_context_consent boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_precise_location boolean := p_latitude is not null and p_longitude is not null;
  v_has_consent boolean := coalesce(p_access_context_consent, false)
    and nullif(btrim(p_terms_version), '') is not null;
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
    user_id, observed_at, user_agent, device_label, operating_system, browser,
    device_type, timezone, language, latitude, longitude, accuracy_meters,
    location_observed_at, source, terms_version, terms_accepted_at, access_context_consent
  )
  values (
    v_user_id, now(), left(nullif(btrim(p_user_agent), ''), 1024),
    left(nullif(btrim(p_device_label), ''), 160),
    left(nullif(btrim(p_operating_system), ''), 120),
    left(nullif(btrim(p_browser), ''), 120), left(nullif(btrim(p_device_type), ''), 60),
    left(nullif(btrim(p_timezone), ''), 120), left(nullif(btrim(p_language), ''), 40),
    p_latitude, p_longitude, p_accuracy_meters,
    case when v_has_precise_location then now() else null end,
    case when v_has_precise_location then 'precise_location' else 'login' end,
    case when v_has_consent then left(nullif(btrim(p_terms_version), ''), 80) else null end,
    case when v_has_consent then now() else null end,
    v_has_consent
  )
  on conflict (user_id) do update set
    observed_at = excluded.observed_at,
    user_agent = excluded.user_agent,
    device_label = excluded.device_label,
    operating_system = excluded.operating_system,
    browser = excluded.browser,
    device_type = excluded.device_type,
    timezone = excluded.timezone,
    language = excluded.language,
    latitude = case when v_has_precise_location then excluded.latitude else public.user_access_contexts.latitude end,
    longitude = case when v_has_precise_location then excluded.longitude else public.user_access_contexts.longitude end,
    accuracy_meters = case when v_has_precise_location then excluded.accuracy_meters else public.user_access_contexts.accuracy_meters end,
    location_observed_at = case when v_has_precise_location then excluded.location_observed_at else public.user_access_contexts.location_observed_at end,
    source = case when v_has_precise_location then excluded.source else public.user_access_contexts.source end,
    terms_version = case when v_has_consent then excluded.terms_version else public.user_access_contexts.terms_version end,
    terms_accepted_at = case when v_has_consent then excluded.terms_accepted_at else public.user_access_contexts.terms_accepted_at end,
    access_context_consent = public.user_access_contexts.access_context_consent or v_has_consent;
end;
$$;

drop function if exists public.get_latest_user_access_context(uuid);

create or replace function public.get_latest_user_access_context(p_user_id uuid)
returns table (
  user_id uuid, observed_at timestamptz, ip_address text, device_label text,
  operating_system text, browser text, device_type text, timezone text, language text,
  latitude double precision, longitude double precision, accuracy_meters double precision,
  location_observed_at timestamptz, country text, region text, city text, street text,
  source text, terms_version text, terms_accepted_at timestamptz, access_context_consent boolean
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
  from public.profiles p where p.id = v_requester_id;
  if v_requester_status is distinct from 'autorizado' then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  if v_requester_id <> p_user_id
     and coalesce(v_requester_cargo, '') not in ('admin', 'delegado')
     and coalesce(v_requester_function, '') <> 'juiz' then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  return query
  select c.user_id, c.observed_at, c.ip_address::text, c.device_label,
    c.operating_system, c.browser, c.device_type, c.timezone, c.language,
    c.latitude, c.longitude, c.accuracy_meters, c.location_observed_at,
    c.country, c.region, c.city, c.street, c.source, c.terms_version,
    c.terms_accepted_at, c.access_context_consent
  from public.user_access_contexts c where c.user_id = p_user_id;
end;
$$;

revoke all on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision,
  double precision, text, boolean
) from public;
grant execute on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision,
  double precision, text, boolean
) to authenticated;

revoke all on function public.get_latest_user_access_context(uuid) from public;
grant execute on function public.get_latest_user_access_context(uuid) to authenticated;
