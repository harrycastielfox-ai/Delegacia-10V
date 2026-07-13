-- SIPI - endurecimento final de grants e funcoes auxiliares.
-- Mantem o fluxo existente e remove caminhos diretos desnecessarios.

begin;

-- Contexto de acesso: somente usuarios autenticados podem registrar ou consultar.
revoke all on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision,
  double precision, text, boolean
) from public;
revoke execute on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision,
  double precision, text, boolean
) from anon;
grant execute on function public.register_own_access_context(
  text, text, text, text, text, text, text, double precision, double precision,
  double precision, text, boolean
) to authenticated;

revoke all on function public.get_latest_user_access_context(uuid) from public;
revoke execute on function public.get_latest_user_access_context(uuid) from anon;
grant execute on function public.get_latest_user_access_context(uuid) to authenticated;

-- Representacoes usam soft delete; DELETE direto nao faz parte do contrato.
revoke delete on table public.representacoes from authenticated;

-- Evita resolucao mutavel do search_path no trigger de updated_at.
alter function public.set_updated_at() set search_path = public;

commit;
