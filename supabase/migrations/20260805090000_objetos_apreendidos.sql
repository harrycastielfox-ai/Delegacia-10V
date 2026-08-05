-- Modulo de Objetos Apreendidos.
-- Espelha a estrutura comprovada de public.vehicles (mesmas roles, mesma
-- auditoria, mesmo soft-delete via RPC) trocando os campos especificos de
-- veiculo por campos de bem apreendido: categoria, marca/modelo, numero de
-- serie, calibre, quantidade e peso ou valor.

create sequence if not exists public.object_internal_id_seq;

create or replace function public.normalize_object_search(p_value text)
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

revoke all on function public.normalize_object_search(text) from public, anon;
grant execute on function public.normalize_object_search(text) to authenticated;

create table if not exists public.objects (
  id uuid primary key default gen_random_uuid(),
  internal_id text not null unique,
  object_type text not null,
  description text not null,
  brand_model text,
  serial_number text,
  caliber text,
  quantity integer not null default 1,
  measurement_unit text,
  weight_or_value numeric(14, 2),
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
  custody_observations text,
  observations text,
  expertise_date date,
  release_status text,
  release_date date,
  released_to text,
  release_document text,
  release_authority text,
  delivery_term text,
  release_observations text,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  constraint objects_object_type_check check (
    object_type in (
      'arma_fogo', 'municao', 'entorpecente', 'dinheiro_valores',
      'eletronico', 'documento', 'joia_bem_valor', 'ferramenta', 'outro'
    )
  ),
  constraint objects_situation_check check (
    situation in (
      'apreendido', 'em_pericia', 'periciado', 'liberado',
      'incinerado', 'disposicao_justica', 'pendente_identificacao'
    )
  ),
  constraint objects_release_status_check check (
    release_status is null or release_status in ('nao_liberado', 'autorizado', 'liberado', 'devolvido')
  ),
  constraint objects_quantity_check check (quantity > 0),
  constraint objects_weight_or_value_check check (weight_or_value is null or weight_or_value >= 0),
  constraint objects_measurement_unit_check check (
    measurement_unit is null or measurement_unit in ('unidade', 'grama', 'quilograma', 'litro', 'real', 'par')
  )
);

comment on table public.objects is
  'Cadastro unico de objetos apreendidos: armas, entorpecentes, dinheiro/valores, eletronicos, documentos, joias e outros bens.';

create table if not exists public.object_photos (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  storage_path text not null unique,
  thumbnail_path text not null unique,
  caption text,
  sort_order integer not null default 0,
  original_size_bytes bigint,
  thumbnail_size_bytes bigint,
  mime_type text not null default 'image/webp',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint object_photos_sort_order_check check (sort_order >= 0),
  constraint object_photos_sizes_check check (
    (original_size_bytes is null or original_size_bytes >= 0)
    and (thumbnail_size_bytes is null or thumbnail_size_bytes >= 0)
  )
);

create table if not exists public.object_movements (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  movement_type text not null,
  occurred_at timestamptz not null default now(),
  from_location text,
  to_location text,
  notes text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint object_movements_type_check check (
    movement_type in (
      'entrada', 'apreensao', 'transferencia', 'pericia',
      'liberacao', 'devolucao', 'incineracao', 'disposicao_justica', 'atualizacao'
    )
  )
);

