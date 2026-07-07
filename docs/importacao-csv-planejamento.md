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

## Roadmap - Planilha DRT como massa de teste

Fonte planejada:

- Pasta local: `C:\Users\PCIVIL\Downloads\PLANILHA PARA O SITE SIPI`
- Arquivo principal: `Cópia de Controle de Procedimentos e Representações.xlsx`
- Versoes auxiliares: CSV e TSV da aba `Controle de Inqueritos`
- Link de referencia informado: Google Sheets compartilhado pelo usuario

Objetivo:

- Usar a planilha DRT como base realista de testes para validar o SIPI.
- Nao copiar a planilha como interface, arquitetura ou regra definitiva.
- Transformar os dados historicos em registros de teste controlados para conferir Dashboard, Central de Pendencias, CVLI, Representacoes, Localidades, Equipes e Ranking.

Dados identificados na leitura inicial:

- Aba `Controle de Inqueritos`: cerca de 750 linhas e 31 colunas.
- Aba `Representacoes Judiciais`: cerca de 12 linhas e 20 colunas.
- Abas auxiliares de Dashboard, CVLI, estatisticas, elucidacoes por equipe e carga de trabalho.

Etapas recomendadas:

1. Criar importador em modo `dry-run`, sem gravar no Supabase.
2. Ler a planilha local e gerar pre-visualizacao em JSON/CSV normalizado.
3. Mapear colunas da planilha para `public.inqueritos` e `public.representacoes`.
4. Identificar repeticoes por `numero_ppe`, `codigo_interno` e processos judiciais sem excluir automaticamente.
5. Normalizar datas, valores booleanos, aliases de tipo, prioridade, gravidade e status.
6. Importar primeiro uma amostra pequena, entre 20 e 50 registros.
7. Validar visualmente no site: Dashboard, Alertas, Inqueritos, Representacoes, Localidades e CVLI.
8. Somente depois considerar importacao completa.

Regras de seguranca:

- Nao importar direto os 750 registros sem pre-visualizacao.
- Nao executar SQL automaticamente.
- Nao sobrescrever registros existentes sem estrategia de conciliacao.
- Nao tratar `numero_ppe` repetido como duplicidade automatica: a planilha pode ter PPE repetido por casos restaurados, desmembrados, vinculados ou operacionalmente parecidos.
- Nao tratar dados derivados da planilha como regra institucional definitiva.
- Respeitar RLS e permissoes do Supabase em qualquer validacao real.

Campos de atencao:

- `RELATORIO ENVIADO?` e `DATA ENVIO RELATORIO` devem ser tratados com cuidado para nao confundir relatorio produzido, relatorio enviado e conclusao.
- `GRAVIDADE`, `TIPIFICACAO`, `TIPO`, `REU PRESO?`, `MEDIDA PROTETIVA?`, `Equipe responsavel` e `ESCRIVAO` ainda podem conter texto livre ou aliases.
- `BAIRRO/DISTRITO` deve alimentar testes de localidade, mas futuramente precisa de normalizacao.
- `numero_ppe` repetido deve gerar grupo de revisao no dry-run, exibindo datas, tipo, vitima, investigado e status para decisao humana.
- Representacoes vinculadas por PPE devem ser conferidas antes de criar relacao com inqueritos, especialmente quando houver mais de um inquerito com o mesmo PPE.

Resultado esperado:

- Uma importacao de teste auditavel, reversivel e conferivel.
- Dados suficientes para testar indicadores reais do SIPI sem depender de mocks.
- Base para evoluir o contrato oficial de campos operacionais.
