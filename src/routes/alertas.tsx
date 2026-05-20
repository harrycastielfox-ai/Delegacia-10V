import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, ChevronDown, ChevronRight, Clock3, FileWarning, Gavel, Info, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

type Severity = "critico" | "atencao" | "informativo";
type OperacionalItem = {
  id: string;
  entityType: "inquerito" | "representacao";
  entityId: string;
  numero: string;
  vitima: string;
  tipo: string;
  prazo: string;
  status: string;
  prioridade: string;
  motivo: string;
  contexto: string[];
  dueDays?: number;
};

type AlertGroup = { id: string; title: string; severity: Severity; icon: typeof AlertTriangle; items: OperacionalItem[]; isExpandedByDefault?: boolean };

export const Route = createFileRoute("/alertas")({ head: () => ({ meta: [{ title: "Alertas — SIPI" }] }), component: Alertas });

const tone = { critico: "var(--destructive)", atencao: "var(--warning)", informativo: "var(--info)" } as const;
const labels = { critico: "Críticos", atencao: "Atenção", informativo: "Informativos" } as const;

const normalizeText = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const displayText = (v?: string | null, fallback = "Não informado") => (normalizeText(v) ? String(v).trim() : fallback);
const isConcluidoAlias = (v?: string | null) => ["concluido", "concluida", "finalizado", "finalizada", "encerrado", "relatado"].some((w) => normalizeText(v).includes(w));
const isPendenteRepresentacao = (v?: string | null) => ["pend", "analis", "aguard", "enviad"].some((w) => normalizeText(v).includes(w)) || !normalizeText(v);

const parseAnyDateUtc = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(raw);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
};

