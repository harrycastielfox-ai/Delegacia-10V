import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

type Severity = "critico" | "atencao" | "informativo";

type OperacionalAlert = {
  id: string;
  severity: Severity;
  priorityLabel: string;
  origem: "Inquérito" | "Representação";
  entityType: "inquerito" | "representacao";
  entityId: string;
  tipo: string;
  identificacao: string;
  nomePrincipal: string;
  motivo: string;
  status: string;
  prazoLabel: string;
  ordem: number;
  busca: string;
};

export const Route = createFileRoute("/alertas")({ head: () => ({ meta: [{ title: "Alertas — SIPI" }] }), component: Alertas });

const tone = { critico: "var(--destructive)", atencao: "var(--warning)", informativo: "var(--info)" } as const;
const labels = { critico: "Crítico", atencao: "Atenção", informativo: "Informativo" } as const;

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
  const [search, setSearch] = useState("");

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

  const alerts = useMemo<OperacionalAlert[]>(() => {
    const items: OperacionalAlert[] = [];

    inqueritos.forEach((item) => {
      const prazoTs = parseAnyDateUtc(item.prazo);
      const dueDays = prazoTs !== null ? diffDaysFromNow(prazoTs) : undefined;
      const ppe = displayText(item.numero_ppe || item.codigo_interno || item.numero_fisico, "Sem número");
      const tipo = displayText(item.tipificacao || item.tipo);
      const vitima = displayText(item.vitima);
      const investigado = displayText((item as { investigado?: string | null }).investigado);
      const principal = vitima !== "Não informado" ? vitima : investigado !== "Não informado" ? investigado : "Sem pessoa principal";
      const status = displayText(item.situacao || item.status_diligencias);
      const prioridade = displayText(item.prioridade);
      const ativo = !isConcluidoAlias(status);

      if (ativo && typeof dueDays === "number" && dueDays < 0) {
        items.push({
          id: `inq-${item.id}-vencido`, severity: "critico", priorityLabel: prioridade, origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: `Prazo vencido há ${Math.abs(dueDays)} dia(s).`, status,
          prazoLabel: displayText(item.prazo), ordem: 1, busca: normalizeText(`${ppe} ${principal} ${tipo} prazo vencido ${status}`),
        });
      }

      if (ativo && typeof dueDays === "number" && dueDays >= 0 && dueDays <= 7) {
        items.push({
          id: `inq-${item.id}-proximo`, severity: "atencao", priorityLabel: prioridade, origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: `Faltam ${dueDays} dia(s) para vencer.`, status,
          prazoLabel: displayText(item.prazo), ordem: 2, busca: normalizeText(`${ppe} ${principal} ${tipo} ${status} faltam ${dueDays}`),
        });
      }

      if (!normalizeText(item.vitima)) {
        items.push({
          id: `inq-${item.id}-sem-vitima`, severity: "atencao", priorityLabel: prioridade, origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: "Sem vítima", motivo: "Sem vítima cadastrada.", status,
          prazoLabel: displayText(item.prazo), ordem: 4, busca: normalizeText(`${ppe} sem vitima ${tipo} ${status}`),
        });
      }

      if (!normalizeText(item.tipificacao) && !normalizeText(item.tipo)) {
        items.push({
          id: `inq-${item.id}-sem-tipificacao`, severity: "informativo", priorityLabel: prioridade, origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo: "Não informado", identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: "Sem tipificação.", status,
          prazoLabel: displayText(item.prazo), ordem: 4, busca: normalizeText(`${ppe} ${principal} sem tipificacao ${status}`),
        });
      }

      if (ativo && (!normalizeText(item.situacao) || !normalizeText(item.status_diligencias))) {
        items.push({
          id: `inq-${item.id}-nao-concluido`, severity: "informativo", priorityLabel: prioridade, origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: "Inquérito ativo sem conclusão.", status,
          prazoLabel: displayText(item.prazo), ordem: 5, busca: normalizeText(`${ppe} ${principal} ${tipo} inquerito ativo ${status}`),
        });
      }
    });

    representacoes.forEach((item) => {
      const status = displayText(item.status);
      const pendente = isPendenteRepresentacao(item.status);
      const dataRepTs = parseAnyDateUtc(item.data_representacao);
      const diasPendente = dataRepTs !== null ? diffDaysSinceNow(dataRepTs) : undefined;
      const semDecisao = parseAnyDateUtc(item.data_decisao_judicial) === null;
      const idCaso = displayText(item.numero_ppe || item.codigo_interno || item.processo_judicial, "Sem identificador");
      const tipo = displayText(item.tipo);
      const vitima = displayText(item.vitima);
      const prioridade = displayText(item.prioridade_operacional);

      if (pendente && typeof diasPendente === "number") {
        items.push({
          id: `rep-${item.id}-pendente`, severity: "atencao", priorityLabel: prioridade, origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: `ID ${idCaso}`, nomePrincipal: vitima, motivo: `Representação pendente há ${Math.max(0, diasPendente)} dia(s).`, status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 3, busca: normalizeText(`${idCaso} ${vitima} ${tipo} pendente ${status}`),
        });
      }

      if (pendente && semDecisao) {
        items.push({
          id: `rep-${item.id}-sem-decisao`, severity: "critico", priorityLabel: prioridade, origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: `ID ${idCaso}`, nomePrincipal: vitima, motivo: "Sem decisão judicial.", status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 1, busca: normalizeText(`${idCaso} ${vitima} ${tipo} sem decisao judicial ${status}`),
        });
      }

      if (!normalizeText(item.vitima) || !normalizeText(item.tipo) || !normalizeText(item.processo_judicial)) {
        items.push({
          id: `rep-${item.id}-incompleta`, severity: "informativo", priorityLabel: prioridade, origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: `ID ${idCaso}`, nomePrincipal: vitima, motivo: "Informações incompletas na representação.", status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 4, busca: normalizeText(`${idCaso} ${vitima} ${tipo} informacoes incompletas ${status}`),
        });
      }
    });

    return items.sort((a, b) => a.ordem - b.ordem || a.motivo.localeCompare(b.motivo, "pt-BR"));
  }, [inqueritos, representacoes]);

  const counts = useMemo(() => ({
    critico: alerts.filter((a) => a.severity === "critico").length,
    atencao: alerts.filter((a) => a.severity === "atencao").length,
    informativo: alerts.filter((a) => a.severity === "informativo").length,
    total: alerts.length,
  }), [alerts]);

  const visibleAlerts = useMemo(() => {
    const base = severityFilter === "todas" ? alerts : alerts.filter((a) => a.severity === severityFilter);
    const q = normalizeText(search);
    return q ? base.filter((a) => a.busca.includes(q)) : base;
  }, [alerts, severityFilter, search]);

  return <AppLayout><div className="space-y-5"><PageHeader title="Central Operacional de Alertas" subtitle="Fila operacional única: ALERTA → LISTA → CASO" showActions={false} />
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">{(["critico", "atencao", "informativo"] as Severity[]).map((s) => {
      const active = severityFilter === s;
      return <button key={s} type="button" onClick={() => setSeverityFilter((old) => old === s ? "todas" : s)} className="cursor-pointer rounded-xl border bg-card/75 p-3 text-left transition hover:bg-card focus-visible:outline-none focus-visible:ring-2" style={{ borderColor: `color-mix(in oklab, ${tone[s]} ${active ? 55 : 30}%, var(--border))`, boxShadow: active ? `0 0 0 1px ${tone[s]} inset` : "none" }} aria-label={`Filtrar alertas ${labels[s]}`} title={`Filtrar por ${labels[s]}`}><div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: tone[s] }}>{labels[s]}</div><div className="text-2xl font-black">{counts[s]}</div></button>;
    })}
      <button type="button" onClick={() => setSeverityFilter("todas")} className="cursor-pointer rounded-xl border border-border bg-card/75 p-3 text-left transition hover:bg-card focus-visible:outline-none focus-visible:ring-2" aria-label="Ver total de alertas ativos" title="Mostrar todos os alertas"><div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total</div><div className="text-2xl font-black">{counts.total}</div></button>
    </section>

    <section className="rounded-xl border border-border/70 bg-card/60 p-3">
      <label htmlFor="alerta-search" className="mb-2 block text-xs uppercase tracking-[0.12em] text-muted-foreground">Busca local</label>
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input id="alerta-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar PPE, vítima, tipo, motivo ou status" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Buscar alertas na lista" title="Buscar alertas na lista" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{visibleAlerts.length} de {counts.total} alertas</p>
    </section>

    {loading ? <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">Carregando alertas operacionais…</div> : null}
    {!loading && error ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
    {!loading && !error && alerts.length === 0 ? <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center text-sm text-muted-foreground">Nenhum alerta operacional ativo no momento.</div> : null}
    {!loading && !error && alerts.length > 0 && visibleAlerts.length === 0 ? <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center text-sm text-muted-foreground">Sem resultados para o filtro/busca selecionado.</div> : null}

    {!loading && !error && visibleAlerts.length > 0 ? <section className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className="grid grid-cols-12 gap-2 border-b border-border/70 bg-background/40 px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        <div className="col-span-2">Prioridade</div><div className="col-span-2">Tipo</div><div className="col-span-2">Caso</div><div className="col-span-2">Principal</div><div className="col-span-2">Motivo</div><div className="col-span-1">Status</div><div className="col-span-1">Ação</div>
      </div>
      {visibleAlerts.map((item) => <Link key={item.id} to={item.entityType === "inquerito" ? "/inqueritos/$caseId" : "/representacoes/$representacaoId"} params={item.entityType === "inquerito" ? { caseId: item.entityId } : { representacaoId: item.entityId }} className="grid grid-cols-12 gap-2 border-b border-border/60 px-3 py-2 text-sm transition hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2" title={`Abrir ${item.origem} ${item.identificacao}`} aria-label={`Abrir ${item.origem} ${item.identificacao}`}>
        <div className="col-span-2"><span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: `color-mix(in oklab, ${tone[item.severity]} 40%, var(--border))`, color: tone[item.severity] }}>{item.priorityLabel}</span><div className="text-[11px] text-muted-foreground">{labels[item.severity]}</div></div>
        <div className="col-span-2 truncate">{item.tipo}<div className="text-[11px] text-muted-foreground">{item.origem}</div></div>
        <div className="col-span-2 truncate">{item.identificacao}<div className="text-[11px] text-muted-foreground">{item.prazoLabel}</div></div>
        <div className="col-span-2 truncate">{item.nomePrincipal}</div>
        <div className="col-span-2 truncate" title={item.motivo}>{item.motivo}</div>
        <div className="col-span-1 truncate" title={item.status}>{item.status}</div>
        <div className="col-span-1"><span className="inline-flex rounded-md border border-border px-2 py-1 text-xs">Ver</span></div>
      </Link>)}
    </section> : null}
  </div></AppLayout>;
}
