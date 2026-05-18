-- Correção: alinhar retorno da RPC com tipo real da coluna public.auditoria.entidade_id (uuid)
-- Mantemos o contrato público retornando entidade_id como text para o frontend.

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
    a.entidade_id::text,
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
