-- Remove a tabela de pontos de referência.
--
-- Os próprios blocos do OpenStreetMap já desenham banco, posto, praça e
-- terminal com nome. Marcá-los de novo por cima duplicava cada rótulo e
-- sujava o mapa. Nada no sistema consome a tabela, então ela sai inteira.

drop table if exists public.localizacao_referencias;
