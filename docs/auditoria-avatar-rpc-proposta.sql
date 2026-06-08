-- SIPI - Proposta revisavel para avatar na Auditoria
-- Nao executar automaticamente.
-- Objetivo: fazer as RPCs de auditoria retornarem executor_avatar_path
-- a partir de public.profiles.avatar_path, sem gerar URL publica no banco.

-- 1) Checagem manual obrigatoria antes de qualquer alteracao.
-- Confirme que public.profiles possui avatar_path.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('avatar_path', 'avatar_url', 'foto', 'image_url')
order by column_name;

-- 2) Checagem manual das assinaturas atuais das funcoes.
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'list_auditoria',
    'list_auditoria_for_admin_user',
    'list_auditoria_by_user'
  )
order by proname;

-- 3) Aplicacao manual proposta.
-- Importante: PostgreSQL nao permite mudar o RETURNS TABLE de uma funcao
-- existente apenas com CREATE OR REPLACE FUNCTION. Por isso, ao adicionar
-- executor_avatar_path ao retorno, a proposta usa DROP FUNCTION + CREATE
-- FUNCTION dentro de uma transacao e recria os grants ao final.
--
-- Execute somente apos revisar os checks acima e confirmar que:
-- - public.profiles.avatar_path existe;
-- - as assinaturas das funcoes sao as mesmas abaixo;
-- - o usuario que executara a proposta deve ser o owner apropriado das funcoes.

begin;

drop function if exists public.list_auditoria(integer);
drop function if exists public.list_auditoria_for_admin_user(uuid, integer);
drop function if exists public.list_auditoria_by_user(uuid, integer);

create function public.list_auditoria(
  p_limit integer default 100
)
returns table (
  id uuid,
  executor_user_id uuid,
  executor_nome text,
  executor_email text,
  executor_login text,
  executor_avatar_path text,
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
    p.avatar_path as executor_avatar_path,
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

create function public.list_auditoria_for_admin_user(
  p_user_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  executor_user_id uuid,
  executor_nome text,
  executor_email text,
  executor_login text,
  executor_avatar_path text,
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
    p.avatar_path as executor_avatar_path,
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

create function public.list_auditoria_by_user(
  p_user_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  executor_user_id uuid,
  executor_nome text,
  executor_email text,
  executor_login text,
  executor_avatar_path text,
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
    p.avatar_path as executor_avatar_path,
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

commit;