create index if not exists objects_type_updated_idx
  on public.objects (object_type, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists objects_situation_updated_idx
  on public.objects (situation, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists objects_type_situation_updated_idx
  on public.objects (object_type, situation, updated_at desc, id desc)
  where deleted_at is null;
create index if not exists objects_pagination_idx
  on public.objects (updated_at desc, id desc)
  where deleted_at is null;
create index if not exists objects_search_trgm_idx
  on public.objects using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists objects_inquerito_id_idx
  on public.objects (inquerito_id)
  where deleted_at is null and inquerito_id is not null;
create index if not exists objects_created_by_idx
  on public.objects (created_by)
  where deleted_at is null and created_by is not null;
create index if not exists object_photos_object_sort_idx
  on public.object_photos (object_id, sort_order, created_at);
create index if not exists object_movements_object_occurred_idx
  on public.object_movements (object_id, occurred_at desc, id desc);

create or replace function private.prepare_object_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(new.internal_id), '') is null then
      new.internal_id := 'OBJ-' || to_char(current_date, 'YYYY') || '-' ||
        lpad(nextval('public.object_internal_id_seq'::regclass)::text, 6, '0');
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  new.pending_identification := coalesce(new.pending_identification, false)
    or coalesce(new.situation = 'pendente_identificacao', false);

  new.search_text := public.normalize_object_search(concat_ws(' ',
    new.internal_id, new.object_type, new.description, new.brand_model,
    new.serial_number, new.caliber, new.occurrence_type, new.procedure_type,
    new.procedure_number, new.police_report_number, new.court_process_number,
    new.involved_people, new.custody_location, new.storage_location,
    new.status, new.situation
  ));
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$function$;

revoke all on function private.prepare_object_row() from public, anon, authenticated, service_role;

drop trigger if exists prepare_object_row on public.objects;
create trigger prepare_object_row
before insert or update on public.objects
for each row execute function private.prepare_object_row();

-- Consultar: qualquer perfil autorizado, exceto "membro" (mesma regra de veiculos).
create or replace function public.current_user_can_access_objects()
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

-- Cadastrar, editar, anexar fotos e registrar movimentacoes operacionais.
create or replace function public.current_user_can_manage_objects()
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

-- Liberar, devolver e excluir: ato de maior responsabilidade, restrito.
create or replace function public.current_user_can_release_objects()
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
      and p.cargo in ('delegado', 'admin')
  );
$function$;

revoke all on function public.current_user_can_access_objects() from public, anon;
revoke all on function public.current_user_can_manage_objects() from public, anon;
revoke all on function public.current_user_can_release_objects() from public, anon;
grant execute on function public.current_user_can_access_objects() to authenticated;
grant execute on function public.current_user_can_manage_objects() to authenticated;
grant execute on function public.current_user_can_release_objects() to authenticated;

alter table public.objects enable row level security;
alter table public.object_photos enable row level security;
alter table public.object_movements enable row level security;

create policy objects_select_authorized
on public.objects for select to authenticated
using (deleted_at is null and (select public.current_user_can_access_objects()));

create policy objects_insert_authorized
on public.objects for insert to authenticated
with check (
  (select public.current_user_can_manage_objects())
  and created_by = (select auth.uid())
);

create policy objects_update_authorized
on public.objects for update to authenticated
using (deleted_at is null and (select public.current_user_can_manage_objects()))
with check ((select public.current_user_can_manage_objects()));

create policy object_photos_select_authorized
on public.object_photos for select to authenticated
using (
  (select public.current_user_can_access_objects())
  and exists (
    select 1 from public.objects o
    where o.id = object_photos.object_id and o.deleted_at is null
  )
);

create policy object_photos_insert_authorized
on public.object_photos for insert to authenticated
with check (
  (select public.current_user_can_manage_objects())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.objects o
    where o.id = object_photos.object_id and o.deleted_at is null
  )
);

create policy object_photos_update_authorized
on public.object_photos for update to authenticated
using ((select public.current_user_can_manage_objects()))
with check ((select public.current_user_can_manage_objects()));

create policy object_photos_delete_authorized
on public.object_photos for delete to authenticated
using ((select public.current_user_can_manage_objects()));

create policy object_movements_select_authorized
on public.object_movements for select to authenticated
using (
  (select public.current_user_can_access_objects())
  and exists (
    select 1 from public.objects o
    where o.id = object_movements.object_id and o.deleted_at is null
  )
);

create policy object_movements_insert_authorized
on public.object_movements for insert to authenticated
with check (
  (select public.current_user_can_manage_objects())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.objects o
    where o.id = object_movements.object_id and o.deleted_at is null
  )
);

