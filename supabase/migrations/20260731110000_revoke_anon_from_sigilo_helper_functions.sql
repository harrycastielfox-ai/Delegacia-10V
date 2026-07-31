-- Achado durante a auditoria de seguranca: as funcoes auxiliares de sigilo
-- tinham EXECUTE concedido a anon, mesmo apos "revoke all ... from public"
-- nas migrations que as criaram. O projeto tem algum mecanismo (privilegio
-- padrao de schema) que concede EXECUTE em funcao nova a anon/authenticated
-- independente do "from public". "revoke ... from public" nao alcanca um
-- grant direto a anon, entao precisa ser revogado explicitamente.
--
-- Risco pratico observado: baixo. representacao_is_sigilosa e
-- inquerito_is_sigiloso sao funcoes puras de comparacao de texto, sem
-- consulta a tabela nenhuma. current_user_can_access_inqueritos_sigilosos
-- consulta profiles usando auth.uid(), que e null para anon, entao sempre
-- retorna false para chamador anonimo - nao vaza dado de outro usuario.
-- Mesmo assim, nenhuma dessas funcoes precisa ser chamavel por anon, entao
-- fechamos o acesso por consistencia e principio do menor privilegio.

revoke all on function public.representacao_is_sigilosa(text) from anon;
revoke all on function public.inquerito_is_sigiloso(text) from anon;
revoke all on function public.current_user_can_access_inqueritos_sigilosos() from anon;

-- Confirma que authenticated continua com acesso (sem efeito se ja tinha).
grant execute on function public.representacao_is_sigilosa(text) to authenticated;
grant execute on function public.inquerito_is_sigiloso(text) to authenticated;
grant execute on function public.current_user_can_access_inqueritos_sigilosos() to authenticated;
