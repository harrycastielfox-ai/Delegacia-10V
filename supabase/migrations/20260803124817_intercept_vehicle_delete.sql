drop policy if exists vehicles_delete_privileged on public.vehicles;

create policy vehicles_delete_privileged
on public.vehicles
as permissive
for delete
to authenticated
using (
  deleted_at is null
  and (select public.current_user_can_release_vehicles())
);

-- O DELETE autorizado e convertido em UPDATE antes da remocao fisica. A
-- funcao de trigger nao pode ser chamada pela API e preserva todas as FKs.
create or replace function private.intercept_vehicle_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.vehicles
  set
    deleted_at = now(),
    updated_by = auth.uid()
  where id = old.id
    and deleted_at is null;

  return null;
end;
$function$;

revoke all on function private.intercept_vehicle_delete() from public, anon, authenticated;

drop trigger if exists vehicles_intercept_delete on public.vehicles;
create trigger vehicles_intercept_delete
before delete on public.vehicles
for each row
execute function private.intercept_vehicle_delete();

create or replace function public.soft_delete_vehicle(p_vehicle_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_vehicle_exists boolean;
begin
  if auth.uid() is null
    or not (select public.current_user_can_release_vehicles()) then
    raise exception 'vehicle_delete_permission_denied' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.vehicles
    where id = p_vehicle_id
      and deleted_at is null
  ) into v_vehicle_exists;

  if not v_vehicle_exists then
    return false;
  end if;

  delete from public.vehicles
  where id = p_vehicle_id
    and deleted_at is null;

  return true;
end;
$function$;

revoke all on function public.soft_delete_vehicle(uuid) from public, anon;
grant execute on function public.soft_delete_vehicle(uuid) to authenticated;

comment on function public.soft_delete_vehicle(uuid) is
  'Aplica exclusao logica auditavel a um veiculo. Restrito a delegado ou administrador.';
