-- Separa consulta, operacao e atos privilegiados no modulo de veiculos.
-- A interface replica estas regras, mas o banco permanece como autoridade final.

create or replace function public.current_user_can_manage_vehicles()
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

create or replace function public.current_user_can_release_vehicles()
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

revoke all on function public.current_user_can_manage_vehicles() from public, anon;
revoke all on function public.current_user_can_release_vehicles() from public, anon;
grant execute on function public.current_user_can_manage_vehicles() to authenticated;
grant execute on function public.current_user_can_release_vehicles() to authenticated;

drop policy if exists vehicles_insert_authorized on public.vehicles;
create policy vehicles_insert_authorized
on public.vehicles for insert to authenticated
with check (
  (select public.current_user_can_manage_vehicles())
  and created_by = (select auth.uid())
);

drop policy if exists vehicles_update_authorized on public.vehicles;
create policy vehicles_update_authorized
on public.vehicles for update to authenticated
using (deleted_at is null and (select public.current_user_can_manage_vehicles()))
with check ((select public.current_user_can_manage_vehicles()));

drop policy if exists vehicle_photos_insert_authorized on public.vehicle_photos;
create policy vehicle_photos_insert_authorized
on public.vehicle_photos for insert to authenticated
with check (
  (select public.current_user_can_manage_vehicles())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_photos.vehicle_id and v.deleted_at is null
  )
);

drop policy if exists vehicle_photos_update_authorized on public.vehicle_photos;
create policy vehicle_photos_update_authorized
on public.vehicle_photos for update to authenticated
using ((select public.current_user_can_manage_vehicles()))
with check ((select public.current_user_can_manage_vehicles()));

drop policy if exists vehicle_photos_delete_authorized on public.vehicle_photos;
create policy vehicle_photos_delete_authorized
on public.vehicle_photos for delete to authenticated
using ((select public.current_user_can_manage_vehicles()));

drop policy if exists vehicle_movements_insert_authorized on public.vehicle_movements;
create policy vehicle_movements_insert_authorized
on public.vehicle_movements for insert to authenticated
with check (
  (select public.current_user_can_manage_vehicles())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_movements.vehicle_id and v.deleted_at is null
  )
);

drop policy if exists vehicle_photos_storage_insert on storage.objects;
create policy vehicle_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_vehicles())
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
  and (select public.current_user_can_manage_vehicles())
)
with check (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_vehicles())
);

drop policy if exists vehicle_photos_storage_delete on storage.objects;
create policy vehicle_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'vehicle-photos'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_manage_vehicles())
);

create or replace function private.enforce_vehicle_privileged_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_can_release boolean;
  v_privileged_change boolean := false;
begin
  if v_actor_id is null then
    raise exception 'vehicle_actor_required' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_actor_id
      and p.status_autorizacao = 'autorizado'
      and p.cargo in ('delegado', 'admin')
  ) into v_can_release;

  if tg_op = 'INSERT' then
    v_privileged_change :=
      new.deleted_at is not null
      or new.situation = 'liberado'
      or new.release_status in ('autorizado', 'liberado', 'devolvido')
      or new.release_date is not null
      or new.released_to is not null
      or new.release_document is not null
      or new.release_authority is not null
      or new.delivery_term is not null
      or new.release_observations is not null;
  else
    v_privileged_change :=
      old.deleted_at is distinct from new.deleted_at
      or (
        old.situation is distinct from new.situation
        and (old.situation = 'liberado' or new.situation = 'liberado')
      )
      or old.release_status is distinct from new.release_status
      or old.release_date is distinct from new.release_date
      or old.released_to is distinct from new.released_to
      or old.release_document is distinct from new.release_document
      or old.release_authority is distinct from new.release_authority
      or old.delivery_term is distinct from new.delivery_term
      or old.release_observations is distinct from new.release_observations;
  end if;

  if v_privileged_change and not v_can_release then
    raise exception 'vehicle_privileged_change_denied' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_vehicle_privileged_changes()
from public, anon, authenticated, service_role;

drop trigger if exists enforce_vehicle_privileged_changes on public.vehicles;
create trigger enforce_vehicle_privileged_changes
before insert or update on public.vehicles
for each row execute function private.enforce_vehicle_privileged_changes();

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
  if not (select public.current_user_can_manage_vehicles()) then
    raise exception 'vehicle_movement_permission_denied' using errcode = '42501';
  end if;

  if p_movement_type not in ('entrada', 'apreensao', 'transferencia', 'pericia', 'liberacao', 'devolucao', 'atualizacao') then
    raise exception 'Tipo de movimentacao invalido' using errcode = '22023';
  end if;

  if p_movement_type in ('liberacao', 'devolucao')
    and not (select public.current_user_can_release_vehicles()) then
    raise exception 'vehicle_release_permission_denied' using errcode = '42501';
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

comment on function public.current_user_can_manage_vehicles() is
  'Autoriza cadastros, edicoes, fotos e movimentacoes operacionais de veiculos.';
comment on function public.current_user_can_release_vehicles() is
  'Restringe liberacao, devolucao e exclusao de veiculos a delegado ou admin.';
