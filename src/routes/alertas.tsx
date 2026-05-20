import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, ChevronRight, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { listInqueritos, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";

type Severity = "critico" | "atencao" | "informativo";

type OperacionalAlert = {
  id: string;
  severity: Severity;
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
  urgencia: number;
  busca: string;
};

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — SIPI" }] }),
  component: Alertas,
});

const tone = { critico: "var(--destructive)", atencao: "var(--warning)", informativo: "var(--info)" } as const;
const labels = { critico: "Crítico", atencao: "Atenção", informativo: "Dados Incompletos" } as const;
const icons = { critico: AlertCircle, atencao: AlertTriangle, informativo: Bell } as const;

const normalizeText = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const displayText = (v?: string | null, fallback = "Não informado") => (normalizeText(v) ? String(v).trim() : fallback);
const isConcluidoAlias = (v?: string | null) =>
  ["concluido", "concluida", "finalizado", "finalizada", "encerrado", "relatado"].some((w) => normalizeText(v).includes(w));
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
  const navigate = Route.useNavigate();
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
        setError("");
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
      const concluido = isConcluidoAlias(item.situacao) || isConcluidoAlias(item.status_diligencias);
      const ativo = !concluido;

      if (ativo && typeof dueDays === "number" && dueDays < 0) {
        items.push({
          id: `inq-${item.id}-vencido`, severity: "critico", origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: `Prazo vencido há ${Math.abs(dueDays)} dia(s).`, status,
          prazoLabel: displayText(item.prazo), ordem: 1, urgencia: Math.abs(dueDays), busca: normalizeText(`${ppe} ${principal} ${tipo} prazo vencido ${status}`),
        });
      }

      if (ativo && typeof dueDays === "number" && dueDays >= 0 && dueDays <= 7) {
        items.push({
          id: `inq-${item.id}-proximo`, severity: "atencao", origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: `Faltam ${dueDays} dia(s) para o prazo final.`, status,
          prazoLabel: displayText(item.prazo), ordem: 2, urgencia: 100 - dueDays, busca: normalizeText(`${ppe} ${principal} ${tipo} ${status} faltam ${dueDays}`),
        });
      }

      if (!normalizeText(item.vitima)) {
        items.push({
          id: `inq-${item.id}-sem-vitima`, severity: "atencao", origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: "Sem vítima", motivo: "Pendência de identificação da vítima.", status,
          prazoLabel: displayText(item.prazo), ordem: 3, urgencia: 40, busca: normalizeText(`${ppe} sem vitima ${tipo} ${status}`),
        });
      }

      if (!normalizeText(item.tipificacao) && !normalizeText(item.tipo)) {
        items.push({
          id: `inq-${item.id}-sem-tipificacao`, severity: concluido ? "atencao" : "informativo", origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo: "Não informado", identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: "Informações incompletas", status,
          prazoLabel: displayText(item.prazo), ordem: 4, urgencia: 20, busca: normalizeText(`${ppe} ${principal} sem tipificacao ${status}`),
        });
      }

      if (ativo && (!normalizeText(item.situacao) || !normalizeText(item.status_diligencias))) {
        items.push({
          id: `inq-${item.id}-nao-concluido`, severity: "informativo", origem: "Inquérito", entityType: "inquerito", entityId: item.id,
          tipo, identificacao: `PPE ${ppe}`, nomePrincipal: principal, motivo: "Inquérito ativo aguardando conclusão.", status,
          prazoLabel: displayText(item.prazo), ordem: 5, urgencia: 15, busca: normalizeText(`${ppe} ${principal} ${tipo} inquerito ativo ${status}`),
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

      if (pendente && semDecisao) {
        items.push({
          id: `rep-${item.id}-sem-decisao`, severity: "critico", origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: idCaso, nomePrincipal: vitima, motivo: "Sem decisão judicial registrada.", status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 1, urgencia: typeof diasPendente === "number" ? diasPendente : 30, busca: normalizeText(`${idCaso} ${vitima} ${tipo} sem decisao judicial ${status}`),
        });
      }

      if (pendente && typeof diasPendente === "number") {
        items.push({
          id: `rep-${item.id}-pendente`, severity: "atencao", origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: idCaso, nomePrincipal: vitima, motivo: `Representação pendente há ${Math.max(0, diasPendente)} dia(s).`, status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 3, urgencia: Math.max(1, diasPendente), busca: normalizeText(`${idCaso} ${vitima} ${tipo} pendente ${status}`),
        });
      }

      if (!normalizeText(item.vitima) || !normalizeText(item.tipo) || !normalizeText(item.processo_judicial)) {
        items.push({
          id: `rep-${item.id}-incompleta`, severity: "informativo", origem: "Representação", entityType: "representacao", entityId: item.id,
          tipo, identificacao: idCaso, nomePrincipal: vitima, motivo: "Informações incompletas", status,
          prazoLabel: displayText(item.data_representacao, "Sem data"), ordem: 4, urgencia: 25, busca: normalizeText(`${idCaso} ${vitima} ${tipo} informacoes incompletas ${status}`),
        });
      }
    });

    return items.sort((a, b) => a.ordem - b.ordem || b.urgencia - a.urgencia || a.motivo.localeCompare(b.motivo, "pt-BR"));
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader title="Central de Alertas" subtitle="Alertas operacionais baseados em dados reais do sistema" showActions={false} />

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(["critico", "atencao", "informativo"] as Severity[]).map((s) => {
            const active = severityFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverityFilter((old) => (old === s ? "todas" : s))}
                className="cursor-pointer rounded-lg border bg-card px-3 py-2 text-left transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: `color-mix(in oklab, ${tone[s]} ${active ? 45 : 28}%, var(--border))` }}
                aria-label={`Filtrar alertas ${labels[s]}`}
                title={`Filtrar por ${labels[s]}`}
              >
                <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: tone[s] }}>{labels[s]}</div>
                <div className="text-xl font-semibold leading-tight">{counts[s]}</div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSeverityFilter("todas")}
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2"
            aria-label="Ver total de alertas"
            title="Mostrar todos os alertas"
          >
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total</div>
            <div className="text-xl font-semibold leading-tight">{counts.total}</div>
          </button>
        </section>

        <section className="rounded-lg border border-border bg-card p-3">
          <label htmlFor="alerta-search" className="mb-2 block text-xs uppercase tracking-[0.12em] text-muted-foreground">Busca operacional</label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/30 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              id="alerta-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar PPE, vítima, tipo, motivo ou status"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Buscar alertas na fila operacional"
              title="Buscar alertas na fila operacional"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{visibleAlerts.length} de {counts.total} alertas visíveis</p>
        </section>

        {loading ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando fila operacional de alertas…</div> : null}
        {!loading && error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
        {!loading && !error && alerts.length === 0 ? <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Nenhum alerta operacional ativo no momento.</div> : null}
        {!loading && !error && alerts.length > 0 && visibleAlerts.length === 0 ? <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Nenhum resultado para o filtro/busca atual.</div> : null}

        {!loading && !error && visibleAlerts.length > 0 ? (
          <section className="space-y-2">
            {visibleAlerts.map((item) => {
              const Icon = icons[item.severity];
              const to = item.entityType === "inquerito" ? "/inqueritos/$caseId" : "/representacoes/$representacaoId";
              const params = item.entityType === "inquerito" ? { caseId: item.entityId } : { representacaoId: item.entityId };

              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ to, params })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ to, params });
                    }
                  }}
                  className="grid cursor-pointer grid-cols-1 gap-2 rounded-lg border border-border bg-card px-3 py-2 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,3fr)_auto_auto] md:items-center"
                  title={`Abrir ${item.origem} ${item.identificacao}`}
                  aria-label={`Abrir ${item.origem} ${item.identificacao}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: tone[item.severity] }} />
                    <span className="rounded-md border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: `color-mix(in oklab, ${tone[item.severity]} 35%, var(--border))`, color: tone[item.severity] }}>
                      {labels[item.severity]}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.identificacao} • {item.tipo}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.nomePrincipal} • {item.origem}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.motivo}</p>
                    <p className="truncate text-xs text-muted-foreground">Status: {item.status} • Prazo: {item.prazoLabel}</p>
                  </div>

                  <span className="inline-flex rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{item.origem}</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium">Ver <ChevronRight className="h-3.5 w-3.5" /></span>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}
