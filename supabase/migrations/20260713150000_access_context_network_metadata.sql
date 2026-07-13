-- SIPI - metadados de rede capturados por infraestrutura confiavel.
-- O frontend nunca envia IP, provedor ou localizacao de IP.

alter table public.user_access_contexts
  add column if not exists ip_provider text;

comment on column public.user_access_contexts.ip_provider is
  'Provedor identificado por servico server-side a partir do IP observado.';

drop function if exists public.get_latest_user_access_context(uuid);

create or replace function public.get_latest_user_access_context(p_user_id uuid)
returns table (
  user_id uuid, observed_at timestamptz, ip_address text, ip_provider text,
  device_label text, operating_system text, browser text, device_type text,
  timezone text, language text, latitude double precision, longitude double precision,
  accuracy_meters double precision, location_observed_at timestamptz,
  country text, region text, city text, street text, source text,
  terms_version text, terms_accepted_at timestamptz, access_context_consent boolean
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
  select c.user_id, c.observed_at, c.ip_address::text, c.ip_provider,
    c.device_label, c.operating_system, c.browser, c.device_type, c.timezone,
    c.language, c.latitude, c.longitude, c.accuracy_meters,
    c.location_observed_at, c.country, c.region, c.city, c.street, c.source,
    c.terms_version, c.terms_accepted_at, c.access_context_consent
  from public.user_access_contexts c where c.user_id = p_user_id;
end;
$$;

revoke all on function public.get_latest_user_access_context(uuid) from public;
grant execute on function public.get_latest_user_access_context(uuid) to authenticated;
