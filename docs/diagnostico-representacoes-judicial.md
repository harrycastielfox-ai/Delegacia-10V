# Diagnóstico técnico — módulo de Representações (SIPI)

## Escopo analisado
- `src/routes/representacoes.tsx`
- `src/routes/nova-representacao.tsx`
- `src/routes/representacoes.$representacaoId.tsx`
- `src/routes/representacoes.$representacaoId.editar.tsx`
- `src/lib/repositories/representacoesRepository.ts`
- `docs/supabase-schema-proposta.sql` (referência de estrutura atual de tabela)

## 1) Campos existentes hoje no frontend

### Cadastro/Edição (formulário)
- `numero_ppe`
- `processo_judicial`
- `tipo` (com opção "Outra")
- `data_representacao`
- `responsavel`
- `vitima`
- `investigado`
- `autor_preso`
- `resumo_fatos`
- `fundamentacao`
- `objetivo`
- `diligencias_relacionadas`
- `status`
- `data_envio_judiciario`
- `data_decisao_judicial` (condicional por status)
- `observacoes_decisao`
- `data_cumprimento` (condicional por status)
- `equipe_cumprimento` (condicional por status)
- `resultado_cumprimento` (condicional por status)
- `observacoes_cumprimento` (condicional por status)
- `prioridade_operacional`
- `pedido_sigiloso`
- `observacoes_internas`

### Lista
- Busca textual: PPE, vítima, investigado, tipo, processo, status
- Filtros: status, tipo, período por `data_representacao`
- Atalhos de filtro: cumpridas, pendentes, tipo não informado, tipo medida protetiva
- Indicadores: total, deferidas, cumpridas, indeferidas, pendentes, taxa de deferimento

### Detalhe
- Blocos de visualização: identificação, pessoas envolvidas, tramitação, controle interno e fundamentação/finalidade
- Fallback visual para vazio: `—`

## 2) Campos existentes hoje na tabela Supabase

Com base no repositório e no schema de referência:
- `id`
- `codigo_interno`
- `inquerito_id`
- `numero_ppe`
- `processo_judicial`
- `tipo`
- `data_representacao`
- `responsavel`
- `vitima`
- `investigado`
- `autor_preso`
- `resumo_fatos`
- `fundamentacao`
- `objetivo`
- `diligencias_relacionadas`
- `status`
- `data_envio_judiciario`
- `data_decisao_judicial`
- `observacoes_decisao`
- `data_cumprimento`
- `equipe_cumprimento`
- `resultado_cumprimento`
- `observacoes_cumprimento`
- `prioridade_operacional`
- `pedido_sigiloso`
- `observacoes_internas`
- `created_at`
- `updated_at`
- `deleted_at`

## 3) Campos operacionais já existentes, mas subaproveitados
- `inquerito_id`: existe no tipo/repositório, mas não é exposto no fluxo de formulário como vínculo estruturado.
- `codigo_interno`: existe no tipo de dados, mas não tem presença operacional clara na UI.
- `data_envio_judiciario` / `data_decisao_judicial` / `data_cumprimento`: existem, porém faltam regras claras de SLA e destaque de vencimento.
- `resultado_cumprimento`: existe, mas sem validação orientada a completude quando status for cumprida/cumprida parcialmente.
- `pedido_sigiloso` e `prioridade_operacional`: existem, mas não entram em filtros dedicados na listagem.

## 4) Campos que faltam para fluxo judicial mais completo

### Críticos para tramitação/prazo
- `vara_juizo`
- `prazo_concedido_dias`
- `data_vencimento` (ou cálculo consistente no frontend com persistência opcional)
- `resultado_diligencia` (pode reutilizar `resultado_cumprimento` via alias de interface)
- `deferimento_tipo` (deferida / parcial / indeferida como enum derivado ou alias do status)

### Críticos para operação interna
- `equipe_responsavel` (hoje existe `equipe_cumprimento`, mas não uma equipe dona da representação desde início)
- `acompanhamento_especial` (flag/categoria)
- `outros_envolvidos` (texto estruturado)

### Governança de qualidade de dados
- Campo derivado/flag de `dados_incompletos` para alertas e filtros rápidos (pode iniciar como cálculo frontend).

## 5) Melhorias possíveis apenas no frontend (sem migration)
- Reorganizar formulário em blocos judiciais já propostos, mantendo o design atual.
- Tornar obrigatórios mínimos: tipo, data, status e ao menos um identificador (PPE ou processo).
- Adotar mapa de alias de status para ciclo de vida padronizado sem apagar status legados.
- Melhorar detalhe com "linha do tempo" de tramitação usando campos já existentes.
- Exibir cartões de prazo e pendência com cálculo derivado por datas existentes.
- Expandir filtros da lista com recortes derivados:
  - deferidas/cumpridas/pendentes (já parcial)
  - sigilosas pendentes
  - sem decisão após envio
  - cumprida sem resultado
  - dados incompletos

## 6) O que exigirá migration/Supabase
- Inclusão de novos campos estruturais: `vara_juizo`, `prazo_concedido_dias`, `data_vencimento` (se persistida), `equipe_responsavel`, `acompanhamento_especial`, `outros_envolvidos`.
- Eventual normalização de `status` (se for evoluir para enum de banco) — recomendado apenas após fase de compatibilidade.
- Índices para filtros operacionais futuros (status, datas de envio/decisão/vencimento, sigilo, prioridade).

## Comparação atual x ideal (resumo)
- **Já existe:** boa base de identificação, partes envolvidas, fundamentação, status e cumprimento.
- **Falta para operação judicial real:** prazo formal, vara/juízo, trilha de decisão mais semântica, e filtros operacionais robustos.
- **Risco atual:** manter status livre pode gerar divergência semântica; resolver primeiro com mapeamento/alias no frontend.

## Plano seguro por etapas

### Etapa 0 — Diagnóstico e compatibilidade (sem banco)
- Inventário de status reais existentes em produção.
- Definição de dicionário de alias para o ciclo de vida padronizado.

### Etapa 1 — Frontend mínimo (sem migration)
- Reorganizar formulário de nova/edição em blocos operacionais (sem alterar rotas base).
- Implementar validações mínimas e mensagens claras.
- Melhorar detalhe com destaque de status, pendências e completude.
- Melhorar filtros da lista com regras derivadas dos campos atuais.

### Etapa 2 — Ajustes de domínio frontend/repositório
- Criar camada de mapeamento de status canônico ↔ legado.
- Criar utilitários de cálculo (pendência de decisão, cumprimento sem resultado, dados incompletos).

### Etapa 3 — Proposta de migration (somente após aprovação)
- Adicionar campos faltantes essenciais.
- Planejar backfill/valor default e impacto em RLS/policies.

## Riscos principais
- Inconsistência de status históricos caso padronização seja brusca.
- Regras de obrigatoriedade excessivas podem quebrar edição de registros antigos incompletos.
- Alterações de filtros sem telemetria podem confundir operação; ideal introdução progressiva.

## Recomendação da primeira alteração segura
Executar **Etapa 1 frontend-only**, sem tocar em Supabase:
1) padronizar apresentação por blocos e validação mínima;
2) adicionar alias de status canônico;
3) ampliar filtros derivados e indicadores;
4) preservar total compatibilidade de cadastro/listagem/detalhe/editar/excluir.
