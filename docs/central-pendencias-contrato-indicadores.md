# Central Operacional de Pendencias - Contrato de Indicadores

Este documento registra o contrato tecnico atual dos indicadores exibidos na Central Operacional de Pendencias do SIPI.

A Central pode continuar exibindo indicadores reais, aproximados e heuristicos desde que essa natureza esteja documentada ate a padronizacao definitiva do banco de dados.

## Fontes de dados

A Central usa dados carregados pelo frontend a partir dos repositories existentes:

- `listInqueritos()`
- `listRepresentacoes()`

Tabelas envolvidas:

- `public.inqueritos`
- `public.representacoes`

As consultas passam pelo cliente Supabase autenticado e respeitam automaticamente:

- RLS vigente;
- permissoes do usuario atual;
- filtros de `deleted_at is null` aplicados pelos repositories.

Isso significa que os numeros da Central podem variar conforme o perfil logado e as policies aplicadas no Supabase.

## Classificacao dos indicadores

### Reais

Indicadores baseados diretamente em campos especificos e sem inferencia textual relevante.

### Aproximados

Indicadores calculados a partir de campos reais, mas com alguma equivalencia operacional ainda nao totalmente normalizada.

### Heuristicos

Indicadores derivados de texto livre, aliases, palavras-chave ou combinacoes de campos sem contrato normalizado definitivo.

### Futuros ou pendentes de padronizacao

Indicadores que podem existir visualmente ou conceitualmente, mas dependem de campos normalizados para serem considerados oficiais.

## Indicadores reais

### Total de Procedimentos

Calculo atual:

- total de registros retornados por `listInqueritos()`.

Campos envolvidos:

- `inqueritos.id`
- `inqueritos.deleted_at`

Classificacao:

- REAL

Observacao:

- atualmente considera apenas inqueritos, nao soma representacoes.

### Relatorios enviados no periodo

Calculo atual:

- inqueritos com `data_envio_relatorio` preenchida;
- `data_envio_relatorio` dentro do periodo filtrado.

Campos envolvidos:

- `inqueritos.data_envio_relatorio`
- `inqueritos.deleted_at`

Classificacao:

- REAL, desde que `data_envio_relatorio` seja preenchida de forma consistente.

## Indicadores aproximados

### Relatorios Enviados

Calculo atual:

- `relatorio_enviado` com valor verdadeiro;
- ou `data_envio_relatorio` preenchida;
- ou `situacao` contendo texto equivalente a concluido ou relatado.

Campos envolvidos:

- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`
- `inqueritos.situacao`

Classificacao:

- APROXIMADO

Risco:

- conclusao, relatorio produzido e relatorio enviado podem ser conceitos diferentes.

### Taxa de conclusao

Calculo atual:

- `Relatorios Enviados / Total de Procedimentos * 100`.

Campos envolvidos:

- mesmos campos usados em `Relatorios Enviados`;
- total de registros de `inqueritos`.

Classificacao:

- APROXIMADO

Risco:

- se `Relatorios Enviados` estiver superestimado, a taxa tambem sera superestimada.

### IP sem relatar

Calculo atual:

- inqueritos com tipo normalizado como IP;
- `relatorio_enviado` nao verdadeiro;
- `data_envio_relatorio` vazia.

Campos envolvidos:

- `inqueritos.tipo`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- APROXIMADO

Risco:

- nao considera de forma definitiva um campo normalizado de status do relatorio.

### APF sem relatar

Calculo atual:

- inqueritos com tipo normalizado como APF;
- `relatorio_enviado` nao verdadeiro;
- `data_envio_relatorio` vazia.

Campos envolvidos:

- `inqueritos.tipo`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- APROXIMADO

Risco:

- depende do mesmo contrato aproximado de relatorio usado para IP.

### Relatados e nao enviados

Calculo atual:

- quantidade de inqueritos considerados concluidos;
- menos quantidade de inqueritos com `data_envio_relatorio` preenchida.

Campos envolvidos:

- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`
- `inqueritos.situacao`

Classificacao:

- APROXIMADO

Risco:

- pode confundir situacao textual de conclusao com relatorio efetivamente produzido e envio formal.

### CVLI elucidados

Calculo atual:

- inqueritos classificados como CVLI por heuristica;
- e `elucidado` verdadeiro;
- ou considerados concluidos pela regra de relatorio/conclusao.

Campos envolvidos:

