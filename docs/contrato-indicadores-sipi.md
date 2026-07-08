# SIPI - Contrato Oficial de Indicadores Operacionais

Este documento registra a regra de produto para os principais indicadores do SIPI.

Objetivo: garantir que Dashboard, Central Operacional de Pendencias, Alertas, CVLI e Ranking de Escrivaes usem a mesma linguagem operacional.

Enquanto o banco ainda possuir campos de texto livre, alguns indicadores continuam classificados como aproximados ou heuristicos. Eles podem ser exibidos, mas nao devem ser tratados como estatistica oficial definitiva ate a padronizacao dos campos.

## Principios

- Dado real acima de painel bonito.
- Nenhum indicador inventado.
- Indicador aproximado deve ser identificado como aproximado.
- Indicador heuristico deve ser identificado como heuristico.
- Representacoes sigilosas dependem de RLS real e nao podem ser expostas por filtro visual.
- O usuario so deve ver numeros calculados sobre registros acessiveis pela RLS.
- O mesmo conceito deve ter a mesma regra em Dashboard, Central e listas destino.

## Fontes oficiais atuais

### Inqueritos

Fonte principal:

- `listInqueritos()`
- tabela `public.inqueritos`

Campos operacionais mais usados:

- `id`
- `numero_ppe`
- `tipo`
- `categoria_caso`
- `gravidade`
- `tipificacao`
- `motivacao`
- `situacao`
- `prazo`
- `data_fato`
- `data_instauracao`
- `created_at`
- `relatorio_enviado`
- `data_envio_relatorio`
- `elucidado`
- `reu_preso`
- `medida_protetiva`
- `equipe`
- `escrivao`
- `deleted_at`

### Representacoes

Fonte principal:

- `listRepresentacoes()`
- tabela `public.representacoes`

Campos operacionais mais usados:

- `id`
- `numero_ppe`
- `tipo`
- `status`
- `pedido_sigiloso`
- `data_representacao`
- `data_envio_judiciario`
- `data_deferimento`
- `data_vencimento`
- `data_cumprimento`
- `equipe_responsavel`
- `equipe_cumprimento`
- `resultado_cumprimento`
- `deleted_at`

### Auditoria e produtividade

Fonte atual:

- RPC `list_escrivao_productivity(p_days)`
- eventos operacionais derivados de acoes auditadas e/ou regras internas de produtividade

O ranking so deve considerar usuarios com funcao institucional `Escrivao(a)` quando essa funcao estiver formalmente registrada e administravel.

## Classificacao de confiabilidade

### REAL

Indicador baseado em campo direto e objetivo, sem interpretacao textual relevante.

Exemplo: `data_envio_relatorio` preenchida dentro de um periodo.

### APROXIMADO

Indicador baseado em campos reais, mas cuja definicao operacional ainda mistura conceitos proximos.

Exemplo: considerar conclusao a partir de `relatorio_enviado` ou `data_envio_relatorio`.

### HEURISTICO

Indicador derivado de texto livre, aliases, palavras-chave ou valores nao normalizados.

Exemplo: detectar CVLI por `gravidade`, `tipificacao`, `tipo` ou `motivacao` contendo termos como `homicidio`.

### PENDENTE DE PADRONIZACAO

Indicador desejado pelo produto, mas ainda sem campo oficial suficiente para ser usado como estatistica definitiva.

## Contratos dos indicadores

## Total de procedimentos

Definicao oficial:

- total de inqueritos ativos acessiveis ao usuario atual.

Regra atual:

- contar registros retornados por `listInqueritos()`;
- ignorar `deleted_at` conforme repository/RLS.

Classificacao:

- REAL para inqueritos.

Observacao:

- nao deve somar representacoes, salvo quando o painel declarar explicitamente que o total e de pendencias ou registros mistos.

## Concluido

Definicao de produto:

- procedimento com fluxo operacional finalizado para efeito de acompanhamento da unidade.

Regra atual:

- considerar concluido quando houver `relatorio_enviado` verdadeiro;
- ou `data_envio_relatorio` preenchida.

Campos atuais:

- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- APROXIMADO

Risco:

- concluir, relatar e enviar relatorio nao sao exatamente a mesma coisa.

Contrato futuro recomendado:

- criar campo controlado `relatorio_status` com valores:
  - `pendente`
  - `relatado`
  - `enviado`
- opcionalmente criar `procedimento_status_operacional` para separar andamento do relatorio.

## Relatorio enviado

Definicao de produto:

- relatorio produzido e formalmente enviado/registrado como remetido.

Regra atual preferencial:

- `data_envio_relatorio` preenchida.

Regra atual secundaria:

- `relatorio_enviado` verdadeiro, quando `data_envio_relatorio` ainda nao existir.

Campos atuais:

- `inqueritos.data_envio_relatorio`
- `inqueritos.relatorio_enviado`

Classificacao:

- REAL quando baseado em `data_envio_relatorio`;
- APROXIMADO quando baseado somente em `relatorio_enviado`.

Contrato futuro recomendado:

- `relatorio_status = enviado`;
- `data_envio_relatorio` obrigatoria quando status for `enviado`.

## Relatado e nao enviado

Definicao de produto:

- procedimento cujo relatorio foi produzido, mas ainda nao foi formalmente enviado.

Regra atual:

- detectar texto de situacao contendo `relat`;
- e `data_envio_relatorio` ausente;
- e `relatorio_enviado` nao verdadeiro.

Campos atuais:

- `inqueritos.situacao`
- `inqueritos.status_diligencias`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- APROXIMADO

Risco:

- texto livre pode marcar como relatado algo que nao representa relatorio pronto.

Contrato futuro recomendado:

- `relatorio_status = relatado`;
- `data_relatorio` separada de `data_envio_relatorio`.

## Em andamento

Definicao de produto:

- procedimento ativo ainda nao concluido/enviado.

Regra atual:

- procedimento ativo sem relatorio enviado.

Campos atuais:

- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`
- `inqueritos.deleted_at`

Classificacao:

- APROXIMADO

Contrato futuro recomendado:

- `procedimento_status_operacional = em_andamento`;
- ou status derivado oficialmente de `relatorio_status != enviado`.

## CVLI - registro

Definicao de produto:

- cada inquerito classificado como CVLI conta como 1 registro de CVLI.

Regra atual:

- classificar como CVLI quando categoria formal ou textos operacionais indiquem:
  - `CVLI`
  - `Homicidio`
  - `Latrocinio`
  - `Feminicidio`

Campos atuais:

- `inqueritos.categoria_caso`
- `inqueritos.gravidade`
- `inqueritos.tipificacao`
- `inqueritos.classificacao`
- `inqueritos.tipo_penal`
- `inqueritos.tipo`
- `inqueritos.motivacao`
- `inqueritos.observacoes`

Data de referencia atual:

1. `data_fato`
2. `data_instauracao`
3. `created_at`

Classificacao:

- HEURISTICO ate `categoria_caso` ser obrigatoria e normalizada.

Contrato futuro recomendado:

- `categoria_criminal = CVLI`;
- `data_fato` obrigatoria para comparativos historicos de CVLI.

## CVLI - elucidado

Definicao de produto:

- CVLI com autoria definida/elucidacao registrada.

Regra atual:

- CVLI com `elucidado` em valor positivo (`sim`, `true`, `1`, etc.).

Campos atuais:

- `inqueritos.elucidado`

Classificacao:

- APROXIMADO, pois o campo ainda aceita texto/alias.

Regra importante:

- um CVLI registrado tambem pode ser elucidado.
- Portanto, no comparativo mensal, o mesmo caso pode contar 1 em `Registros` e 1 em `Elucidados`.
- `Elucidados` nunca deve ser interpretado como alternativa a `Registros`; ele e um subconjunto dos registros.

Contrato futuro recomendado:

- `cvli_elucidado boolean not null default false`;
- opcionalmente `data_elucidacao`.

## Taxa de elucidação CVLI

Definicao:

- percentual de CVLIs elucidados sobre CVLIs registrados.

Formula:

- `elucidados / registros * 100`

Regra de divisao por zero:

- se `registros = 0`, taxa deve ser `0%`.

Classificacao:

- APROXIMADO ate CVLI e elucidacao serem campos normalizados.

## Prazo vencido

Definicao:

- procedimento ou representacao com data limite anterior ao dia atual e ainda nao concluido/cumprido.

Regra atual para inqueritos:

- `prazo` < hoje.

Regra atual para representacoes:

- `data_vencimento` < hoje;
- e representacao nao cumprida.

Campos atuais:

- `inqueritos.prazo`
- `representacoes.data_vencimento`
- `representacoes.data_cumprimento`
- `representacoes.status`
- `representacoes.resultado_cumprimento`

Classificacao:

- REAL quando a data existe e esta padronizada;
- APROXIMADO quando depende de status textual para saber se foi cumprido.

## Prazo critico

Definicao de produto:

- caso que vence em ate 3 dias, excluindo casos ja vencidos.
- em cards operacionais de inqueritos, deve considerar apenas procedimentos ainda ativos/sem relatorio enviado.

Regra atual:

- dias restantes entre 0 e 3.
- quando o indicador navegar para `/inqueritos`, enviar tambem `status=em_andamento` para a lista destino usar a mesma base do contador.

Campos atuais:

- `inqueritos.prazo`
- `representacoes.data_vencimento`

Classificacao:

- REAL para o calculo de data;
- APROXIMADO quando precisa saber se a representacao ja foi cumprida por texto.

Contrato futuro recomendado:

- manter data limite normalizada;
- adicionar status operacional controlado para encerramento/cumprimento.

## Vencendo em 7 dias

Definicao:

- caso com vencimento entre hoje e os proximos 7 dias.

Regra atual:

- dias restantes entre 0 e 7.

Classificacao:

- REAL para a data;
- APROXIMADO para exclusao de cumpridos quando depender de texto.

## Prioridade alta

Definicao de produto:

- caso que exige acompanhamento imediato pela chefia.

Regra atual:

- `prioridade` textual indicando alta/urgente;
- ou reu preso;
- ou medida protetiva;
- ou categoria critica;
- ou prazo vencido.

Campos atuais:

- `inqueritos.prioridade`
- `inqueritos.reu_preso`
- `inqueritos.medida_protetiva`
- `inqueritos.categoria_caso`
- `inqueritos.gravidade`
- `inqueritos.prazo`

Classificacao:

- HEURISTICO

Contrato futuro recomendado:

- `prioridade_operacional` controlada:
  - `baixa`
  - `media`
  - `alta`
  - `urgente`
- manter campo calculado ou historico de motivo da prioridade.

## Reu preso

Definicao:

- procedimento vinculado a pessoa custodiada/presa.

Regra atual:

- aceitar valores textuais positivos em `reu_preso`.

Campos atuais:

- `inqueritos.reu_preso`

Classificacao:

- HEURISTICO

Contrato futuro recomendado:

- `reu_preso boolean not null default false`.

## Medida protetiva

Definicao:

- procedimento ou representacao vinculado a medida protetiva ativa ou representada.

Regra atual:

- aceitar valores positivos em `medida_protetiva`;
- ou detectar texto relacionado a protetiva.

Campos atuais:

- `inqueritos.medida_protetiva`
- `inqueritos.tipo`
- `inqueritos.tipificacao`
- `representacoes.tipo`

Classificacao:

- HEURISTICO

Contrato futuro recomendado:

- `medida_protetiva boolean not null default false`;
- em representacoes, `tipo_normalizado = medida_protetiva`.

## Representacao sigilosa

Definicao:

- representacao marcada com pedido de sigilo.

Regra atual aprovada:

- `pedido_sigiloso = 'Sim'` indica sigilosa;
- `pedido_sigiloso is null` indica nao sigilosa.

Campos atuais:

- `representacoes.pedido_sigiloso`

Classificacao:

- REAL quando protegido por RLS.

Regra de seguranca:

- sigilo nao pode depender apenas de ocultacao visual.
- RLS deve impedir leitura de sigilosas por usuarios sem permissao.

## Ranking de Escrivaes

Definicao de produto:

- painel de produtividade operacional individual restrito a usuarios com funcao institucional `Escrivao(a)`.

Regra atual:

- usar RPC `list_escrivao_productivity(p_days)`;
- exibir pontos, cadastros, atualizacoes, relatorios enviados e conclusoes retornados pela RPC.

Campos/fontes atuais:

- `profiles.funcao_institucional`, quando existir;
- eventos de auditoria/produtividade usados pela RPC;
- `p_days` como janela temporal.

Classificacao:

- APROXIMADO ate o contrato de produtividade estar totalmente formalizado.

Regra oficial desejada:

- somente usuarios com funcao institucional `Escrivao(a)` entram no ranking;
- admin/delegado podem alterar a funcao no perfil administrativo;
- alteracao de funcao deve gerar auditoria;
- pontuacao deve vir de eventos auditaveis ou de atribuicao formal de responsavel.

Pontuacao recomendada:

- cadastro validado de procedimento: 1 ponto;
- atualizacao operacional relevante: 1 ponto;
- relatorio enviado: 2 pontos;
- conclusao de inquerito ou representacao: 2 pontos;
- eventos devem ter data, executor, modulo, entidade e entidade_id.

O que nao fazer:

- nao pontuar por nome digitado em texto livre;
- nao usar usuario de auditoria como produtividade se a acao nao representa trabalho operacional;
- nao usar dados ficticios.

## Equipe responsavel

Definicao:

- equipe operacional vinculada ao procedimento ou cumprimento.

Regra atual:

- usar texto de `equipe`, `equipe_responsavel` ou `equipe_cumprimento`.

Classificacao:

- HEURISTICO

Contrato futuro recomendado:

- tabela ou enum de equipes;
- campo normalizado `equipe_responsavel_id` ou `equipe_responsavel`.

## Regras para indicadores clicaveis

Todo indicador clicavel deve obedecer a uma destas regras:

1. abrir lista destino com exatamente os registros que compoem o numero;
2. ou ser marcado como informativo, sem clique;
3. ou exibir indicacao clara de filtro em desenvolvimento.

Regras obrigatorias:

- indicador com valor maior que zero nao deve navegar para lista vazia por falta de filtro;
- query params devem ser entendidos pela rota destino;
- Dashboard e Central devem usar a mesma regra de filtro;
- a lista destino deve respeitar a RLS vigente.

## Padronizacao futura minima

Campos recomendados para consolidar indicadores:

- `tipo_procedimento_normalizado`
- `categoria_criminal`
- `relatorio_status`
- `data_relatorio`
- `data_envio_relatorio`
- `cvli_elucidado`
- `data_elucidacao`
- `prazo_status`
- `reu_preso`
- `medida_protetiva`
- `prioridade_operacional`
- `equipe_responsavel`
- `escrivao_responsavel_id`
- `funcao_institucional`

Proposta SQL revisavel relacionada:

- `docs/proposta-padronizacao-campos-operacionais.sql`

## Ordem segura de implementacao

### Fase 1 - Relatorios

- consolidar `relatorio_status`;
- separar `relatado` de `enviado`;
- ajustar Dashboard e Central para usar essa regra.

### Fase 2 - CVLI

- tornar `categoria_criminal` controlada;
- tornar `cvli_elucidado` booleano;
- adicionar `data_elucidacao`, se necessario.

### Fase 3 - Prazos e prioridade

- padronizar prazo operacional;
- padronizar prioridade;
- reduzir heuristicas de prazo critico e alertas.

### Fase 4 - Equipe e Ranking

- formalizar funcao institucional;
- formalizar responsavel/escrivao do procedimento;
- auditar alteracoes;
- recalcular ranking apenas com base oficial.

## Decisao de produto

O SIPI pode continuar usando indicadores aproximados e heuristicos como apoio operacional durante a evolucao do banco.

Porem, qualquer indicador usado para cobranca formal, produtividade individual, prestacao institucional ou estatistica oficial deve migrar para campo normalizado antes de ser tratado como definitivo.
