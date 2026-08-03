# Roadmap - Mapa Operacional de Itabela

**Projeto:** SIPI - Localização Operacional  
**Data de criação:** 03/08/2026  
**Status:** Planejamento aprovado para evolução futura

## Objetivo

Construir um mapa operacional próprio de Itabela, integrado aos cadastros do SIPI, sem depender da coleta manual de capturas de tela e sem transformar imagens do Google Maps em uma base cartográfica paralela.

O mapa deverá exibir, conforme a permissão do usuário:

- bairros e áreas operacionais;
- pessoas e alvos;
- fotografias de perfil e de referência do local;
- endereços e coordenadas;
- diligências, equipes, destinos e progresso;
- viaturas e posições autorizadas;
- rotas salvas e pontos de referência;
- agrupamentos de marcadores conforme o nível de zoom.

## Decisão sobre o Google Maps

### Uso permitido no projeto

- Abrir Google Maps ou Waze por meio de links oficiais para navegação.
- Futuramente, avaliar a exibição do Google Maps por uma API oficial, com chave, faturamento, atribuição e limites configurados.
- Usar coordenadas que tenham sido informadas diretamente pelo usuário, coletadas pelo GPS do aparelho ou obtidas de uma fonte cartográfica licenciada para essa finalidade.

### O que não será feito

- Capturar várias telas do Google Maps para montar um mapa próprio.
- Costurar imagens da API Static Maps para formar um mapa maior.
- Baixar blocos de mapa, imagens de satélite ou Street View em massa.
- Traçar ou digitalizar ruas, prédios, bairros ou outros elementos a partir de imagens do Google.
- Remover logotipos, créditos ou atribuições.
- Guardar conteúdo do Google como mapa offline do SIPI.

As políticas atuais da Map Tiles API proíbem uso offline, extração de geodados e armazenamento fora das condições limitadas do serviço. A Maps Static API fornece imagens oficiais, mas exige chave e faturamento e não deve ser utilizada para colher ou reconstruir uma base independente.

Referências oficiais:

- https://developers.google.com/maps/documentation/tile/policies
- https://developers.google.com/maps/documentation/maps-static/start
- https://developers.google.com/maps/documentation/maps-static/usage-and-billing
- https://developers.google.com/maps/faq

## Fontes cartográficas propostas

### 1. Base principal: IBGE

Arquivo inicial disponível:

`C:/Users/PCIVIL/Downloads/itabela_291465305_itabela_05_mue_a0.pdf`

Características confirmadas:

- Mapa Urbano Estatístico de Itabela;
- GeoPDF com georreferenciamento;
- sistema SIRGAS 2000;
- EPSG:4674;
- limites aproximados da folha entre latitude -16.59992 e -16.55362;
- limites aproximados da folha entre longitude -39.60467 e -39.53923;
- malha urbana, vias, perímetro, setores e elementos de referência.

Antes da distribuição do mapa convertido, confirmar e registrar as condições de reprodução e atribuição aplicáveis ao produto específico do IBGE.

Referência do produto:

- https://www.ibge.gov.br/geociencias/cartas-e-mapas/mapas-municipais/27440-mapas-municipais-para-fins-estatisticos.html

### 2. Complemento vetorial: OpenStreetMap

Usar dados vetoriais obtidos de uma fonte que permita download, transformação e hospedagem local, mantendo a atribuição e as condições da licença ODbL.

Ponto de referência confirmado em Itabela:

- latitude: `-16.572570`;
- longitude: `-39.566290`;
- zoom de inspeção: `18`;
- visualização: https://www.openstreetmap.org/#map=18/-16.572570/-39.566290
- visualização com marcador: https://www.openstreetmap.org/?mlat=-16.572570&mlon=-39.566290#map=18/-16.572570/-39.566290

Esses links devem ser usados para inspeção humana e conferência do alinhamento. O mapa interno não deverá copiar imagens da página: deverá renderizar dados vetoriais autorizados com o estilo próprio do SIPI.

