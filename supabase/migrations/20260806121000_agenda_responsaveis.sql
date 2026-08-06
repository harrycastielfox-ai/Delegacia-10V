-- Para marcar uma oitiva e preciso escolher quem vai conduzir. A tabela
-- profiles so deixa cada um ver o proprio cadastro (profiles_self_select), o
-- que e o certo — mas impede montar essa lista.
--
-- Em vez de afrouxar a RLS de profiles, esta funcao devolve apenas o minimo
-- necessario para o seletor: id, nome e funcao. Sem e-mail, sem login, sem
-- status. Nome e funcao de colega de unidade nao e dado sensivel — quem tem
-- acesso a agenda ja trabalha ao lado dessas pessoas.

create or replace function public.list_agenda_responsaveis()
returns table (
  id uuid,
  nome text,
  funcao_institucional text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id, p.nome, p.funcao_institucional
  from public.profiles p
  where (select public.current_user_can_access_agenda())
    and p.status_autorizacao = 'autorizado'
    and p.cargo <> 'membro'
  order by p.nome asc
  limit 200;
$function$;

revoke all on function public.list_agenda_responsaveis() from public, anon;
grant execute on function public.list_agenda_responsaveis() to authenticated;

comment on function public.list_agenda_responsaveis() is
  'Lista reduzida (id, nome, funcao) de servidores que podem conduzir um atendimento agendado.';
