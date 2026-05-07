-- Proposta inicial de schema Supabase para o SIPI.
-- Não executar automaticamente sem validação funcional e jurídica da equipe.

create extension if not exists pgcrypto;

create table if not exists public.inqueritos (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text unique,
  numero_ppe text,
  numero_fisico text,
  numero_bo text,
  tipo text,
  tipificacao text,
  gravidade text,
  prioridade text,
  situacao text,
  status_diligencias text,
  data_fato date,
  data_instauracao date,
  prazo date,
  bairro text,
  vitima text,
  investigado text,
  reu_preso text,
  elucidado text,
  houve_arma_fogo text,
  arma_utilizada text,
  faccao text,
  nome_faccao text,
  equipe text,
  escrivao text,
  relatorio_enviado text,
  data_envio_relatorio date,
  medida_protetiva text,
  numero_processo_medida text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz null
);

create table if not exists public.representacoes (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text unique,
  inquerito_id uuid references public.inqueritos(id),
  numero_ppe text,
  processo_judicial text,
  tipo text,
  data_representacao date,
  responsavel text,
  vitima text,
  investigado text,
  autor_preso text,
  resumo_fatos text,
  fundamentacao text,
  objetivo text,
  diligencias_relacionadas text,
  status text,
  data_envio_judiciario date,
  data_decisao_judicial date,
  observacoes_decisao text,
  data_cumprimento date,
  equipe_cumprimento text,
  resultado_cumprimento text,
  observacoes_cumprimento text,
  prioridade_operacional text,
  pedido_sigiloso text,
  observacoes_internas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz null
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text,
  entidade_id uuid,
  acao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario text,
  created_at timestamptz default now()
);

-- Fase 1+2: perfis, cargos e status de autorização.
do $$
begin
  create type public.user_role as enum ('membro', 'sipi_access', 'atlas_access', 'delegado', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.authorization_status as enum ('aguardando', 'autorizado', 'bloqueado');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  login text not null unique,
  avatar_url text,
  avatar_path text,
  cargo public.user_role not null default 'membro',
  status_autorizacao public.authorization_status not null default 'aguardando',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Usuário autenticado só enxerga o próprio perfil.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
for select
using (auth.uid() = id);

-- Sem update direto por usuário comum: evita elevação de privilégio local.
drop policy if exists "profiles_self_update" on public.profiles;

-- RPC controlada para resolver login -> email sem abrir SELECT da tabela inteira.
create or replace function public.resolve_login_to_email(input_login text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.login) = lower(trim(input_login))
  limit 1;
$$;

revoke all on function public.resolve_login_to_email(text) from public;
grant execute on function public.resolve_login_to_email(text) to anon, authenticated;



create or replace function public.update_own_avatar(input_avatar_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.profiles
  set avatar_path = input_avatar_path,
      avatar_url = input_avatar_path,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_avatar(text) from public;
grant execute on function public.update_own_avatar(text) to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, login, avatar_url, avatar_path, cargo, status_autorizacao)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'login', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_path', new.raw_user_meta_data->>'avatar_url'),
    coalesce(new.raw_user_meta_data->>'avatar_path', new.raw_user_meta_data->>'avatar_url'),
    'membro',
    'aguardando'
  )
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    login = excluded.login,
    avatar_url = excluded.avatar_url,
    avatar_path = excluded.avatar_path,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();



-- Bucket e policies para avatar de perfil.
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
for select
to anon, authenticated
using (bucket_id = 'profile-avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