Não baixar a cidade inteira por varredura dos servidores públicos de imagens `tile.openstreetmap.org`. A própria política do OpenStreetMap orienta que mapas offline utilizem blocos hospedados pelo próprio projeto ou por um provedor que autorize essa finalidade.

Referências:

- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/vector/

#### Ferramenta de prototipação: MyOSMatic / MapOSMatic

O serviço `print.get-map.org` pode acelerar a criação da primeira base visual de Itabela usando dados públicos do OpenStreetMap. Ele permite selecionar a área, o layout, o estilo cartográfico, sobreposições, idioma e tamanho do papel, além de gerar arquivos PNG, PDF e SVG.

Uso aprovado no projeto:

- gerar uma base pública de Itabela para comparação visual;
- testar diferentes estilos antes de criar o estilo dark definitivo do SIPI;
- obter SVG para preservar linhas e textos com boa resolução;
- produzir mapas impressos e índices de ruas;
- registrar a área geográfica, o estilo, a data e a atribuição usados em cada exportação;
- avaliar futuramente uma instância própria, pois o código do MapOSMatic e do OCitySMap é software livre.

Limitações:

- o arquivo gerado é um mapa estático, não um mecanismo de mapa interativo;
- zoom dinâmico, filtros, agrupamento e carregamento por área ainda exigirão MapLibre e uma base vetorial local;
- manter a atribuição ao OpenStreetMap conforme a licença aplicável;
- nunca enviar GPX, Umap ou GeoJSON contendo pessoas, fotografias, diligências, agentes, viaturas ou outros dados sensíveis;
- o próprio serviço informa que mapas criados com arquivos enviados ficam publicamente visíveis.

Referências:

- https://print.get-map.org/
- https://print.get-map.org/new/
- https://print.get-map.org/about/
- https://github.com/hholzgra/maposmatic/

### 3. Camadas territoriais opcionais: MapBiomas e Google Earth Engine

O MapBiomas será considerado uma fonte complementar de contexto territorial, e não um substituto para o mapa de ruas. Suas coleções podem enriquecer o SIPI com informações como:

- cobertura e uso da terra;
- áreas de vegetação, pastagem e agricultura;
- superfície de água;
- cicatrizes de fogo;
- mudanças territoriais ao longo dos anos;
- contexto rural ao redor da área urbana de Itabela.

Os dados do MapBiomas são públicos, abertos e gratuitos sob licença CC-BY, desde que a fonte seja citada no formato indicado pelo próprio projeto. Como as coleções trabalham normalmente com resoluções de 30 metros e, em alguns produtos, 10 metros, elas servem para leitura territorial e ambiental, mas não para identificar casas, lotes ou traçar ruas com precisão.

O Google Earth Engine poderá ser usado somente como ferramenta externa de processamento e análise de imagens geoespaciais públicas. Ele não será o mapa-base do SIPI e não receberá dados de pessoas, telefones, fotografias, agentes, diligências ou coordenadas operacionais.

Para uma aplicação operacional de órgão governamental, o Earth Engine não deve ser presumido como gratuito. As regras atuais do Google exigem licença comercial para aplicações, serviços e produtos de dados governamentais mantidos de forma contínua, salvo hipóteses específicas de pesquisa acadêmica ou elegibilidade sujeita à análise do Google.

**Caminho preferencial sem dependência mensal:** obter produtos públicos do MapBiomas, recortar somente Itabela em ferramenta local como QGIS, gerar uma camada otimizada e hospedá-la junto ao mapa do SIPI, mantendo a atribuição CC-BY. O Earth Engine permanecerá opcional e fora do funcionamento diário do sistema.

Referências oficiais:

- https://brasil.mapbiomas.org/codigos-e-ferramentas/
- https://brasil.mapbiomas.org/termos-de-uso/
- https://earthengine.google.com/
- https://earthengine.google.com/noncommercial/
- https://earthengine.google.com/commercial/

### 4. Dados próprios do SIPI

Serão considerados dados próprios:

