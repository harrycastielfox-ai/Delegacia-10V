-- Modulo Agenda de Oitivas.
--
-- Na delegacia, quando entra um B.O. (agressao, ameaca, furto...), o escrivao
-- convoca as pessoas envolvidas para serem ouvidas: a vitima, as testemunhas
-- e, em outro momento, o autor. Cada convocacao tem dia, hora e quem conduz.
--
-- Modelagem: UMA LINHA = UMA PESSOA convocada para UM horario. Nao e uma
-- "sessao" com varias pessoas dentro, porque na pratica cada um chega no seu
-- horario e e ouvido separadamente. O que agrupa todos e o numero do B.O. ou
-- o procedimento — e por ele que o cronograma junta de volta.
--
-- Espelha a estrutura ja comprovada de objects/vehicles: mesmas roles, mesma
-- auditoria, mesmo soft-delete.

create sequence if not exists public.agendamento_codigo_seq;

create or replace function public.normalize_agenda_search(p_value text)
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

revoke all on function public.normalize_agenda_search(text) from public, anon;
grant execute on function public.normalize_agenda_search(text) to authenticated;

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,

  -- Quem foi convocado
  pessoa_nome text not null,
  pessoa_telefone text,
  pessoa_documento text,
  qualificacao text not null default 'testemunha',

  -- O que sera feito e sobre o que
  tipo_atendimento text not null default 'oitiva',
  natureza text,
  numero_bo text,
  procedimento_numero text,
  inquerito_id uuid references public.inqueritos(id) on delete set null,

  -- Quando e onde
  data_hora timestamptz not null,
  duracao_minutos integer not null default 30,
  local text,

  -- Quem conduz
  responsavel_user_id uuid references public.profiles(id) on delete set null,
  responsavel_nome text,

  -- Acompanhamento
  status text not null default 'agendado',
  intimacao_status text not null default 'pendente',
  intimacao_via text,
  observacoes text,
  resultado text,

  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,

  constraint agendamentos_qualificacao_check check (
    qualificacao in (
      'vitima', 'testemunha', 'autor', 'comunicante',
      'representante_legal', 'advogado', 'perito', 'outro'
    )
  ),
  constraint agendamentos_tipo_check check (
    tipo_atendimento in (
      'oitiva', 'acareacao', 'reconhecimento', 'entrega_documento',
      'assinatura', 'retirada_objeto', 'outro'
    )
  ),
  constraint agendamentos_status_check check (
    status in ('agendado', 'confirmado', 'compareceu', 'nao_compareceu', 'remarcado', 'cancelado')
  ),
  constraint agendamentos_intimacao_check check (
    intimacao_status in ('pendente', 'enviada', 'confirmada', 'nao_localizado')
  ),
  constraint agendamentos_duracao_check check (duracao_minutos between 5 and 480)
);

create index if not exists agendamentos_data_hora_idx
  on public.agendamentos (data_hora) where deleted_at is null;
create index if not exists agendamentos_responsavel_idx
  on public.agendamentos (responsavel_user_id, data_hora) where deleted_at is null;
create index if not exists agendamentos_created_by_idx
  on public.agendamentos (created_by, data_hora) where deleted_at is null;
create index if not exists agendamentos_inquerito_idx
  on public.agendamentos (inquerito_id) where deleted_at is null;
create index if not exists agendamentos_numero_bo_idx
  on public.agendamentos (numero_bo) where deleted_at is null and numero_bo is not null;
create index if not exists agendamentos_search_idx
  on public.agendamentos using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;

comment on table public.agendamentos is
  'Convocacoes para oitiva e demais atendimentos agendados. Uma linha por pessoa convocada.';
comment on column public.agendamentos.qualificacao is
  'Papel da pessoa no fato: vitima, testemunha, autor, comunicante, etc.';
comment on column public.agendamentos.responsavel_user_id is
  'Servidor que vai conduzir o atendimento (normalmente o escrivao).';

create or replace function private.prepare_agendamento_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(new.codigo), '') is null then
      new.codigo := 'AGD-' || to_char(current_date, 'YYYY') || '-' ||
        lpad(nextval('public.agendamento_codigo_seq'::regclass)::text, 6, '0');
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  -- Nome do responsavel fica gravado junto: se o servidor sair da unidade e o
  -- perfil for removido, a agenda historica continua legivel.
  if new.responsavel_user_id is not null then
    select p.nome into new.responsavel_nome
    from public.profiles p where p.id = new.responsavel_user_id;
  end if;

  new.search_text := public.normalize_agenda_search(concat_ws(' ',
    new.codigo, new.pessoa_nome, new.pessoa_telefone, new.pessoa_documento,
    new.natureza, new.numero_bo, new.procedimento_numero, new.local,
    new.responsavel_nome, new.observacoes
  ));
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$function$;

revoke all on function private.prepare_agendamento_row() from public, anon, authenticated, service_role;

