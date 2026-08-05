drop policy if exists vehicles_privileged_soft_delete on public.vehicles;

create policy vehicles_privileged_soft_delete
on public.vehicles
as permissive
for update
to authenticated
using (
  deleted_at is null
  and (select public.current_user_can_release_vehicles())
)
with check ((select public.current_user_can_release_vehicles()));

-- Com a permissao de linha explicita, a funcao nao precisa executar com
-- privilegios do proprietario do banco.
create or replace function public.soft_delete_vehicle(p_vehicle_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_affected_rows integer;
begin
  if auth.uid() is null
    or not (select public.current_user_can_release_vehicles()) then
    raise exception 'vehicle_delete_permission_denied' using errcode = '42501';
  end if;

  update public.vehicles
  set
    deleted_at = now(),
    updated_by = auth.uid()
  where id = p_vehicle_id
    and deleted_at is null;

  get diagnostics v_affected_rows = row_count;
  return v_affected_rows = 1;
end;
$function$;

revoke all on function public.soft_delete_vehicle(uuid) from public, anon;
grant execute on function public.soft_delete_vehicle(uuid) to authenticated;

comment on function public.soft_delete_vehicle(uuid) is
  'Aplica exclusao logica auditavel a um veiculo. Restrito a delegado ou administrador.';
