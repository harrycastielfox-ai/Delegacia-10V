-- Secure the pre-authentication login flow.
-- Raw identifiers and passwords are never stored; only keyed hashes produced by
-- the secure-login Edge Function reach this rate-limit table.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null default statement_timestamp(),
  outcome text not null default 'pending'
    check (outcome in ('pending', 'success', 'failure')),
  completed_at timestamptz
);

comment on table private.login_attempts is
  'Short-lived, pseudonymized counters used by the secure-login Edge Function.';

alter table private.login_attempts enable row level security;
alter table private.login_attempts force row level security;

revoke all on table private.login_attempts from public, anon, authenticated;
revoke all on table private.login_attempts from service_role;

create index if not exists login_attempts_attempted_at_idx
  on private.login_attempts (attempted_at);

create index if not exists login_attempts_pair_active_idx
  on private.login_attempts (identifier_hash, ip_hash, attempted_at desc)
  where outcome in ('pending', 'failure');

create index if not exists login_attempts_identifier_active_idx
  on private.login_attempts (identifier_hash, attempted_at desc)
  where outcome in ('pending', 'failure');

create index if not exists login_attempts_ip_active_idx
  on private.login_attempts (ip_hash, attempted_at desc)
  where outcome in ('pending', 'failure');

create unique index if not exists profiles_login_lower_unique
  on public.profiles (lower(login));

create or replace function public.prepare_login_attempt(
  p_identifier text,
  p_identifier_hash text,
  p_ip_hash text
)
returns table (
  attempt_id uuid,
  allowed boolean,
  retry_after_seconds integer,
  resolved_email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identifier text := lower(btrim(coalesce(p_identifier, '')));
  v_now timestamptz := statement_timestamp();
  v_attempt_id uuid;
  v_resolved_email text;
  v_pair_attempts integer;
  v_identifier_attempts integer;
  v_ip_attempts integer;
  v_lock_key bigint;
begin
  if char_length(v_identifier) < 1 or char_length(v_identifier) > 254 then
    raise exception using errcode = '22023', message = 'invalid identifier';
  end if;

  if coalesce(p_identifier_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_ip_hash, '') !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'invalid rate-limit hash';
  end if;

  -- Lock the pair, identifier and IP scopes in a deterministic order. This
  -- prevents concurrent requests from observing the same pre-insert counters.
  for v_lock_key in
    select distinct lock_key
    from (
      values
        (pg_catalog.hashtextextended('pair:' || p_identifier_hash || ':' || p_ip_hash, 0)),
        (pg_catalog.hashtextextended('identifier:' || p_identifier_hash, 0)),
        (pg_catalog.hashtextextended('ip:' || p_ip_hash, 0))
    ) as rate_limit_locks(lock_key)
    order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  -- Bound cleanup work so login transactions stay short.
  delete from private.login_attempts as attempts
  where attempts.id in (
    select expired.id
    from private.login_attempts as expired
    where expired.attempted_at < v_now - interval '24 hours'
    order by expired.attempted_at
    limit 250
  );

  select count(*)::integer
    into v_pair_attempts
  from private.login_attempts as attempts
  where attempts.identifier_hash = p_identifier_hash
    and attempts.ip_hash = p_ip_hash
    and attempts.outcome in ('pending', 'failure')
    and attempts.attempted_at >= v_now - interval '10 minutes';

  select count(*)::integer
    into v_identifier_attempts
  from private.login_attempts as attempts
  where attempts.identifier_hash = p_identifier_hash
    and attempts.outcome in ('pending', 'failure')
    and attempts.attempted_at >= v_now - interval '15 minutes';

  select count(*)::integer
    into v_ip_attempts
  from private.login_attempts as attempts
  where attempts.ip_hash = p_ip_hash
    and attempts.outcome in ('pending', 'failure')
    and attempts.attempted_at >= v_now - interval '10 minutes';

  if v_pair_attempts >= 5 then
    return query select null::uuid, false, 600, null::text;
    return;
  end if;

  if v_identifier_attempts >= 15 then
    return query select null::uuid, false, 900, null::text;
    return;
  end if;

  if v_ip_attempts >= 60 then
    return query select null::uuid, false, 600, null::text;
    return;
  end if;

  insert into private.login_attempts (identifier_hash, ip_hash)
  values (p_identifier_hash, p_ip_hash)
  returning id into v_attempt_id;

  if strpos(v_identifier, '@') > 0 then
    v_resolved_email := v_identifier;
  else
    select lower(profiles.email)
      into v_resolved_email
    from public.profiles as profiles
    where lower(profiles.login) = v_identifier
    limit 1;
  end if;

  return query select v_attempt_id, true, 0, v_resolved_email;
end;
$$;

comment on function public.prepare_login_attempt(text, text, text) is
  'Atomically rate-limits login and resolves an identifier for the service-role Edge Function.';

create or replace function public.complete_login_attempt(
  p_attempt_id uuid,
  p_succeeded boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed boolean := false;
begin
  update private.login_attempts
  set
    outcome = case when p_succeeded then 'success' else 'failure' end,
    completed_at = statement_timestamp()
  where id = p_attempt_id
    and outcome = 'pending'
    and attempted_at >= statement_timestamp() - interval '15 minutes'
  returning true into v_completed;

  return coalesce(v_completed, false);
end;
$$;

comment on function public.complete_login_attempt(uuid, boolean) is
  'Completes a pending secure-login rate-limit attempt.';

revoke all on function public.prepare_login_attempt(text, text, text)
  from public, anon, authenticated;
revoke all on function public.complete_login_attempt(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.prepare_login_attempt(text, text, text) to service_role;
grant execute on function public.complete_login_attempt(uuid, boolean) to service_role;

-- The old browser-callable resolver exposed account information and used a
-- single global quota. The secure-login function replaces both behaviours.
drop function if exists public.resolve_login_to_email(text);
drop table if exists public.login_resolve_attempts;
