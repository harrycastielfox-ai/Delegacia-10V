import type { InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import type { RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import {
  hasRelatorioEnviado as hasRelatorioEnviadoCentral,
  isRepresentacaoCumprida as isRepresentacaoCumpridaCentral,
  isRepresentacaoSigilosaValue,
  isOperationalDateDueWithin,
  isOperationalDateOverdue,
} from "@/lib/operationalMetrics";
import { isCvliRecord } from "@/lib/cvliMetrics";

export type Severity = "critico" | "alto" | "medio" | "baixo";
export type AlertModule = "Inquérito" | "Representação";
export type AlertCategory = "criticos" | "prazo" | "operacional" | "judicial" | "dados_incompletos";
export type ModuleKey =
  | "criticos"
  | "prazos"
  | "operacionais"
  | "judiciais"
  | "dados-incompletos"
  | "sigilosas";

export type SmartAlert = {
  id: string;
  title: string;
  severity: Severity;
  module: AlertModule;
  category: AlertCategory;
  entityType: "inquerito" | "representacao";
  entityId?: string;
  identifier: string;
  principal: string;
  typeLabel: string;
  team: string;
  dueLabel: string;
  action: string;
  status: string;
  searchable: string;
};

export const moduleMeta: Record<ModuleKey, { title: string; desc: string; badge: string }> = {
  criticos: {
    title: "Alertas Críticos",
    desc: "Situações que exigem ação imediata e prioridade máxima.",
    badge: "Urgência",
  },
  prazos: {
    title: "Alertas de Prazo",
    desc: "Prazos vencidos ou críticos que requerem atenção.",
    badge: "Temporal",
  },
  operacionais: {
    title: "Alertas Operacionais",
    desc: "Ocorrências, diligências e tarefas operacionais pendentes.",
    badge: "Execução",
  },
  judiciais: {
    title: "Alertas Judiciais",
    desc: "Decisões, intimações e comunicações judiciais pendentes.",
    badge: "Forense",
  },
  "dados-incompletos": {
    title: "Dados Incompletos",
    desc: "Registros com informações incompletas ou inconsistentes.",
    badge: "Qualidade",
  },
  sigilosas: {
    title: "Representações Sigilosas",
    desc: "Representações sigilosas com pendências de análise.",
    badge: "Acesso restrito",
  },
};

export const normalizeText = (v?: string | null) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const hasText = (v?: string | null) => normalizeText(v).length > 0;
const display = (v?: string | null, fallback = "Não informado") =>
  hasText(v) ? String(v).trim() : fallback;
const boolLike = (v?: string | number | boolean | null) => {
  if (typeof v === "boolean") return v;
  const n = normalizeText(String(v ?? ""));
  return ["sim", "s", "true", "1", "yes", "y", "ok"].includes(n);
};
const isOverdue = (date?: string | null) => isOperationalDateOverdue(date);
const isDueIn7Days = (date?: string | null) => isOperationalDateDueWithin(date, 7);
const isDueInCritical3Days = (date?: string | null) => isOperationalDateDueWithin(date, 3);
const hasReuPreso = (item: InqueritoRecord) =>
  item.reu_preso_normalizado === true || boolLike(item.reu_preso);
const hasMedidaProtetiva = (item: InqueritoRecord) =>
  item.medida_protetiva_normalizada === true || boolLike(item.medida_protetiva);
const hasDiligenciasPendentes = (item: InqueritoRecord) => {
  const diligencia = normalizeText(item.diligencias_pendentes);
  const status = normalizeText(item.status_diligencias);
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
  return !negativeValues.has(diligencia) || ["pend", "aguard"].some((w) => status.includes(w));
};
const isAltaPrioridade = (item: InqueritoRecord) =>
  ["alta", "urg", "prioridade alta"].some((w) => normalizeText(item.prioridade).includes(w));
const isCvliOuHomicidio = (item: InqueritoRecord) =>
  isCvliRecord(item) ||
  ["homic", "cvli", "latrocin", "feminic", "grave"].some((w) =>
    normalizeText(`${item.tipificacao} ${item.tipo} ${item.gravidade}`).includes(w),
  );
const isCrimeSexual = (item: InqueritoRecord) =>
  ["estupro", "sexual", "assedio", "violacao sexual"].some((w) =>
    normalizeText(`${item.tipificacao} ${item.tipo}`).includes(w),
  );
const hasRelatorioEnviado = (item: InqueritoRecord) => hasRelatorioEnviadoCentral(item);
const isInqueritoEmFluxo = (item: InqueritoRecord) => !hasRelatorioEnviado(item);
const isRepresentacaoSigilosa = (item: RepresentacaoRecord) =>
  isRepresentacaoSigilosaValue(item.pedido_sigiloso_normalizado ?? item.pedido_sigiloso);
const isRepresentacaoPendente = (item: RepresentacaoRecord) =>
  ["pend", "aguard", "analise"].some((w) => normalizeText(item.status).includes(w));
const isRepresentacaoDeferida = (item: RepresentacaoRecord) => {
  const decision = normalizeText(`${item.status} ${item.observacoes_decisao}`);
  return !decision.includes("indeferid") && decision.includes("deferid");
};
const isRepresentacaoCumprida = (item: RepresentacaoRecord) => isRepresentacaoCumpridaCentral(item);
const isRepresentacaoVencida = (item: RepresentacaoRecord) =>
  isOverdue(item.data_vencimento) && !isRepresentacaoCumprida(item);
const isRepresentacaoVencendo = (item: RepresentacaoRecord) =>
  isDueIn7Days(item.data_vencimento) && !isRepresentacaoCumprida(item);

export function buildSmartAlerts(
  inqueritos: InqueritoRecord[],
  representacoes: RepresentacaoRecord[],
) {
  const out: SmartAlert[] = [];
  inqueritos.forEach((i) => {
    const identifier = display(i.numero_ppe || i.codigo_interno || i.numero_fisico, "Sem PPE/ID");
    const principal = display(i.vitima || i.investigado, "Sem vítima/alvo");
    const typeLabel = display(i.tipificacao || i.tipo);
    const team = display(i.equipe);
    const status = display(i.situacao || i.status_diligencias);
    const dueLabel = display(i.prazo, "Sem data limite");
    const isActive = isInqueritoEmFluxo(i);

    if (isActive && isOverdue(i.prazo))
      out.push({
        id: `inq-${i.id}-vencido`,
        title: "Prazo vencido",
        severity: "critico",
        module: "Inquérito",
        category: "prazo",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Priorizar conclusão e encaminhamento imediato.",
        status,
        searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`),
      });
    if (isActive && isDueInCritical3Days(i.prazo))
      out.push({
        id: `inq-${i.id}-critico`,
        title: "Prazo crítico (0-3 dias)",
        severity: "alto",
        module: "Inquérito",
        category: "prazo",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Executar diligências urgentes e revisar pendências.",
        status,
        searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`),
      });
    if (isActive && !isDueInCritical3Days(i.prazo) && isDueIn7Days(i.prazo))
      out.push({
        id: `inq-${i.id}-7dias`,
        title: "Vencendo em até 7 dias",
        severity: "medio",
        module: "Inquérito",
        category: "prazo",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Planejar fechamento antes do vencimento.",
        status,
        searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`),
      });
    if (isActive && hasReuPreso(i))
      out.push({
        id: `inq-${i.id}-preso`,
        title: "Réu preso",
        severity: "alto",
        module: "Inquérito",
        category: "operacional",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Acompanhar com prioridade máxima.",
        status,
        searchable: normalizeText(`${identifier} ${principal} reu preso`),
      });
    if (isActive && hasMedidaProtetiva(i))
      out.push({
        id: `inq-${i.id}-medida`,
        title: "Medida protetiva ativa",
        severity: "alto",
        module: "Inquérito",
        category: "operacional",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Monitorar cumprimento e risco associado.",
        status,
        searchable: normalizeText(`${identifier} ${principal} medida`),
      });
    if (isActive && hasDiligenciasPendentes(i))
      out.push({
        id: `inq-${i.id}-diligencias`,
        title: "Diligências pendentes",
        severity: isAltaPrioridade(i) ? "alto" : "medio",
        module: "Inquérito",
        category: "operacional",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Atualizar status e concluir diligências pendentes.",
        status,
        searchable: normalizeText(`${identifier} ${principal} diligencias`),
      });
    if (isCvliOuHomicidio(i) && !hasRelatorioEnviado(i))
      out.push({
        id: `inq-${i.id}-cvli-sem-rel`,
        title: "CVLI/Homicídio sem relatório",
        severity: "critico",
        module: "Inquérito",
        category: "operacional",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Emitir relatório com urgência crítica.",
        status,
        searchable: normalizeText(`${identifier} ${principal} cvli homicidio`),
      });
    if (isCrimeSexual(i) && !hasRelatorioEnviado(i))
      out.push({
        id: `inq-${i.id}-sexual-sem-rel`,
        title: "Crime sexual sem relatório",
        severity: "critico",
        module: "Inquérito",
        category: "operacional",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Priorizar relatório e medidas protetivas cabíveis.",
        status,
        searchable: normalizeText(`${identifier} ${principal} crime sexual`),
      });
    if (
      isActive &&
      (!hasText(i.numero_ppe) ||
        !hasText(i.tipificacao || i.tipo) ||
        !hasText(i.vitima) ||
        !hasText(i.investigado) ||
        !hasText(i.equipe) ||
        (!hasText(i.data_fato) && !hasText(i.data_instauracao)))
    )
      out.push({
        id: `inq-${i.id}-incompleto`,
        title: "Dados essenciais incompletos",
        severity: "baixo",
        module: "Inquérito",
        category: "dados_incompletos",
        entityType: "inquerito",
        entityId: i.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Completar campos obrigatórios operacionais.",
        status,
        searchable: normalizeText(`${identifier} ${principal} dados incompletos`),
      });
  });

  representacoes.forEach((r) => {
    const identifier = display(
      r.numero_ppe || r.codigo_interno || r.processo_judicial,
      "Sem PPE/ID",
    );
    const principal = isRepresentacaoSigilosa(r)
      ? "Sigiloso"
      : display(r.vitima || r.investigado, "Sem alvo");
    const typeLabel = display(r.tipo);
    const team = display(r.equipe_responsavel || r.equipe_cumprimento);
    const status = display(r.status);
    const dueLabel = display(r.data_vencimento || r.data_representacao, "Sem data");

    if (isRepresentacaoPendente(r))
      out.push({
        id: `rep-${r.id}-aguardando`,
        title: "Representação aguardando decisão",
        severity: "medio",
        module: "Representação",
        category: "judicial",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Cobrar andamento judicial e atualizar status.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} pendente`),
      });
    if (isRepresentacaoDeferida(r) && !isRepresentacaoCumprida(r))
      out.push({
        id: `rep-${r.id}-deferida`,
        title: "Deferida aguardando cumprimento",
        severity: "alto",
        module: "Representação",
        category: "judicial",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Acionar equipe para cumprimento imediato.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} deferida`),
      });
    if (isRepresentacaoVencida(r))
      out.push({
        id: `rep-${r.id}-vencida`,
        title: "Representação vencida",
        severity: "critico",
        module: "Representação",
        category: "prazo",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Regularizar situação judicial com urgência.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} vencida`),
      });
    if (!isRepresentacaoVencida(r) && isRepresentacaoVencendo(r))
      out.push({
        id: `rep-${r.id}-vencendo`,
        title: "Representação vencendo em até 7 dias",
        severity: "alto",
        module: "Representação",
        category: "prazo",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Concluir cumprimento antes do vencimento.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} vencendo`),
      });
    if (isRepresentacaoSigilosa(r))
      out.push({
        id: `rep-${r.id}-sigilosa`,
        title: "Representação sigilosa",
        severity: "alto",
        module: "Representação",
        category: "judicial",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal: "Sigiloso",
        typeLabel,
        team,
        dueLabel,
        action: "Tratar acesso e tramitação com restrição.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} sigilosa`),
      });
    if (
      !hasText(r.processo_judicial) ||
      !hasText(r.tipo) ||
      !hasText(r.equipe_responsavel) ||
      !hasText(r.status)
    )
      out.push({
        id: `rep-${r.id}-incompleta`,
        title: "Dados judiciais incompletos",
        severity: "baixo",
        module: "Representação",
        category: "dados_incompletos",
        entityType: "representacao",
        entityId: r.id,
        identifier,
        principal,
        typeLabel,
        team,
        dueLabel,
        action: "Completar dados judiciais e responsáveis operacionais.",
        status,
        searchable: normalizeText(`${identifier} ${typeLabel} dados incompletos`),
      });
  });

  return out;
}

export const buildModuleAlerts = (alerts: SmartAlert[]) => ({
  criticos: alerts.filter((a) => a.severity === "critico"),
  prazos: alerts.filter((a) => a.category === "prazo"),
  operacionais: alerts.filter((a) => a.category === "operacional"),
  judiciais: alerts.filter((a) => a.category === "judicial"),
  "dados-incompletos": alerts.filter((a) => a.category === "dados_incompletos"),
  sigilosas: alerts.filter((a) => a.title === "Representação sigilosa"),
});

export type ModuleAlerts = ReturnType<typeof buildModuleAlerts>;

export const countModuleAlertsTotal = (moduleAlerts: ModuleAlerts) =>
  new Set(
    Object.values(moduleAlerts)
      .flat()
      .map((alert) => alert.id),
  ).size;

export const isValidModulo = (modulo: string): modulo is ModuleKey => modulo in moduleMeta;
