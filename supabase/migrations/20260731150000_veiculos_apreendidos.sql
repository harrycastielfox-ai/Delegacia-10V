-- Modulo de Veiculos Apreendidos.
-- Estrutura unica para todas as categorias, com consultas paginadas,
-- fotografias privadas, movimentacoes e auditoria transacional.

create extension if not exists pg_trgm with schema extensions;

create sequence if not exists public.vehicle_internal_id_seq;

create or replace function public.normalize_vehicle_search(p_value text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select trim(
    regexp_replace(
      translate(
        lower(coalesce(p_value, '')),
        'áàâãäéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaeeeeiiiiooooouuuucnyy'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$function$;

revoke all on function public.normalize_vehicle_search(text) from public, anon;
grant execute on function public.normalize_vehicle_search(text) to authenticated;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  internal_id text not null unique,
  vehicle_type text not null,
  brand text,
  model text,
  brand_model text,
  color text,
  plate text,
  plate_status text,
  renavam text,
  renavam_status text,
  engine_number text,
  engine_status text,
  chassis text,
  chassis_status text,
  is_motorized boolean,
  manufacture_year integer,
  model_year integer,
  heavy_category text,
  bodywork_type text,
  situation text not null default 'apreendido',
  occurrence_type text,
  status text,
  pending_identification boolean not null default false,
  procedure_type text,
  procedure_number text,
  police_report_number text,
  court_process_number text,
  involved_people text,
  inquerito_id uuid references public.inqueritos(id) on delete set null,
  seizure_date date,
  seizure_location text,
  custody_location text,
  storage_location text,
  custody_responsible text,
  conservation_state text,
  has_key boolean,
  has_document boolean,
  custody_observations text,
  observations text,
  release_status text,
  release_date date,
  released_to text,
  release_document text,
  release_authority text,
  delivery_term text,
  release_observations text,
  legacy_source jsonb,
  legacy_sheet text,
  legacy_row_number integer,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  constraint vehicles_vehicle_type_check check (
    vehicle_type in ('automovel', 'motocicleta', 'caminhao', 'onibus', 'bicicleta', 'outro')
  ),
  constraint vehicles_situation_check check (
    situation in (
      'regular', 'apreendido', 'liberado', 'adulterado', 'em_investigacao',
      'recuperado', 'periciado', 'pendente_identificacao'
    )
  ),
  constraint vehicles_release_status_check check (
    release_status is null or release_status in ('nao_liberado', 'autorizado', 'liberado', 'devolvido')
  ),
  constraint vehicles_identification_status_check check (
    (plate_status is null or plate_status in ('informado', 'ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'))
    and (renavam_status is null or renavam_status in ('informado', 'ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'))
    and (engine_status is null or engine_status in ('informado', 'ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'))
    and (chassis_status is null or chassis_status in ('informado', 'ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'))
  ),
  constraint vehicles_years_check check (
    (manufacture_year is null or manufacture_year between 1800 and 3000)
    and (model_year is null or model_year between 1800 and 3000)
  ),
  constraint vehicles_legacy_row_check check (legacy_row_number is null or legacy_row_number > 0)
);

comment on table public.vehicles is
  'Cadastro unico de automoveis, motocicletas, caminhoes, onibus, bicicletas e outros veiculos.';
comment on column public.vehicles.legacy_source is
  'Conteudo bruto preservado para futura importacao assistida da planilha legada.';

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null unique,
  thumbnail_path text not null unique,
  caption text,
  sort_order integer not null default 0,
  original_size_bytes bigint,
  thumbnail_size_bytes bigint,
  mime_type text not null default 'image/webp',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint vehicle_photos_sort_order_check check (sort_order >= 0),
  constraint vehicle_photos_sizes_check check (
    (original_size_bytes is null or original_size_bytes >= 0)
    and (thumbnail_size_bytes is null or thumbnail_size_bytes >= 0)
  )
);

create table if not exists public.vehicle_movements (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  movement_type text not null,
  occurred_at timestamptz not null default now(),
  from_location text,
  to_location text,
  notes text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint vehicle_movements_type_check check (
    movement_type in ('entrada', 'apreensao', 'transferencia', 'pericia', 'liberacao', 'devolucao', 'atualizacao')
  )
);

create index if not exists vehicles_plate_lookup_idx
  on public.vehicles (upper(replace(replace(plate, '-', ''), ' ', '')))
  where deleted_at is null and plate is not null;
create index if not exists vehicles_chassis_lookup_idx
  on public.vehicles (upper(replace(replace(chassis, '-', ''), ' ', '')))
  where deleted_at is null and chassis is not null;
create index if not exists vehicles_renavam_lookup_idx
  on public.vehicles (replace(replace(renavam, '-', ''), ' ', ''))
  where deleted_at is null and renavam is not null;
create index if not exists vehicles_type_updated_idx
  on public.vehicles (vehicle_type, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists vehicles_situation_updated_idx
  on public.vehicles (situation, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists vehicles_status_updated_idx
  on public.vehicles (status, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists vehicles_type_situation_updated_idx
  on public.vehicles (vehicle_type, situation, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists vehicles_pagination_idx
  on public.vehicles (updated_at desc, id desc)
  where deleted_at is null;
create index if not exists vehicles_search_trgm_idx
  on public.vehicles using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists vehicles_inquerito_id_idx
  on public.vehicles (inquerito_id)
  where deleted_at is null and inquerito_id is not null;
create index if not exists vehicles_created_by_idx
  on public.vehicles (created_by)
  where deleted_at is null and created_by is not null;
create index if not exists vehicles_updated_by_idx
  on public.vehicles (updated_by)
  where deleted_at is null and updated_by is not null;
create index if not exists vehicle_photos_vehicle_sort_idx
  on public.vehicle_photos (vehicle_id, sort_order, created_at);
create index if not exists vehicle_photos_created_by_idx
  on public.vehicle_photos (created_by)
  where created_by is not null;
create index if not exists vehicle_movements_vehicle_occurred_idx
  on public.vehicle_movements (vehicle_id, occurred_at desc, id desc);
create index if not exists vehicle_movements_created_by_idx
  on public.vehicle_movements (created_by)
  where created_by is not null;

create or replace function private.prepare_vehicle_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(new.internal_id), '') is null then
      new.internal_id := 'VEI-' || to_char(current_date, 'YYYY') || '-' ||
        lpad(nextval('public.vehicle_internal_id_seq'::regclass)::text, 6, '0');
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  new.brand_model := nullif(btrim(concat_ws(' ', new.brand, new.model)), '');
  new.pending_identification := coalesce(new.pending_identification, false)
    or coalesce(new.situation = 'pendente_identificacao', false)
    or (
      (new.vehicle_type <> 'bicicleta' or coalesce(new.is_motorized, false))
      and (
        coalesce(new.plate_status in ('ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'), false)
        or coalesce(new.engine_status in ('ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'), false)
        or coalesce(new.chassis_status in ('ausente', 'suprimido', 'raspado', 'ilegivel', 'incompativel'), false)
      )
    );
  new.search_text := public.normalize_vehicle_search(concat_ws(' ',
    new.internal_id, new.vehicle_type, new.brand, new.model, new.brand_model,
    new.color, new.plate, new.renavam, new.engine_number, new.chassis,
    new.occurrence_type, new.procedure_type, new.procedure_number,
    new.police_report_number, new.court_process_number, new.involved_people,
    new.custody_location, new.storage_location, new.status, new.situation
  ));
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$function$;

revoke all on function private.prepare_vehicle_row() from public, anon, authenticated, service_role;

drop trigger if exists prepare_vehicle_row on public.vehicles;
create trigger prepare_vehicle_row
before insert or update on public.vehicles
for each row execute function private.prepare_vehicle_row();

create or replace function public.current_user_can_access_vehicles()
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
      and p.cargo <> 'membro'
  );
$function$;

revoke all on function public.current_user_can_access_vehicles() from public, anon;
grant execute on function public.current_user_can_access_vehicles() to authenticated;

alter table public.vehicles enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.vehicle_movements enable row level security;

create policy vehicles_select_authorized
on public.vehicles for select to authenticated
using (deleted_at is null and (select public.current_user_can_access_vehicles()));

create policy vehicles_insert_authorized
on public.vehicles for insert to authenticated
with check (
  (select public.current_user_can_access_vehicles())
  and created_by = (select auth.uid())
);

create policy vehicles_update_authorized
on public.vehicles for update to authenticated
using (deleted_at is null and (select public.current_user_can_access_vehicles()))
with check ((select public.current_user_can_access_vehicles()));

create policy vehicle_photos_select_authorized
on public.vehicle_photos for select to authenticated
using (
  (select public.current_user_can_access_vehicles())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id and v.deleted_at is null
  )
);

create policy vehicle_photos_insert_authorized
on public.vehicle_photos for insert to authenticated
with check (
  (select public.current_user_can_access_vehicles())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id and v.deleted_at is null
  )
);

create policy vehicle_photos_update_authorized
on public.vehicle_photos for update to authenticated
using ((select public.current_user_can_access_vehicles()))
with check ((select public.current_user_can_access_vehicles()));

create policy vehicle_photos_delete_authorized
on public.vehicle_photos for delete to authenticated
using ((select public.current_user_can_access_vehicles()));

create policy vehicle_movements_select_authorized
on public.vehicle_movements for select to authenticated
using (
  (select public.current_user_can_access_vehicles())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_movements.vehicle_id and v.deleted_at is null
  )
);

create policy vehicle_movements_insert_authorized
on public.vehicle_movements for insert to authenticated
with check (
  (select public.current_user_can_access_vehicles())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_movements.vehicle_id and v.deleted_at is null
  )
);

