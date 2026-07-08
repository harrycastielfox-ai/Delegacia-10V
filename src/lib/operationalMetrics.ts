import type { InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import type { RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeOperationalText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isYesLike(value: unknown) {
  if (typeof value === "boolean") return value;
  return ["true", "t", "1", "sim", "s", "yes", "y", "ok"].includes(normalizeOperationalText(value));
}

export function parseOperationalDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) {
    return new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12));
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function todayAtUtcNoon(now = Date.now()) {
  const date = new Date(now);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function daysUntilOperationalDate(value: unknown, now = Date.now()) {
  const date = parseOperationalDate(value);
  if (!date) return null;

  const dateAtUtcNoon = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12);
  return Math.round((dateAtUtcNoon - todayAtUtcNoon(now)) / DAY_MS);
}

export function isOperationalDateOverdue(value: unknown, now = Date.now()) {
  const days = daysUntilOperationalDate(value, now);
  return days !== null && days < 0;
}

export function isOperationalDateDueWithin(value: unknown, limitDays: number, now = Date.now()) {
  const days = daysUntilOperationalDate(value, now);
  return days !== null && days >= 0 && days <= limitDays;
}

export function hasRelatorioEnviado(inquerito: InqueritoRecord) {
  const status = normalizeOperationalText(inquerito.relatorio_status);
  return (
    status === "enviado" ||
    isYesLike(inquerito.relatorio_enviado) ||
    Boolean(parseOperationalDate(inquerito.data_relatorio)) ||
    Boolean(parseOperationalDate(inquerito.data_envio_relatorio))
  );
}

export function isInqueritoEmAndamento(inquerito: InqueritoRecord) {
  return !hasRelatorioEnviado(inquerito);
}

export function isRelatadoNaoEnviado(inquerito: InqueritoRecord) {
  const relatorioStatus = normalizeOperationalText(inquerito.relatorio_status);
  if (relatorioStatus === "relatado") return true;

  const status = normalizeOperationalText(
    `${inquerito.situacao ?? ""} ${inquerito.status_diligencias ?? ""}`,
  );
  return status.includes("relat") && !hasRelatorioEnviado(inquerito);
}

export function hasDiligenciasPendentes(inquerito: InqueritoRecord) {
  const value = normalizeOperationalText(inquerito.diligencias_pendentes);
  const status = normalizeOperationalText(inquerito.status_diligencias);
  const negativeValues = new Set([
    "",
    "nao",
    "nenhuma",
    "sem",
    "n/a",
    "na",
    "false",
    "0",
    "concluida",
    "concluido",
  ]);

  return !negativeValues.has(value) || status.includes("pend") || status.includes("aguard");
}

export function isRepresentacaoSigilosaValue(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeOperationalText(value);
  return isYesLike(value) || normalized.includes("sigilos");
}

export function isRepresentacaoCumprida(representacao: RepresentacaoRecord) {
  const cumprimentoStatus = normalizeOperationalText(representacao.cumprimento_status);
  if (cumprimentoStatus === "cumprido") return true;

  const status = normalizeOperationalText(representacao.status);
  const resultado = normalizeOperationalText(representacao.resultado_cumprimento);
  return (
    Boolean(parseOperationalDate(representacao.data_cumprimento)) ||
    status.includes("cumprid") ||
    status.includes("finaliz") ||
    status.includes("encerrad") ||
    resultado.includes("cumprid")
  );
}

export function isRepresentacaoIndeferida(representacao: RepresentacaoRecord) {
  const cumprimentoStatus = normalizeOperationalText(representacao.cumprimento_status);
  if (cumprimentoStatus === "indeferido") return true;

  const decision = normalizeOperationalText(
    `${representacao.status ?? ""} ${representacao.observacoes_decisao ?? ""}`,
  );
  return decision.includes("indeferid") || decision.includes("negad");
}

export function isRepresentacaoDeferida(representacao: RepresentacaoRecord) {
  if (isRepresentacaoIndeferida(representacao)) return false;
  const cumprimentoStatus = normalizeOperationalText(representacao.cumprimento_status);
  if (cumprimentoStatus === "deferido") return true;

  const decision = normalizeOperationalText(
    `${representacao.status ?? ""} ${representacao.observacoes_decisao ?? ""}`,
  );
  return decision.includes("deferid");
}

export function isRepresentacaoPendente(representacao: RepresentacaoRecord) {
  if (
    isRepresentacaoCumprida(representacao) ||
    isRepresentacaoDeferida(representacao) ||
    isRepresentacaoIndeferida(representacao)
  ) {
    return false;
  }

  const status = normalizeOperationalText(representacao.status);
  const cumprimentoStatus = normalizeOperationalText(representacao.cumprimento_status);
  return (
    cumprimentoStatus === "pendente" ||
    !status ||
    status.includes("pend") ||
    status.includes("aguard") ||
    status.includes("analis") ||
    status.includes("enviad")
  );
}

export function isRepresentacaoVencida(representacao: RepresentacaoRecord, now = Date.now()) {
  return (
    !isRepresentacaoCumprida(representacao) &&
    isOperationalDateOverdue(representacao.data_vencimento, now)
  );
}

export function isRepresentacaoVencendo(
  representacao: RepresentacaoRecord,
  limitDays = 7,
  now = Date.now(),
) {
  return (
    !isRepresentacaoCumprida(representacao) &&
    isOperationalDateDueWithin(representacao.data_vencimento, limitDays, now)
  );
}