- coordenadas capturadas pelo GPS dos agentes;
- endereços digitados manualmente;
- nomes de bairros confirmados pela unidade;
- pontos de referência;
- fotografias realizadas e armazenadas conforme autorização;
- rotas e instruções operacionais cadastradas pela equipe.

## Arquitetura visual e técnica desejada

### Mapa-base

- Converter o GeoPDF para uma base otimizada e georreferenciada.
- Preservar uma versão original do PDF sem alteração.
- Para o protótipo, gerar uma imagem WebP de alta resolução com coordenadas conhecidas.
- Para a versão definitiva, preferir blocos vetoriais locais ou um arquivo PMTiles.
- Renderizar no navegador com MapLibre GL JS ou tecnologia equivalente.
- Aplicar estilo dark do SIPI com acento ciano, sem modificar a fonte original de forma enganosa.

### Projeção de coordenadas

- Converter latitude e longitude em posições dentro do mapa.
- Recusar coordenadas fora da área conhecida de Itabela ou exibir aviso de confirmação.
- Permitir coordenadas decimais com ponto ou vírgula.
- Exigir latitude e longitude em conjunto.
- Registrar a origem da coordenada: GPS, manual, link externo ou importação cartográfica.

### Bairros

- Um bairro não será apenas um texto solto no mapa.
- Cada bairro terá nome normalizado, ponto central e, futuramente, polígono de limite.
- Cadastros repetidos do mesmo bairro devem ser agrupados.
- Bairro sem coordenada permanece no cadastro, mas não aparece espacialmente até ser posicionado.
- Ao clicar no bairro, mostrar total de pessoas, endereços e diligências vinculadas.

### Marcadores

- Pessoa/alvo: fotografia em miniatura somente para usuários autorizados.
- Endereço: ícone de residência ou ponto de referência.
- Diligência: cor conforme status.
- Viatura: posição mais recente, horário e precisão.
- Marcadores próximos devem ser agrupados para evitar poluição visual.
- Fotografias e dados sensíveis não devem aparecer em níveis de zoom muito afastados.

## Etapas de implementação

### Etapa 0 - Segurança, origem e licenciamento

- [ ] Registrar a origem de cada base cartográfica.
- [ ] Confirmar condições de atribuição e reprodução do GeoPDF do IBGE.
- [ ] Definir a fonte autorizada dos dados vetoriais do OpenStreetMap.
- [ ] Definir quais cargos podem visualizar fotos e localização de pessoas.
- [ ] Definir prazo de retenção das posições de viaturas e agentes.

### Etapa 1 - Prova de conceito com o GeoPDF

- [ ] Converter o GeoPDF para WebP otimizado.
- [ ] Gerar uma exportação pública de Itabela no MyOSMatic em SVG, PDF e PNG, sem sobreposições do SIPI.
- [ ] Registrar os limites geográficos, estilo, data e atribuição da exportação do MyOSMatic.
- [ ] Comparar a cobertura e a legibilidade da exportação do MyOSMatic com o GeoPDF do IBGE.
- [ ] Criar componente de mapa com arrastar, zoom e centralização.
- [ ] Usar os limites geográficos presentes no GeoPDF para posicionar coordenadas.
- [ ] Mostrar um endereço de teste na posição real.
- [ ] Confirmar alinhamento em diferentes pontos da cidade.
- [ ] Exibir atribuição do IBGE na interface.

**Critério de conclusão:** cinco coordenadas conhecidas devem aparecer nas posições corretas sem utilizar imagens do Google.

### Etapa 2 - Cadastro territorial

- [ ] Criar tabela de bairros com nome, centro e polígono opcional.
- [ ] Criar ferramenta administrativa para posicionar um bairro no mapa.
- [ ] Normalizar nomes para evitar duplicações.
- [ ] Relacionar endereços existentes aos bairros normalizados.
- [ ] Permitir correção manual de coordenadas.

**Critério de conclusão:** todo bairro confirmado e georreferenciado deve aparecer automaticamente no mapa.

### Etapa 3 - Camadas operacionais

