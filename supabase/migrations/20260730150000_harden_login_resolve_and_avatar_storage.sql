-- Endurece dois achados do supabase db advisors --type security:
--
-- 1. public.resolve_login_to_email era chamavel por anon sem limite,
--    devolvendo o e-mail real de qualquer login existente. Isso permite
--    varrer logins e colher uma lista de e-mails reais da unidade para
--    phishing/engenharia social. A funcao precisa continuar acessivel a
--    anon (e' usada antes do login, para resolver login -> e-mail antes
--    de chamar signInWithPassword), entao a mitigacao e' um limite
--    global simples de chamadas por minuto, nao uma revogacao de acesso.
--    Mitigacao completa de verdade (rate limit por IP) deve vir de uma
--    regra de rate limiting no Cloudflare, fora do escopo do banco.
--
-- 2. O bucket de storage "profile-avatars" tinha uma policy de SELECT
--    ampla (anon e authenticated) que permite listar todos os arquivos
--    do bucket, nao so buscar um caminho conhecido. O bucket ja e
--    "public" no Supabase Storage, entao avatares individuais continuam
--    acessiveis via URL publica (supabase.storage.from(...).getPublicUrl)
--    sem essa policy. O frontend nunca lista o bucket (so faz upload e
--    getPublicUrl), entao a policy de listagem e removida.

-- 1. Throttle global de resolve_login_to_email.

create table if not exists public.login_resolve_attempts (
  id bigint generated always as identity primary key,
  attempted_at timestamptz not null default now()
);

comment on table public.login_resolve_attempts is
  'Janela deslizante para limitar chamadas globais a resolve_login_to_email e dificultar varredura de logins.';

revoke all on table public.login_resolve_attempts from anon, authenticated;

create or replace function public.resolve_login_to_email(input_login text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_attempts integer;
  result_email text;
begin
  delete from public.login_resolve_attempts
  where attempted_at < now() - interval '1 minute';

  select count(*) into recent_attempts from public.login_resolve_attempts;

  if recent_attempts >= 30 then
    return null;
  end if;

  insert into public.login_resolve_attempts default values;

  select p.email
    into result_email
  from public.profiles p
  where lower(p.login) = lower(trim(input_login))
  limit 1;

  return result_email;
end;
$$;

comment on function public.resolve_login_to_email(text) is
  'Resolve login para e-mail para permitir login por usuario ou e-mail. Limitado a 30 chamadas/min globalmente para dificultar varredura de logins.';

revoke all on function public.resolve_login_to_email(text) from public;
grant execute on function public.resolve_login_to_email(text) to anon, authenticated;

-- 2. Remove a policy de storage que permite listar o bucket de avatares.
-- O bucket continua publico para leitura por caminho conhecido (getPublicUrl);
-- so a capacidade de listar todos os arquivos e removida.
drop policy if exists avatars_public_read on storage.objects;