revoke all on table public.objects, public.object_photos, public.object_movements from anon;
grant select, insert, update on table public.objects to authenticated;
grant select, insert, update, delete on table public.object_photos to authenticated;
grant select, insert on table public.object_movements to authenticated;

create or replace function public.list_objects_page(
  p_limit integer default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search text default null,
  p_object_type text default null,
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
  object_type text,
  description text,
  brand_model text,
  quantity integer,
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
    select o.*
    from public.objects o
    where o.deleted_at is null
      and (nullif(btrim(p_search), '') is null
        or o.search_text like '%' || public.normalize_object_search(p_search) || '%')
      and (p_object_type is null or o.object_type = p_object_type)
      and (p_situation is null or o.situation = p_situation)
      and (p_occurrence_type is null or o.occurrence_type = p_occurrence_type)
      and (p_status is null or o.status = p_status)
      and (p_custody_location is null or o.custody_location = p_custody_location)
      and (p_start_date is null or o.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or o.created_at < (p_end_date + 1)::timestamptz)
      and (p_pending_identification is null or o.pending_identification = p_pending_identification)
  ),
  counted as (
    select filtered.*, count(*) over () as matching_total
    from filtered
  )
  select
    c.id, c.internal_id, c.object_type, c.description, c.brand_model, c.quantity,
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

revoke all on function public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) from public, anon;
grant execute on function public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) to authenticated;

