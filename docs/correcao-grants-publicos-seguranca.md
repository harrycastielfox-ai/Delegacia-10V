# Correção de Grants Públicos — Segurança

## Contexto

Na revisão final de segurança/RLS foram encontrados grants diretos antigos para `anon` e permissões de escrita direta desnecessárias em tabelas sensíveis.

As tabelas tinham RLS ativa, mas manter grants amplos no nível da tabela aumentava ruído operacional e risco futuro caso alguma policy fosse alterada incorretamente.

## Correção aplicada no Supabase

Foi aplicado manualmente no Supabase:

```sql
revoke all on table public.profiles from anon;
revoke all on table public.auditoria from anon;
revoke insert, update, delete on table public.profiles from authenticated;
revoke insert, update, delete on table public.auditoria from authenticated;
```

## Motivo

- `profiles` deve ser lida diretamente apenas pelo usuário autenticado conforme RLS.
- Alterações de perfil devem passar por RPCs seguras, como `update_own_name`, `update_own_phone`, `update_own_avatar` e funções administrativas.
- `auditoria` deve ser consumida por RPCs próprias, como `list_auditoria`, `list_auditoria_by_user` e `list_auditoria_for_admin_user`.
- Usuário anônimo não precisa de acesso direto às tabelas `profiles` e `auditoria`.

## Validação realizada

Teste anônimo:

- `profiles`: `permission denied`
- `auditoria`: `permission denied`
- `inqueritos`: `permission denied`
- `representacoes`: `permission denied`

Teste autenticado como admin:

- leitura do próprio perfil: funcionando;
- leitura de `inqueritos`: funcionando;
- leitura de `representacoes`: funcionando;
- RPC `list_auditoria`: funcionando;
- RPC `list_profiles_for_admin`: funcionando.

## Próximo passo recomendado

Quando a CLI do Supabase estiver disponível no ambiente local, consolidar esta correção em migration oficial de segurança para reproduzir o estado em outros ambientes.
