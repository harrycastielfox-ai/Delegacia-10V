# SIPI - Reconciliação da Planilha Histórica

## Escopo da análise

Comparação realizada entre a planilha operacional usada como referência do SIPI e os registros acessíveis no banco durante a auditoria de julho de 2026.

## Resultado consolidado

- 754 ocorrências de PPE foram identificadas na planilha.
- 745 valores distintos de PPE foram identificados.
- 8 grupos possuem PPE repetido, totalizando 17 linhas.
- As repetições são legítimas quando representam casos restaurados ou relacionados.
- O banco possuía 750 inquéritos ativos e 1 registro excluído logicamente no momento da comparação.
- Foram identificadas 5 ocorrências da planilha ainda não conciliadas com registros ativos e 1 registro adicional no banco.
- As 12 representações analisadas ainda estavam sem `inquerito_id` formalmente preenchido.

Esses números são um retrato da auditoria e devem ser recalculados após novas importações ou alterações operacionais.

## Regra sobre PPE repetido

PPE não deve possuir restrição de unicidade. A reconciliação deve considerar, além do PPE:

- UUID do registro;
- origem da ocorrência;
- data de instauração;
- tipo de procedimento;
- situação;
- tipificação;
- partes envolvidas;
- vínculo com outros procedimentos.

É proibido deduplicar ou sobrescrever automaticamente somente pela igualdade do PPE.

## Lacunas observadas na origem

Na leitura histórica foram encontrados campos ausentes ou inconsistentes, incluindo aproximadamente:

- 10 registros sem prazo confiável;
- 11 registros sem observações;
- 6 registros sem data de relatório;
- 6 registros sem equipe;
- 6 registros sem escrivão.

Ausência de dado não deve ser convertida em valor fictício. O SIPI deve manter `null` e permitir regularização posterior.

## Representações

O legado precisa de uma etapa específica de vínculo:

1. localizar todos os inquéritos acessíveis pelo PPE;
2. comparar data, tipo, partes e contexto;
3. selecionar manualmente o inquérito correto;
4. preencher `inquerito_id`;
5. quando não houver vínculo, registrar `justificativa_sem_inquerito`;
6. auditar a decisão.

Não deve haver vinculação automática quando mais de uma ocorrência compartilhar o mesmo PPE.

## Estratégia segura para nova importação

1. Executar leitura e validação sem escrita.
2. Gerar relatório de linhas válidas, incompletas, ambíguas e já existentes.
3. Preservar uma chave de origem por linha da planilha.
4. Importar em lotes pequenos e identificáveis.
5. Não usar `upsert` baseado somente em PPE.
6. Conferir totais por tipo, ano, categoria e relatório após cada lote.
7. Validar os indicadores do Dashboard e da Central de Pendências.
8. Registrar em auditoria o lote, executor e resultado.

## Pendências de regularização

- Vincular gradualmente as representações legadas.
- Classificar registros históricos sem `origem_registro` quando houver evidência.
- Preencher campos normalizados apenas quando a informação for confiável.
- Conciliar as ocorrências divergentes entre planilha e banco.
- Manter os dados legados originais para rastreabilidade.
