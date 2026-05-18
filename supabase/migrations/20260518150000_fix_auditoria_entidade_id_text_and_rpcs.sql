-- Padroniza public.auditoria.entidade_id como text e realinha RPCs de auditoria.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auditoria'
      and column_name = 'entidade_id'
      and data_type <> 'text'
  ) then
    alter table public.auditoria
      alter column entidade_id type text using entidade_id::text;
  end if;
end;
$$;

-- Reforça índice após padronização.
drop index if exists public.auditoria_entidade_entidade_id_idx;
create index if not exists auditoria_entidade_entidade_id_idx
  on public.auditoria (entidade, entidade_id);

create or replace function public.log_auditoria(
  p_acao text,
  p_modulo text,
  p_entidade text,
  p_entidade_id text,
  p_descricao text,
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
  v_metadata jsonb;
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

  v_metadata := coalesce(p_metadata, '{}'::jsonb);

  select p.nome, p.email, p.login
    into v_executor_nome, v_executor_email, v_executor_login
  from public.profiles p
  where p.id = v_executor_user_id;

  insert into public.auditoria (
    executor_user_id,
    executor_nome,
    executor_email,
    executor_login,
    acao,
    modulo,
    entidade,
    entidade_id,
    descricao,
    metadata
  )
  values (
    v_executor_user_id,
    v_executor_nome,
    v_executor_email,
    v_executor_login,
    trim(p_acao),
    trim(p_modulo),
    trim(p_entidade),
    nullif(trim(coalesce(p_entidade_id, '')), ''),
    trim(p_descricao),
    v_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.log_auditoria(text, text, text, text, text, jsonb) from public;
grant execute on function public.log_auditoria(text, text, text, text, text, jsonb) to authenticated;

create or replace function public.list_auditoria_by_user(
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
  v_requester_role public.user_role;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.cargo into v_requester_role
  from public.profiles p
  where p.id = auth.uid();

  if v_requester_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_requester_role not in ('admin', 'delegado') then
    raise exception 'INSUFFICIENT_PRIVILEGE';
  end if;

  if p_user_id is null then
    raise exception 'INVALID_USER_ID';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  return query
  select
    a.id,
    a.executor_user_id,
    a.executor_nome,
    a.executor_email,
    a.executor_login,
    a.acao,
    a.modulo,
    a.entidade,
    a.entidade_id,
    a.descricao,
    a.metadata,
    a.created_at
  from public.auditoria a
  where a.executor_user_id = p_user_id
  order by a.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.list_auditoria_by_user(uuid, integer) from public;
grant execute on function public.list_auditoria_by_user(uuid, integer) to authenticated;

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
  v_requester_role public.user_role;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.cargo into v_requester_role
  from public.profiles p
  where p.id = auth.uid();

  if v_requester_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_requester_role not in ('admin', 'delegado') then
    raise exception 'INSUFFICIENT_PRIVILEGE';
  end if;

  if p_user_id is null then
    raise exception 'INVALID_USER_ID';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  return query
  select
    a.id,
    a.executor_user_id,
    a.executor_nome,
    a.executor_email,
    a.executor_login,
    a.acao,
    a.modulo,
    a.entidade,
    a.entidade_id,
    a.descricao,
    a.metadata,
    a.created_at
  from public.auditoria a
  where a.executor_user_id = p_user_id
     or a.entidade_id = p_user_id::text
     or a.metadata ->> 'target_user_id' = p_user_id::text
  order by a.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.list_auditoria_for_admin_user(uuid, integer) from public;
grant execute on function public.list_auditoria_for_admin_user(uuid, integer) to authenticated;
