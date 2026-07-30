-- Consolida em migration oficial as correcoes de grants ja aplicadas e
-- validadas manualmente em producao no Supabase.
--
-- Referencias:
--   docs/correcao-grants-publicos-seguranca.md
--   docs/correcao-grants-rls-representacoes.md

-- profiles/auditoria: leitura direta apenas via RLS para o usuario autenticado;
-- escrita apenas via RPCs seguras. anon nao precisa de acesso direto.
revoke all on table public.profiles from anon;
revoke all on table public.auditoria from anon;
revoke insert, update, delete on table public.profiles from authenticated;
revoke insert, update, delete on table public.auditoria from authenticated;

-- policies de RLS de representacoes dependem destas funcoes para decidir
-- acesso; sem EXECUTE para authenticated a consulta falhava antes mesmo de
-- avaliar a regra de acesso.
grant execute on function public.current_user_can_access_representacoes() to authenticated;
grant execute on function public.current_user_can_access_representacoes_sigilosas() to authenticated;