revoke all on table public.vehicles, public.vehicle_photos, public.vehicle_movements from anon;
grant select, insert, update on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.vehicle_photos to authenticated;
grant select, insert on table public.vehicle_movements to authenticated;

create or replace function public.list_vehicles_page(
  p_limit integer default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null,
  p_vehicle_type text default null,
  p_situation text default null,
  p_occurrence_type text default null,
  p_status text default null,
  p_custody_location text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_pending_identification boolean default null
)
returns table (
  id uuid,
  internal_id text,
  vehicle_type text,
  brand_model text,
  color text,
  plate text,
  situation text,
  occurrence_type text,
  procedure_type text,
  procedure_number text,
  police_report_number text,
  custody_location text,
  storage_location text,
  pending_identification boolean,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with filtered as (
    select v.*
    from public.vehicles v
    where v.deleted_at is null
      and (nullif(btrim(p_search), '') is null
        or v.search_text like '%' || public.normalize_vehicle_search(p_search) || '%')
      and (p_vehicle_type is null or v.vehicle_type = p_vehicle_type)
      and (p_situation is null or v.situation = p_situation)
      and (p_occurrence_type is null or v.occurrence_type = p_occurrence_type)
      and (p_status is null or v.status = p_status)
      and (p_custody_location is null or v.custody_location = p_custody_location)
      and (p_start_date is null or v.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or v.created_at < (p_end_date + 1)::timestamptz)
      and (p_pending_identification is null or v.pending_identification = p_pending_identification)
  ),
  counted as (
    select filtered.*, count(*) over () as matching_total
    from filtered
  )
  select
    c.id, c.internal_id, c.vehicle_type, c.brand_model, c.color, c.plate,
    c.situation, c.occurrence_type, c.procedure_type, c.procedure_number,
    c.police_report_number, c.custody_location, c.storage_location,
    c.pending_identification, c.updated_at, c.matching_total
  from counted c
  where p_cursor_updated_at is null
    or p_cursor_id is null
    or (c.updated_at, c.id) < (p_cursor_updated_at, p_cursor_id)
  order by c.updated_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$function$;

revoke all on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) from public, anon;
grant execute on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) to authenticated;

