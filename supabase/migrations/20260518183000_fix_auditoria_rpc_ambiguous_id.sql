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

  select p.cargo
    into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role not in ('admin', 'delegado') then
    raise exception 'INSUFFICIENT_PRIVILEGE';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 100), 1), 200);

  return query
  select
    a.id,
    a.executor_user_id,
    coalesce(a.executor_nome, p.nome) as executor_nome,
    coalesce(a.executor_email, p.email) as executor_email,
    coalesce(a.executor_login, p.login) as executor_login,
    a.acao,
    a.modulo,
    a.entidade,
    a.entidade_id,
    a.descricao,
    a.metadata,
    a.created_at
  from public.auditoria a
  left join public.profiles p
    on p.id = a.executor_user_id
  order by a.created_at desc
  limit v_limit;
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

  select p.cargo
    into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role not in ('admin', 'delegado') then
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
    coalesce(a.executor_nome, p.nome) as executor_nome,
    coalesce(a.executor_email, p.email) as executor_email,
    coalesce(a.executor_login, p.login) as executor_login,
    a.acao,
    a.modulo,
    a.entidade,
    a.entidade_id,
    a.descricao,
    a.metadata,
    a.created_at
  from public.auditoria a
  left join public.profiles p
    on p.id = a.executor_user_id
  where a.executor_user_id = p_user_id
     or a.entidade_id = p_user_id::text
     or a.metadata ->> 'target_user_id' = p_user_id::text
  order by a.created_at desc
  limit v_limit;
end;
$$;

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

  select p.cargo
    into v_requester_role
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
    coalesce(a.executor_nome, p.nome) as executor_nome,
    coalesce(a.executor_email, p.email) as executor_email,
    coalesce(a.executor_login, p.login) as executor_login,
    a.acao,
    a.modulo,
    a.entidade,
    a.entidade_id,
    a.descricao,
    a.metadata,
    a.created_at
  from public.auditoria a
  left join public.profiles p
    on p.id = a.executor_user_id
  where a.executor_user_id = p_user_id
  order by a.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.list_auditoria(integer) from public;
revoke all on function public.list_auditoria_for_admin_user(uuid, integer) from public;
revoke all on function public.list_auditoria_by_user(uuid, integer) from public;

grant execute on function public.list_auditoria(integer) to authenticated;
grant execute on function public.list_auditoria_for_admin_user(uuid, integer) to authenticated;
grant execute on function public.list_auditoria_by_user(uuid, integer) to authenticated;
