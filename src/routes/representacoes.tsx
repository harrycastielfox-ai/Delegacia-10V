import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter } from "lucide-react";
import { listRepresentacoes, type RepresentacaoRecord } from "@/lib/repositories/representacoesRepository";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes } from "@/lib/authz";

export const Route = createFileRoute("/representacoes")({ component: Representacoes });

const normalizeText = (v?: string) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const STATUS_FILTER_CUMPRIDAS = "__status_cumpridas__";
const STATUS_FILTER_PENDENTES = "__status_pendentes__";
const TIPO_FILTER_NAO_INFORMADO = "__tipo_nao_informado__";
const TIPO_FILTER_MEDIDA_PROTETIVA = "__tipo_medida_protetiva__";
const isMedidaProtetivaAlias = (value: string) => normalizeText(value).replace(/-/g, " ").includes("protetiv");

const parseDateUtc = (value?: string | null) => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(v);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(v);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
  return null;
};

function buildOperationalStatus(r: RepresentacaoRecord) {
  const statusN = normalizeText(r.status);
  const hasJudicialDecision = statusN.includes("defer") || statusN.includes("indefer");
  const isCumprida = statusN.includes("cumprid") || Boolean(r.data_cumprimento);
  if (isCumprida) return "Cumprida/finalizada";
  if (statusN.includes("defer") && !statusN.includes("indefer")) return "Aguardando equipe cumprir";
  if (!hasJudicialDecision || statusN.includes("pend") || statusN.includes("aguard") || statusN.includes("analis")) return "Pendente judicial";
  if (statusN.includes("indefer")) return "Sem cumprimento (indeferida)";
  return "Em acompanhamento";
}

function getRepresentacaoState(r: RepresentacaoRecord) {
  const now = Date.now();
  const due = parseDateUtc(r.data_vencimento);
  const statusN = normalizeText(r.status);
  const isCumprida = statusN.includes("cumprid") || Boolean(r.data_cumprimento) || normalizeText(r.resultado_cumprimento).includes("cumpr");
  const isSpecial = Boolean(r.acompanhamento_especial);
  const isSigilosa = normalizeText(r.pedido_sigiloso).includes("sim") || normalizeText(r.pedido_sigiloso).includes("sigilos");
  const pendingJudicial = buildOperationalStatus(r) === "Pendente judicial";
  const incomplete = !normalizeText(r.tipo) || !normalizeText(r.vitima) || !normalizeText(r.investigado);
  const daysToDue = due === null ? null : Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const isOverdue = !isCumprida && due !== null && daysToDue < 0;
  const isDueSoon = !isCumprida && due !== null && daysToDue >= 0 && daysToDue <= 7;

  const priority = isOverdue ? 0 : isDueSoon ? 1 : isSpecial ? 2 : pendingJudicial ? 3 : incomplete ? 4 : 5;

  return { isCumprida, isSpecial, isSigilosa, pendingJudicial, incomplete, daysToDue, isOverdue, isDueSoon, priority };
}

function buildPrazoLabel(state: ReturnType<typeof getRepresentacaoState>) {
  if (state.isCumprida) return "🟢 Cumprida";
  if (state.isOverdue) return `🔴 Vencida há ${Math.abs(state.daysToDue ?? 0)} dia(s)`;
  if (state.daysToDue === 0) return "🟡 Vence hoje";
  if (state.daysToDue === 1) return "🟡 Vence amanhã";
  if (state.isDueSoon) return `🟡 Vence em ${state.daysToDue} dia(s)`;
  return "🟢 Sem criticidade de prazo";
}

