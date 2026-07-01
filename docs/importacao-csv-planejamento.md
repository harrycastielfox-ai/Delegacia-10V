# Planejamento de importação CSV (futuro)

> Nesta etapa, **a importação CSV não será implementada**. Este documento define apenas o mapeamento esperado.

## Inquéritos (tabela `public.inqueritos`)

Colunas recomendadas no CSV:

- codigo_interno
- numero_ppe
- numero_fisico
- numero_bo
- tipo
- tipificacao
- gravidade
- prioridade
- situacao
- status_diligencias
- data_fato
- data_instauracao
- prazo
- bairro
- vitima
- investigado
- reu_preso
- elucidado
- houve_arma_fogo
- arma_utilizada
- faccao
- nome_faccao
- equipe
- escrivao
- relatorio_enviado
- data_envio_relatorio
- medida_protetiva
- numero_processo_medida
- observacoes

## Representações (tabela `public.representacoes`)

Colunas recomendadas no CSV:

- codigo_interno
- inquerito_id
- numero_ppe
- processo_judicial
- tipo
- data_representacao
- responsavel
- vitima
- investigado
- autor_preso
- resumo_fatos
- fundamentacao
- objetivo
- diligencias_relacionadas
- status
- data_envio_judiciario
- data_decisao_judicial
- observacoes_decisao
- data_cumprimento
- equipe_cumprimento
- resultado_cumprimento
- observacoes_cumprimento
- prioridade_operacional
- pedido_sigiloso
- observacoes_internas

## Relação CSV -> tabelas

- Cada coluna deve ter o mesmo nome do campo destino para facilitar importação em lote.
- Datas devem vir no formato `YYYY-MM-DD`.
- Registros com `deleted_at` não serão importados por CSV (campo controlado internamente).
