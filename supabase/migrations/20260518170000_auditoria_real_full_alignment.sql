create extension if not exists pgcrypto;

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  executor_user_id uuid not null,
  executor_nome text,
  executor_email text,
  executor_login text,
  acao text not null,
  modulo text not null,
  entidade text not null,
  entidade_id text,
  descricao text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.auditoria
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists executor_user_id uuid,
  add column if not exists executor_nome text,
  add column if not exists executor_email text,
  add column if not exists executor_login text,
  add column if not exists acao text,
  add column if not exists modulo text,
  add column if not exists entidade text,
  add column if not exists entidade_id text,
  add column if not exists descricao text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auditoria'
      and column_name = 'entidade_id'
      and udt_name <> 'text'
  ) then
    execute 'alter table public.auditoria alter column entidade_id type text using entidade_id::text';
  end if;
end;
$$;

update public.auditoria set metadata = '{}'::jsonb where metadata is null;

alter table public.auditoria alter column id set default gen_random_uuid();
alter table public.auditoria alter column executor_user_id set not null;
alter table public.auditoria alter column acao set not null;
alter table public.auditoria alter column modulo set not null;
alter table public.auditoria alter column entidade set not null;
alter table public.auditoria alter column descricao set not null;
alter table public.auditoria alter column metadata set default '{}'::jsonb;
alter table public.auditoria alter column metadata set not null;
alter table public.auditoria alter column created_at set default now();
alter table public.auditoria alter column created_at set not null;

alter table public.auditoria drop constraint if exists auditoria_pkey;
alter table public.auditoria add constraint auditoria_pkey primary key (id);

create index if not exists auditoria_created_at_desc_idx on public.auditoria (created_at desc);
create index if not exists auditoria_executor_created_at_desc_idx on public.auditoria (executor_user_id, created_at desc);
create index if not exists auditoria_modulo_created_at_desc_idx on public.auditoria (modulo, created_at desc);
create index if not exists auditoria_entidade_entidade_id_idx on public.auditoria (entidade, entidade_id);

alter table public.auditoria enable row level security;
drop policy if exists auditoria_admin_delegado_select on public.auditoria;
create policy auditoria_admin_delegado_select
on public.auditoria
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.cargo in ('admin', 'delegado')
  )
);

create or replace function public.log_auditoria(
  p_acao text,
  p_modulo text,
  p_entidade text,
  p_entidade_id text default null,
  p_descricao text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_executor_user_id uuid;
  v_executor_nome text;
  v_executor_email text;
  v_executor_login text;
  v_event_id uuid;
begin
  v_executor_user_id := auth.uid();
  if v_executor_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if nullif(trim(coalesce(p_acao, '')), '') is null then
    raise exception 'INVALID_ACAO';
  end if;
  if nullif(trim(coalesce(p_modulo, '')), '') is null then
    raise exception 'INVALID_MODULO';
  end if;
  if nullif(trim(coalesce(p_entidade, '')), '') is null then
    raise exception 'INVALID_ENTIDADE';
  end if;
  if nullif(trim(coalesce(p_descricao, '')), '') is null then
    raise exception 'INVALID_DESCRICAO';
  end if;

  select nome, email, login
    into v_executor_nome, v_executor_email, v_executor_login
  from public.profiles
  where id = v_executor_user_id;

  insert into public.auditoria (
    executor_user_id, executor_nome, executor_email, executor_login,
    acao, modulo, entidade, entidade_id, descricao, metadata
  ) values (
    v_executor_user_id,
    v_executor_nome,
    v_executor_email,
    v_executor_login,
    trim(p_acao),
    trim(p_modulo),
    trim(p_entidade),
    nullif(trim(coalesce(p_entidade_id, '')), ''),
    trim(p_descricao),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.list_auditoria_for_admin_user(
  p_user_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  executor_user_id uuid,
  executor_nome text,
  executor_email text,
  executor_login text,
  acao text,
  modulo text,
  entidade text,
  entidade_id text,
  descricao text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select cargo into v_role from public.profiles where id = auth.uid();
  if v_role is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('admin', 'delegado') then raise exception 'INSUFFICIENT_PRIVILEGE'; end if;
  if p_user_id is null then raise exception 'INVALID_USER_ID'; end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  return query
  select a.id, a.executor_user_id, a.executor_nome, a.executor_email, a.executor_login,
    a.acao, a.modulo, a.entidade, a.entidade_id, a.descricao, a.metadata, a.created_at
  from public.auditoria a
  where a.executor_user_id = p_user_id
    or a.entidade_id = p_user_id::text
    or a.metadata ->> 'target_user_id' = p_user_id::text
  order by a.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.list_auditoria(
  p_limit integer default 100
)
returns table (
  id uuid,
  executor_user_id uuid,
  executor_nome text,
  executor_email text,
  executor_login text,
  acao text,
  modulo text,
  entidade text,
  entidade_id text,
  descricao text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select cargo into v_role from public.profiles where id = auth.uid();
  if v_role is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('admin', 'delegado') then raise exception 'INSUFFICIENT_PRIVILEGE'; end if;

  v_limit := least(greatest(coalesce(p_limit, 100), 1), 200);

  return query
  select a.id, a.executor_user_id, a.executor_nome, a.executor_email, a.executor_login,
    a.acao, a.modulo, a.entidade, a.entidade_id, a.descricao, a.metadata, a.created_at
  from public.auditoria a
  order by a.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.log_auditoria(text, text, text, text, text, jsonb) from public;
revoke all on function public.list_auditoria_for_admin_user(uuid, integer) from public;
revoke all on function public.list_auditoria(integer) from public;
grant execute on function public.log_auditoria(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.list_auditoria_for_admin_user(uuid, integer) to authenticated;
grant execute on function public.list_auditoria(integer) to authenticated;