drop trigger if exists prepare_agendamento_row on public.agendamentos;
create trigger prepare_agendamento_row
before insert or update on public.agendamentos
for each row execute function private.prepare_agendamento_row();

-- --- Permissoes -----------------------------------------------------------

create or replace function public.current_user_can_access_agenda()
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

create or replace function public.current_user_can_manage_agenda()
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

revoke all on function public.current_user_can_access_agenda() from public, anon;
revoke all on function public.current_user_can_manage_agenda() from public, anon;
grant execute on function public.current_user_can_access_agenda() to authenticated;
grant execute on function public.current_user_can_manage_agenda() to authenticated;

alter table public.agendamentos enable row level security;

create policy agendamentos_select_authorized
on public.agendamentos for select to authenticated
using (deleted_at is null and (select public.current_user_can_access_agenda()));

create policy agendamentos_insert_authorized
on public.agendamentos for insert to authenticated
with check (
  (select public.current_user_can_manage_agenda())
  and created_by = (select auth.uid())
);

create policy agendamentos_update_authorized
on public.agendamentos for update to authenticated
using (deleted_at is null and (select public.current_user_can_manage_agenda()))
with check ((select public.current_user_can_manage_agenda()));

revoke all on table public.agendamentos from anon;
grant select, insert, update on table public.agendamentos to authenticated;

-- --- Conflitos: o que realmente evita problema no balcao ------------------
--
-- Dois riscos diferentes, e o segundo e o que importa de verdade:
--
-- 1) "horario": o mesmo servidor com duas pessoas no mesmo intervalo. Erro de
--    agenda comum, gera espera e reclamacao.
--
-- 2) "confronto": vitima e autor do MESMO fato marcados em horarios que se
--    cruzam. Na pratica isso coloca os dois na mesma sala de espera — risco
--    de intimidacao e de novo fato ali dentro, especialmente em violencia
--    domestica. E aviso, nao bloqueio: em acareacao os dois se encontram de
--    proposito, entao quem decide e o servidor.

