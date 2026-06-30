import { normalizeCaseCategory } from "@/lib/inqueritosPriority";
import { isYesLike } from "@/lib/operationalMetrics";
import type { InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const CVLI_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type CvliMetric = {
  registros: number;
  elucidados: number;
  taxa: number;
};

export type CvliMonthlyRow = {
  monthIndex: number;
  month: string;
  byYear: Record<number, CvliMetric>;
};

export type CvliMonthlyComparison = {
  years: number[];
  rows: CvliMonthlyRow[];
  totals: Record<number, CvliMetric>;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function parseValidDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickRecordText(record: InqueritoRecord, ...keys: string[]) {
  const source = record as unknown as Record<string, unknown>;
  return keys
    .map((key) => source[key])
    .filter(Boolean)
    .join(" ");
}

export function isCvliRecord(record: InqueritoRecord) {
  const formalCategory = normalizeCaseCategory(
    pickRecordText(record, "categoria_caso", "categoriaCaso", "gravidade"),
    "",
  );
  const searchable = normalizeText(
    [
      formalCategory,
      pickRecordText(
        record,
        "gravidade",
        "tipificacao",
        "classificacao",
        "tipo_penal",
        "tipo",
        "motivacao",
        "observacoes",
      ),
    ].join(" "),
  );

  return ["CVLI", "HOMICIDIO", "LATROCINIO", "FEMINICIDIO"].some((term) =>
    searchable.includes(term),
  );
}

export function getCvliReferenceDate(record: InqueritoRecord) {
  return (
    parseValidDate(record.data_fato) ??
    parseValidDate(record.data_instauracao) ??
    parseValidDate(record.created_at)
  );
}

export function isCvliElucidado(record: InqueritoRecord) {
  return isYesLike(record.elucidado);
}

function calculateRate(registros: number, elucidados: number) {
  return registros === 0 ? 0 : Number(((elucidados / registros) * 100).toFixed(1));
}

function createEmptyMetric(): CvliMetric {
  return { registros: 0, elucidados: 0, taxa: 0 };
}

export function buildCvliMonthlyComparison(inqueritos: InqueritoRecord[]): CvliMonthlyComparison {
  const cvliWithDate = inqueritos
    .filter(isCvliRecord)
    .map((record) => ({ record, referenceDate: getCvliReferenceDate(record) }))
    .filter(
      (
        item,
      ): item is {
        record: InqueritoRecord;
        referenceDate: Date;
      } => item.referenceDate !== null,
    );

  const years = Array.from(
    new Set(cvliWithDate.map(({ referenceDate }) => referenceDate.getFullYear())),
  ).sort((a, b) => a - b);

  const rows = CVLI_MONTHS.map((month, monthIndex) => ({
    month,
    monthIndex,
    byYear: Object.fromEntries(years.map((year) => [year, createEmptyMetric()])) as Record<
      number,
      CvliMetric
    >,
  }));
  const totals = Object.fromEntries(years.map((year) => [year, createEmptyMetric()])) as Record<
    number,
    CvliMetric
  >;

  cvliWithDate.forEach(({ record, referenceDate }) => {
    const year = referenceDate.getFullYear();
    const monthIndex = referenceDate.getMonth();
    const rowMetric = rows[monthIndex].byYear[year];
    const totalMetric = totals[year];

    rowMetric.registros += 1;
    totalMetric.registros += 1;

    if (isCvliElucidado(record)) {
      rowMetric.elucidados += 1;
      totalMetric.elucidados += 1;
    }
  });

  rows.forEach((row) => {
    years.forEach((year) => {
      const metric = row.byYear[year];
      metric.taxa = calculateRate(metric.registros, metric.elucidados);
    });
  });
  years.forEach((year) => {
    const metric = totals[year];
    metric.taxa = calculateRate(metric.registros, metric.elucidados);
  });

  return { years, rows, totals };
}