function Representacoes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRepresentacoesIndex = location.pathname === "/representacoes";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [operationalFilter, setOperationalFilter] = useState("todas");
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => { if (!isRepresentacoesIndex) return; (async () => { try { const currentProfile = await getCurrentProfile(); if (!canViewRepresentacoes(currentProfile)) { setRestricted(true); return; } setRestricted(false); setLoading(true); setError(""); setRepresentacoes(await listRepresentacoes()); } catch { setError("Não foi possível carregar representações agora."); } finally { setLoading(false); } })(); }, [isRepresentacoesIndex]);

  const filtered = useMemo(() => {
    const s = normalizeText(searchTerm);
    const isFallbackSearch = ["nao informado", "nao informados", "vazio", "sem informacao", "sem valor"].includes(s);
    const normalizeDateInput = (value: string, asEndOfDay: boolean) => { if (!value) return null; const [year, month, day] = value.split("-").map(Number); if (!year || !month || !day) return null; return asEndOfDay ? Date.UTC(year, month - 1, day, 23, 59, 59, 999) : Date.UTC(year, month - 1, day, 0, 0, 0, 0); };
    const startDate = normalizeDateInput(dataInicial, false);
    const endDate = normalizeDateInput(dataFinal, true);

    return representacoes
      .filter((r) => {
        const state = getRepresentacaoState(r);
        const fields = [r.numero_ppe, r.vitima, r.investigado, r.processo_judicial, r.vara_juizo, r.tipo, r.status, r.equipe_responsavel, r.observacoes_internas, r.observacoes_cumprimento, r.resumo_fatos]
          .map((v) => normalizeText(String(v ?? "")));
        const matchesSearch = !s || fields.some((f) => f.includes(s)) || (isFallbackSearch && fields.some((f) => !f));
        if (!matchesSearch) return false;

        if (statusFilter === STATUS_FILTER_CUMPRIDAS && !state.isCumprida) return false;
        if (statusFilter === STATUS_FILTER_PENDENTES && state.isCumprida) return false;
        if (!["todos", STATUS_FILTER_CUMPRIDAS, STATUS_FILTER_PENDENTES].includes(statusFilter) && normalizeText(r.status) !== normalizeText(statusFilter)) return false;
        if (tipoFilter === TIPO_FILTER_NAO_INFORMADO && normalizeText(r.tipo)) return false;
        if (tipoFilter === TIPO_FILTER_MEDIDA_PROTETIVA && !normalizeText(r.tipo).includes("protetiv")) return false;
        if (!["todos", TIPO_FILTER_NAO_INFORMADO, TIPO_FILTER_MEDIDA_PROTETIVA].includes(tipoFilter) && normalizeText(r.tipo) !== normalizeText(tipoFilter)) return false;

        const recordDate = parseDateUtc(r.data_representacao);
        if (startDate !== null && (recordDate === null || recordDate < startDate)) return false;
        if (endDate !== null && (recordDate === null || recordDate > endDate)) return false;

        if (operationalFilter === "pendentes" && state.isCumprida) return false;
        if (operationalFilter === "deferidas" && !normalizeText(r.status).includes("defer")) return false;
        if (operationalFilter === "cumpridas" && !state.isCumprida) return false;
        if (operationalFilter === "vencendo" && !state.isDueSoon) return false;
        if (operationalFilter === "vencidas" && !state.isOverdue) return false;
        if (operationalFilter === "sigilosas" && !state.isSigilosa) return false;
        if (operationalFilter === "especial" && !state.isSpecial) return false;
        return true;
      })
      .sort((a, b) => {
        const as = getRepresentacaoState(a);
        const bs = getRepresentacaoState(b);
        if (as.priority !== bs.priority) return as.priority - bs.priority;
        return (parseDateUtc(b.created_at) ?? 0) - (parseDateUtc(a.created_at) ?? 0);
      });
  }, [representacoes, searchTerm, statusFilter, tipoFilter, dataInicial, dataFinal, operationalFilter]);

  const kpis = useMemo(() => {
    const base = representacoes.map((r) => getRepresentacaoState(r));
    return {
      vencidas: base.filter((s) => s.isOverdue).length,
      vencendo: base.filter((s) => s.isDueSoon).length,
      pendentesJudiciais: base.filter((s) => s.pendingJudicial).length,
      acompanhamentoEspecial: base.filter((s) => s.isSpecial).length,
      cumpridas: base.filter((s) => s.isCumprida).length,
    };
  }, [representacoes]);

  if (!isRepresentacoesIndex) return <Outlet />;
  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Representações.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const quickFilters = [
    { key: "todas", label: "Todas" }, { key: "pendentes", label: "Pendentes" }, { key: "deferidas", label: "Deferidas" }, { key: "cumpridas", label: "Cumpridas" },
    { key: "vencendo", label: "Vencendo" }, { key: "vencidas", label: "Vencidas" }, { key: "sigilosas", label: "Sigilosas" }, { key: "especial", label: "Acomp. Especial" },
  ];

  return <AppLayout><div className="space-y-5">
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4"><div><h1 className="text-2xl font-bold">Representações Judiciais</h1><p className="text-sm text-muted-foreground">Fila operacional judicial</p></div><Link to="/nova-representacao" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Cadastrar Representação</Link></div>
    {error && <p className="text-xs text-destructive">{error}</p>}

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[
        ["vencidas", "🔴 Vencidas", kpis.vencidas, "text-destructive"],
        ["vencendo", "🟡 Vencendo", kpis.vencendo, "text-warning"],
        ["pendentes", "⚖ Pendentes Judiciais", kpis.pendentesJudiciais, "text-amber-300"],
        ["especial", "🛡 Acomp. Especial", kpis.acompanhamentoEspecial, "text-info"],
        ["cumpridas", "📄 Cumpridas", kpis.cumpridas, "text-emerald-300"],
      ].map(([key, label, value, tone]) => <button key={String(key)} onClick={() => setOperationalFilter(String(key))} className={`rounded-xl border border-border bg-card/70 p-3 text-left transition hover:bg-muted/20 ${operationalFilter === key ? "ring-1 ring-primary/40" : ""}`}><p className="text-[11px] text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${tone}`}>{String(value)}</p></button>)}
    </section>

    <div className="rounded-xl border border-border/80 bg-card/70 p-4">
      <div className="flex flex-wrap gap-2">{quickFilters.map((f) => <button key={f.key} onClick={() => setOperationalFilter(f.key)} className={`rounded-full border px-3 py-1.5 text-xs ${operationalFilter === f.key ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{f.label}</button>)}</div>
      <div className="mt-3 flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input placeholder="Buscar por PPE, vítima, investigado, processo, vara, tipo, status, equipe ou observações..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 w-full rounded-xl border border-border/90 bg-background/70 py-2.5 pl-10 pr-4 text-sm" /></div><button onClick={() => setShowFilters((prev) => !prev)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm"><Filter className="h-4 w-4" />Filtros</button></div>
      {showFilters && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Status: todos</option><option value={STATUS_FILTER_CUMPRIDAS}>Status: cumpridas</option><option value={STATUS_FILTER_PENDENTES}>Status: pendentes</option></select><select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm"><option value="todos">Tipo: todos</option><option value={TIPO_FILTER_NAO_INFORMADO}>Tipo: não informado</option><option value={TIPO_FILTER_MEDIDA_PROTETIVA}>Tipo: medida protetiva</option></select><input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm" /><input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm" /></div>}
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} de {representacoes.length} representações</p>
    </div>

    <div className="space-y-2">
      {filtered.map((r) => {
        const state = getRepresentacaoState(r);
        const prazo = buildPrazoLabel(state);
        const tone = state.isOverdue
          ? "border-l-destructive"
          : state.isDueSoon || state.pendingJudicial
            ? "border-l-warning"
            : state.incomplete
              ? "border-l-info"
              : state.isCumprida
                ? "border-l-emerald-400"
                : "border-l-border";

        return <div key={r.id} role="button" tabIndex={0} title={`Abrir representação ${r.numero_ppe || r.id}`} aria-label={`Abrir representação ${r.numero_ppe || r.id}`} onClick={() => navigate({ to: "/representacoes/$representacaoId", params: { representacaoId: r.id } })} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate({ to: "/representacoes/$representacaoId", params: { representacaoId: r.id } })} className={`cursor-pointer rounded-xl border border-border/70 border-l-4 bg-card/80 px-3 py-2.5 transition hover:border-primary/40 hover:bg-muted/20 ${tone}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold">PPE {r.numero_ppe || "—"} • {r.tipo || "Não informado"}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>⚖ {buildOperationalStatus(r)}</span>
                <span>👤 {r.investigado || r.vitima || "—"}</span>
                <span>🏛 {r.vara_juizo || "Não informado"}</span>
                <span className={state.isOverdue ? "text-destructive" : state.isDueSoon ? "text-warning" : state.isCumprida ? "text-emerald-300" : "text-muted-foreground"}>🕒 {prazo.replace(/^[🟢🔴🟡]\s/u, "")}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {state.pendingJudicial && <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">PENDENTE</span>}
                {state.incomplete && <span className="rounded border border-info/40 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-info">INCOMPLETA</span>}
                {state.isSigilosa && <span className="rounded border border-purple-400/35 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">SIGILOSA</span>}
                {state.isOverdue && <span className="rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">URGENTE</span>}
                {state.isSpecial && <span className="rounded border border-info/40 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-info">ACOMP. ESPECIAL</span>}
              </div>
            </div>
            <button className="shrink-0 rounded-full border border-border/80 px-2 py-0.5 text-xs text-muted-foreground" aria-label={`Abrir detalhe da representação ${r.numero_ppe || r.id}`} title={`Abrir detalhe da representação ${r.numero_ppe || r.id}`}>›</button>
          </div>
        </div>;
      })}
      {!loading && filtered.length === 0 && <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">Nenhum resultado para a busca informada.</div>}
      {loading && <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">Carregando representações...</div>}
    </div>
  </div></AppLayout>;
}
