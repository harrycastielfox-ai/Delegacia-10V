/**
 * Contrato de dados do módulo Localização Operacional.
 *
 * Os nomes de campo seguem as colunas do Supabase (snake_case), como em
 * `vehicleTypes.ts`. A camada de UI deve consumir estes tipos e nunca declarar
 * formatos próprios — assim a troca do repositório mock pelo Supabase real não
 * exige mudança nenhuma nas telas.
 */

export type DiligenciaStatus =
  "planejada" | "em_deslocamento" | "no_local" | "concluida" | "cancelada";

export type DiligenciaTipo =
  | "intimacao"
  | "verificacao_endereco"
  | "cumprimento_mandado"
  | "oitiva"
  | "vistoria_local"
  | "patrulhamento"
  | "apoio_outra_unidade"
  | "outro";

export type PessoaVinculo = "alvo" | "testemunha" | "vitima" | "informante" | "outro";

export type BairroStatus = "pendente" | "confirmado" | "nao_identificado";

export interface BairroOperacionalRecord {
  id: string;
  nome: string;
  chave: string;
  aliases: string[];
  municipio: string;
  uf: string;
  ordem: number;
  centro_latitude: number | null;
  centro_longitude: number | null;
  limite_geojson: Record<string, unknown> | null;
  posicao_confirmada: boolean;
  fonte: string | null;
  ativo: boolean;
}