create or replace function public.vehicle_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with available as (
    select * from public.vehicles where deleted_at is null
  ),
  by_type as (
    select vehicle_type as key, count(*)::bigint as total
    from available group by vehicle_type
  ),
  by_situation as (
    select situation as key, count(*)::bigint as total
    from available group by situation
  ),
  monthly as (
    select date_trunc('month', created_at) as month, count(*)::bigint as total
    from available
    where created_at >= date_trunc('month', now()) - interval '5 months'
    group by date_trunc('month', created_at)
  )
  select jsonb_build_object(
    'total', (select count(*) from available),
    'seized', (select count(*) from available where situation = 'apreendido'),
    'recovered', (select count(*) from available where situation = 'recuperado'),
    'adulterated', (select count(*) from available where situation = 'adulterado'),
    'pendingIdentification', (select count(*) from available where pending_identification),
    'releasedThisMonth', (
      select count(*) from available
      where situation = 'liberado'
        and release_date >= date_trunc('month', current_date)::date
    ),
    'byType', coalesce((select jsonb_object_agg(key, total) from by_type), '{}'::jsonb),
    'bySituation', coalesce((select jsonb_object_agg(key, total) from by_situation), '{}'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(month, 'YYYY-MM'), 'total', total) order by month)
      from monthly
    ), '[]'::jsonb)
  );