create or replace function public.object_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with available as (
    select * from public.objects where deleted_at is null
  ),
  by_type as (
    select object_type as key, count(*)::bigint as total
    from available group by object_type
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
    'inExpertise', (select count(*) from available where situation = 'em_pericia'),
    'released', (select count(*) from available where situation = 'liberado'),
    'destroyed', (select count(*) from available where situation = 'incinerado'),
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

revoke all on function public.object_overview_stats() from public, anon;
grant execute on function public.object_overview_stats() to authenticated;

create or replace function public.register_object_movement(
  p_object_id uuid,
  p_movement_type text,
  p_from_location text default null,
  p_to_location text default null,
  p_notes text default null,
  p_details jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns public.object_movements
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_movement public.object_movements;
begin
  if not (select public.current_user_can_manage_objects()) then
    raise exception 'object_movement_permission_denied' using errcode = '42501';
  end if;

  if p_movement_type not in (
    'entrada', 'apreensao', 'transferencia', 'pericia',
    'liberacao', 'devolucao', 'incineracao', 'disposicao_justica', 'atualizacao'
  ) then
    raise exception 'Tipo de movimentacao invalido' using errcode = '22023';
  end if;

  if p_movement_type in ('liberacao', 'devolucao', 'incineracao', 'disposicao_justica')
    and not (select public.current_user_can_release_objects()) then
    raise exception 'object_release_permission_denied' using errcode = '42501';
  end if;

  update public.objects
  set
    custody_location = case
      when p_movement_type in ('entrada', 'apreensao', 'transferencia')
        then coalesce(nullif(btrim(p_to_location), ''), custody_location)
      else custody_location
    end,
    situation = case
      when p_movement_type in ('entrada', 'apreensao') then 'apreendido'
      when p_movement_type = 'pericia' then 'em_pericia'
      when p_movement_type in ('liberacao', 'devolucao') then 'liberado'
      when p_movement_type = 'incineracao' then 'incinerado'
      when p_movement_type = 'disposicao_justica' then 'disposicao_justica'
      else situation
    end,
    expertise_date = case
      when p_movement_type = 'pericia' then p_occurred_at::date
      else expertise_date
    end,
    release_status = case
      when p_movement_type = 'liberacao' then 'liberado'
      when p_movement_type = 'devolucao' then 'devolvido'
      else release_status
    end,
    release_date = case
      when p_movement_type in ('liberacao', 'devolucao', 'incineracao', 'disposicao_justica')
        then p_occurred_at::date
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
      when p_movement_type in ('liberacao', 'devolucao', 'incineracao', 'disposicao_justica')
        then coalesce(nullif(btrim(p_notes), ''), release_observations)
      else release_observations
    end
  where id = p_object_id and deleted_at is null;

  if not found then
    raise exception 'Objeto nao encontrado ou sem permissao' using errcode = 'P0002';
  end if;

  insert into public.object_movements (
    object_id, movement_type, occurred_at, from_location, to_location,
    notes, details, created_by
  ) values (
    p_object_id, p_movement_type, coalesce(p_occurred_at, now()),
    nullif(btrim(p_from_location), ''), nullif(btrim(p_to_location), ''),
    nullif(btrim(p_notes), ''), coalesce(p_details, '{}'::jsonb), auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$function$;

revoke all on function public.register_object_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) from public, anon;
grant execute on function public.register_object_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) to authenticated;

-- Exclusao logica auditavel, restrita a delegado ou administrador (mesma
-- regra usada para liberar/devolver: quem pode dar baixa definitiva no bem).
create or replace function public.soft_delete_object(p_object_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_object_exists boolean;
begin
  if auth.uid() is null
    or not (select public.current_user_can_release_objects()) then
    raise exception 'object_delete_permission_denied' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.objects where id = p_object_id and deleted_at is null
  ) into v_object_exists;

  if not v_object_exists then
    return false;
  end if;

  update public.objects
  set deleted_at = now(), updated_by = auth.uid()
  where id = p_object_id and deleted_at is null;

  return true;
end;
$function$;

revoke all on function public.soft_delete_object(uuid) from public, anon;
grant execute on function public.soft_delete_object(uuid) to authenticated;

comment on function public.soft_delete_object(uuid) is
  'Aplica exclusao logica auditavel a um objeto. Restrito a delegado ou administrador.';

create or replace function private.audit_object_row_change()
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
    v_action, 'objetos', 'object', v_entity_id,
    case v_action
      when 'create' then 'Criou objeto'
      when 'delete' then 'Excluiu objeto'
      else 'Editou objeto'
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'source', 'database_trigger',
      'operation', tg_op,
      'changed_fields', v_changed_fields,
      'internal_id', coalesce(v_new_row ->> 'internal_id', v_old_row ->> 'internal_id'),
      'object_type', coalesce(v_new_row ->> 'object_type', v_old_row ->> 'object_type')
    )),
    case when tg_op = 'INSERT' then null else v_old_row - 'search_text' end,
    case when tg_op = 'DELETE' then null else v_new_row - 'search_text' end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.audit_object_row_change() from public, anon, authenticated, service_role;

drop trigger if exists audit_object_critical_changes on public.objects;
create trigger audit_object_critical_changes
after insert or update or delete on public.objects
for each row execute function private.audit_object_row_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'object-photos',
  'object-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists object_photos_storage_select on storage.objects;
create policy object_photos_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'object-photos'
  and (select public.current_user_can_access_objects())
  and exists (
    select 1 from public.objects o
    where o.id::text = (storage.foldername(name))[1]
      and o.deleted_at is null
  )
);

drop policy if exists object_photos_storage_insert on storage.objects;
create policy object_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'object-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_objects())
  and exists (
    select 1 from public.objects o
    where o.id::text = (storage.foldername(name))[1]
      and o.deleted_at is null
  )
);

drop policy if exists object_photos_storage_update on storage.objects;
create policy object_photos_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'object-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_objects())
)
with check (
  bucket_id = 'object-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_objects())
);

drop policy if exists object_photos_storage_delete on storage.objects;
create policy object_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'object-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_objects())
);

comment on function public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
) is 'Listagem limitada e paginada por cursor para o modulo de objetos apreendidos.';
comment on function public.object_overview_stats() is
  'Indicadores e series agregadas carregados exclusivamente pela Visao Geral de Objetos.';
comment on function public.register_object_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) is 'Registra movimentacao e atualiza o objeto atomicamente.';
