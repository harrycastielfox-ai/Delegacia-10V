# Correção de Grants RLS — Representações

## Contexto

Durante a auditoria real dos números do SIPI, usando login autenticado comum do sistema, as consultas de `representacoes` falharam por falta de permissão de execução em helpers usados pelas policies de RLS.

Erros observados:

- `permission denied for function current_user_can_access_representacoes`
- `permission denied for function current_user_can_access_representacoes_sigilosas`

## Correção aplicada no Supabase

Foi aplicado manualmente no Supabase:

```sql
grant execute on function public.current_user_can_access_representacoes() to authenticated;
grant execute on function public.current_user_can_access_representacoes_sigilosas() to authenticated;
```

## Motivo

As policies de RLS de `public.representacoes` chamam essas funções para decidir acesso. Quando o papel `authenticated` não tem `EXECUTE`, a consulta falha antes mesmo de avaliar a regra de acesso.

## Estado local

O arquivo `docs/proposta-rls-representacoes-sigilosas.sql` já documenta os grants corretos, mas ainda não existe migration local consolidada para essa correção.

A CLI do Supabase não estava disponível no ambiente local no momento da auditoria, então nenhuma migration foi criada automaticamente.

## Próximo passo recomendado

Quando a CLI do Supabase estiver disponível, gerar uma migration oficial contendo apenas os grants acima, ou consolidar essa correção na próxima migration de segurança/RLS de Representações.

## Validação realizada

Após aplicar os grants, a consulta autenticada em:

- `public.inqueritos`
- `public.representacoes`

voltou a executar sem erro de permissão.
