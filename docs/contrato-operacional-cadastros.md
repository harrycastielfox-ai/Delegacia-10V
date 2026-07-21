# Contrato operacional de cadastros

Este documento registra as regras compartilhadas entre cadastro, edicao e
detalhe de Inqueritos e Representacoes no SIPI. Ele serve como referencia
tecnica para evolucoes futuras sem perder compatibilidade com registros
importados da planilha.

## Principios

- Cada tela deve usar as mesmas regras de completude para o mesmo registro.
- O detalhe mostra apenas dados preenchidos; campos vazios nao devem gerar
  blocos ou linhas artificiais.
- RLS continua sendo a fonte de permissao. Este contrato nao amplia acesso a
  dados, nem substitui regras do Supabase.
- PPE nao e uma chave global unica: podem existir registros restaurados,
  importados ou historicos com o mesmo PPE.
- Dados legados devem ser preservados. A ausencia de uma chave estrangeira
  `inquerito_id` nao pode apagar ou ocultar um PPE existente em
  `numero_ppe`.

## Inqueritos

### Identificacao e origem

- `numero_ppe`: identificador operacional exibido na lista e no detalhe.
- `numero_fisico` e `numero_bo`: referencias complementares, opcionais.
- `origem_registro`: informa se o cadastro e novo, restaurado, relacionado a
  ocorrencia ou importado de controle anterior.

### Campos operacionais

- `tipo_procedimento`: IP, APF, TCO, BOC, AIAI ou outro procedimento.
- `categoria_caso`: categoria criminal usada em indicadores e filtros.
- `situacao`: situacao do procedimento.
- `status_diligencias`: andamento das diligencias.
- `status_relatorio` e `data_envio_relatorio`: registro do relatorio enviado.
- `elucidado`: informacao propria do caso; um CVLI pode ser registrado e,
  depois, marcado como elucidado.

### Pessoas envolvidas

Uma pessoa pode ser vitima, autor/investigado, testemunha ou outro papel. O
nome e a alcunha devem ser exibidos juntos quando ambos existirem, no formato
`Nome - (Alcunha: apelido)`.

## Representacoes

### Vinculo com inquerito

`vinculo_inquerito` possui tres estados de interface:

- `sim`: existe inquerito relacionado. O vinculo pode ocorrer por
  `inquerito_id` ou por PPE legado em `numero_ppe`.
- `nao`: nao existe inquerito relacionado e uma justificativa e obrigatoria.
- vazio: `A definir`; ainda nao houve decisao sobre o vinculo.

Registros importados que possuem `numero_ppe`, mas nao possuem `inquerito_id`,
sao validos e devem continuar exibindo o PPE e permitindo edicao sem apagar a
referencia historica.

### Status judiciais canonicos

Os formulários de criacao e edicao usam a mesma lista:

- Em elaboracao
- Em analise
- Aguardando Analise Judicial
- Enviada ao Judiciario
- Aguardando decisao
- Deferida
- Deferida parcialmente
- Deferida Aguardando Cumprimento
- Cumprida
- Cumprida parcialmente
- Cumprida (Positiva)
- Cumprida (Negativa)
- Indeferida
- Arquivada
- Finalizada

### Exigencias condicionais

- Status enviados ao Judiciario, em analise judicial ou aguardando decisao
  exigem data de envio e vara/juizo.
- Status com decisao exigem data da decisao.
- Status deferidos exigem prazo concedido ou data de vencimento.
- Status de cumprimento exigem data e resultado do cumprimento.
- Equipe de cumprimento e recomendada quando o cumprimento esta em curso ou
  finalizado.

## Integridade do cadastro

O painel de integridade mostra bloqueios e recomendacoes a partir deste
contrato. Quando todos os campos avaliados estiverem completos, o painel nao
e exibido. O detalhe apresenta o mesmo conjunto de pendencias em um popover,
orientando a pessoa a usar Editar para completar o cadastro.

## Padronizacao futura recomendada

Hoje parte dos valores ainda chega de importacoes e texto livre. Antes de
transformar isso em uma migration obrigatoria, a base deve consolidar valores
controlados para:

- tipo de procedimento;
- categoria criminal;
- situacao e status de diligencias;
- status e data do relatorio;
- indicador de elucidacao;
- reu preso e medida protetiva;
- equipe responsavel e escrivao/responsavel formal;
- status judicial e resultado do cumprimento.

Uma migration futura deve preservar aliases e registros historicos, migrar
valores conhecidos de forma auditavel e manter um caminho de compatibilidade
para importacoes antigas.
