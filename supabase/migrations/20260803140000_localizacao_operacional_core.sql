-- Nucleo persistente e seguro do modulo Localizacao Operacional.
-- Pessoas, enderecos, diligencias, rotas, chegadas e fotografias de campo.

create extension if not exists pgcrypto;

create sequence if not exists public.localizacao_diligencia_codigo_seq;

create or replace function public.current_user_can_access_localizacao()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status_autorizacao = 'autorizado'
      and p.cargo in ('sipi_access', 'delegado', 'admin')
  );
$function$;

revoke all on function public.current_user_can_access_localizacao() from public, anon;
grant execute on function public.current_user_can_access_localizacao() to authenticated;

create table if not exists public.localizacao_enderecos (
  id uuid primary key default gen_random_uuid(),
  logradouro text not null check (char_length(btrim(logradouro)) between 2 and 240),
  numero text,
  sem_numero boolean not null default false,
  complemento text,
  bairro text,
  municipio text not null default 'Itabela',
  uf text not null default 'BA' check (char_length(uf) = 2),
  cep text,
  ponto_referencia text,
  como_chegar text,
  latitude double precision,
  longitude double precision,
  maps_url text,
  confirmado boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  constraint localizacao_enderecos_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint localizacao_enderecos_longitude_check
    check (longitude is null or longitude between -180 and 180),
  constraint localizacao_enderecos_coordinates_pair_check
    check ((latitude is null) = (longitude is null)),
  constraint localizacao_enderecos_maps_url_check
    check (maps_url is null or maps_url ~* '^https?://')
);

create table if not exists public.localizacao_pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 180),
  apelido text,
  foto_perfil_path text,
  cpf text,
  rg text,
  data_nascimento date,
  nome_mae text,
  vinculo text not null default 'alvo'
    check (vinculo in ('alvo', 'testemunha', 'vitima', 'informante', 'outro')),
  telefone text,
  numero_bo text,
  numero_procedimento text,
  endereco_id uuid references public.localizacao_enderecos(id) on delete set null,
  inquerito_id uuid references public.inqueritos(id) on delete set null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz
);

create table if not exists public.localizacao_diligencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default (
    'DLG-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.localizacao_diligencia_codigo_seq')::text, 6, '0')
  ),
  tipo text not null check (tipo in (
    'intimacao', 'verificacao_endereco', 'cumprimento_mandado', 'oitiva',
    'vistoria_local', 'patrulhamento', 'apoio_outra_unidade', 'outro'
  )),
  status text not null default 'planejada'
    check (status in ('planejada', 'em_deslocamento', 'no_local', 'concluida', 'cancelada')),
  endereco_id uuid references public.localizacao_enderecos(id) on delete set null,
  pessoa_id uuid references public.localizacao_pessoas(id) on delete set null,
  inquerito_id uuid references public.inqueritos(id) on delete set null,
  veiculo_id uuid references public.vehicles(id) on delete set null,
  equipe_nome text,
  equipe_agentes integer check (equipe_agentes is null or equipe_agentes between 1 and 99),
  viatura text,
  agendada_para timestamptz,
  saida_em timestamptz,
  chegada_em timestamptz,
  concluida_em timestamptz,
  distancia_metros integer check (distancia_metros is null or distancia_metros >= 0),
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos >= 0),
  resultado text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz
);

create table if not exists public.localizacao_chegadas (
  id uuid primary key default gen_random_uuid(),
  diligencia_id uuid not null references public.localizacao_diligencias(id) on delete cascade,
  registrada_em timestamptz not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  precisao_metros double precision check (precisao_metros is null or precisao_metros >= 0),
  registrada_por uuid references public.profiles(id) on delete set null default auth.uid(),
  observacoes text
);

create table if not exists public.localizacao_registros_fotograficos (
  id uuid primary key default gen_random_uuid(),
  diligencia_id uuid references public.localizacao_diligencias(id) on delete cascade,
  endereco_id uuid references public.localizacao_enderecos(id) on delete set null,
  storage_path text not null unique,
  legenda text,
  capturada_em timestamptz not null default now(),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  constraint localizacao_fotos_coordinates_pair_check
    check ((latitude is null) = (longitude is null)),
  constraint localizacao_fotos_parent_check
    check (diligencia_id is not null or endereco_id is not null)
);

create table if not exists public.localizacao_rotas_salvas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 180),
  origem_endereco_id uuid references public.localizacao_enderecos(id) on delete set null,
  destino_endereco_id uuid references public.localizacao_enderecos(id) on delete cascade,
  pessoa_id uuid references public.localizacao_pessoas(id) on delete set null,
  paradas jsonb not null default '[]'::jsonb check (jsonb_typeof(paradas) = 'array'),
  distancia_metros integer check (distancia_metros is null or distancia_metros >= 0),
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos >= 0),
  google_maps_url text,
  waze_url text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  constraint localizacao_rotas_maps_url_check
    check (google_maps_url is null or google_maps_url ~* '^https?://'),
  constraint localizacao_rotas_waze_url_check
    check (waze_url is null or waze_url ~* '^https?://')
);

