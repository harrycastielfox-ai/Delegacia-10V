-- Catalogo territorial persistente da sede de Itabela.
-- Mantem bairros independentes dos enderecos e exige confirmacao humana
-- antes de classificar um endereco legado ou sugerido.

create table if not exists public.localizacao_bairros (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  chave text not null check (chave ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  aliases text[] not null default '{}'::text[],
  municipio text not null default 'Itabela',
  uf text not null default 'BA' check (char_length(uf) = 2),
  ordem smallint not null check (ordem > 0),
  centro_latitude double precision,
  centro_longitude double precision,
  limite_geojson jsonb,
  posicao_confirmada boolean not null default false,
  fonte text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint localizacao_bairros_municipio_chave_key unique (municipio, uf, chave),
  constraint localizacao_bairros_coordinates_pair_check
    check ((centro_latitude is null) = (centro_longitude is null)),
  constraint localizacao_bairros_latitude_check
    check (centro_latitude is null or centro_latitude between -90 and 90),
  constraint localizacao_bairros_longitude_check
    check (centro_longitude is null or centro_longitude between -180 and 180),
  constraint localizacao_bairros_geojson_check
    check (
      limite_geojson is null
      or (
        jsonb_typeof(limite_geojson) = 'object'
        and limite_geojson ->> 'type' in ('Polygon', 'MultiPolygon')
      )
    )
);

create unique index if not exists localizacao_bairros_ativos_ordem_idx
  on public.localizacao_bairros (municipio, uf, ordem)
  where ativo;
create index if not exists localizacao_bairros_ativos_nome_idx
  on public.localizacao_bairros (lower(nome))
  where ativo;

insert into public.localizacao_bairros (
  nome, chave, aliases, ordem, centro_latitude, centro_longitude,
  posicao_confirmada, fonte
)
values
  ('Centro', 'centro', '{}', 1, -16.57257, -39.56629, true, 'OpenStreetMap'),
  ('Pereirão', 'pereirao', array['Pereirao'], 2, null, null, false, 'Relação operacional da unidade'),
  ('Bandeirante', 'bandeirante', array['Bandeirantes'], 3, -16.5787642, -39.5506699, true, 'OpenStreetMap'),
  ('Ouro Verde', 'ouro-verde', '{}', 4, -16.5756828, -39.5749892, true, 'OpenStreetMap'),
  ('Palmares', 'palmares', '{}', 5, null, null, false, 'Relação operacional da unidade'),
  ('Ubirajara Brito', 'ubirajara-brito', '{}', 6, null, null, false, 'Relação operacional da unidade'),
  ('Jaqueira', 'jaqueira', array['Village', 'Vilagge'], 7, -16.5787503, -39.5989604, true, 'OpenStreetMap'),
  ('Irmã Dulce', 'irma-dulce', array['Irma Dulce'], 8, null, null, false, 'Relação operacional da unidade'),
  ('Triunfo', 'triunfo', array['Triunfo 1'], 9, null, null, false, 'Relação operacional da unidade'),
  ('Manzolão', 'manzolao', array['Manzolao'], 10, null, null, false, 'Relação operacional da unidade'),
  ('Bacia', 'bacia', array['Bairro da Bacia'], 11, null, null, false, 'Levantamento territorial complementar'),
  ('Bela Vista', 'bela-vista', '{}', 12, null, null, false, 'Levantamento territorial complementar'),
  ('Dapezão', 'dapezao', array['Dapezao'], 13, null, null, false, 'Levantamento territorial complementar'),
  ('Ventania', 'ventania', '{}', 14, null, null, false, 'Levantamento territorial complementar'),
  ('Imperial', 'imperial', '{}', 15, null, null, false, 'Levantamento territorial complementar'),
  ('Francisqueto', 'francisqueto', '{}', 16, null, null, false, 'Levantamento territorial complementar'),
  ('Peladão', 'peladao', array['Peladao', 'Campo do Peladão', 'Campo do Peladao'], 17, null, null, false, 'Levantamento territorial complementar')
on conflict (municipio, uf, chave) do update set
  nome = excluded.nome,
  aliases = excluded.aliases,
  ordem = excluded.ordem,
  centro_latitude = excluded.centro_latitude,
  centro_longitude = excluded.centro_longitude,
  posicao_confirmada = excluded.posicao_confirmada,
  fonte = excluded.fonte,
  ativo = true,
  updated_at = now();

alter table public.localizacao_enderecos
  add column if not exists bairro_id uuid,
  add column if not exists bairro_status text not null default 'pendente',
  add column if not exists bairro_confirmado_em timestamptz,
  add column if not exists bairro_confirmado_por uuid;

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'localizacao_enderecos_bairro_id_fkey'
      and conrelid = 'public.localizacao_enderecos'::regclass
  ) then
    alter table public.localizacao_enderecos
      add constraint localizacao_enderecos_bairro_id_fkey
      foreign key (bairro_id) references public.localizacao_bairros(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'localizacao_enderecos_bairro_confirmado_por_fkey'
      and conrelid = 'public.localizacao_enderecos'::regclass
  ) then
    alter table public.localizacao_enderecos
      add constraint localizacao_enderecos_bairro_confirmado_por_fkey
      foreign key (bairro_confirmado_por) references public.profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'localizacao_enderecos_bairro_status_check'
      and conrelid = 'public.localizacao_enderecos'::regclass
  ) then
    alter table public.localizacao_enderecos
      add constraint localizacao_enderecos_bairro_status_check
      check (bairro_status in ('pendente', 'confirmado'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'localizacao_enderecos_bairro_confirmado_check'
      and conrelid = 'public.localizacao_enderecos'::regclass
  ) then
    alter table public.localizacao_enderecos
      add constraint localizacao_enderecos_bairro_confirmado_check
      check (bairro_status <> 'confirmado' or bairro_id is not null);
  end if;
end
$block$;

create index if not exists localizacao_enderecos_bairro_id_idx
  on public.localizacao_enderecos (bairro_id)
  where deleted_at is null;
create index if not exists localizacao_enderecos_bairro_pendente_idx
  on public.localizacao_enderecos (updated_at desc)
  where deleted_at is null and bairro_status = 'pendente';
create index if not exists localizacao_enderecos_bairro_confirmado_por_idx
  on public.localizacao_enderecos (bairro_confirmado_por)
  where bairro_confirmado_por is not null;

-- Liga somente textos que correspondam ao nome ou a um alias conhecido.
-- O status permanece pendente até um usuário confirmar a classificação.
update public.localizacao_enderecos e
set bairro_id = b.id,
    bairro = b.nome
from public.localizacao_bairros b
where e.bairro_id is null
  and nullif(btrim(e.bairro), '') is not null
  and (
    lower(btrim(e.bairro)) = lower(b.nome)
    or exists (
      select 1 from unnest(b.aliases) alias
      where lower(btrim(e.bairro)) = lower(alias)
    )
  );

create or replace function private.sync_localizacao_endereco_bairro()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_bairro_nome text;
begin
  if new.bairro_id is null then
    new.bairro_status := 'pendente';
    new.bairro_confirmado_em := null;
    new.bairro_confirmado_por := null;
    return new;
  end if;

  select b.nome into v_bairro_nome
  from public.localizacao_bairros b
  where b.id = new.bairro_id and b.ativo;

  if v_bairro_nome is null then
    raise exception 'localizacao_bairro_invalido' using errcode = '23503';
  end if;

  new.bairro := v_bairro_nome;
  if new.bairro_status = 'confirmado' then
    if tg_op = 'INSERT'
      or new.bairro_id is distinct from old.bairro_id
      or new.bairro_status is distinct from old.bairro_status then
      new.bairro_confirmado_em := now();
      new.bairro_confirmado_por := auth.uid();
    end if;
  else
    new.bairro_confirmado_em := null;
    new.bairro_confirmado_por := null;
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_localizacao_endereco_bairro()
from public, anon, authenticated, service_role;

drop trigger if exists sync_localizacao_endereco_bairro on public.localizacao_enderecos;
create trigger sync_localizacao_endereco_bairro
before insert or update of bairro_id, bairro_status on public.localizacao_enderecos
for each row execute function private.sync_localizacao_endereco_bairro();

alter table public.localizacao_bairros enable row level security;

drop policy if exists localizacao_bairros_select on public.localizacao_bairros;
create policy localizacao_bairros_select on public.localizacao_bairros
for select to authenticated
using (ativo and (select public.current_user_can_access_localizacao()));

revoke all on table public.localizacao_bairros from anon, authenticated;
grant select on table public.localizacao_bairros to authenticated;
grant select, insert, update, delete on table public.localizacao_bairros to service_role;

comment on table public.localizacao_bairros is
  'Catalogo territorial oficial do modulo; enderecos dependem de confirmacao humana para vinculo.';
comment on column public.localizacao_enderecos.bairro_id is
  'Bairro territorial normalizado; o campo bairro textual e mantido para compatibilidade.';
comment on column public.localizacao_enderecos.bairro_status is
  'Pendente ate confirmacao humana; coordenadas ou texto nunca confirmam automaticamente.';
