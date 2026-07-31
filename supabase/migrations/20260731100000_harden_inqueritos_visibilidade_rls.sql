-- Endurece o acesso a inqueritos marcados como privados/sigilosos.
--
-- Achado: current_user_can_access_inqueritos() e um check unico (autorizado
-- e cargo <> 'membro'), sem nenhuma distincao pelo campo `visibilidade`.
-- Isso significa que qualquer perfil autorizado que nao seja "membro"
-- (ex: sipi_access) recebe pela API o registro completo de um inquerito
-- "Privado" - a tela so esconde depois de receber o dado. O mesmo padrao
-- ja foi corrigido para representacoes (ver
-- docs/proposta-rls-representacoes-sigilosas.sql e a migration de
-- consolidacao de grants). Esta migration aplica o mesmo padrao para:
--   - public.inqueritos (select/insert/update)
--   - public.inquerito_pessoas (select, via join com o inquerito pai)
--   - public.replace_inquerito_pessoas (RPC, SECURITY DEFINER)
--   - public.soft_delete_inquerito (RPC, SECURITY DEFINER)
--
-- Valores reais observados em producao para `visibilidade`: null (maioria),
-- 'Publico', 'Privado'. O frontend (canOnlyViewPublicCases) trata como
-- privado qualquer valor contendo "priv" ou "sig" (case-insensitive), para
-- cobrir tambem um futuro "Sigiloso". Espelhamos a mesma regra aqui.

-- 1. Helper: identifica se o valor de visibilidade representa sigilo/privado.
create or replace function public.inquerito_is_sigiloso(p_visibilidade text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    lower(trim(coalesce(p_visibilidade, ''))) like '%priv%'
    or lower(trim(coalesce(p_visibilidade, ''))) like '%sig%',
    false
  );
$$;

comment on function public.inquerito_is_sigiloso(text) is
  'Retorna true quando o campo visibilidade do inquerito indica caso privado/sigiloso.';

-- 2. Helper: usuario autenticado, autorizado e com acesso a inqueritos sigilosos.
-- Mesmo criterio de canViewPrivateCases no frontend (admin, delegado, atlas_access).
create or replace function public.current_user_can_access_inqueritos_sigilosos()
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
      and p.cargo in ('admin', 'delegado', 'atlas_access')
  );
$$;

comment on function public.current_user_can_access_inqueritos_sigilosos() is
  'Autoriza acesso a inqueritos privados/sigilosos para admin, delegado e atlas_access autorizados.';

revoke all on function public.inquerito_is_sigiloso(text) from public;
revoke all on function public.current_user_can_access_inqueritos_sigilosos() from public;

grant execute on function public.inquerito_is_sigiloso(text) to authenticated;
grant execute on function public.current_user_can_access_inqueritos_sigilosos() to authenticated;

-- 3. RLS de public.inqueritos: adiciona a distincao de sigilo.
drop policy if exists inqueritos_select_authenticated on public.inqueritos;
drop policy if exists inqueritos_insert_authenticated on public.inqueritos;
drop policy if exists inqueritos_update_authenticated on public.inqueritos;

create policy inqueritos_select_authenticated
on public.inqueritos
for select
to authenticated
using (
  deleted_at is null
  and (
    (
      not public.inquerito_is_sigiloso(visibilidade)
      and public.current_user_can_access_inqueritos()
    )
    or (
      public.inquerito_is_sigiloso(visibilidade)
      and public.current_user_can_access_inqueritos_sigilosos()
    )
  )
);

create policy inqueritos_insert_authenticated
on public.inqueritos
for insert
to authenticated
with check (
  (
    not public.inquerito_is_sigiloso(visibilidade)
    and public.current_user_can_access_inqueritos()
  )
  or (
    public.inquerito_is_sigiloso(visibilidade)
    and public.current_user_can_access_inqueritos_sigilosos()
  )
);