create index if not exists localizacao_enderecos_busca_idx
  on public.localizacao_enderecos (lower(logradouro), lower(coalesce(bairro, '')))
  where deleted_at is null;
create index if not exists localizacao_enderecos_coordinates_idx
  on public.localizacao_enderecos (latitude, longitude)
  where deleted_at is null and latitude is not null;
create index if not exists localizacao_pessoas_nome_idx
  on public.localizacao_pessoas (lower(nome), lower(coalesce(apelido, '')))
  where deleted_at is null;
create index if not exists localizacao_pessoas_bo_idx
  on public.localizacao_pessoas (numero_bo) where deleted_at is null and numero_bo is not null;
create index if not exists localizacao_pessoas_procedimento_idx
  on public.localizacao_pessoas (numero_procedimento)
  where deleted_at is null and numero_procedimento is not null;
create index if not exists localizacao_diligencias_status_updated_idx
  on public.localizacao_diligencias (status, updated_at desc) where deleted_at is null;
create index if not exists localizacao_diligencias_schedule_idx
  on public.localizacao_diligencias (agendada_para) where deleted_at is null;
create index if not exists localizacao_diligencias_endereco_idx
  on public.localizacao_diligencias (endereco_id) where deleted_at is null;
create index if not exists localizacao_diligencias_pessoa_idx
  on public.localizacao_diligencias (pessoa_id) where deleted_at is null;

create or replace function private.prepare_localizacao_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$function$;

revoke all on function private.prepare_localizacao_row() from public, anon, authenticated, service_role;

drop trigger if exists prepare_localizacao_endereco on public.localizacao_enderecos;
create trigger prepare_localizacao_endereco before insert or update on public.localizacao_enderecos
for each row execute function private.prepare_localizacao_row();
drop trigger if exists prepare_localizacao_pessoa on public.localizacao_pessoas;
create trigger prepare_localizacao_pessoa before insert or update on public.localizacao_pessoas
for each row execute function private.prepare_localizacao_row();
drop trigger if exists prepare_localizacao_diligencia on public.localizacao_diligencias;
create trigger prepare_localizacao_diligencia before insert or update on public.localizacao_diligencias
for each row execute function private.prepare_localizacao_row();

create or replace function private.audit_localizacao_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_actor_nome text;
  v_actor_email text;
  v_actor_login text;
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_action text := case when tg_op = 'INSERT' then 'create' when tg_op = 'DELETE' then 'delete' else 'update' end;
begin
  if v_actor_id is null then
    raise exception 'localizacao_audit_actor_required' using errcode = '42501';
  end if;

  select p.nome, p.email, p.login
    into v_actor_nome, v_actor_email, v_actor_login
  from public.profiles p where p.id = v_actor_id;

  insert into public.auditoria (
    executor_user_id, executor_nome, executor_email, executor_login,
    acao, modulo, entidade, entidade_id, descricao, metadata
  ) values (
    v_actor_id, v_actor_nome, v_actor_email, v_actor_login,
    v_action, 'localizacao', tg_table_name, v_row ->> 'id',
    case v_action when 'create' then 'Criou registro de localizacao'
      when 'delete' then 'Excluiu registro de localizacao'
      else 'Atualizou registro de localizacao' end,
    jsonb_build_object('source', 'database_trigger', 'operation', tg_op)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.audit_localizacao_row_change()
from public, anon, authenticated, service_role;

drop trigger if exists audit_localizacao_enderecos on public.localizacao_enderecos;
create trigger audit_localizacao_enderecos after insert or update on public.localizacao_enderecos
for each row execute function private.audit_localizacao_row_change();
drop trigger if exists audit_localizacao_pessoas on public.localizacao_pessoas;
create trigger audit_localizacao_pessoas after insert or update on public.localizacao_pessoas
for each row execute function private.audit_localizacao_row_change();
drop trigger if exists audit_localizacao_diligencias on public.localizacao_diligencias;
create trigger audit_localizacao_diligencias after insert or update on public.localizacao_diligencias
for each row execute function private.audit_localizacao_row_change();
drop trigger if exists audit_localizacao_rotas on public.localizacao_rotas_salvas;
create trigger audit_localizacao_rotas after insert on public.localizacao_rotas_salvas
for each row execute function private.audit_localizacao_row_change();

alter table public.localizacao_enderecos enable row level security;
alter table public.localizacao_pessoas enable row level security;
alter table public.localizacao_diligencias enable row level security;
alter table public.localizacao_chegadas enable row level security;
alter table public.localizacao_registros_fotograficos enable row level security;
alter table public.localizacao_rotas_salvas enable row level security;

create policy localizacao_enderecos_select on public.localizacao_enderecos
for select to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()));
create policy localizacao_enderecos_insert on public.localizacao_enderecos
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and created_by = (select auth.uid())
);
create policy localizacao_enderecos_update on public.localizacao_enderecos
for update to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()))
with check ((select public.current_user_can_access_localizacao()) and updated_by = (select auth.uid()));

