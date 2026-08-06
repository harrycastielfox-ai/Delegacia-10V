/**
 * Contrato de dados da Agenda de Oitivas.
 *
 * Uma linha = uma pessoa convocada para um horário. O que junta várias pessoas
 * do mesmo fato é o número do B.O. ou o procedimento, não um registro "sessão".
 */

export const QUALIFICACOES = [
  "vitima",
  "testemunha",
  "autor",
  "comunicante",
  "representante_legal",
  "advogado",
  "perito",
  "outro",
] as const;
export type Qualificacao = (typeof QUALIFICACOES)[number];

export const TIPOS_ATENDIMENTO = [
  "oitiva",
  "acareacao",
  "reconhecimento",
  "entrega_documento",
  "assinatura",
  "retirada_objeto",
  "outro",
] as const;
export type TipoAtendimento = (typeof TIPOS_ATENDIMENTO)[number];

export const AGENDAMENTO_STATUS = [
  "agendado",
  "confirmado",
  "compareceu",
  "nao_compareceu",
  "remarcado",
  "cancelado",
] as const;
export type AgendamentoStatus = (typeof AGENDAMENTO_STATUS)[number];

export const INTIMACAO_STATUS = ["pendente", "enviada", "confirmada", "nao_localizado"] as const;
export type IntimacaoStatus = (typeof INTIMACAO_STATUS)[number];

export const INTIMACAO_VIAS = ["whatsapp", "telefone", "presencial", "correio", "outro"] as const;
export type IntimacaoVia = (typeof INTIMACAO_VIAS)[number];

export interface AgendamentoRecord {
  id: string;
  codigo: string;
  pessoa_nome: string;
  pessoa_telefone: string | null;
  pessoa_documento: string | null;
  qualificacao: Qualificacao;
  tipo_atendimento: TipoAtendimento;
  natureza: string | null;
  numero_bo: string | null;
  procedimento_numero: string | null;
  inquerito_id: string | null;
  /** ISO 8601 com fuso. */
  data_hora: string;
  duracao_minutos: number;
  local: string | null;
  responsavel_user_id: string | null;
  responsavel_nome: string | null;
  status: AgendamentoStatus;
  intimacao_status: IntimacaoStatus;
  intimacao_via: IntimacaoVia | null;
  observacoes: string | null;
  resultado: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type AgendamentoPayload = Partial<
  Omit<
    AgendamentoRecord,
    "id" | "codigo" | "created_at" | "updated_at" | "created_by" | "updated_by" | "responsavel_nome"
  >
> & {
  pessoa_nome: string;
  data_hora: string;
};

/** Servidor que pode conduzir o atendimento. Lista reduzida vinda do RPC. */
export interface ResponsavelOption {
  id: string;
  nome: string;
  funcao_institucional: string | null;
}

/**
 * Aviso levantado antes de salvar. Nunca bloqueia: em acareação vítima e autor
 * se encontram de propósito — quem decide é o servidor.
 */
export interface AgendaConflito {
  tipo: "horario" | "confronto";
  agendamento_id: string;
  codigo: string;
  pessoa_nome: string;
  qualificacao: Qualificacao;
  data_hora: string;
  responsavel_nome: string | null;
}

export interface AgendaOverviewStats {
  hoje: number;
  amanha: number;
  semana: number;
  intimacaoPendente: number;
  naoCompareceuMes: number;
  porQualificacao: Partial<Record<Qualificacao, number>>;
}

export interface AgendaPeriodoFilters {
  inicio: string;
  fim: string;
  responsavelUserId?: string | null;
  status?: AgendamentoStatus | null;
  search?: string | null;
  limit?: number;
}
