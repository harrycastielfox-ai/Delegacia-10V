import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, Clock3, FileSearch, FolderKanban, Gavel, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

type Severity = "critico" | "alto" | "medio" | "baixo";
type AlertModule = "Inquérito" | "Representação";
type AlertCategory = "criticos" | "prazo" | "operacional" | "judicial" | "dados_incompletos";
type FilterKey = "todos" | "criticos" | "altos" | "inqueritos" | "representacoes" | "prazo" | "dados_incompletos";

type SmartAlert = {
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

const normalizeText = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const hasText = (v?: string | null) => normalizeText(v).length > 0;
const display = (v?: string | null, fallback = "Não informado") => (hasText(v) ? String(v).trim() : fallback);
const boolLike = (v?: string | number | boolean | null) => {
  if (typeof v === "boolean") return v;
  const n = normalizeText(String(v ?? ""));
  return ["sim", "s", "true", "1", "yes", "y", "ok"].includes(n);
};
const parseSafeDate = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
};
const diffDaysFromNow = (utcTs: number) => Math.ceil((utcTs - Date.now()) / (1000 * 60 * 60 * 24));
const isOverdue = (date?: string | null) => {
  const ts = parseSafeDate(date);
  if (ts === null) return false;
  return diffDaysFromNow(ts) < 0;
};
const isDueIn7Days = (date?: string | null) => {
  const ts = parseSafeDate(date);
  if (ts === null) return false;
  const days = diffDaysFromNow(ts);
  return days >= 0 && days <= 7;
};
const isDueInCritical3Days = (date?: string | null) => {
  const ts = parseSafeDate(date);
  if (ts === null) return false;
  const days = diffDaysFromNow(ts);
  return days >= 0 && days <= 3;
};
const hasReuPreso = (item: InqueritoRecord) => boolLike(item.reu_preso);
const hasMedidaProtetiva = (item: InqueritoRecord) => boolLike(item.medida_protetiva);
const hasDiligenciasPendentes = (item: InqueritoRecord) => boolLike(item.diligencias_pendentes) || ["pend", "aguard"].some((w) => normalizeText(item.status_diligencias).includes(w));
const isAltaPrioridade = (item: InqueritoRecord) => ["alta", "urg", "prioridade alta"].some((w) => normalizeText(item.prioridade).includes(w));
const isCvliOuHomicidio = (item: InqueritoRecord) => ["homic", "cvli", "latrocin", "feminic", "grave"].some((w) => normalizeText(`${item.tipificacao} ${item.tipo} ${item.gravidade}`).includes(w));
const isCrimeSexual = (item: InqueritoRecord) => ["estupro", "sexual", "assedio", "violacao sexual"].some((w) => normalizeText(`${item.tipificacao} ${item.tipo}`).includes(w));
const hasRelatorioEnviado = (item: InqueritoRecord) => boolLike(item.relatorio_enviado) || hasText(item.data_envio_relatorio);
const isRepresentacaoSigilosa = (item: RepresentacaoRecord) => boolLike(item.pedido_sigiloso);
const isRepresentacaoPendente = (item: RepresentacaoRecord) => ["pend", "aguard", "analise"].some((w) => normalizeText(item.status).includes(w));
const isRepresentacaoDeferida = (item: RepresentacaoRecord) => boolLike(item.observacoes_decisao) || ["deferid"].some((w) => normalizeText(`${item.status} ${item.observacoes_decisao}`).includes(w));
const isRepresentacaoIndeferida = (item: RepresentacaoRecord) => ["indeferid", "negad"].some((w) => normalizeText(`${item.status} ${item.observacoes_decisao}`).includes(w));
const isRepresentacaoCumprida = (item: RepresentacaoRecord) => hasText(item.data_cumprimento) || ["cumprid", "finaliz", "encerrad"].some((w) => normalizeText(item.status).includes(w));
const isRepresentacaoVencida = (item: RepresentacaoRecord) => isOverdue(item.data_vencimento) && !isRepresentacaoCumprida(item);
const isRepresentacaoVencendo = (item: RepresentacaoRecord) => isDueIn7Days(item.data_vencimento) && !isRepresentacaoCumprida(item);

