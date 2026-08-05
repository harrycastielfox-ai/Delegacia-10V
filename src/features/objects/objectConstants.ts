import type {
  MeasurementUnit,
  ObjectSituation,
  ObjectSituationFilter,
  ObjectType,
} from "./objectTypes";

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  arma_fogo: "Arma de fogo",
  municao: "Munição",
  entorpecente: "Entorpecente",
  dinheiro_valores: "Dinheiro / Valores",
  eletronico: "Eletrônico",
  documento: "Documento",
  joia_bem_valor: "Joia / Bem de valor",
  ferramenta: "Ferramenta",
  outro: "Outro",
};

export const OBJECT_SITUATION_LABELS: Record<ObjectSituation, string> = {
  apreendido: "Apreendido",
  em_pericia: "Em perícia",
  periciado: "Periciado",
  liberado: "Liberado / Devolvido",
  incinerado: "Incinerado / Destruído",
  disposicao_justica: "À disposição da Justiça",
  pendente_identificacao: "Pendente de identificação",
};

export const OBJECT_SITUATION_FILTER_LABELS: Record<ObjectSituationFilter, string> = {
  ...OBJECT_SITUATION_LABELS,
  nao_informada: "Não informada",
};

export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  unidade: "Unidade(s)",
  grama: "Grama(s)",
  quilograma: "Quilograma(s)",
  litro: "Litro(s)",
  real: "Reais (R$)",
  par: "Par(es)",
};

/**
 * Tipos de ocorrência do módulo de Objetos. Reaproveita o vocabulário já
 * comprovado em Veículos (mesma origem: planilha real da unidade) e
 * acrescenta os tipos próprios de apreensão de bens — porte ilegal de arma
 * e tráfico de entorpecentes.
 */
export const OBJECT_OCCURRENCE_TYPES = [
  "Sem ocorrência",
  "Furto/Roubo",
  "Receptação",
  "Porte ilegal de arma",
  "Tráfico de drogas",
  "Adulteração",
  "Perda",
  "Violência doméstica",
  "Acidente de trânsito",
  "Outros",
] as const;

/** Campos que aceitam calibre e número de série — arma, munição e eletrônico. */
export const OBJECT_TYPES_WITH_CALIBER: readonly ObjectType[] = ["arma_fogo", "municao"];
export const OBJECT_TYPES_WITH_SERIAL: readonly ObjectType[] = [
  "arma_fogo",
  "eletronico",
  "ferramenta",
];
export const OBJECT_TYPES_WITH_BRAND_MODEL: readonly ObjectType[] = [
  "arma_fogo",
  "eletronico",
  "ferramenta",
  "joia_bem_valor",
  "outro",
];

export const OBJECT_PAGE_SIZE = 20;

export function formatObjectDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    "pt-BR",
    includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" },
  ).format(date);
}

export function displayObjectValue(value?: string | number | boolean | null) {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}

export function formatObjectWeightOrValue(
  value: number | null | undefined,
  unit: MeasurementUnit | null | undefined,
) {
  if (value === null || value === undefined) return "—";
  if (unit === "real") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${MEASUREMENT_UNIT_LABELS[unit].toLowerCase()}` : formatted;
}
