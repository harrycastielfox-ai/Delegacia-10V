-- O lembrete de login deixou de ser pessoal ("o que EU marquei") e passou a
-- mostrar a agenda de hoje da unidade inteira ("o que cada um marcou"). A
-- tela usa list_agendamentos_periodo (já existente, sem filtro de
-- responsável) para isso. Esta função não tem mais nenhum uso.

drop function if exists public.meus_agendamentos_lembrete();
