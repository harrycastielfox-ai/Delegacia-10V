-- Cobertura dos relacionamentos usados pelas consultas e pelas cascatas de exclusao.

create index if not exists localizacao_chegadas_diligencia_idx
  on public.localizacao_chegadas (diligencia_id);
create index if not exists localizacao_chegadas_registrada_por_idx
  on public.localizacao_chegadas (registrada_por);

create index if not exists localizacao_diligencias_created_by_idx
  on public.localizacao_diligencias (created_by);
create index if not exists localizacao_diligencias_updated_by_idx
  on public.localizacao_diligencias (updated_by);
create index if not exists localizacao_diligencias_inquerito_idx
  on public.localizacao_diligencias (inquerito_id);
create index if not exists localizacao_diligencias_veiculo_idx
  on public.localizacao_diligencias (veiculo_id);

create index if not exists localizacao_enderecos_created_by_idx
  on public.localizacao_enderecos (created_by);
create index if not exists localizacao_enderecos_updated_by_idx
  on public.localizacao_enderecos (updated_by);

create index if not exists localizacao_pessoas_created_by_idx
  on public.localizacao_pessoas (created_by);
create index if not exists localizacao_pessoas_updated_by_idx
  on public.localizacao_pessoas (updated_by);
create index if not exists localizacao_pessoas_endereco_idx
  on public.localizacao_pessoas (endereco_id);
create index if not exists localizacao_pessoas_inquerito_idx
  on public.localizacao_pessoas (inquerito_id);

create index if not exists localizacao_fotos_created_by_idx
  on public.localizacao_registros_fotograficos (created_by);
create index if not exists localizacao_fotos_diligencia_idx
  on public.localizacao_registros_fotograficos (diligencia_id);
create index if not exists localizacao_fotos_endereco_idx
  on public.localizacao_registros_fotograficos (endereco_id);

create index if not exists localizacao_rotas_created_by_idx
  on public.localizacao_rotas_salvas (created_by);
create index if not exists localizacao_rotas_origem_idx
  on public.localizacao_rotas_salvas (origem_endereco_id);
create index if not exists localizacao_rotas_destino_idx
  on public.localizacao_rotas_salvas (destino_endereco_id);
create index if not exists localizacao_rotas_pessoa_idx
  on public.localizacao_rotas_salvas (pessoa_id);
