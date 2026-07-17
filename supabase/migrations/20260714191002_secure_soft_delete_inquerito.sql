-- Soft delete must bypass the active-only SELECT policy after deleted_at changes.
-- Authorization remains identical to the existing inqueritos access contract.
create or replace function public.soft_delete_inquerito(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected_rows integer;
begin
  if auth.uid() is null
    or not public.current_user_can_access_inqueritos()
  then
    raise exception using
      errcode = '42501',
      message = 'Sem permissao para excluir este inquerito.';
  end if;

  update public.inqueritos
  set deleted_at = now()
  where id = p_id
    and deleted_at is null;

  get diagnostics v_affected_rows = row_count;
  return v_affected_rows = 1;
end;
$$;

revoke all on function public.soft_delete_inquerito(uuid) from public;
revoke execute on function public.soft_delete_inquerito(uuid) from anon;
grant execute on function public.soft_delete_inquerito(uuid) to authenticated;

comment on function public.soft_delete_inquerito(uuid) is
  'Aplica soft delete a um inquerito para usuarios autorizados, sem expor registros excluidos pela RLS.';
