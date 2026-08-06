-- Contato Operacional (ex-Localização Operacional) passa a ser restrito ao
-- cargo admin, a pedido explícito do usuário. Só trocar o texto na tela não
-- bastaria: sem isso, um usuário sipi_access ou delegado continuaria
-- conseguindo ler e escrever nas tabelas por baixo da UI. A trava real tem
-- de estar aqui, na função que toda a RLS do módulo usa.

create or replace function public.current_user_can_access_localizacao()
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
      and p.cargo = 'admin'
  );
$function$;