create policy inqueritos_update_authenticated
on public.inqueritos
for update
to authenticated
using (
  deleted_at is null
  and (
    (
      not public.inquerito_is_sigiloso(visibilidade)
      and public.current_user_can_access_inqueritos()
    )
    or (
      public.inquerito_is_sigiloso(visibilidade)
      and public.current_user_can_access_inqueritos_sigilosos()
    )
  )
)
with check (
  (
    not public.inquerito_is_sigiloso(visibilidade)
    and public.current_user_can_access_inqueritos()
  )
  or (
    public.inquerito_is_sigiloso(visibilidade)
    and public.current_user_can_access_inqueritos_sigilosos()
  )
);

-- 4. RLS de public.inquerito_pessoas: propaga a mesma regra via o inquerito pai.
drop policy if exists inquerito_pessoas_select_authorized on public.inquerito_pessoas;

create policy inquerito_pessoas_select_authorized
on public.inquerito_pessoas
for select
to authenticated
using (
  exists (
    select 1
    from public.inqueritos i
    where i.id = inquerito_pessoas.inquerito_id
      and i.deleted_at is null
      and (
        (
          not public.inquerito_is_sigiloso(i.visibilidade)
          and public.current_user_can_access_inqueritos()
        )
        or (
          public.inquerito_is_sigiloso(i.visibilidade)
          and public.current_user_can_access_inqueritos_sigilosos()
        )
      )
  )
);

-- 5. RPC replace_inquerito_pessoas: mesma regra antes de substituir a lista de pessoas.
create or replace function public.replace_inquerito_pessoas(
  p_inquerito_id uuid,
  p_pessoas jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_visibilidade text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  if not public.current_user_can_access_inqueritos() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select i.visibilidade
    into v_visibilidade
  from public.inqueritos i
  where i.id = p_inquerito_id
    and i.deleted_at is null;

  if not found then
    raise exception 'Inquérito não encontrado' using errcode = 'P0002';
  end if;

  if public.inquerito_is_sigiloso(v_visibilidade)
     and not public.current_user_can_access_inqueritos_sigilosos() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_pessoas, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de pessoas inválida' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_pessoas, '[]'::jsonb)) item
    where coalesce(item->>'papel', '') not in ('vitima', 'autor_investigado', 'testemunha', 'outro')
      or nullif(btrim(item->>'nome'), '') is null
  ) then
    raise exception 'Pessoa envolvida possui papel ou nome inválido' using errcode = '22023';
  end if;

  delete from public.inquerito_pessoas
  where inquerito_id = p_inquerito_id;

  insert into public.inquerito_pessoas (
    inquerito_id,
    papel,
    nome,
    observacao,
    ordem,
    created_by
  )
  select
    p_inquerito_id,
    item->>'papel',
    btrim(item->>'nome'),
    nullif(btrim(item->>'observacao'), ''),
    coalesce((item->>'ordem')::integer, ordinality::integer - 1),
    auth.uid()
  from jsonb_array_elements(coalesce(p_pessoas, '[]'::jsonb))
    with ordinality as source(item, ordinality);
end;
$function$;

-- 6. RPC soft_delete_inquerito: mesma regra antes de marcar deleted_at.
create or replace function public.soft_delete_inquerito(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_visibilidade text;
  v_affected_rows integer;
begin
  if auth.uid() is null
    or not public.current_user_can_access_inqueritos()
  then
    raise exception using
      errcode = '42501',
      message = 'Sem permissao para excluir este inquerito.';
  end if;

  select visibilidade
    into v_visibilidade
  from public.inqueritos
  where id = p_id
    and deleted_at is null;

  if not found then
    return false;
  end if;

  if public.inquerito_is_sigiloso(v_visibilidade)
     and not public.current_user_can_access_inqueritos_sigilosos()
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
$function$;

revoke all on function public.replace_inquerito_pessoas(uuid, jsonb) from public;
revoke all on function public.soft_delete_inquerito(uuid) from public;
grant execute on function public.replace_inquerito_pessoas(uuid, jsonb) to authenticated;
grant execute on function public.soft_delete_inquerito(uuid) to authenticated;