- `inqueritos.elucidado`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`
- `inqueritos.situacao`
- `inqueritos.gravidade`
- `inqueritos.tipificacao`
- `inqueritos.tipo`
- `inqueritos.motivacao`

Classificacao:

- APROXIMADO

Risco:

- elucidar CVLI e enviar relatorio nao sao necessariamente a mesma coisa.

## Indicadores heuristicos

### Tipos IP, APF, TCO, BOC e AIAI

Calculo atual:

- derivado de `inqueritos.tipo`;
- aceita aliases e textos equivalentes.

Campos envolvidos:

- `inqueritos.tipo`

Classificacao:

- HEURISTICO

Risco:

- variacoes de escrita podem distorcer os totais.

### IP CVLI sem relatar

Calculo atual:

- IP sem relatar;
- e texto contendo palavras como `cvli`, `homic`, `latrocin` ou `feminic`.

Campos envolvidos:

- `inqueritos.tipo`
- `inqueritos.gravidade`
- `inqueritos.tipificacao`
- `inqueritos.motivacao`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- HEURISTICO

Risco:

- CVLI ainda nao depende de um campo normalizado obrigatorio.

### IP Patrimoniais sem relatar

Calculo atual:

- IP sem relatar;
- e texto contendo palavras como `patrimonio`, `furto`, `roubo`, `receptacao`, `estelionato` ou `dano`.

Campos envolvidos:

- `inqueritos.tipo`
- `inqueritos.gravidade`
- `inqueritos.tipificacao`
- `inqueritos.relatorio_enviado`
- `inqueritos.data_envio_relatorio`

Classificacao:

- HEURISTICO

Risco:

- crimes patrimoniais dependem de texto livre.

### Violencia domestica, crimes sexuais e crimes de transito

Calculo atual:

- busca por palavras-chave em campos de classificacao e tipificacao.

Campos envolvidos:

- `inqueritos.tipo`
- `inqueritos.gravidade`
- `inqueritos.tipificacao`

Classificacao:

- HEURISTICO

Risco:

- depende de padrao textual consistente.

### MPU representadas no periodo

Calculo atual:

- representacoes no periodo;
- `tipo` contendo `protetiva`.

Campos envolvidos:

- `representacoes.tipo`
- `representacoes.data_representacao`
- `representacoes.created_at`
- `representacoes.data_envio_judiciario`

Classificacao:

- HEURISTICO

Risco:

- medida protetiva ainda nao esta garantida por campo normalizado dedicado.

### Prisoes vinculadas no periodo

Calculo atual:

- inqueritos no periodo;
- `reu_preso` aceitando aliases de verdadeiro, como `sim`, `s`, `true`, `1`, `yes`, `y` ou `ok`.

Campos envolvidos:

- `inqueritos.reu_preso`
- `inqueritos.data_instauracao`
- `inqueritos.created_at`
- `inqueritos.data_fato`

Classificacao:

- HEURISTICO

Risco:

- `reu_preso` deveria ser booleano real para indicador oficial.

## Futuros ou pendentes de padronizacao

Indicadores que dependem de contrato mais forte no banco:

- produtividade individual por escrivao;
- produtividade por equipe;
- ranking operacional;
- CVLI elucidado oficial;
- relatorio produzido versus relatorio enviado;
- categoria criminal oficial;
- medidas protetivas normalizadas;
- carga operacional por responsavel.

## Riscos conhecidos

- Texto livre em `tipo`, `gravidade`, `tipificacao`, `motivacao`, `situacao` e `status`.
- Aliases inconsistentes entre usuarios e telas.
- Classificacao criminal ainda sem campo normalizado obrigatorio.
- Relatorio enviado pode estar sendo confundido com conclusao.
- Elucidacao pode estar sendo confundida com relatorio/conclusao.
- RLS pode alterar os numeros conforme o perfil logado.
- Data operacional pode variar entre `data_instauracao`, `created_at`, `data_fato`, `data_representacao` e `data_envio_judiciario`.

## Contrato futuro recomendado

Campos recomendados para reduzir aproximacoes e heuristicas:

- `tipo_procedimento_normalizado`
- `relatorio_status`
- `categoria_criminal`
- `cvli_elucidado`
- `medida_protetiva`
- `reu_preso` boolean real
- `equipe_responsavel` normalizada
- `escrivao_responsavel` normalizado

Valores recomendados:

- `tipo_procedimento_normalizado`: `IP`, `APF`, `TCO`, `BOC`, `AIAI`
- `relatorio_status`: `pendente`, `relatado`, `enviado`
- `categoria_criminal`: `CVLI`, `patrimonial`, `violencia_domestica`, `sexual`, `transito`, `drogas`, `outros`
- `cvli_elucidado`: boolean
- `medida_protetiva`: boolean
- `reu_preso`: boolean

## Prioridades

### Prioridade 1

- IP sem relatar.
- APF sem relatar.
- Relatorio enviado.
- Relatado e nao enviado.

### Prioridade 2

- CVLI.
- CVLI elucidado.
- Categoria criminal.

### Prioridade 3

- Equipe.
- Escrivao.
- Produtividade.

## Decisao de produto

A Central Operacional de Pendencias pode continuar exibindo indicadores aproximados e heuristicos enquanto eles estiverem claramente documentados.

Esses indicadores devem ser tratados como apoio operacional, nao como estatistica oficial definitiva, ate que o banco possua campos normalizados suficientes para sustentar cada calculo.