$function$;

revoke all on function public.vehicle_overview_stats() from public, anon;
grant execute on function public.vehicle_overview_stats() to authenticated;

create or replace function public.register_vehicle_movement(
  p_vehicle_id uuid,
  p_movement_type text,
  p_from_location text default null,
  p_to_location text default null,
  p_notes text default null,
  p_details jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns public.vehicle_movements
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_movement public.vehicle_movements;
begin
  if p_movement_type not in ('entrada', 'apreensao', 'transferencia', 'pericia', 'liberacao', 'devolucao', 'atualizacao') then
    raise exception 'Tipo de movimentacao invalido' using errcode = '22023';
  end if;

  update public.vehicles
  set
    custody_location = case
      when p_movement_type in ('entrada', 'apreensao', 'transferencia')
        then coalesce(nullif(btrim(p_to_location), ''), custody_location)
      else custody_location
    end,
    situation = case
      when p_movement_type in ('entrada', 'apreensao') then 'apreendido'
      when p_movement_type = 'pericia' then 'periciado'
      when p_movement_type in ('liberacao', 'devolucao') then 'liberado'
      else situation
    end,
    release_status = case
      when p_movement_type = 'liberacao' then 'liberado'
      when p_movement_type = 'devolucao' then 'devolvido'
      else release_status
    end,
    release_date = case
      when p_movement_type in ('liberacao', 'devolucao') then p_occurred_at::date
      else release_date
    end,
    released_to = case
      when p_movement_type in ('liberacao', 'devolucao')
        then coalesce(nullif(btrim(p_details ->> 'released_to'), ''), released_to)
      else released_to
    end,
    release_document = case
      when p_movement_type in ('liberacao', 'devolucao')
        then coalesce(nullif(btrim(p_details ->> 'release_document'), ''), release_document)
      else release_document
    end,
    release_authority = case
      when p_movement_type in ('liberacao', 'devolucao')
        then coalesce(nullif(btrim(p_details ->> 'release_authority'), ''), release_authority)
      else release_authority
    end,
    release_observations = case
      when p_movement_type in ('liberacao', 'devolucao')
        then coalesce(nullif(btrim(p_notes), ''), release_observations)
      else release_observations
    end
  where id = p_vehicle_id and deleted_at is null;

  if not found then
    raise exception 'Veiculo nao encontrado ou sem permissao' using errcode = 'P0002';
  end if;

  insert into public.vehicle_movements (
    vehicle_id, movement_type, occurred_at, from_location, to_location,
    notes, details, created_by
  ) values (
    p_vehicle_id, p_movement_type, coalesce(p_occurred_at, now()),
    nullif(btrim(p_from_location), ''), nullif(btrim(p_to_location), ''),
    nullif(btrim(p_notes), ''), coalesce(p_details, '{}'::jsonb), auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$function$;

revoke all on function public.register_vehicle_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) from public, anon;
grant execute on function public.register_vehicle_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) to authenticated;

