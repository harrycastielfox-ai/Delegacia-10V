-- Pessoas adicionais vinculadas a representações.
-- Os campos legados representacoes.vitima e representacoes.investigado permanecem intactos.

create table if not exists public.representacao_pessoas (
  id uuid primary key default gen_random_uuid(),
  representacao_id uuid not null references public.representacoes(id) on delete cascade,
  papel text not null check (
    papel in ('vitima', 'investigado_representado', 'testemunha', 'outro')
  ),
  nome text not null check (btrim(nome) <> ''),
  observacao text null,
  ordem integer not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.representacao_pessoas is
  'Pessoas adicionais da representação, sem duplicar os campos legados de vítima e investigado.';

create index if not exists representacao_pessoas_representacao_ordem_idx
  on public.representacao_pessoas (representacao_id, ordem, created_at);

alter table public.representacao_pessoas enable row level security;

drop policy if exists representacao_pessoas_select_parent_access
  on public.representacao_pessoas;

create policy representacao_pessoas_select_parent_access
  on public.representacao_pessoas
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.representacoes as representacao
      where representacao.id = representacao_pessoas.representacao_id
        and representacao.deleted_at is null
    )
  );

create or replace function public.replace_representacao_pessoas(
  p_representacao_id uuid,
  p_pessoas jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_sigiloso text;
  v_pessoa jsonb;
  v_ordem integer := 0;
  v_papel text;
  v_nome text;
  v_observacao text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select representacao.pedido_sigiloso
    into v_pedido_sigiloso
  from public.representacoes as representacao
  where representacao.id = p_representacao_id
    and representacao.deleted_at is null;

  if not found then
    raise exception 'Representação não encontrada.' using errcode = 'P0002';
  end if;

  if public.representacao_is_sigilosa(v_pedido_sigiloso) then
    if not public.current_user_can_access_representacoes_sigilosas() then
      raise exception 'Sem permissão para alterar pessoas de representação sigilosa.'
        using errcode = '42501';
    end if;
  elsif not public.current_user_can_access_representacoes() then
    raise exception 'Sem permissão para alterar pessoas da representação.'
      using errcode = '42501';
  end if;

  if p_pessoas is null or jsonb_typeof(p_pessoas) <> 'array' then
    raise exception 'A lista de pessoas deve ser um array JSON.' using errcode = '22023';
  end if;

  delete from public.representacao_pessoas
  where representacao_id = p_representacao_id;

  for v_pessoa in select value from jsonb_array_elements(p_pessoas)
  loop
    v_papel := coalesce(v_pessoa ->> 'papel', 'outro');
    v_nome := btrim(coalesce(v_pessoa ->> 'nome', ''));
    v_observacao := nullif(btrim(coalesce(v_pessoa ->> 'observacao', '')), '');

    if v_papel not in ('vitima', 'investigado_representado', 'testemunha', 'outro') then
      raise exception 'Papel de pessoa inválido: %', v_papel using errcode = '22023';
    end if;

    if v_nome = '' then
      continue;
    end if;

    insert into public.representacao_pessoas (
      representacao_id,
      papel,
      nome,
      observacao,
      ordem
    ) values (
      p_representacao_id,
      v_papel,
      v_nome,
      v_observacao,
      v_ordem
    );

    v_ordem := v_ordem + 1;
  end loop;
end;
$$;

revoke all on table public.representacao_pessoas from public, anon, authenticated;
grant select on table public.representacao_pessoas to authenticated;

revoke all on function public.replace_representacao_pessoas(uuid, jsonb)
  from public, anon;
grant execute on function public.replace_representacao_pessoas(uuid, jsonb)
  to authenticated;
