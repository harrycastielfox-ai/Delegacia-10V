-- Pontos de referência de Itabela.
--
-- É por eles que as pessoas explicam onde ficam as coisas: "depois do
-- Bradesco", "atrás do Terminal", "na frente da Praça Inocêncio Pereira".
-- Diferente dos bairros, esses pontos o OpenStreetMap tem — foram extraídos de
-- lá (licença ODbL, atribuição devida na interface).
--
-- Alguns supermercados vêm do OSM com código de cadastro no início do nome
-- ("3552 novo barateiro com"); o código foi removido, mas os nomes podem
-- precisar de ajuste manual depois.

create table if not exists public.localizacao_referencias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  municipio text not null default 'Itabela',
  uf text not null default 'BA',
  latitude double precision not null,
  longitude double precision not null,
  fonte text not null default 'OpenStreetMap (ODbL)',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint localizacao_referencias_latitude_valida
    check (latitude between -90 and 90),
  constraint localizacao_referencias_longitude_valida
    check (longitude between -180 and 180),
  constraint localizacao_referencias_tipo_conhecido check (
    tipo in ('banco','posto','hospital','farmacia','escola','igreja','orgao_publico',
             'terminal','mercado','associacao','supermercado','comercio','hospedagem',
             'praca','estadio')
  )
);

create unique index if not exists localizacao_referencias_nome_ponto_idx
  on public.localizacao_referencias (municipio, uf, lower(nome), round(latitude::numeric, 4), round(longitude::numeric, 4));

create index if not exists localizacao_referencias_ativas_idx
  on public.localizacao_referencias (tipo, nome) where ativo;

alter table public.localizacao_referencias enable row level security;

-- Ponto de referência é dado público de cidade, sem informação de pessoa:
-- qualquer usuário autenticado do SIPI pode consultar; alteração é restrita.
drop policy if exists localizacao_referencias_select on public.localizacao_referencias;
create policy localizacao_referencias_select
  on public.localizacao_referencias for select
  to authenticated
  using (ativo);

grant select on public.localizacao_referencias to authenticated;