export interface EnderecoRecord {
  id: string;
  logradouro: string;
  numero: string | null;
  sem_numero: boolean;
  complemento: string | null;
  bairro: string | null;
  /** Referência normalizada ao catálogo territorial. */
  bairro_id: string | null;
  /** Nunca é confirmado automaticamente por texto ou coordenada. */
  bairro_status: BairroStatus;
  bairro_confirmado_em: string | null;
  bairro_confirmado_por: string | null;
  bairro_revisado_em: string | null;
  bairro_revisado_por: string | null;
  municipio: string;
  uf: string;
  cep: string | null;
  ponto_referencia: string | null;
  /**
   * Explicação em texto corrido de como chegar, do jeito que se fala:
   * "porteira azul à direita, 4 km depois do posto, terceira casa".
   * É o campo mais valioso do cadastro — o que nenhum mapa tem.
   */
  como_chegar: string | null;
  /** Preenchidas por geocodificação ou pela confirmação em campo. */
  latitude: number | null;
  longitude: number | null;
  /** Link manual do Google Maps, útil quando a rua ainda não existe nas buscas. */
  maps_url: string | null;
  /** true depois que uma equipe confirmou o local presencialmente. */
  confirmado: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PessoaAlvoRecord {
  id: string;
  nome: string;
  /** Como a pessoa é conhecida. Na prática é por aqui que a busca acontece. */
  apelido: string | null;
  /** Caminho da foto no Supabase Storage (bucket privado, nunca URL pública). */
  foto_perfil_path: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  nome_mae: string | null;
  vinculo: PessoaVinculo;
  telefone: string | null;
  numero_bo: string | null;
  /** Número do procedimento policial usado para cruzar o cadastro com o SIPI. */
  numero_procedimento: string | null;
  endereco_id: string | null;
  inquerito_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Ficha completa carregada somente quando o usuário seleciona uma pessoa. */
export interface PessoaDetalheRecord extends PessoaAlvoRecord {
  endereco: EnderecoRecord | null;
}

/**
 * Resultado da busca "Onde Fica": a pessoa já com o local resolvido.
 * É o formato que a tela de busca e a ficha consomem — evita a UI ter que
 * cruzar pessoa e endereço por conta própria.
 */
export interface PessoaComLocal {
  id: string;
  nome: string;
  apelido: string | null;
  telefone: string | null;
  numero_bo: string | null;
  numero_procedimento: string | null;
  foto_perfil_path: string | null;
  vinculo: PessoaVinculo;
  inquerito_id: string | null;
  endereco: EnderecoRecord | null;
  /** Fotos do local (fachada, entrada, referência), não da pessoa. */
  fotos_local: RegistroFotograficoRecord[];
}

/** Endereço leve usado para montar os bairros no mapa sem carregar fichas pessoais. */
export type MapaEnderecoRecord = Pick<
  EnderecoRecord,
  | "id"
  | "logradouro"
  | "numero"
  | "sem_numero"
  | "bairro"
  | "bairro_id"
  | "bairro_status"
  | "municipio"
  | "uf"
  | "latitude"
  | "longitude"
  | "maps_url"
>;

/** Pessoa carregada sob demanda somente para a área visível ou bairro selecionado. */
export interface MapaPessoaRecord {
  id: string;
  nome: string;
  apelido: string | null;
  foto_perfil_path: string | null;
  vinculo: PessoaVinculo;
  endereco: MapaEnderecoRecord | null;
}

export interface BairroPainelDiligenciaRecord {
  id: string;
  codigo: string;
  status: DiligenciaStatus;
  equipe_nome: string | null;
  agendada_para: string | null;
  destino: string;
}

/** Ficha territorial limitada, carregada apenas depois da selecao de um bairro. */
export interface BairroPainelRecord {
  bairro_id: string;
  bairro_nome: string;
  enderecos_total: number;
  enderecos_posicionados: number;
  pessoas_total: number;
  diligencias_ativas: number;
  enderecos: MapaEnderecoRecord[];
  pessoas: MapaPessoaRecord[];
  diligencias: BairroPainelDiligenciaRecord[];
}

export type ReferenciaTipo =
  | "banco"
  | "posto"
  | "hospital"
  | "farmacia"
  | "escola"
  | "igreja"
  | "orgao_publico"
  | "terminal"
  | "mercado"
  | "associacao"
  | "supermercado"
  | "comercio"
  | "hospedagem"
  | "praca"
  | "estadio";

/**
 * Ponto de referência da cidade — banco, posto, praça, terminal.
 *
 * É por eles que as pessoas explicam onde fica uma casa ("depois do Bradesco").
 * Dado público, sem informação de pessoa: serve de orientação no mapa.
 */
export interface ReferenciaRecord {
  id: string;
  nome: string;
  tipo: ReferenciaTipo;
  latitude: number;
  longitude: number;
  fonte: string;
}

export interface DiligenciaRecord {
  id: string;
  /** Identificador legível, ex.: "DLG-2026-0876". Gerado pelo banco. */
  codigo: string;
  tipo: DiligenciaTipo;
  status: DiligenciaStatus;
  endereco_id: string | null;
  pessoa_id: string | null;
  inquerito_id: string | null;
  veiculo_id: string | null;
  equipe_nome: string | null;
  equipe_agentes: number | null;
  viatura: string | null;
  /** ISO 8601. */
  agendada_para: string | null;
  saida_em: string | null;
  chegada_em: string | null;
  concluida_em: string | null;
  /** Metros e segundos devolvidos pelo serviço de rota. */
  distancia_metros: number | null;
  duracao_segundos: number | null;
  resultado: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** Linha da tabela de diligências, já com os campos resolvidos para exibição. */
export interface DiligenciaListRecord {
  id: string;
  codigo: string;
  tipo: DiligenciaTipo;
  status: DiligenciaStatus;
  destino: string;
  bairro: string | null;
  latitude: number | null;
  longitude: number | null;
  equipe_nome: string | null;
  agendada_para: string | null;
  saida_em: string | null;
  chegada_em: string | null;
  total_count: number;
}

/** Diligência com os vínculos carregados, para a tela de detalhe e o painel lateral. */
export interface DiligenciaDetalhe extends DiligenciaRecord {
  endereco: EnderecoRecord | null;
  pessoa: PessoaAlvoRecord | null;
  fotos: RegistroFotograficoRecord[];
  chegada: ChegadaRecord | null;
}

export interface ChegadaRecord {
  id: string;
  diligencia_id: string;
  registrada_em: string;
  latitude: number;
  longitude: number;
  /** Precisão do GPS em metros, como devolvida pelo navegador. */
  precisao_metros: number | null;
  registrada_por: string | null;
  observacoes: string | null;
}

export interface RegistroFotograficoRecord {
  id: string;
  /** Foto tirada durante uma diligência. Nulo quando o local foi cadastrado avulso. */
  diligencia_id: string | null;
  /** Foto do local em si (fachada, entrada, referência) — sobrevive à diligência. */
  endereco_id: string | null;
  storage_path: string;
  legenda: string | null;
  capturada_em: string;
  latitude: number | null;
  longitude: number | null;
  created_by: string | null;
}

/** Posição da viatura durante o deslocamento, para o mapa ao vivo. */
export interface PosicaoVtrRecord {
  id: string;
  diligencia_id: string;
  latitude: number;
  longitude: number;
  precisao_metros: number | null;
  velocidade_kmh: number | null;
  registrada_em: string;
}

export interface RotaSalvaRecord {
  id: string;
  nome: string;
  origem_endereco_id: string | null;
  destino_endereco_id: string | null;
  pessoa_id: string | null;
  paradas: string[];
  distancia_metros: number | null;
  duracao_segundos: number | null;
  google_maps_url: string | null;
  waze_url: string | null;
  created_at: string;
  created_by: string | null;
}

export interface DiligenciaListFilters {
  status?: DiligenciaStatus | "todos" | "ativas";
  tipo?: DiligenciaTipo;
  equipe?: string;
  busca?: string;
  /** Datas ISO (YYYY-MM-DD). */
  de?: string;
  ate?: string;
  page?: number;
  pageSize?: number;
}

export interface LocalizacaoOverviewStats {
  ativas: number;
  em_deslocamento: number;
  no_local: number;
  concluidas_hoje: number;
  enderecos_cadastrados: number;
  pessoas_cadastradas: number;
  fotos_30_dias: number;
  /** Diligências por dia, para o gráfico da visão geral. */
  por_dia: Array<{ dia: string; total: number }>;
}

export type DiligenciaPayload = Omit<
  DiligenciaRecord,
  "id" | "codigo" | "created_at" | "updated_at" | "created_by" | "updated_by"
>;

export type EnderecoPayload = Omit<
  EnderecoRecord,
  | "id"
  | "created_at"
  | "updated_at"
  | "created_by"
  | "bairro_status"
  | "bairro_confirmado_em"
  | "bairro_confirmado_por"
  | "bairro_revisado_em"
  | "bairro_revisado_por"
> & { bairro_status?: BairroStatus };

export type PessoaAlvoPayload = Omit<
  PessoaAlvoRecord,
  "id" | "created_at" | "updated_at" | "created_by"
>;

export interface PessoaCadastroCompletoPayload {
  pessoa: Omit<PessoaAlvoPayload, "endereco_id" | "foto_perfil_path">;
  endereco: EnderecoPayload | null;
  endereco_id: string | null;
  foto: File | null;
  salvar_rota: boolean;
}
