# Aplicacao - Padronizacao de Campos Operacionais

Data: 2026-07-08

## Objetivo

Registrar a aplicacao controlada da proposta de padronizacao de campos operacionais no Supabase.

Esta etapa cria campos normalizados de transicao sem remover campos legados. O frontend ainda pode continuar usando os campos antigos enquanto os modulos passam a consumir os novos campos gradualmente.

## Campos criados em public.inqueritos

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

## Campos criados em public.representacoes

- `tipo_normalizado`
- `medida_protetiva_normalizada`
- `pedido_sigiloso_normalizado`
- `cumprimento_status`

## Campo ja existente confirmado

- `profiles.funcao_institucional`

## Constraints criadas ou confirmadas

- `inqueritos_tipo_procedimento_normalizado_check`
- `inqueritos_categoria_criminal_check`
- `inqueritos_relatorio_status_check`
- `inqueritos_prioridade_operacional_check`
- `representacoes_tipo_normalizado_check`
- `representacoes_cumprimento_status_check`
- `profiles_funcao_institucional_check`

As constraints novas foram aplicadas como `NOT VALID` para nao quebrar dados legados durante a transicao.

## Indices criados

- `inqueritos_tipo_norm_idx`
- `inqueritos_categoria_criminal_idx`
- `inqueritos_relatorio_status_idx`
- `inqueritos_escrivao_responsavel_idx`
- `representacoes_tipo_norm_idx`
- `representacoes_sigilo_norm_idx`

## Backfill conservador

Foi aplicado backfill apenas quando havia regra segura a partir de campos existentes:

- tipo de procedimento por alias de `tipo`;
- status de relatorio por `data_envio_relatorio`, `relatorio_enviado` e texto de situacao;
- `cvli_elucidado` por alias de `elucidado`;
- `reu_preso_normalizado` por alias de `reu_preso`;
- `medida_protetiva_normalizada` por alias/texto;
- `pedido_sigiloso_normalizado` por `pedido_sigiloso = 'Sim'` ou `null`;
- `cumprimento_status` por data/status/resultado de cumprimento.

## Estado atual do banco durante aplicacao

No momento da verificacao, `public.inqueritos` estava sem registros ativos. Portanto, o backfill de inqueritos preparou contrato e estrutura, mas nao alterou registros ativos.

## Proximos passos

1. Ajustar Dashboard e Central para priorizar campos normalizados quando existirem.
2. Manter heuristicas antigas apenas como fallback.
3. Reimportar ou cadastrar dados de teste e validar indicador por indicador.
4. Validar constraints em etapa futura, somente depois de saneamento completo.
5. Formalizar ranking com `escrivao_responsavel_id` e eventos auditaveis.
