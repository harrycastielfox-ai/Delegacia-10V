-- SIPI - Proposta revisavel para adicionar telefone em public.profiles
--
-- IMPORTANTE:
-- - Este arquivo e apenas documentacao tecnica/proposta.
-- - Nao foi executado automaticamente.
-- - Revise e aplique manualmente no Supabase SQL Editor somente quando aprovado.
-- - Esta proposta nao adiciona Instagram.
-- - Esta proposta nao altera cargo, status, login, email ou avatar existentes.

-- ============================================================
-- 1. CHECAGENS MANUAIS ANTES DE APLICAR
-- ============================================================
-- Execute primeiro estas consultas para confirmar o contrato atual.

-- 1.1. Conferir colunas relacionadas a perfil/contato.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'id',
    'nome',
    'email',
    'login',
    'avatar_path',
    'avatar_url',
    'telefone',
    'instagram',
    'cargo',
    'status_autorizacao',
    'created_at',
    'updated_at'
  )
order by ordinal_position;

-- 1.2. Conferir definicao atual da trigger/funcoes antes de substituir.
select pg_get_functiondef('public.handle_new_user_profile()'::regprocedure);
select pg_get_functiondef('public.list_profiles_for_admin()'::regprocedure);

-- 1.3. Conferir se a trigger de criacao de perfil esta ativa em auth.users.
select
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_schema,
  event_object_table
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created_profile';

-- ============================================================
-- 2. APLICACAO MANUAL PROPOSTA
-- ============================================================
-- Execute apenas apos revisar as checagens acima.

begin;

-- 2.1. Adiciona telefone ao contrato de public.profiles.
alter table public.profiles
add column if not exists telefone text null;

comment on column public.profiles.telefone is
  'Telefone institucional/opcional do usuario no SIPI. Campo nullable.';

-- 2.2. Atualiza a trigger de criacao de perfil.
-- O telefone passa a ser copiado de auth.users.raw_user_meta_data->>'telefone',
-- quando existir. Se nao existir ou vier vazio, permanece null.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nome,
    email,
    login,
    avatar_path,
    telefone,
    cargo,
    status_autorizacao
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'login', split_part(new.email, '@', 1)),
    null,
    nullif(trim(new.raw_user_meta_data->>'telefone'), ''),
    'membro',
    'aguardando'
  )
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    login = excluded.login,
    telefone = coalesce(excluded.telefone, public.profiles.telefone),
    updated_at = now();

  return new;
end;
$$;

-- 2.3. Atualiza RPC administrativa para retornar telefone.
-- Observacao: como o tipo de retorno muda, e mais seguro recriar a funcao.
drop function if exists public.list_profiles_for_admin();

create or replace function public.list_profiles_for_admin()
returns table (
  id uuid,
  nome text,
  email text,
  login text,
  avatar_path text,
  telefone text,
  cargo public.user_role,
  status_autorizacao public.authorization_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.cargo into requester_role
  from public.profiles p
  where p.id = auth.uid();

  if requester_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if requester_role not in ('admin', 'delegado', 'atlas_access') then
    raise exception 'INSUFFICIENT_PRIVILEGE';
  end if;

  return query
  select
    p.id,
    p.nome,
    p.email,
    p.login,
    p.avatar_path,
    p.telefone,
    p.cargo,
    p.status_autorizacao,
    p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$$;

revoke all on function public.list_profiles_for_admin() from public;
grant execute on function public.list_profiles_for_admin() to authenticated;

commit;

-- ============================================================
-- 3. CHECAGENS MANUAIS DEPOIS DE APLICAR
-- ============================================================
-- Execute depois da aplicacao manual para conferir o contrato.

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'telefone';

select pg_get_functiondef('public.handle_new_user_profile()'::regprocedure);
select pg_get_functiondef('public.list_profiles_for_admin()'::regprocedure);

-- Opcional: conferir apenas estrutura retornada pela RPC no cliente/Supabase.
-- Nao exponha dados sensiveis em prints ou commits.

-- ============================================================
-- 4. OBSERVACOES DE ESCOPO
-- ============================================================
-- - update_own_avatar nao precisa mudar: continua tratando somente avatar_path.
-- - resolve_login_to_email nao precisa mudar: continua tratando somente login/email.
-- - Para o frontend salvar telefone no cadastro futuramente, signUp devera enviar
--   options.data.telefone. Esta proposta apenas prepara o contrato do banco.
-- - Para o perfil permitir edicao do telefone futuramente, prefira uma RPC
--   controlada especifica, em vez de liberar update direto amplo em profiles.
