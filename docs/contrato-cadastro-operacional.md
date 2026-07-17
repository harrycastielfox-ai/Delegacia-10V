# SIPI - Contrato de Cadastro Operacional

## Objetivo

Este documento define o contrato operacional usado no cadastro e na edição de Inquéritos e Representações. O banco continua aceitando os registros históricos, enquanto os novos fluxos passam a gravar campos normalizados para relatórios, filtros e auditoria.

## Identidade do procedimento

- `numero_ppe` é o identificador operacional informado pela unidade, mas não é uma chave única.
- PPE repetido é permitido quando o registro representa procedimento restaurado, ocorrência relacionada ou migração histórica.
- A chave técnica permanece sendo `id` (UUID).
- Nenhuma rotina deve excluir, unir ou sobrescrever registros somente porque o PPE coincide.
- `origem_registro` informa a natureza da ocorrência: `novo`, `restaurado`, `relacionado` ou `migrado`.

Ao digitar um PPE já existente, a interface deve apenas alertar e apresentar as ocorrências encontradas. A decisão de continuar pertence ao operador.

## Inquéritos

### Tipo de procedimento

O valor operacional deve ser gravado em `tipo_procedimento_normalizado` com um dos códigos:

- `IP`
- `APF`
- `TCO`
- `BOC`
- `AIAI`
- `OUTROS`

O campo textual legado `tipo` continua preservado para compatibilidade e apresentação histórica.

### Categoria criminal

`categoria_criminal` é a fonte normalizada para indicadores. O texto legado de categoria ou gravidade pode continuar existindo, mas não deve ser a única origem de métricas futuras.

### Ciclo do relatório

O relatório é independente da situação geral do inquérito:

- `pendente`: relatório ainda não produzido;
- `relatado`: relatório produzido, ainda não enviado;
- `enviado`: relatório formalmente enviado.

Campos de data:

- `data_relatorio`: data em que o procedimento foi relatado;
- `data_envio_relatorio`: data do envio formal.

Um inquérito não deve ser considerado concluído apenas porque possui um texto de status genérico. Os indicadores de relatório devem priorizar `relatorio_status` e suas datas.

### CVLI e elucidação

- CVLI é identificado por `categoria_criminal = 'CVLI'`.
- `cvli_elucidado` indica se a autoria foi esclarecida conforme o critério institucional.
- `data_elucidacao` registra quando a elucidação foi reconhecida.
- Registro e elucidação não são estados excludentes: todo CVLI conta como registro e, quando elucidado, conta também como elucidado.

### Outros campos normalizados

- `reu_preso_normalizado`: booleano real para réu preso;
- `medida_protetiva_normalizada`: booleano real para medida protetiva;
- `prioridade_operacional`: `baixa`, `media`, `alta` ou `urgente`;
- `equipe_responsavel`: equipe operacional;
- `escrivao_responsavel_id`: vínculo formal com o perfil responsável;
- `autoria_determinada`: estado explícito da autoria.

## Representações

### Vínculo com inquérito

- `inquerito_id` é o vínculo técnico preferencial.
- O PPE digitado serve para localizar ocorrências acessíveis, inclusive quando existem PPEs repetidos.
- O operador deve selecionar a ocorrência correta pelo UUID apresentado internamente pela interface.
- Quando a representação for autônoma ou o inquérito ainda não estiver cadastrado, `justificativa_sem_inquerito` deve explicar a ausência do vínculo.

Registros históricos sem vínculo continuam válidos. A regularização deve ser gradual e auditada.

### Tipo de representação

`tipo_normalizado` deve usar um dos códigos:

- `prisao_preventiva`
- `prisao_temporaria`
- `busca_apreensao`
- `medida_protetiva`
- `interceptacao`
- `quebra_sigilo`
- `representacao`
- `outros`

O campo `tipo` preserva a descrição operacional apresentada ao usuário.

### Tramitação e cumprimento

O status judicial e o cumprimento são conceitos separados:

- `status`: fase ou decisão judicial;
- `cumprimento_status`: `pendente`, `parcial`, `cumprido`, `indeferido` ou `cancelado`;
- `resultado_cumprimento`: resultado controlado, como positivo, negativo, parcial, inconclusivo ou não aplicável;
- `data_cumprimento`, `equipe_cumprimento` e `observacoes_cumprimento`: evidências operacionais.

O status judicial não deve ser usado sozinho para inferir resultado de diligência.

## Segurança e auditoria

- Toda consulta continua sujeita à RLS do usuário autenticado.
- O frontend não substitui RLS, policies ou grants.
- Alterações críticas devem continuar registradas na Auditoria.
- Campos normalizados não concedem privilégios adicionais.
- Nenhum vínculo ou deduplicação histórica deve ser feito automaticamente sem confirmação operacional.

## Compatibilidade histórica

Os campos normalizados são opcionais para registros legados. Helpers podem usar fallback textual durante a transição, mas cadastros e edições novos devem gravar o contrato normalizado sempre que houver dado confiável.
