-- Uma pessoa cadastrada nem sempre é uma pessoa: às vezes é um comércio, uma
-- loja, um ponto de referência com mais de um telefone (o dono, o gerente,
-- a portaria...). Um único campo "telefone" não dava conta disso.
--
-- A coluna "telefone" (texto simples) continua existindo — ela passa a
-- espelhar sempre o primeiro número da lista, para a busca rápida por
-- telefone (que usa o índice trigram já existente nessa coluna) continuar
-- funcionando sem precisar ser reescrita.

alter table public.localizacao_pessoas
  add column if not exists telefones jsonb not null default '[]'::jsonb;

-- O backfill roda como migração, sem um usuário autenticado (auth.uid() nulo)
-- — o gatilho de auditoria exige um autor e bloquearia o UPDATE. Desabilita
-- só para este backfill, dentro da mesma transação da migração.
alter table public.localizacao_pessoas disable trigger audit_localizacao_pessoas;

update public.localizacao_pessoas
set telefones = jsonb_build_array(jsonb_build_object('nome', 'Principal', 'numero', telefone))
where telefone is not null
  and btrim(telefone) <> ''
  and telefones = '[]'::jsonb;

alter table public.localizacao_pessoas enable trigger audit_localizacao_pessoas;

comment on column public.localizacao_pessoas.telefones is
  'Lista de contatos telefônicos: [{"nome": "...", "numero": "..."}, ...]. O primeiro número é espelhado na coluna telefone.';
