-- Painel territorial carregado somente quando um bairro e selecionado no mapa.
-- SECURITY INVOKER preserva as politicas RLS das tabelas consultadas.
create or replace function public.localizacao_bairro_painel(p_bairro_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce(
    (
      select jsonb_build_object(
        'bairro_id', b.id,
        'bairro_nome', b.nome,
        'enderecos_total', (
          select count(*)
          from public.localizacao_enderecos e
          where e.bairro_id = b.id
            and e.deleted_at is null
        ),
        'enderecos_posicionados', (
          select count(*)
          from public.localizacao_enderecos e
          where e.bairro_id = b.id
            and e.deleted_at is null
            and e.latitude is not null
            and e.longitude is not null
        ),
        'pessoas_total', (
          select count(*)
          from public.localizacao_pessoas p
          join public.localizacao_enderecos e on e.id = p.endereco_id
          where e.bairro_id = b.id
            and e.deleted_at is null
            and p.deleted_at is null
        ),
        'diligencias_ativas', (
          select count(*)
          from public.localizacao_diligencias d
          left join public.localizacao_pessoas p
            on p.id = d.pessoa_id
           and p.deleted_at is null
          join public.localizacao_enderecos e
            on e.id = coalesce(d.endereco_id, p.endereco_id)
           and e.deleted_at is null
          where e.bairro_id = b.id
            and d.deleted_at is null
            and d.status not in ('concluida', 'cancelada')
        ),
        'enderecos', coalesce(
          (
            select jsonb_agg(to_jsonb(address_rows) order by address_rows.logradouro, address_rows.numero)
            from (
              select
                e.id,
                e.logradouro,
                e.numero,
                e.sem_numero,
                e.bairro,
                e.bairro_id,
                e.bairro_status,
                e.municipio,
                e.uf,
                e.latitude,
                e.longitude,
                e.maps_url
              from public.localizacao_enderecos e
              where e.bairro_id = b.id
                and e.deleted_at is null
              order by e.logradouro, e.numero nulls last
              limit 12
            ) address_rows
          ),
          '[]'::jsonb
        ),
        'pessoas', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', person_rows.id,
                'nome', person_rows.nome,
                'apelido', person_rows.apelido,
                'foto_perfil_path', person_rows.foto_perfil_path,
                'vinculo', person_rows.vinculo,
                'endereco', jsonb_build_object(
                  'id', person_rows.endereco_id,
                  'logradouro', person_rows.logradouro,
                  'numero', person_rows.numero,
                  'sem_numero', person_rows.sem_numero,
                  'bairro', person_rows.bairro,
                  'bairro_id', person_rows.bairro_id,
                  'bairro_status', person_rows.bairro_status,
                  'municipio', person_rows.municipio,
                  'uf', person_rows.uf,
                  'latitude', person_rows.latitude,
                  'longitude', person_rows.longitude,
                  'maps_url', person_rows.maps_url
                )
              )
              order by person_rows.nome
            )
            from (
              select
                p.id,
                p.nome,
                p.apelido,
                p.foto_perfil_path,
                p.vinculo,
                e.id as endereco_id,
                e.logradouro,
                e.numero,
                e.sem_numero,
                e.bairro,
                e.bairro_id,
                e.bairro_status,
                e.municipio,
                e.uf,
                e.latitude,
                e.longitude,
                e.maps_url
              from public.localizacao_pessoas p
              join public.localizacao_enderecos e on e.id = p.endereco_id
              where e.bairro_id = b.id
                and e.deleted_at is null
                and p.deleted_at is null
              order by p.nome
              limit 20
            ) person_rows
          ),
          '[]'::jsonb
        ),
        'diligencias', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', diligence_rows.id,
                'codigo', diligence_rows.codigo,
                'status', diligence_rows.status,
                'equipe_nome', diligence_rows.equipe_nome,
                'agendada_para', diligence_rows.agendada_para,
                'destino', diligence_rows.destino
              )
              order by diligence_rows.updated_at desc
            )
            from (
              select
                d.id,
                d.codigo,
                d.status,
                d.equipe_nome,
                d.agendada_para,
                d.updated_at,
                concat_ws(
                  ', ',
                  e.logradouro,
                  case when e.sem_numero then 's/n' else coalesce(e.numero, 's/n') end
                ) as destino
              from public.localizacao_diligencias d
              left join public.localizacao_pessoas p
                on p.id = d.pessoa_id
               and p.deleted_at is null
              join public.localizacao_enderecos e
                on e.id = coalesce(d.endereco_id, p.endereco_id)
               and e.deleted_at is null
              where e.bairro_id = b.id
                and d.deleted_at is null
                and d.status not in ('concluida', 'cancelada')
              order by d.updated_at desc
              limit 8
            ) diligence_rows
          ),
          '[]'::jsonb
        )
      )
      from public.localizacao_bairros b
      where b.id = p_bairro_id
        and b.ativo
    ),
    '{}'::jsonb
  );
$function$;

revoke all on function public.localizacao_bairro_painel(uuid)
from public, anon, authenticated;
grant execute on function public.localizacao_bairro_painel(uuid)
to authenticated, service_role;

comment on function public.localizacao_bairro_painel(uuid) is
  'Resumo territorial limitado e protegido por RLS, carregado sob demanda pelo mapa operacional.';
