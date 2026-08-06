import type {
  AgendamentoStatus,
  IntimacaoStatus,
  IntimacaoVia,
  Qualificacao,
  TipoAtendimento,
} from "./agendaTypes";

export const QUALIFICACAO_LABELS: Record<Qualificacao, string> = {
  vitima: "Vítima",
  testemunha: "Testemunha",
  autor: "Autor / Investigado",
  comunicante: "Comunicante",
  representante_legal: "Representante legal",
  advogado: "Advogado",
  perito: "Perito",
  outro: "Outro",
};

export const TIPO_ATENDIMENTO_LABELS: Record<TipoAtendimento, string> = {
  oitiva: "Oitiva",
  acareacao: "Acareação",
  reconhecimento: "Reconhecimento",
  entrega_documento: "Entrega de documento",
  assinatura: "Assinatura",
  retirada_objeto: "Retirada de objeto",
  outro: "Outro",
};

export const AGENDAMENTO_STATUS_LABELS: Record<AgendamentoStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  compareceu: "Compareceu",
  nao_compareceu: "Não compareceu",
  remarcado: "Remarcado",
  cancelado: "Cancelado",
};

/** Token do design system por status. Nunca cor crua na UI. */
export const AGENDAMENTO_STATUS_TONE: Record<AgendamentoStatus, string> = {
  agendado: "border-info/35 bg-info/10 text-info",
  confirmado: "border-success/35 bg-success/10 text-success",
  compareceu: "border-success/35 bg-success/12 text-success",
  nao_compareceu: "border-destructive/35 bg-destructive/10 text-destructive",
  remarcado: "border-warning/35 bg-warning/10 text-warning",
  cancelado: "border-border bg-muted/40 text-muted-foreground",
};

export const INTIMACAO_STATUS_LABELS: Record<IntimacaoStatus, string> = {
  pendente: "Intimação pendente",
  enviada: "Intimação enviada",
  confirmada: "Intimação confirmada",
  nao_localizado: "Não localizado",
};

export const INTIMACAO_VIA_LABELS: Record<IntimacaoVia, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  presencial: "Presencial",
  correio: "Correio",
  outro: "Outro",
};

/**
 * Naturezas mais frequentes no balcão. Reaproveita o vocabulário já usado nos
 * outros módulos para os relatórios cruzarem sem tradução no meio.
 */
export const NATUREZAS_FREQUENTES = [
  "Agressão / Lesão corporal",
  "Ameaça",
  "Violência doméstica",
  "Furto",
  "Roubo",
  "Injúria / Calúnia / Difamação",
  "Estelionato",
  "Dano",
  "Acidente de trânsito",
  "Tráfico de drogas",
  "Receptação",
  "Desaparecimento",
  "Outros",
] as const;

export const DURACOES_MINUTOS = [15, 30, 45, 60, 90, 120] as const;

/** Qualificações que não devem esbarrar no autor na sala de espera. */
export const QUALIFICACOES_VULNERAVEIS: readonly Qualificacao[] = ["vitima", "comunicante"];

export function formatHora(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDataHora(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function formatDiaExtenso(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(value);
}

export function formatDiaCurto(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(value);
}

/** Chave YYYY-MM-DD no fuso local — agrupa por dia sem escorregar para o dia anterior. */
export function chaveDoDia(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function inicioDoDia(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function somarDias(date: Date, dias: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + dias);
  return copy;
}

/**
 * Valor para <input type="datetime-local">. O input trabalha em horário local
 * e não aceita fuso, então o ISO com "Z" precisa ser convertido antes.
 */
export function paraInputDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function ehPassado(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}