insert into public.localizacao_referencias (nome, tipo, latitude, longitude)
values
  ('Abr comércio de alimentos', 'supermercado', -16.579121, -39.550887),
  ('Auto Posto Industrial', 'posto', -16.571971, -39.561873),
  ('Auto Posto Itabela', 'posto', -16.579966, -39.556503),
  ('Auto Posto Pau Brasil', 'posto', -16.571644, -39.559643),
  ('Banco do Brasil', 'banco', -16.572472, -39.558492),
  ('Bicicleta', 'comercio', -16.577720, -39.553417),
  ('Bradesco', 'banco', -16.573454, -39.557693),
  ('Caixa Econômica Federal', 'banco', -16.572786, -39.558218),
  ('Canaã com de carnes', 'supermercado', -16.574044, -39.559316),
  ('Carlos jose costa', 'supermercado', -16.578826, -39.563820),
  ('Colégio Estadual Antônio Carlos Magalhães', 'escola', -16.575776, -39.561694),
  ('Colégio Municipal Luiz Eduardo Magalhães', 'escola', -16.575292, -39.575412),
  ('Colégio Municipal de Itabela', 'escola', -16.572664, -39.557327),
  ('Colégio Municipal de Itabela', 'escola', -16.575634, -39.550287),
  ('Câmara Municipal de Itabela', 'orgao_publico', -16.572884, -39.558419),
  ('Delegacia de Polícia Civil de Itabela', 'orgao_publico', -16.574830, -39.561801),
  ('Escola Maria D''ajuda Silva Vieira', 'escola', -16.575094, -39.563517),
  ('Escola Municipal Abdias Martins Pereira', 'escola', -16.578411, -39.600577),
  ('Escola Municipal Archimedes Ernesto da Silva', 'escola', -16.574934, -39.553670),
  ('Escola Municipal Augusto Gonçalves Costa', 'escola', -16.577720, -39.551164),
  ('Escola Municipal João Batista de Oliveira', 'escola', -16.582338, -39.551999),
  ('Escola Municipal Lúcio Ferreira da Silva', 'escola', -16.582428, -39.551550),
  ('Estádio Municipal David Manzoli', 'estadio', -16.577581, -39.566301),
  ('Farmácia Indiana', 'farmacia', -16.575755, -39.557639),
  ('Fórum Esperança Maria de Oliveira', 'orgao_publico', -16.574760, -39.561454),
  ('Hospital e Maternidade Frei Ricardo', 'hospital', -16.572547, -39.569120),
  ('Hotel e Restaurante Caraíva', 'hospedagem', -16.572240, -39.558576),
  ('Igreja Adventista do Sétimo Dia em Itabela', 'igreja', -16.577076, -39.557255),
  ('Igreja Matriz de São João Batista', 'igreja', -16.574977, -39.556462),
  ('Igreja Presbiteriana em Itabela', 'igreja', -16.573653, -39.561731),
  ('Igreja da Sagrada Família', 'igreja', -16.578348, -39.600241),
  ('Igreja de Nossa Senhora Aparecida', 'igreja', -16.575047, -39.562243),
  ('Israel neres da silva', 'supermercado', -16.576831, -39.562725),
  ('Ks Auto Posto Schmoor', 'posto', -16.579577, -39.557406),
  ('Mania Supermercado Comércio', 'supermercado', -16.579299, -39.561753),
  ('Mercado Municipal Leones Oliveira Costa', 'mercado', -16.573501, -39.559047),
  ('Mix Sups', 'supermercado', -16.573931, -39.557184),
  ('Novo Barateiro Com', 'supermercado', -16.577875, -39.551199),
  ('Pelotão da Sétima Companhia Independente de Polícia Militar', 'orgao_publico', -16.582237, -39.556726),
  ('Posto Verão Dois', 'posto', -16.602697, -39.547658),
  ('Pousada Garnier', 'hospedagem', -16.572014, -39.558070),
  ('Pousada do Posto Vitória', 'hospedagem', -16.602194, -39.547241),
  ('Praça Inocêncio Pereira', 'praca', -16.574451, -39.556572),
  ('Praça Inocêncio Pereira', 'praca', -16.574852, -39.556455),
  ('Praça José Moura de Vasconcelos', 'praca', -16.572108, -39.560887),
  ('Praça Moacir Francisqueto', 'praca', -16.575753, -39.550866),
  ('Praça do Fórum', 'praca', -16.574222, -39.561860),
  ('Prefeitura Municipal de Itabela', 'orgao_publico', -16.573017, -39.558386),
  ('Primeira Igreja Batista em Itabela', 'igreja', -16.578844, -39.555799),
  ('Rotary Club de Itabela', 'associacao', -16.572310, -39.565676),
  ('Sicoob', 'banco', -16.572752, -39.558105),
  ('Sueli Aparecida Vieira', 'supermercado', -16.577103, -39.573077),
  ('Terminal Rodoviário de Itabela', 'terminal', -16.571050, -39.561214),
  ('Waldir Bispo Moraes', 'supermercado', -16.575268, -39.572964),
  ('jeanice dos Santos Rodrigues', 'supermercado', -16.574163, -39.560056),
  ('jobson santos Silva', 'supermercado', -16.574864, -39.559546)
on conflict do nothing;

-- Palmares: posição indicada pela unidade — o quarteirão entre a Rua Ayrton
-- Senna e a Rua Dom Pedro I, a noroeste do Estádio David Manzoli.
update public.localizacao_bairros
set centro_latitude = -16.576012,
    centro_longitude = -39.567392,
    fonte = 'Referência da unidade',
    updated_at = now()
where chave = 'palmares' and municipio = 'Itabela' and uf = 'BA';
