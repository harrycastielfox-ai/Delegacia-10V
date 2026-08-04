-- Ajuste fino dos centros, indicado pela unidade sobre o mapa.
--
-- Bandeirante estava deslocado para a direita do miolo do bairro; Dapezão,
-- acima e à direita. Ambos foram movidos conforme marcação feita na tela.

update public.localizacao_bairros
set centro_latitude = -16.578764,
    centro_longitude = -39.552962,
    fonte = 'Referência da unidade',
    updated_at = now()
where chave = 'bandeirante' and municipio = 'Itabela' and uf = 'BA';

update public.localizacao_bairros
set centro_latitude = -16.581701,
    centro_longitude = -39.548699,
    fonte = 'Referência da unidade',
    updated_at = now()
where chave = 'dapezao' and municipio = 'Itabela' and uf = 'BA';
