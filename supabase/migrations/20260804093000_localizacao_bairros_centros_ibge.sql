-- Posiciona no mapa os bairros que estavam sem coordenada.
--
-- Origem: Mapa Urbano Estatístico do IBGE, folha 291465305 (SIRGAS 2000 / EPSG:4674).
-- A folha traz o nome de cada bairro impresso sobre a malha urbana e carrega a
-- georreferência no próprio arquivo, o que permite converter a posição de cada
-- rótulo em latitude e longitude. O OpenStreetMap não conhece esses bairros:
-- de treze consultados, onze não existem lá e dois devolveram resultados de
-- outro bairro.
--
-- Cuidado observado na leitura: o IBGE imprime o nome onde há espaço livre na
-- folha, não sobre as casas. Em Pereirão, Ubirajara, Manzolão e Triunfo o
-- rótulo cai em área vazia, então o centro foi tomado do agrupamento de ruas
-- correspondente.
--
-- Conferência: os quatro bairros que já tinham posição foram recalculados pelo
-- mesmo método e a diferença ficou entre 477 e 708 m — compatível com a
-- distância entre o rótulo impresso e o ponto central, com ambos dentro do
-- mesmo bairro. Os valores originais desses quatro foram mantidos.
--
-- `posicao_confirmada` permanece false: são posições aproximadas, boas para
-- exibir o bairro no mapa, e devem virar true quando alguém da unidade
-- confirmar em campo.

update public.localizacao_bairros as b
set
  centro_latitude = novo.lat,
  centro_longitude = novo.lon,
  fonte = novo.fonte,
  updated_at = now()
from (
  values
    -- Rótulo em área vazia: centro tomado do agrupamento de ruas.
    -- Pereirão foi conferido contra o Google Maps (loteamento das ruas A a T).
    ('pereirao', -16.574546, -39.548468, 'IBGE 291465305 (agrupamento de ruas)'),
    ('ubirajara-brito', -16.578552, -39.548060, 'IBGE 291465305 (agrupamento de ruas)'),
    ('manzolao', -16.581712, -39.559289, 'IBGE 291465305 (agrupamento de ruas)'),
    ('triunfo', -16.574149, -39.574271, 'IBGE 291465305 (agrupamento de ruas)'),
    -- Rótulo sobre a área construída: posição do próprio rótulo.
    ('irma-dulce', -16.579072, -39.562281, 'IBGE 291465305'),
    ('dapezao', -16.581287, -39.547350, 'IBGE 291465305')
) as novo(chave, lat, lon, fonte)
where b.chave = novo.chave
  and b.municipio = 'Itabela'
  and b.uf = 'BA';

-- Jardim Paquetá aparece na folha do IBGE e não constava da relação da unidade.
insert into public.localizacao_bairros (
  nome, chave, aliases, ordem, centro_latitude, centro_longitude,
  posicao_confirmada, fonte
)
values (
  'Jardim Paquetá', 'jardim-paqueta', array['Jardim Paqueta', 'Paquetá', 'Paqueta'],
  18, -16.577416, -39.576150, false, 'IBGE 291465305'
)
on conflict (municipio, uf, chave) do update set
  centro_latitude = excluded.centro_latitude,
  centro_longitude = excluded.centro_longitude,
  fonte = excluded.fonte,
  ativo = true,
  updated_at = now();

-- O Centro vai da delegacia até a Avenida Porto Seguro (chamada localmente de
-- Rua Porto Seguro), cerca de 1,5 km. O ponto estava numa das pontas desse
-- trecho e passa para o meio. Informação da própria unidade.
update public.localizacao_bairros
set
  centro_latitude = -16.573791,
  centro_longitude = -39.559451,
  fonte = 'Referência da unidade (delegacia até a Avenida Porto Seguro)',
  updated_at = now()
where chave = 'centro' and municipio = 'Itabela' and uf = 'BA';