create or replace function public.agenda_conflitos(
  p_data_hora timestamptz,
  p_duracao_minutos integer default 30,
  p_responsavel_user_id uuid default null,
  p_numero_bo text default null,
  p_inquerito_id uuid default null,
  p_qualificacao text default null,
  p_ignorar_id uuid default null
)
returns table (
  tipo text,
  agendamento_id uuid,
  codigo text,
  pessoa_nome text,
  qualificacao text,
  data_hora timestamptz,
  responsavel_nome text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with janela as (
    select
      p_data_hora as inicio,
      p_data_hora + make_interval(mins => greatest(coalesce(p_duracao_minutos, 30), 5)) as fim
  ),
  candidatos as (
    select a.*
    from public.agendamentos a, janela j
    where a.deleted_at is null
      and a.status not in ('cancelado', 'remarcado')
      and (p_ignorar_id is null or a.id <> p_ignorar_id)
      and (a.data_hora, a.data_hora + make_interval(mins => a.duracao_minutos))
          overlaps (j.inicio, j.fim)
  )
  select
    'horario'::text, c.id, c.codigo, c.pessoa_nome, c.qualificacao,
    c.data_hora, c.responsavel_nome
  from candidatos c
  where p_responsavel_user_id is not null
    and c.responsavel_user_id = p_responsavel_user_id

  union all

  select
    'confronto'::text, c.id, c.codigo, c.pessoa_nome, c.qualificacao,
    c.data_hora, c.responsavel_nome
  from candidatos c
  where p_qualificacao is not null
    and (
      (p_numero_bo is not null and nullif(btrim(p_numero_bo), '') is not null
        and c.numero_bo = p_numero_bo)
      or (p_inquerito_id is not null and c.inquerito_id = p_inquerito_id)
    )
    and (
      (p_qualificacao in ('vitima', 'comunicante') and c.qualificacao = 'autor')
      or (p_qualificacao = 'autor' and c.qualificacao in ('vitima', 'comunicante'))
    );
$function$;

revoke all on function public.agenda_conflitos(
  timestamptz, integer, uuid, text, uuid, text, uuid
) from public, anon;
grant execute on function public.agenda_conflitos(
  timestamptz, integer, uuid, text, uuid, text, uuid
) to authenticated;

comment on function public.agenda_conflitos(
  timestamptz, integer, uuid, text, uuid, text, uuid
) is 'Choque de horario do mesmo servidor e encontro de vitima com autor do mesmo fato.';

-- --- Listagem por periodo --------------------------------------------------

create or replace function public.list_agendamentos_periodo(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_responsavel_user_id uuid default null,
  p_status text default null,
  p_search text default null,
  p_limit integer default 300
)
returns setof public.agendamentos
language sql
stable
security invoker
set search_path = ''
as $function$
  select a.*
  from public.agendamentos a
  where a.deleted_at is null
    and a.data_hora >= p_inicio
    and a.data_hora < p_fim
    and (p_responsavel_user_id is null or a.responsavel_user_id = p_responsavel_user_id)
    and (p_status is null or a.status = p_status)
    and (nullif(btrim(p_search), '') is null
      or a.search_text like '%' || public.normalize_agenda_search(p_search) || '%')
  order by a.data_hora asc, a.created_at asc
  limit least(greatest(coalesce(p_limit, 300), 1), 500);
$function$;

revoke all on function public.list_agendamentos_periodo(
  timestamptz, timestamptz, uuid, text, text, integer
) from public, anon;
grant execute on function public.list_agendamentos_periodo(
  timestamptz, timestamptz, uuid, text, text, integer
) to authenticated;

-- --- Lembrete de login -----------------------------------------------------
--
-- "Amanha voce marcou X pessoas": traz o que e do proprio usuario (marcado por
-- ele ou sob a responsabilidade dele) para hoje e amanha.

create or replace function public.meus_agendamentos_lembrete()
returns setof public.agendamentos
language sql
stable
security invoker
set search_path = ''
as $function$
  select a.*
  from public.agendamentos a
  where a.deleted_at is null
    and a.status in ('agendado', 'confirmado')
    and (a.created_by = (select auth.uid()) or a.responsavel_user_id = (select auth.uid()))
    and a.data_hora >= date_trunc('day', now())
    and a.data_hora < date_trunc('day', now()) + interval '2 days'
  order by a.data_hora asc
  limit 50;
$function$;

revoke all on function public.meus_agendamentos_lembrete() from public, anon;
grant execute on function public.meus_agendamentos_lembrete() to authenticated;

-- --- Indicadores -----------------------------------------------------------

create or replace function public.agenda_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with base as (
    select * from public.agendamentos where deleted_at is null
  ),
  ativos as (
    select * from base where status in ('agendado', 'confirmado')
  )
  select jsonb_build_object(
    'hoje', (
      select count(*) from ativos
      where data_hora >= date_trunc('day', now())
        and data_hora < date_trunc('day', now()) + interval '1 day'
    ),
    'amanha', (
      select count(*) from ativos
      where data_hora >= date_trunc('day', now()) + interval '1 day'
        and data_hora < date_trunc('day', now()) + interval '2 days'
    ),
    'semana', (
      select count(*) from ativos
      where data_hora >= date_trunc('day', now())
        and data_hora < date_trunc('day', now()) + interval '7 days'
    ),
    'intimacaoPendente', (
      select count(*) from ativos
      where intimacao_status = 'pendente' and data_hora >= now()
    ),
    'naoCompareceuMes', (
      select count(*) from base
      where status = 'nao_compareceu'
        and data_hora >= date_trunc('month', now())
    ),
    'porQualificacao', coalesce((
      select jsonb_object_agg(qualificacao, total)
      from (
        select qualificacao, count(*)::bigint as total
        from ativos
        where data_hora >= date_trunc('day', now())
          and data_hora < date_trunc('day', now()) + interval '7 days'
        group by qualificacao
      ) q
    ), '{}'::jsonb)
  );
$function$;

revoke all on function public.agenda_overview_stats() from public, anon;
grant execute on function public.agenda_overview_stats() to authenticated;

-- --- Exclusao logica -------------------------------------------------------

create or replace function public.soft_delete_agendamento(p_agendamento_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_deleted boolean;
begin
  if not (select public.current_user_can_manage_agenda()) then
    raise exception 'agenda_permission_denied' using errcode = '42501';
  end if;

  update public.agendamentos
  set deleted_at = now()
  where id = p_agendamento_id and deleted_at is null
  returning true into v_deleted;

  return coalesce(v_deleted, false);
end;
$function$;

revoke all on function public.soft_delete_agendamento(uuid) from public, anon;
grant execute on function public.soft_delete_agendamento(uuid) to authenticated;

-- --- Auditoria -------------------------------------------------------------

create or replace function private.audit_agendamento_row_change()
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
    raise exception 'agenda_audit_actor_required' using errcode = '42501';
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
    v_action, 'agenda', 'agendamento', v_entity_id,
    case v_action
      when 'create' then 'Agendou atendimento'
      when 'delete' then 'Excluiu agendamento'
      else 'Editou agendamento'
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'source', 'database_trigger',
      'operation', tg_op,
      'changed_fields', v_changed_fields,
      'codigo', coalesce(v_new_row ->> 'codigo', v_old_row ->> 'codigo'),
      'pessoa_nome', coalesce(v_new_row ->> 'pessoa_nome', v_old_row ->> 'pessoa_nome'),
      'data_hora', coalesce(v_new_row ->> 'data_hora', v_old_row ->> 'data_hora')
    )),
    case when tg_op = 'INSERT' then null else v_old_row - 'search_text' end,
    case when tg_op = 'DELETE' then null else v_new_row - 'search_text' end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.audit_agendamento_row_change()
from public, anon, authenticated, service_role;

drop trigger if exists audit_agendamento_changes on public.agendamentos;
create trigger audit_agendamento_changes
after insert or update or delete on public.agendamentos
for each row execute function private.audit_agendamento_row_change();
