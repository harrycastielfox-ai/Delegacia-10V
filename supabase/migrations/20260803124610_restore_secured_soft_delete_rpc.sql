drop policy if exists vehicles_privileged_soft_delete on public.vehicles;

-- A operacao e deliberadamente estreita: valida a identidade e o cargo antes
-- de contornar somente a politica que oculta linhas com deleted_at preenchido.
create or replace function public.soft_delete_vehicle(p_vehicle_id uuid)
returns boolean
language plpgsql
security definer
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