- [ ] Camada de pessoas/alvos.
- [ ] Camada de endereços.
- [ ] Camada de diligências.
- [ ] Camada de equipes e viaturas.
- [ ] Camada de fotografias e pontos de referência.
- [ ] Filtros por status, equipe, período e bairro.
- [ ] Painel lateral ao selecionar um marcador.

**Critério de conclusão:** selecionar um marcador deve carregar somente os dados autorizados daquele registro.

### Etapa 4 - Navegação e trabalho em campo

- [ ] Botão para abrir Google Maps.
- [ ] Botão para abrir Waze.
- [ ] Capturar posição atual mediante autorização do agente.
- [ ] Registrar chegada com horário, coordenada e precisão.
- [ ] Suportar funcionamento temporário sem sinal para ações essenciais.
- [ ] Sincronizar registros quando a conexão retornar.

**Critério de conclusão:** o agente deve conseguir abrir a rota, chegar ao local e registrar a comprovação usando o celular.

### Etapa 5 - Mapa vetorial local definitivo

- [ ] Obter extrato vetorial autorizado de Itabela.
- [ ] Gerar blocos locais ou PMTiles somente para a área necessária.
- [ ] Criar estilo cartográfico dark próprio do SIPI.
- [ ] Adicionar nomes de ruas, bairros, rios e referências por nível de zoom.
- [ ] Carregar apenas os blocos visíveis.
- [ ] Manter versão e data de atualização da base.

**Critério de conclusão:** mapa rápido, legível, atualizável e independente de serviços comerciais para visualização básica.

### Etapa 6 - Camadas territoriais complementares (opcional)

- [ ] Testar uma camada pública do MapBiomas recortada para Itabela.
- [ ] Comparar um produto estável de 30 metros com o produto de 10 metros aplicável.
- [ ] Converter o recorte para raster otimizado, blocos locais ou PMTiles.
- [ ] Criar seletor de camada, ano e opacidade no mapa operacional.
- [ ] Exibir atribuição do MapBiomas de forma permanente e legível.
- [ ] Manter a camada desativada por padrão no celular para economizar processamento e dados.
- [ ] Garantir que nenhum dado operacional seja enviado ao Earth Engine.
- [ ] Não tornar o funcionamento diário do SIPI dependente do Earth Engine.

**Critério de conclusão:** o usuário deve conseguir ativar uma camada territorial de Itabela sem perder a leitura das ruas e sem enviar dados sensíveis a serviços externos.

### Etapa 7 - Administração e qualidade

- [ ] Histórico de alterações territoriais.
- [ ] Auditoria de criação e correção de coordenadas.
- [ ] Indicador de coordenada confirmada em campo.
- [ ] Relatório de endereços sem coordenadas.
- [ ] Relatório de bairros duplicados ou sem posicionamento.
- [ ] Backup da base cartográfica e dos dados operacionais.

## Desempenho

- Não carregar todas as pessoas ou diligências de uma vez.
- Consultar somente registros dentro da área visível do mapa.
- Agrupar marcadores no servidor ou no navegador.
- Carregar fotografias somente ao selecionar o registro.
- Usar miniaturas comprimidas e URLs temporárias.
- Separar a base cartográfica dos dados sensíveis.
- Carregar blocos do mapa conforme o zoom.

## Privacidade e segurança

- Fotos de pessoas e endereços são privadas.
- Nenhuma chave administrativa pode ser exposta no navegador.
- A autorização deve existir no banco e na interface.
- Links de fotografias devem expirar.
- Toda consulta sensível deve respeitar RLS.
- Ações de criação, atualização e confirmação territorial devem gerar auditoria.
- Não enviar informações de pessoas, agentes ou diligências a serviços cartográficos externos.
- Ao abrir navegação externa, enviar apenas o destino necessário e informar ao usuário que outro aplicativo será aberto.

## Próximo passo recomendado

Executar somente a **Etapa 1 - Prova de conceito com o GeoPDF**, mantendo o mapa atual disponível até a validação do alinhamento. Nenhum dado real de pessoa deve ser usado nessa prova; utilizar apenas coordenadas públicas de referência.
