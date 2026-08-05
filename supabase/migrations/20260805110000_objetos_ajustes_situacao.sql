-- Ajustes ao módulo de Objetos, a pedido da unidade e por revisão de
-- segurança:
--
-- 1) Perícia deixa de ser uma "situação" (estado que competia com
--    "Apreendido"). Um objeto não deixa de estar em custódia só por ter
--    sido enviado para exame. O evento continua registrado no histórico
--    (movement_type "pericia" + expertise_date), só não muda mais a
--    situação do objeto.
--
-- 2) Novo indicador "sem procedimento vinculado" na Visão Geral, no lugar
--    do indicador de perícia removido — evidência (arma, droga, dinheiro)
--    sem IP/TCO/B.O. amarrado é um risco de auditoria real.
--
-- 3) Fecha uma lacuna: o formulário só bloqueava a opção "Liberado" para
--    quem não pode liberar, mas deixava "Incinerado" e "À disposição da
--    Justiça" — atos igualmente privilegiados — livres para qualquer
--    editor. Corrigido na interface e agora também reforçado no banco,
--    com o mesmo gatilho que já protege Veículos: mesmo um UPDATE direto
--    (fora do RPC) não consegue tocar nesses campos sem a role de
--    liberação.

-- --- 1) Situação: remove os estados de perícia ---------------------------

update public.objects
set situation = 'apreendido'
where situation in ('em_pericia', 'periciado');

alter table public.objects
  drop constraint if exists objects_situation_check;

alter table public.objects
  add constraint objects_situation_check check (
    situation in (
      'apreendido', 'liberado', 'incinerado', 'disposicao_justica', 'pendente_identificacao'
    )
  );

-- --- 2) list_objects_page ganha o filtro "sem procedimento" --------------

drop function if exists public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean
);

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
  p_pending_identification boolean default null,
  p_without_procedure boolean default null
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
      and (
        p_without_procedure is not true
        or (o.procedure_number is null and o.police_report_number is null)
      )
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
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean, boolean
) from public, anon;
grant execute on function public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean, boolean
) to authenticated;

comment on function public.list_objects_page(
  integer, timestamptz, uuid, text, text, text, text, text, text, date, date, boolean, boolean
) is 'Listagem limitada e paginada por cursor para o modulo de objetos apreendidos.';

-- --- 3) object_overview_stats: troca inExpertise por withoutProcedure ----

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
    'released', (select count(*) from available where situation = 'liberado'),
    'destroyed', (select count(*) from available where situation = 'incinerado'),
    'pendingIdentification', (select count(*) from available where pending_identification),
    'withoutProcedure', (
      select count(*) from available
      where procedure_number is null and police_report_number is null
    ),
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

-- --- 4) register_object_movement: perícia não altera mais a situação ----

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
    -- "pericia" é um evento registrado no histórico, com sua própria data;
    -- não muda mais a situação do objeto (ele continua apreendido).
    situation = case
      when p_movement_type in ('entrada', 'apreensao') then 'apreendido'
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

-- --- 5) Reforço no banco: atos privilegiados exigem role de liberação ----
--
-- Mesma proteção que Veículos já tem. O RPC register_object_movement já
-- checava a permissão, mas nada impedia um UPDATE direto na tabela (fora
-- do RPC) de mudar a situação para "incinerado" ou preencher os campos de
-- liberação sem essa role — o formulário de cadastro, por exemplo, tinha
-- essa lacuna. Este gatilho fecha a lacuna na origem, não só na tela.

create or replace function private.enforce_object_privileged_changes()
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
    raise exception 'object_actor_required' using errcode = '42501';
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
      or new.situation in ('liberado', 'incinerado', 'disposicao_justica')
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
        and (
          old.situation in ('liberado', 'incinerado', 'disposicao_justica')
          or new.situation in ('liberado', 'incinerado', 'disposicao_justica')
        )
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
    raise exception 'object_privileged_change_denied' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_object_privileged_changes()
from public, anon, authenticated, service_role;

drop trigger if exists enforce_object_privileged_changes on public.objects;
create trigger enforce_object_privileged_changes
before insert or update on public.objects
for each row execute function private.enforce_object_privileged_changes();

comment on function public.object_overview_stats() is
  'Indicadores e series agregadas carregados exclusivamente pela Visao Geral de Objetos.';
comment on function public.register_object_movement(
  uuid, text, text, text, text, jsonb, timestamptz
) is 'Registra movimentacao e atualiza o objeto atomicamente. "pericia" registra data sem mudar a situacao.';