create or replace function private.audit_vehicle_row_change()
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
  v_old_row jsonb := '{}'::jsonb;
  v_new_row jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_action text;
  v_entity_id text;
begin
  if v_actor_id is null then
    raise exception 'audit_actor_required' using errcode = '42501';
  end if;

  if tg_op <> 'INSERT' then v_old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new_row := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(field_name order by field_name), '[]'::jsonb)
    into v_changed_fields
    from (
      select keys.field_name
      from jsonb_object_keys(v_new_row) keys(field_name)
      where (v_old_row -> keys.field_name) is distinct from (v_new_row -> keys.field_name)
        and keys.field_name not in ('search_text', 'updated_at', 'updated_by')
    ) changed;

    if jsonb_array_length(v_changed_fields) = 0 then return new; end if;
  end if;

  v_action := case tg_op when 'INSERT' then 'create' when 'DELETE' then 'delete' else 'update' end;
  if tg_op = 'UPDATE'
    and (v_old_row ->> 'deleted_at') is null
    and (v_new_row ->> 'deleted_at') is not null then
    v_action := 'delete';
  end if;
  v_entity_id := coalesce(v_new_row ->> 'id', v_old_row ->> 'id');

  select p.nome, p.email, p.login
  into v_actor_nome, v_actor_email, v_actor_login
  from public.profiles p where p.id = v_actor_id;

  insert into public.auditoria (
    executor_user_id, executor_nome, executor_email, executor_login,
    acao, modulo, entidade, entidade_id, descricao, metadata,
    dados_anteriores, dados_novos
  ) values (
    v_actor_id, v_actor_nome, v_actor_email, v_actor_login,
    v_action, 'veiculos', 'vehicle', v_entity_id,
    case v_action
      when 'create' then 'Criou veiculo'
      when 'delete' then 'Excluiu veiculo'
      else 'Editou veiculo'
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'source', 'database_trigger',
      'operation', tg_op,
      'changed_fields', v_changed_fields,
      'internal_id', coalesce(v_new_row ->> 'internal_id', v_old_row ->> 'internal_id'),
      'plate', coalesce(v_new_row ->> 'plate', v_old_row ->> 'plate')
    )),
    case when tg_op = 'INSERT' then null else v_old_row - 'search_text' end,
    case when tg_op = 'DELETE' then null else v_new_row - 'search_text' end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.audit_vehicle_row_change() from public, anon, authenticated, service_role;

drop trigger if exists audit_vehicle_critical_changes on public.vehicles;
create trigger audit_vehicle_critical_changes
after insert or update or delete on public.vehicles
for each row execute function private.audit_vehicle_row_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-photos',
  'vehicle-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vehicle_photos_storage_select on storage.objects;
create policy vehicle_photos_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'vehicle-photos'
  and (select public.current_user_can_access_vehicles())
  and exists (
    select 1 from public.vehicles v
    where v.id::text = (storage.foldername(name))[1]
      and v.deleted_at is null
  )
);

drop policy if exists vehicle_photos_storage_insert on storage.objects;
create policy vehicle_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_vehicles())
  and exists (
    select 1 from public.vehicles v
    where v.id::text = (storage.foldername(name))[1]
      and v.deleted_at is null
  )
);

drop policy if exists vehicle_photos_storage_update on storage.objects;
create policy vehicle_photos_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_vehicles())
)
with check (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_vehicles())
);

drop policy if exists vehicle_photos_storage_delete on storage.objects;
create policy vehicle_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_access_vehicles())
);

comment on function public.list_vehicles_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) is 'Listagem limitada e paginada por cursor para o modulo de veiculos.';
comment on function public.vehicle_overview_stats() is
  'Indicadores e series agregadas carregados exclusivamente pela Visao Geral de Veiculos.';
comment on function public.register_vehicle_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) is 'Registra movimentacao e atualiza o veiculo atomicamente.';
