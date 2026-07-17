-- Amplia o contrato de procedimentos e normaliza pessoas envolvidas em inquéritos.

alter table public.inqueritos
  drop constraint if exists inqueritos_tipo_procedimento_normalizado_check;

alter table public.inqueritos
  add constraint inqueritos_tipo_procedimento_normalizado_check
  check (
    tipo_procedimento_normalizado is null
    or tipo_procedimento_normalizado in ('IP', 'APF', 'TCO', 'BOC', 'AAFAI', 'AIAI', 'OUTROS')
  );

create table if not exists public.inquerito_pessoas (
  id uuid primary key default gen_random_uuid(),
  inquerito_id uuid not null references public.inqueritos(id) on delete cascade,
  papel text not null check (papel in ('vitima', 'autor_investigado', 'testemunha', 'outro')),
  nome text not null check (length(btrim(nome)) > 0),
  observacao text,
  ordem integer not null default 0 check (ordem >= 0),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquerito_pessoas_inquerito_id_idx
  on public.inquerito_pessoas (inquerito_id);

create index if not exists inquerito_pessoas_papel_ordem_idx
  on public.inquerito_pessoas (inquerito_id, papel, ordem);

alter table public.inquerito_pessoas enable row level security;

revoke all on table public.inquerito_pessoas from anon;
revoke all on table public.inquerito_pessoas from public;
grant select on table public.inquerito_pessoas to authenticated;

drop policy if exists inquerito_pessoas_select_authorized on public.inquerito_pessoas;
create policy inquerito_pessoas_select_authorized
on public.inquerito_pessoas
for select
to authenticated
using (
  public.current_user_can_access_inqueritos()
  and exists (
    select 1
    from public.inqueritos i
    where i.id = inquerito_pessoas.inquerito_id
      and i.deleted_at is null
  )
);

insert into public.inquerito_pessoas (inquerito_id, papel, nome, ordem, created_at, updated_at)
select i.id, 'vitima', btrim(i.vitima), 0, coalesce(i.created_at, now()), coalesce(i.updated_at, now())
from public.inqueritos i
where nullif(btrim(i.vitima), '') is not null
  and not exists (
    select 1
    from public.inquerito_pessoas p
    where p.inquerito_id = i.id and p.papel = 'vitima'
  );

insert into public.inquerito_pessoas (inquerito_id, papel, nome, ordem, created_at, updated_at)
select i.id, 'autor_investigado', btrim(i.investigado), 1, coalesce(i.created_at, now()), coalesce(i.updated_at, now())
from public.inqueritos i
where nullif(btrim(i.investigado), '') is not null
  and not exists (
    select 1
    from public.inquerito_pessoas p
    where p.inquerito_id = i.id and p.papel = 'autor_investigado'
  );

create or replace function public.replace_inquerito_pessoas(
  p_inquerito_id uuid,
  p_pessoas jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  if not public.current_user_can_access_inqueritos() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.inqueritos i
    where i.id = p_inquerito_id
      and i.deleted_at is null
  ) then
    raise exception 'Inquérito não encontrado' using errcode = 'P0002';
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
$$;

revoke all on function public.replace_inquerito_pessoas(uuid, jsonb) from public;
revoke all on function public.replace_inquerito_pessoas(uuid, jsonb) from anon;
grant execute on function public.replace_inquerito_pessoas(uuid, jsonb) to authenticated;

comment on table public.inquerito_pessoas is
  'Pessoas envolvidas em inquéritos, com múltiplos papéis por procedimento.';

comment on function public.replace_inquerito_pessoas(uuid, jsonb) is
  'Substitui atomicamente as pessoas de um inquérito acessível ao usuário autenticado.';
