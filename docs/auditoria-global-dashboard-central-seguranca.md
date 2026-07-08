# Auditoria Global - Dashboard, Central e Seguranca

Data: 2026-07-08

## Objetivo

Registrar a auditoria tecnica executada sobre os indicadores principais do Dashboard, Central Operacional de Pendencias e superficie de seguranca Supabase.

## Correcoes aplicadas

### Filtros de prazo do Dashboard

Os cards e linhas de prazo do Dashboard calculam `Prazo critico`, `Prazo vencido` e `Vencendo em 7 dias` apenas sobre inqueritos ainda ativos, isto e, sem relatorio enviado.

Antes, alguns cliques navegavam para `/inqueritos` enviando somente:

- `prazo=critico`
- `prazo=vencido`
- `prazo=vencendo`

Isso podia abrir uma lista com contrato diferente do contador.

Agora os destinos de prazo tambem enviam:

- `status=em_andamento`

Assim, a tela destino usa a mesma base operacional do contador.

## Contrato operacional consolidado

### Concluido

Regra atual:

- `relatorio_enviado` verdadeiro; ou
- `data_envio_relatorio` preenchida.

Classificacao:

- aproximado ate existir `relatorio_status`.

### Relatorio enviado

Regra preferencial:

- `data_envio_relatorio` preenchida.

Regra secundaria:

- `relatorio_enviado` verdadeiro.

Classificacao:

- real quando baseado em data;
- aproximado quando baseado apenas em flag textual.

### Em andamento

Regra atual:

- inquerito ativo sem relatorio enviado.

### CVLI

Regra atual:

- campo formal de categoria/gravidade quando disponivel;
- ou heuristica por texto em tipificacao, tipo, motivacao e observacoes.

Classificacao:

- heuristico ate `categoria_criminal` ser normalizada.

### CVLI elucidado

Regra atual:

- CVLI com `elucidado` em valor positivo.

Importante:

- um mesmo caso CVLI conta como 1 registro;
- se estiver elucidado, tambem conta como 1 elucidado;
- elucidado e subconjunto de registros, nao alternativa.

### Prazo critico

Regra atual:

- data limite entre hoje e os proximos 3 dias;
- exclui vencidos;
- nos cards de inquerito, considera somente casos em andamento.

## Padronizacao pendente

Os seguintes campos continuam recomendados para estabilizar os numeros:

- `tipo_procedimento_normalizado`
- `categoria_criminal`
- `relatorio_status`
- `data_relatorio`
- `cvli_elucidado`
- `data_elucidacao`
- `reu_preso_normalizado`
- `medida_protetiva_normalizada`
- `prioridade_operacional`
- `equipe_responsavel`
- `escrivao_responsavel_id`

A proposta SQL revisavel esta em:

- `docs/proposta-padronizacao-campos-operacionais.sql`

## Seguranca Supabase

### Verificacao RLS

As tabelas principais verificadas possuem RLS ativo:

- `public.inqueritos`
- `public.representacoes`
- `public.profiles`
- `public.auditoria`

### Correcoes de grants

Foram revogados grants publicos/anonimos de funcoes `SECURITY DEFINER` sensiveis.

Mantido acesso autenticado apenas para RPCs chamadas pelo frontend:

- `admin_update_user_access`
- `admin_update_user_function`
- `list_profiles_for_admin`
- `list_auditoria`
- `list_auditoria_by_user`
- `list_auditoria_for_admin_user`
- `list_escrivao_productivity`
- `log_auditoria`
- `update_own_avatar`
- `update_own_name`
- `update_own_phone`

Excecao mantida:

- `resolve_login_to_email` continua executavel por `anon`, porque login por usuario precisa resolver o e-mail antes da sessao existir.

### Validacao

Foi validado:

- login por `ADMIN`;
- chamada autenticada de `list_profiles_for_admin`;
- chamada autenticada de `list_auditoria`.

## Riscos restantes

- Alguns indicadores ainda dependem de texto livre.
- Produtividade/ranking depende de eventos auditados consistentes.
- Advisors ainda podem apontar funcoes `SECURITY DEFINER` acessiveis por `authenticated`; isso e esperado para RPCs publicas autenticadas, mas cada funcao deve manter checagem interna de permissao.
- Bucket publico de avatar permite listagem ampla e merece revisao futura de policy.
- `private.productivity_events` possui RLS sem policy; se for acessado somente por funcoes privilegiadas, pode ser aceitavel, mas deve ser documentado no contrato de ranking.

## Proximos passos

1. Aplicar a padronizacao de campos em etapa controlada.
2. Migrar Dashboard e Central para consumir campos normalizados quando existirem.
3. Criar teste operacional de contagem para cada indicador clicavel.
4. Revisar policies de storage do bucket `profile-avatars`.
5. Revisar advisors restantes e separar o que e risco real do que e warning esperado.