const diffDaysFromNow = (utcTimestamp: number) => Math.ceil((utcTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
const diffDaysSinceNow = (utcTimestamp: number) => Math.floor((Date.now() - utcTimestamp) / (1000 * 60 * 60 * 24));

function Alertas() {
  const [inqueritos, setInqueritos] = useState<InqueritoRecord[]>([]);
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "todas">("todas");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [inq, rep] = await Promise.all([listInqueritos(), listRepresentacoes()]);
        setInqueritos(inq);
        setRepresentacoes(rep);
      } catch {
        setError("Não foi possível carregar os alertas operacionais agora.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo<AlertGroup[]>(() => {
    const inqItems = inqueritos.map((item) => {
      const prazoTs = parseAnyDateUtc(item.prazo);
      const updatedTs = parseAnyDateUtc(item.updated_at);
      const missingFields = [!normalizeText(item.vitima), !normalizeText(item.tipificacao), !normalizeText(item.numero_ppe), !normalizeText(item.prazo), !normalizeText(item.situacao)].filter(Boolean).length;
      return {
        entityType: "inquerito" as const,
        entityId: item.id,
        numero: displayText(item.numero_ppe || item.codigo_interno || item.numero_fisico, "Sem número"),
        vitima: displayText(item.vitima),
        tipo: displayText(item.tipificacao || item.tipo),
        prazo: displayText(item.prazo),
        status: displayText(item.situacao || item.status_diligencias),
        prioridade: displayText(item.prioridade),
        prazoTs,
        dueDays: prazoTs !== null ? diffDaysFromNow(prazoTs) : undefined,
        updatedDays: updatedTs !== null ? diffDaysSinceNow(updatedTs) : undefined,
        missingFields,
      };
    });

    const ativos = inqItems.filter((r) => !isConcluidoAlias(r.status));

    const makeInqItem = (r: (typeof ativos)[number], suffix: { motivo: string; contexto?: string[] }): OperacionalItem => ({
      id: `inq-${r.entityId}-${suffix.motivo}`,
      entityType: "inquerito",
      entityId: r.entityId,
      numero: r.numero,
      vitima: r.vitima,
      tipo: r.tipo,
      prazo: r.prazo,
      status: r.status,
      prioridade: r.prioridade,
      motivo: suffix.motivo,
      dueDays: r.dueDays,
      contexto: [`PPE ${r.numero}`, `Vítima ${r.vitima}`, `Tipo ${r.tipo}`, `Status ${r.status}`, ...(suffix.contexto ?? [])],
    });

    const inqVencidos = ativos.filter((r) => typeof r.dueDays === "number" && r.dueDays < 0).map((r) => makeInqItem(r, { motivo: `Prazo vencido há ${Math.abs(r.dueDays ?? 0)} dia(s).`, contexto: [`Prazo ${r.prazo}`] }));
    const inqProximos = ativos.filter((r) => typeof r.dueDays === "number" && (r.dueDays ?? 999) >= 0 && (r.dueDays ?? 999) <= 7).map((r) => makeInqItem(r, { motivo: `Faltam ${r.dueDays ?? 0} dia(s) para vencer.`, contexto: [`Prazo ${r.prazo}`] }));
    const inqSemPrazo = ativos.filter((r) => !normalizeText(r.prazo) || normalizeText(r.prazo) === "nao informado").map((r) => makeInqItem(r, { motivo: "Sem prazo definido para controle operacional." }));
    const inqSemAtualizacao = ativos.filter((r) => (r.updatedDays ?? 0) >= 15).map((r) => makeInqItem(r, { motivo: `Última atualização há ${r.updatedDays} dia(s).` }));
    const inqNaoConcluidos = ativos.map((r) => makeInqItem(r, { motivo: "Inquérito ativo e não concluído." }));
    const inqIncompletos = inqItems.filter((r) => r.missingFields > 0).map((r) => makeInqItem(r, { motivo: r.vitima === "Não informado" ? "Sem vítima cadastrada." : r.tipo === "Não informado" ? "Sem tipificação cadastrada." : "Informações essenciais incompletas." }));

    const repItems = representacoes.map((r) => {
      const dataRepTs = parseAnyDateUtc(r.data_representacao);
      const dataDecisaoTs = parseAnyDateUtc(r.data_decisao_judicial);
      const updatedTs = parseAnyDateUtc(r.updated_at);
      const missing = [!normalizeText(r.tipo), !normalizeText(r.vitima), !normalizeText(r.processo_judicial), !normalizeText(r.status)].filter(Boolean).length;
      return {
        id: r.id,
        numero: displayText(r.numero_ppe || r.codigo_interno, "Sem número"),
        vitima: displayText(r.vitima),
        tipo: displayText(r.tipo),
        processo: displayText(r.processo_judicial),
        status: displayText(r.status),
        prioridade: displayText(r.prioridade_operacional),
        pending: isPendenteRepresentacao(r.status),
        diasAguardandoDecisao: dataRepTs !== null ? diffDaysSinceNow(dataRepTs) : undefined,
        semDecisao: dataDecisaoTs === null,
        updatedDays: updatedTs !== null ? diffDaysSinceNow(updatedTs) : undefined,
        missing,
      };
    });

    const makeRepItem = (r: (typeof repItems)[number], motivo: string): OperacionalItem => ({
      id: `rep-${r.id}-${motivo}`,
      entityType: "representacao",
      entityId: r.id,
      numero: r.numero,
      vitima: r.vitima,
      tipo: r.tipo,
      prazo: "N/A",
      status: r.status,
      prioridade: r.prioridade,
      motivo,
      contexto: [`PPE ${r.numero}`, `Vítima ${r.vitima}`, `Tipo ${r.tipo}`, `Processo ${r.processo}`, `Status ${r.status}`],
    });

    const repPendentes = repItems.filter((r) => r.pending).map((r) => makeRepItem(r, "Representação pendente de tramitação."));
    const repSemDecisao = repItems.filter((r) => r.pending && r.semDecisao && (r.diasAguardandoDecisao ?? 0) > 0).map((r) => makeRepItem(r, `Aguardando decisão judicial há ${r.diasAguardandoDecisao} dia(s).`));
    const repIncompletas = repItems.filter((r) => r.missing > 0).map((r) => makeRepItem(r, "Informações essenciais incompletas."));
    const repSemMov = repItems.filter((r) => (r.updatedDays ?? 0) >= 20).map((r) => makeRepItem(r, `Sem movimentação recente há ${r.updatedDays} dia(s).`));

    return [
      { id: "inq-vencidos", title: "Inquéritos vencidos", severity: "critico", icon: AlertTriangle, items: inqVencidos, isExpandedByDefault: true },
      { id: "inq-proximos", title: "Inquéritos próximos do prazo", severity: "atencao", icon: CalendarClock, items: inqProximos, isExpandedByDefault: true },
      { id: "rep-sem-decisao", title: "Representações sem decisão judicial", severity: "critico", icon: Gavel, items: repSemDecisao, isExpandedByDefault: true },
      { id: "inq-sem-atualizacao", title: "Inquéritos sem atualização recente", severity: "informativo", icon: Clock3, items: inqSemAtualizacao },
      { id: "inq-sem-prazo", title: "Inquéritos sem prazo definido", severity: "atencao", icon: Bell, items: inqSemPrazo },
      { id: "inq-nao-concluidos", title: "Inquéritos não concluídos", severity: "informativo", icon: Info, items: inqNaoConcluidos },
      { id: "inq-incompletos", title: "Inquéritos com informações incompletas", severity: "atencao", icon: FileWarning, items: inqIncompletos },
      { id: "rep-pendentes", title: "Representações pendentes", severity: "atencao", icon: ShieldAlert, items: repPendentes },
      { id: "rep-sem-mov", title: "Representações antigas sem movimentação", severity: "informativo", icon: Clock3, items: repSemMov },
      { id: "rep-incompletas", title: "Representações com informações incompletas", severity: "informativo", icon: FileWarning, items: repIncompletas },
    ].filter((g) => g.items.length > 0);
  }, [inqueritos, representacoes]);

  const counts = useMemo(() => ({
    critico: groups.reduce((acc, g) => acc + (g.severity === "critico" ? g.items.length : 0), 0),
    atencao: groups.reduce((acc, g) => acc + (g.severity === "atencao" ? g.items.length : 0), 0),
    informativo: groups.reduce((acc, g) => acc + (g.severity === "informativo" ? g.items.length : 0), 0),
    total: groups.reduce((acc, g) => acc + g.items.length, 0),
  }), [groups]);

  const visibleGroups = severityFilter === "todas" ? groups : groups.filter((g) => g.severity === severityFilter);

  const isCollapsed = (groupId: string, expandedByDefault = false) => collapsedGroups[groupId] ?? !expandedByDefault;

  return <AppLayout><div className="space-y-5"><PageHeader title="Central Operacional de Alertas" subtitle="Fluxo tático: ALERTA → LISTA → CASO" showActions={false} />
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">{(["critico", "atencao", "informativo"] as Severity[]).map((s) => {
      const active = severityFilter === s;
      return <button key={s} type="button" onClick={() => setSeverityFilter((old) => old === s ? "todas" : s)} className="cursor-pointer rounded-xl border bg-card/75 p-3 text-left transition hover:bg-card focus-visible:outline-none focus-visible:ring-2" style={{ borderColor: `color-mix(in oklab, ${tone[s]} ${active ? 55 : 30}%, var(--border))`, boxShadow: active ? `0 0 0 1px ${tone[s]} inset` : "none" }} aria-label={`Filtrar alertas ${labels[s]}`} title={`Filtrar por ${labels[s]}`}><div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: tone[s] }}>{labels[s]}</div><div className="text-2xl font-black">{counts[s]}</div></button>;
    })}
      <button type="button" onClick={() => setSeverityFilter("todas")} className="cursor-pointer rounded-xl border border-border bg-card/75 p-3 text-left transition hover:bg-card focus-visible:outline-none focus-visible:ring-2" aria-label="Ver total de alertas ativos" title="Mostrar todos os alertas"><div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total ativo</div><div className="text-2xl font-black">{counts.total}</div></button>
    </section>

    {loading ? <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">Carregando alertas operacionais…</div> : null}
    {!loading && error ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error && groups.length === 0 ? <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center text-sm text-muted-foreground">Nenhuma pendência operacional ativa no momento.</div> : null}
    {!loading && !error && groups.length > 0 && visibleGroups.length === 0 ? <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center text-sm text-muted-foreground">Sem resultados para o filtro selecionado.</div> : null}

    <section className="space-y-2">{visibleGroups.map((group) => {
      const Icon = group.icon;
      const collapsed = isCollapsed(group.id, group.isExpandedByDefault);
      return <div key={group.id} className="rounded-xl border bg-card/70" style={{ borderColor: `color-mix(in oklab, ${tone[group.severity]} 28%, var(--border))` }}>
        <button type="button" onClick={() => setCollapsedGroups((s) => ({ ...s, [group.id]: !collapsed }))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setCollapsedGroups((s) => ({ ...s, [group.id]: !collapsed })); } }} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-card focus-visible:outline-none focus-visible:ring-2" title={`Expandir/recolher grupo ${group.title}`} aria-label={`Expandir/recolher grupo ${group.title}`}>
          <div className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0" style={{ color: tone[group.severity] }} /><h3 className="truncate font-semibold">{group.title}</h3><span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{group.items.length}</span></div>
          {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {!collapsed ? <div className="divide-y divide-border/70">{group.items.map((item) => <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Link to={item.entityType === "inquerito" ? "/inqueritos/$caseId" : "/representacoes/$representacaoId"} params={item.entityType === "inquerito" ? { caseId: item.entityId } : { representacaoId: item.entityId }} className="cursor-pointer font-semibold hover:underline" title={`Abrir ${item.entityType === "inquerito" ? "inquérito" : "representação"} ${item.numero}`} aria-label={`Abrir ${item.entityType === "inquerito" ? "inquérito" : "representação"} ${item.numero}`}>{item.numero}</Link><span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{item.prioridade}</span></div>
            <p className="text-sm text-muted-foreground">{item.motivo}</p>
            <div className="flex flex-wrap gap-1.5">{item.contexto.slice(0, 4).map((ctx) => <span key={`${item.id}-${ctx}`} className="cursor-pointer rounded-md border border-border/80 bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground" title={ctx} aria-label={ctx}>{ctx}</span>)}</div>
          </div>
          <div className="flex items-center md:justify-end"><Link to={item.entityType === "inquerito" ? "/inqueritos/$caseId" : "/representacoes/$representacaoId"} params={item.entityType === "inquerito" ? { caseId: item.entityId } : { representacaoId: item.entityId }} className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-accent" title="Ver caso específico" aria-label="Ver caso específico">Ver</Link></div>
        </div>)}</div> : null}
      </div>;
    })}</section>
  </div></AppLayout>;
}