const sevTone = { critico: "var(--destructive)", alto: "var(--warning)", medio: "#d7b24f", baixo: "var(--info)" } as const;

export const Route = createFileRoute("/alertas")({ component: Alertas, head: () => ({ meta: [{ title: "Alertas — SIPI" }] }) });

function Alertas() {
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inq, rep] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setInqueritos(inq);
        setRepresentacoes(rep);
      } catch {
        setError("Não foi possível carregar os alertas inteligentes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const alerts = useMemo<SmartAlert[]>(() => {
    const out: SmartAlert[] = [];
    inqueritos.forEach((i) => {
      const identifier = display(i.numero_ppe || i.codigo_interno || i.numero_fisico, "Sem PPE/ID");
      const principal = display(i.vitima || i.investigado, "Sem vítima/alvo");
      const typeLabel = display(i.tipificacao || i.tipo);
      const team = display(i.equipe);
      const status = display(i.situacao || i.status_diligencias);
      const dueLabel = display(i.prazo, "Sem data limite");

      if (isOverdue(i.prazo)) out.push({ id: `inq-${i.id}-vencido`, title: "Prazo vencido", severity: "critico", module: "Inquérito", category: "prazo", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Priorizar conclusão e encaminhamento imediato.", status, searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`) });
      if (isDueInCritical3Days(i.prazo)) out.push({ id: `inq-${i.id}-critico`, title: "Prazo crítico (0-3 dias)", severity: "alto", module: "Inquérito", category: "prazo", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Executar diligências urgentes e revisar pendências.", status, searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`) });
      if (!isDueInCritical3Days(i.prazo) && isDueIn7Days(i.prazo)) out.push({ id: `inq-${i.id}-7dias`, title: "Vencendo em até 7 dias", severity: "medio", module: "Inquérito", category: "prazo", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Planejar fechamento antes do vencimento.", status, searchable: normalizeText(`${identifier} ${principal} ${typeLabel}`) });
      if (hasReuPreso(i)) out.push({ id: `inq-${i.id}-preso`, title: "Réu preso", severity: "alto", module: "Inquérito", category: "operacional", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Acompanhar com prioridade máxima.", status, searchable: normalizeText(`${identifier} ${principal} reu preso`) });
      if (hasMedidaProtetiva(i)) out.push({ id: `inq-${i.id}-medida`, title: "Medida protetiva ativa", severity: "alto", module: "Inquérito", category: "operacional", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Monitorar cumprimento e risco associado.", status, searchable: normalizeText(`${identifier} ${principal} medida`) });
      if (hasDiligenciasPendentes(i)) out.push({ id: `inq-${i.id}-diligencias`, title: "Diligências pendentes", severity: isAltaPrioridade(i) ? "alto" : "medio", module: "Inquérito", category: "operacional", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Atualizar status e concluir diligências pendentes.", status, searchable: normalizeText(`${identifier} ${principal} diligencias`) });
      if (isCvliOuHomicidio(i) && !hasRelatorioEnviado(i)) out.push({ id: `inq-${i.id}-cvli-sem-rel`, title: "CVLI/Homicídio sem relatório", severity: "critico", module: "Inquérito", category: "operacional", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Emitir relatório com urgência crítica.", status, searchable: normalizeText(`${identifier} ${principal} cvli homicidio`) });
      if (isCrimeSexual(i) && !hasRelatorioEnviado(i)) out.push({ id: `inq-${i.id}-sexual-sem-rel`, title: "Crime sexual sem relatório", severity: "critico", module: "Inquérito", category: "operacional", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Priorizar relatório e medidas protetivas cabíveis.", status, searchable: normalizeText(`${identifier} ${principal} crime sexual`) });
      if (!hasText(i.numero_ppe) || !hasText(i.tipificacao || i.tipo) || !hasText(i.vitima) || !hasText(i.investigado) || !hasText(i.equipe) || (!hasText(i.data_fato) && !hasText(i.data_instauracao))) out.push({ id: `inq-${i.id}-incompleto`, title: "Dados essenciais incompletos", severity: "baixo", module: "Inquérito", category: "dados_incompletos", entityType: "inquerito", entityId: i.id, identifier, principal, typeLabel, team, dueLabel, action: "Completar campos obrigatórios operacionais.", status, searchable: normalizeText(`${identifier} ${principal} dados incompletos`) });
    });

    representacoes.forEach((r) => {
      const identifier = display(r.numero_ppe || r.codigo_interno || r.processo_judicial, "Sem PPE/ID");
      const principal = isRepresentacaoSigilosa(r) ? "Sigiloso" : display(r.vitima || r.investigado, "Sem alvo");
      const typeLabel = display(r.tipo);
      const team = display(r.equipe_responsavel || r.equipe_cumprimento);
      const status = display(r.status);
      const dueLabel = display(r.data_vencimento || r.data_representacao, "Sem data");

      if (isRepresentacaoPendente(r)) out.push({ id: `rep-${r.id}-aguardando`, title: "Representação aguardando decisão", severity: "medio", module: "Representação", category: "judicial", entityType: "representacao", entityId: r.id, identifier, principal, typeLabel, team, dueLabel, action: "Cobrar andamento judicial e atualizar status.", status, searchable: normalizeText(`${identifier} ${typeLabel} pendente`) });
      if (isRepresentacaoDeferida(r) && !isRepresentacaoCumprida(r)) out.push({ id: `rep-${r.id}-deferida`, title: "Deferida aguardando cumprimento", severity: "alto", module: "Representação", category: "judicial", entityType: "representacao", entityId: r.id, identifier, principal, typeLabel, team, dueLabel, action: "Acionar equipe para cumprimento imediato.", status, searchable: normalizeText(`${identifier} ${typeLabel} deferida`) });
      if (isRepresentacaoVencida(r)) out.push({ id: `rep-${r.id}-vencida`, title: "Representação vencida", severity: "critico", module: "Representação", category: "prazo", entityType: "representacao", entityId: r.id, identifier, principal, typeLabel, team, dueLabel, action: "Regularizar situação judicial com urgência.", status, searchable: normalizeText(`${identifier} ${typeLabel} vencida`) });
      if (!isRepresentacaoVencida(r) && isRepresentacaoVencendo(r)) out.push({ id: `rep-${r.id}-vencendo`, title: "Representação vencendo em até 7 dias", severity: "alto", module: "Representação", category: "prazo", entityType: "representacao", entityId: r.id, identifier, principal, typeLabel, team, dueLabel, action: "Concluir cumprimento antes do vencimento.", status, searchable: normalizeText(`${identifier} ${typeLabel} vencendo`) });
      if (isRepresentacaoSigilosa(r)) out.push({ id: `rep-${r.id}-sigilosa`, title: "Representação sigilosa", severity: "alto", module: "Representação", category: "judicial", entityType: "representacao", entityId: r.id, identifier, principal: "Sigiloso", typeLabel, team, dueLabel, action: "Tratar acesso e tramitação com restrição.", status, searchable: normalizeText(`${identifier} ${typeLabel} sigilosa`) });
      if (!hasText(r.processo_judicial) || !hasText(r.tipo) || !hasText(r.equipe_responsavel) || !hasText(r.status) || isRepresentacaoIndeferida(r)) out.push({ id: `rep-${r.id}-incompleta`, title: "Dados judiciais incompletos", severity: "baixo", module: "Representação", category: "dados_incompletos", entityType: "representacao", entityId: r.id, identifier, principal, typeLabel, team, dueLabel, action: "Completar dados e revisar decisão judicial registrada.", status, searchable: normalizeText(`${identifier} ${typeLabel} dados incompletos`) });
    });

    return out;
  }, [inqueritos, representacoes]);

  const stats = useMemo(() => ({
    total: alerts.length,
    criticos: alerts.filter((a) => a.severity === "critico").length,
    altos: alerts.filter((a) => a.severity === "alto").length,
    medios: alerts.filter((a) => a.severity === "medio").length,
    baixos: alerts.filter((a) => a.severity === "baixo").length,
    inqueritos: alerts.filter((a) => a.module === "Inquérito").length,
    representacoes: alerts.filter((a) => a.module === "Representação").length,
  }), [alerts]);

  const filtered = useMemo(() => alerts.filter((a) => {
    if (filter === "todos") return true;
    if (filter === "criticos") return a.severity === "critico";
    if (filter === "altos") return a.severity === "alto";
    if (filter === "inqueritos") return a.module === "Inquérito";
    if (filter === "representacoes") return a.module === "Representação";
    if (filter === "prazo") return a.category === "prazo";
    if (filter === "dados_incompletos") return a.category === "dados_incompletos";
    return true;
  }), [alerts, filter]);

  const grouped = useMemo(() => ({
    criticos: filtered.filter((a) => a.category === "criticos" || a.severity === "critico"),
    prazo: filtered.filter((a) => a.category === "prazo"),
    operacional: filtered.filter((a) => a.category === "operacional"),
    judicial: filtered.filter((a) => a.category === "judicial"),
    dados: filtered.filter((a) => a.category === "dados_incompletos"),
  }), [filtered]);

  const renderBlock = (title: string, data: SmartAlert[]) => (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground/90">{title} ({data.length})</h3>
      {data.length === 0 ? <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">Sem alertas neste bloco.</div> : data.map((a) => (
        <article key={a.id} className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{a.title}</p>
            <span className="rounded px-2 py-0.5 text-[11px]" style={{ color: sevTone[a.severity], border: `1px solid color-mix(in oklab, ${sevTone[a.severity]} 45%, var(--border))` }}>{a.severity.toUpperCase()}</span>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
            <p><FolderKanban className="mr-1 inline h-3.5 w-3.5" />Módulo: {a.module}</p>
            <p><FileSearch className="mr-1 inline h-3.5 w-3.5" />Identificação: {a.identifier}</p>
            <p>Vítima/Alvo: {a.principal}</p><p>Tipo: {a.typeLabel}</p><p>Equipe: {a.team}</p><p>Status: {a.status}</p><p><Clock3 className="mr-1 inline h-3.5 w-3.5" />Prazo/Data: {a.dueLabel}</p>
            <p className="md:col-span-2"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Ação sugerida: {a.action}</p>
          </div>
          {a.entityId ? (
            <div className="mt-3">
              {a.entityType === "inquerito" ? <Link to="/inqueritos/$caseId" params={{ caseId: a.entityId }} className="text-xs font-medium text-emerald-400 hover:underline">Abrir inquérito</Link> : <Link to="/representacoes/$representacaoId" params={{ representacaoId: a.entityId }} className="text-xs font-medium text-emerald-400 hover:underline">Abrir representação</Link>}
            </div>
          ) : <p className="mt-3 text-xs text-muted-foreground">ID indisponível para abertura.</p>}
        </article>
      ))}
    </section>
  );

  return <AppLayout><div className="space-y-4"><PageHeader title="Central de Alertas" subtitle="Alertas inteligentes por Inquéritos e Representações" showActions={false} />
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">{[
      ["Total", stats.total], ["Críticos", stats.criticos], ["Altos", stats.altos], ["Médios", stats.medios], ["Baixos", stats.baixos], ["Inquéritos", stats.inqueritos], ["Representações", stats.representacoes],
    ].map(([k, v]) => <div key={String(k)} className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</section>
    <section className="flex flex-wrap gap-2">{([
      ["todos", "Todos"], ["criticos", "Críticos"], ["altos", "Altos"], ["inqueritos", "Inquéritos"], ["representacoes", "Representações"], ["prazo", "Prazo"], ["dados_incompletos", "Dados incompletos"],
    ] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-md border px-3 py-1.5 text-xs ${filter === k ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-card"}`}>{l}</button>)}</section>
    {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando alertas…</div> : null}
    {!loading && error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error ? <div className="space-y-4">{renderBlock("Alertas Críticos", grouped.criticos)}{renderBlock("Alertas de Prazo", grouped.prazo)}{renderBlock("Alertas Operacionais", grouped.operacional)}{renderBlock("Alertas Judiciais", grouped.judicial)}{renderBlock("Alertas de Dados Incompletos", grouped.dados)}</div> : null}
  </div></AppLayout>;
}