create policy localizacao_pessoas_select on public.localizacao_pessoas
for select to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()));
create policy localizacao_pessoas_insert on public.localizacao_pessoas
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and created_by = (select auth.uid())
);
create policy localizacao_pessoas_update on public.localizacao_pessoas
for update to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()))
with check ((select public.current_user_can_access_localizacao()) and updated_by = (select auth.uid()));

create policy localizacao_diligencias_select on public.localizacao_diligencias
for select to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()));
create policy localizacao_diligencias_insert on public.localizacao_diligencias
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and created_by = (select auth.uid())
);
create policy localizacao_diligencias_update on public.localizacao_diligencias
for update to authenticated using (deleted_at is null and (select public.current_user_can_access_localizacao()))
with check ((select public.current_user_can_access_localizacao()) and updated_by = (select auth.uid()));

create policy localizacao_chegadas_select on public.localizacao_chegadas
for select to authenticated using ((select public.current_user_can_access_localizacao()));
create policy localizacao_chegadas_insert on public.localizacao_chegadas
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and registrada_por = (select auth.uid())
);

create policy localizacao_fotos_select on public.localizacao_registros_fotograficos
for select to authenticated using ((select public.current_user_can_access_localizacao()));
create policy localizacao_fotos_insert on public.localizacao_registros_fotograficos
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and created_by = (select auth.uid())
);

create policy localizacao_rotas_select on public.localizacao_rotas_salvas
for select to authenticated using ((select public.current_user_can_access_localizacao()));
create policy localizacao_rotas_insert on public.localizacao_rotas_salvas
for insert to authenticated with check (
  (select public.current_user_can_access_localizacao()) and created_by = (select auth.uid())
);

revoke all on table public.localizacao_enderecos, public.localizacao_pessoas,
  public.localizacao_diligencias, public.localizacao_chegadas,
  public.localizacao_registros_fotograficos, public.localizacao_rotas_salvas from anon;
grant select, insert, update on table public.localizacao_enderecos,
  public.localizacao_pessoas, public.localizacao_diligencias to authenticated;
grant select, insert on table public.localizacao_chegadas,
  public.localizacao_registros_fotograficos, public.localizacao_rotas_salvas to authenticated;
grant usage, select on sequence public.localizacao_diligencia_codigo_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'localizacao-private', 'localizacao-private', false, 6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy localizacao_storage_select on storage.objects
for select to authenticated using (
  bucket_id = 'localizacao-private'
  and (select public.current_user_can_access_localizacao())
);
create policy localizacao_storage_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'localizacao-private'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_localizacao())
);
create policy localizacao_storage_update on storage.objects
for update to authenticated using (
  bucket_id = 'localizacao-private'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_localizacao())
) with check (
  bucket_id = 'localizacao-private'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_localizacao())
);
create policy localizacao_storage_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'localizacao-private'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_localizacao())
);

create or replace function public.localizacao_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'ativas', count(*) filter (where d.status not in ('concluida', 'cancelada')),
    'em_deslocamento', count(*) filter (where d.status = 'em_deslocamento'),
    'no_local', count(*) filter (where d.status = 'no_local'),
    'concluidas_hoje', count(*) filter (
      where d.status = 'concluida' and d.concluida_em::date = current_date
    ),
    'enderecos_cadastrados', (
      select count(*) from public.localizacao_enderecos e where e.deleted_at is null
    ),
    'pessoas_cadastradas', (
      select count(*) from public.localizacao_pessoas p where p.deleted_at is null
    ),
    'fotos_30_dias', (
      select count(*) from public.localizacao_registros_fotograficos f
      where f.capturada_em >= now() - interval '30 days'
    ),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', series.dia, 'total', series.total) order by series.dia)
      from (
        select created_at::date::text as dia, count(*) as total
        from public.localizacao_diligencias
        where deleted_at is null and created_at >= current_date - interval '6 days'
        group by created_at::date
      ) series
    ), '[]'::jsonb)
  )
  from public.localizacao_diligencias d
  where d.deleted_at is null;
$function$;

revoke all on function public.localizacao_overview_stats() from public, anon;
grant execute on function public.localizacao_overview_stats() to authenticated;

comment on table public.localizacao_pessoas is
  'Cadastro operacional sensivel de pessoas e alvos, protegido por RLS e fotos privadas.';
comment on table public.localizacao_enderecos is
  'Enderecos manuais com coordenadas opcionais, link de mapa e instrucoes de campo.';
comment on table public.localizacao_diligencias is
  'Ordens externas vinculadas a pessoa, endereco, procedimento e veiculo.';
