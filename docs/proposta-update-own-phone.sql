-- SIPI - Proposta revisavel para edicao segura do proprio telefone
--
-- IMPORTANTE:
-- - Este arquivo e apenas documentacao tecnica/proposta.
-- - Nao foi executado automaticamente.
-- - Revise e aplique manualmente no Supabase SQL Editor somente quando aprovado.
-- - Esta proposta nao altera cadastro, perfil, admin usuarios ou frontend.
-- - Esta proposta nao adiciona Instagram.
-- - Esta proposta nao permite alterar cargo, status, email, login ou avatar.

-- ============================================================
-- 1. CHECAGENS MANUAIS ANTES DE APLICAR
-- ============================================================
-- Execute primeiro estas consultas para confirmar o contrato atual.

-- 1.1. Confirmar que public.profiles possui telefone.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('id', 'telefone', 'updated_at');

-- 1.2. Confirmar se ja existe alguma funcao similar.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('update_own_phone', 'update_own_contact', 'update_own_profile');

-- 1.3. Se update_own_phone ja existir, revisar antes de substituir.
-- select pg_get_functiondef('public.update_own_phone(text)'::regprocedure);

-- ============================================================
-- 2. APLICACAO MANUAL PROPOSTA
-- ============================================================
-- Execute apenas apos revisar as checagens acima.

begin;

create or replace function public.update_own_phone(p_telefone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_telefone text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Normaliza para apenas digitos.
  -- Null, string vazia ou string sem digitos limpam o telefone.
  v_telefone := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');

  -- Mantem o contrato visual atual do frontend: DDD + celular com ate 11 digitos.
  if v_telefone is not null and length(v_telefone) > 11 then
    raise exception 'INVALID_PHONE_LENGTH';
  end if;

  update public.profiles
  set
    telefone = v_telefone,
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

comment on function public.update_own_phone(text) is
  'Atualiza somente o telefone do proprio usuario autenticado no SIPI.';

revoke all on function public.update_own_phone(text) from public;
grant execute on function public.update_own_phone(text) to authenticated;

commit;

-- ============================================================
-- 3. CHECAGENS MANUAIS DEPOIS DE APLICAR
-- ============================================================
-- Execute depois da aplicacao manual para conferir a funcao.

select pg_get_functiondef('public.update_own_phone(text)'::regprocedure);

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_own_phone';

-- ============================================================
-- 4. OBSERVACOES DE ESCOPO
-- ============================================================
-- - O frontend /perfil so deve ser alterado depois que esta RPC estiver aplicada.
-- - O frontend deve chamar supabase.rpc('update_own_phone', { p_telefone: telefone })
--   ou o nome de parametro confirmado no Supabase.
-- - A funcao aceita null/string vazia para limpar telefone.
-- - A funcao nao altera nome, email, login, avatar_path, cargo ou status_autorizacao.
