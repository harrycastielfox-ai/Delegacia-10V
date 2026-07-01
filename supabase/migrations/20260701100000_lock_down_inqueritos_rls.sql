-- SIPI - Endurece RLS de public.inqueritos.
--
-- Objetivo:
-- - remover acesso amplo de anon;
-- - restringir leitura/criacao/atualizacao a usuarios autenticados, autorizados
--   e com cargo operacional diferente de membro;
-- - manter soft delete via update de deleted_at apenas para registros ativos.

alter table public.inqueritos enable row level security;

create or replace function public.current_user_can_access_inqueritos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status_autorizacao = 'autorizado'
      and p.cargo <> 'membro'
  );
$$;

revoke all on function public.current_user_can_access_inqueritos() from public;
revoke execute on function public.current_user_can_access_inqueritos() from anon;
grant execute on function public.current_user_can_access_inqueritos() to authenticated;

drop policy if exists inqueritos_insert on public.inqueritos;
drop policy if exists inqueritos_select on public.inqueritos;
drop policy if exists inqueritos_update on public.inqueritos;
drop policy if exists inqueritos_select_active_anon on public.inqueritos;
drop policy if exists inqueritos_soft_delete_update_anon on public.inqueritos;

drop policy if exists inqueritos_select_authenticated on public.inqueritos;
create policy inqueritos_select_authenticated
on public.inqueritos
for select
to authenticated
using (
  public.current_user_can_access_inqueritos()
  and deleted_at is null
);

drop policy if exists inqueritos_insert_authenticated on public.inqueritos;
create policy inqueritos_insert_authenticated
on public.inqueritos
for insert
to authenticated
with check (
  public.current_user_can_access_inqueritos()
);

drop policy if exists inqueritos_update_authenticated on public.inqueritos;
create policy inqueritos_update_authenticated
on public.inqueritos
for update
to authenticated
using (
  public.current_user_can_access_inqueritos()
  and deleted_at is null
)
with check (
  public.current_user_can_access_inqueritos()
);

revoke all on table public.inqueritos from anon;
revoke all on table public.inqueritos from authenticated;
grant select, insert, update on table public.inqueritos to authenticated;
