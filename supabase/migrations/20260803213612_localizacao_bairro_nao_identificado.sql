-- Permite encerrar a revisao territorial quando o bairro nao pode ser
-- determinado com seguranca. O texto original do endereco e preservado,
-- mas ele nao entra nos totais oficiais de nenhum bairro.

alter table public.localizacao_enderecos
  add column if not exists bairro_revisado_em timestamptz,
  add column if not exists bairro_revisado_por uuid;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'localizacao_enderecos_bairro_revisado_por_fkey'
      and conrelid = 'public.localizacao_enderecos'::regclass
  ) then
    alter table public.localizacao_enderecos
      add constraint localizacao_enderecos_bairro_revisado_por_fkey
      foreign key (bairro_revisado_por) references public.profiles(id)
      on delete set null;
  end if;
end
$block$;

alter table public.localizacao_enderecos
  drop constraint if exists localizacao_enderecos_bairro_status_check;

alter table public.localizacao_enderecos
  add constraint localizacao_enderecos_bairro_status_check
  check (bairro_status in ('pendente', 'confirmado', 'nao_identificado'));

alter table public.localizacao_enderecos
  drop constraint if exists localizacao_enderecos_bairro_nao_identificado_check;

alter table public.localizacao_enderecos
  add constraint localizacao_enderecos_bairro_nao_identificado_check
  check (bairro_status <> 'nao_identificado' or bairro_id is null);

create index if not exists localizacao_enderecos_bairro_revisado_por_idx
  on public.localizacao_enderecos (bairro_revisado_por)
  where bairro_revisado_por is not null;

create or replace function private.sync_localizacao_endereco_bairro()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_bairro_nome text;
begin
  if new.bairro_status = 'nao_identificado' then
    new.bairro_id := null;
    new.bairro_confirmado_em := null;
    new.bairro_confirmado_por := null;
    if tg_op = 'INSERT'
      or new.bairro_status is distinct from old.bairro_status then
      new.bairro_revisado_em := now();
      new.bairro_revisado_por := auth.uid();
    end if;
    return new;
  end if;

  if new.bairro_id is null then
    new.bairro_status := 'pendente';
    new.bairro_confirmado_em := null;
    new.bairro_confirmado_por := null;
    new.bairro_revisado_em := null;
    new.bairro_revisado_por := null;
    return new;
  end if;

  select b.nome into v_bairro_nome
  from public.localizacao_bairros b
  where b.id = new.bairro_id and b.ativo;

  if v_bairro_nome is null then
    raise exception 'localizacao_bairro_invalido' using errcode = '23503';
  end if;

  new.bairro := v_bairro_nome;
  if new.bairro_status = 'confirmado' then
    if tg_op = 'INSERT'
      or new.bairro_id is distinct from old.bairro_id
      or new.bairro_status is distinct from old.bairro_status then
      new.bairro_confirmado_em := now();
      new.bairro_confirmado_por := auth.uid();
      new.bairro_revisado_em := now();
      new.bairro_revisado_por := auth.uid();
    end if;
  else
    new.bairro_confirmado_em := null;
    new.bairro_confirmado_por := null;
    new.bairro_revisado_em := null;
    new.bairro_revisado_por := null;
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_localizacao_endereco_bairro()
from public, anon, authenticated, service_role;

comment on column public.localizacao_enderecos.bairro_revisado_em is
  'Instante da decisao humana: bairro confirmado ou marcado como nao identificado.';
comment on column public.localizacao_enderecos.bairro_revisado_por is
  'Usuario que concluiu a revisao territorial do endereco.';
comment on column public.localizacao_enderecos.bairro_status is
  'Pendente ate revisao humana; confirmado vincula ao catalogo e nao_identificado encerra sem vinculo territorial.';
