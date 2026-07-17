import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  FileSearch,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentProfile } from "@/lib/auth";
import { canViewRepresentacoes, type UserProfile } from "@/lib/authz";
import {
  buildModuleAlerts,
  buildSmartAlerts,
  isValidModulo,
  moduleMeta,
  normalizeText,
  type ModuleKey,
  type SmartAlert,
} from "@/lib/alertasInteligentes";
import { listInqueritos } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes } from "@/lib/repositories/representacoesRepository";
import { canAccessSigilosa } from "@/lib/representacoesSigilo";

export const Route = createFileRoute("/alertas/$modulo")({
  component: AlertasModulo,
  head: () => ({ meta: [{ title: "Módulo de Alertas - SIPI" }] }),
});

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const severityMeta = {
  critico: {
    label: "Crítico",
    rank: 4,
    badge: "border-red-500/70 bg-red-500/8 text-red-400",
    border: "border-l-red-500",
    dot: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.75)]",
  },
  alto: {
    label: "Alto",
    rank: 3,
    badge: "border-orange-400/60 bg-orange-400/8 text-orange-300",
    border: "border-l-orange-400",
    dot: "bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.7)]",
  },
  medio: {
    label: "Médio",
    rank: 2,
    badge: "border-amber-400/55 bg-amber-400/8 text-amber-300",
    border: "border-l-amber-400",
    dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]",
  },
  baixo: {
    label: "Baixo",
    rank: 1,
    badge: "border-sky-400/55 bg-sky-400/8 text-sky-300",
    border: "border-l-sky-400",
    dot: "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.65)]",
  },
} as const;

const moduleVisual: Record<
  ModuleKey,
  { iconClass: string; panelClass: string; icon: typeof Siren }
> = {
  criticos: {
    icon: Siren,
    iconClass: "border-red-500/25 bg-red-500/15 text-red-400",
    panelClass: "border-red-500/15",
  },
  prazos: {
    icon: Clock3,
    iconClass: "border-emerald-500/25 bg-emerald-500/12 text-emerald-400",
    panelClass: "border-emerald-500/15",
  },
  operacionais: {
    icon: AlertCircle,
    iconClass: "border-orange-400/25 bg-orange-400/12 text-orange-300",
    panelClass: "border-orange-400/15",
  },
  judiciais: {
    icon: FileSearch,
    iconClass: "border-sky-400/25 bg-sky-400/12 text-sky-300",
    panelClass: "border-sky-400/15",
  },
  "dados-incompletos": {
    icon: AlertCircle,
    iconClass: "border-amber-400/25 bg-amber-400/12 text-amber-300",
    panelClass: "border-amber-400/15",
  },
  sigilosas: {
    icon: ShieldAlert,
    iconClass: "border-violet-400/25 bg-violet-400/12 text-violet-300",
    panelClass: "border-violet-400/15",
  },
};

function parseAlertDueDate(value: string) {
  const raw = value.trim();
  if (!raw || raw.toLowerCase().includes("sem data")) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(raw);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(raw);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysUntilDue(value: string) {
  const dueDate = parseAlertDueDate(value);
  if (!dueDate) return null;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  return Math.round((dueDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueDeltaInfo(value: string) {
  const daysUntilDue = getDaysUntilDue(value);
  if (daysUntilDue === null) return null;

  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue);
    return {
      label: `Venceu há ${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"}`,
      className: "text-red-400",
    };
  }

  if (daysUntilDue === 0) return { label: "Vence hoje", className: "text-amber-300" };

  return {
    label: `Falta${daysUntilDue === 1 ? "" : "m"} ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"}`,
    className: daysUntilDue <= 3 ? "text-amber-300" : "text-emerald-300",
  };
}

function formatDueDate(value: string) {
  const dueDate = parseAlertDueDate(value);
  return dueDate ? dueDate.toLocaleDateString("pt-BR") : value;
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const visiblePages = Array.from(
    new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | string> = [];
  visiblePages.forEach((page, index) => {
    const previous = visiblePages[index - 1];
    if (previous && page - previous > 1) items.push(`ellipsis-${previous}`);
    items.push(page);
  });
  return items;
}

function AlertasModulo() {
  const { modulo } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moduleAlerts, setModuleAlerts] = useState(buildModuleAlerts([]));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [canOpenSigilosas, setCanOpenSigilosas] = useState(false);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("todos");
  const [teamFilter, setTeamFilter] = useState("todas");
  const [dueFilter, setDueFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("urgencia");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const selectedModule = isValidModulo(modulo) ? modulo : null;
  const detailedAlerts = useMemo(
    () => (selectedModule ? moduleAlerts[selectedModule] : []),
    [moduleAlerts, selectedModule],
  );
  const meta = selectedModule ? moduleMeta[selectedModule] : null;
  const visual = selectedModule ? moduleVisual[selectedModule] : moduleVisual.criticos;
  const ModuleIcon = visual.icon;

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [currentProfile, inq, rep] = await Promise.all([
        getCurrentProfile(),
        listInqueritos(),
        listRepresentacoes(),
      ]);
      setProfile(currentProfile);
      setCanOpenSigilosas(canAccessSigilosa(currentProfile));
      setModuleAlerts(buildModuleAlerts(buildSmartAlerts(inq, rep)));
    } catch {
      setError("Não foi possível carregar os alertas do módulo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, entityFilter, teamFilter, dueFilter, sortBy, pageSize]);

  const teams = useMemo(
    () =>
      Array.from(new Set(detailedAlerts.map((alert) => alert.team).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [detailedAlerts],
  );

  const summary = useMemo(
    () => ({
      overdue: detailedAlerts.filter((alert) => (getDaysUntilDue(alert.dueLabel) ?? 0) < 0).length,
      inqueritos: detailedAlerts.filter((alert) => alert.entityType === "inquerito").length,
      representacoes: detailedAlerts.filter((alert) => alert.entityType === "representacao").length,
    }),
    [detailedAlerts],
  );

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return detailedAlerts
      .filter((alert) => {
        const searchable = normalizeText(
          `${alert.searchable} ${alert.identifier} ${alert.principal} ${alert.typeLabel} ${alert.team} ${alert.status}`,
        );
        if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
        if (entityFilter !== "todos" && alert.entityType !== entityFilter) return false;
        if (teamFilter !== "todas" && alert.team !== teamFilter) return false;

        const daysUntilDue = getDaysUntilDue(alert.dueLabel);
        if (dueFilter === "vencidos" && (daysUntilDue === null || daysUntilDue >= 0)) return false;
        if (dueFilter === "hoje" && daysUntilDue !== 0) return false;
        if (
          dueFilter === "3dias" &&
          (daysUntilDue === null || daysUntilDue < 0 || daysUntilDue > 3)
        )
          return false;
        if (
          dueFilter === "7dias" &&
          (daysUntilDue === null || daysUntilDue < 0 || daysUntilDue > 7)
        )
          return false;
        if (dueFilter === "sem-data" && daysUntilDue !== null) return false;
        return true;
      })
      .sort((a, b) => {
        const aDue = parseAlertDueDate(a.dueLabel)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bDue = parseAlertDueDate(b.dueLabel)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (sortBy === "prazo") return aDue - bDue;
        if (sortBy === "identificacao")
          return a.identifier.localeCompare(b.identifier, "pt-BR", { numeric: true });
        if (sortBy === "equipe") return a.team.localeCompare(b.team, "pt-BR");
        return (
          severityMeta[b.severity].rank - severityMeta[a.severity].rank ||
          aDue - bDue ||
          a.identifier.localeCompare(b.identifier, "pt-BR", { numeric: true })
        );
      });
  }, [detailedAlerts, dueFilter, entityFilter, search, sortBy, teamFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedAlerts = filteredAlerts.slice(pageStart, pageStart + pageSize);
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const canOpenAlert = (alert: SmartAlert) => {
    if (!alert.entityId) return false;
    if (alert.entityType === "inquerito") return Boolean(profile);
    const isSigilosaAlert = selectedModule === "sigilosas";
    return canViewRepresentacoes(profile) && (!isSigilosaAlert || canOpenSigilosas);
  };

  const renderOpenButton = (alert: SmartAlert, compact = false) => {
    const isOpenable = canOpenAlert(alert);
    const className = `inline-flex items-center justify-center rounded-lg border transition-colors ${
      compact ? "h-9 w-9" : "h-10 w-10"
    } ${
      isOpenable
        ? "border-border bg-background/40 text-foreground hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-300"
        : "cursor-not-allowed border-border/50 text-muted-foreground/40"
    }`;

    if (!isOpenable)
      return (
        <span className={className} title="Registro indisponível ou acesso restrito">
          <ArrowRight className="h-4 w-4" />
        </span>
      );

    if (alert.entityType === "inquerito")
      return (
        <Link
          to="/inqueritos/$caseId"
          params={{ caseId: alert.entityId! }}
          className={className}
          aria-label={`Abrir inquérito ${alert.identifier}`}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      );

    return (
      <Link
        to="/representacoes/$representacaoId"
        params={{ representacaoId: alert.entityId! }}
        className={className}
        aria-label={`Abrir representação ${alert.identifier}`}
      >
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Link
          to="/alertas"
          className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 transition-colors hover:text-emerald-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Central de Alertas
        </Link>

        {!selectedModule ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Módulo inválido</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O módulo informado não existe. Use os painéis da Central de Alertas para abrir um
              módulo válido.
            </p>
          </section>
        ) : (
          <section
            className={`overflow-hidden rounded-xl border bg-card/95 shadow-[0_18px_45px_rgba(0,0,0,0.18)] ${visual.panelClass}`}
          >
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border ${visual.iconClass}`}
                >
                  <ModuleIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                    {meta?.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">{meta?.desc}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    <span className="text-red-400">{detailedAlerts.length}</span> alertas ativos
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:w-[610px]">
                <SummaryMetric
                  icon={Clock3}
                  label="Prazos vencidos"
                  value={summary.overdue}
                  tone="red"
                />
                <SummaryMetric
                  icon={FileSearch}
                  label="Inquéritos"
                  value={summary.inqueritos}
                  tone="sky"
                />
                <SummaryMetric
                  icon={ShieldAlert}
                  label="Representações"
                  value={summary.representacoes}
                  tone="violet"
                />
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
            Carregando alertas...
          </div>
        ) : null}
        {!loading && error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!loading && !error && selectedModule ? (
          <section className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            <div className="border-b border-border p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(280px,1.6fr)_150px_190px_150px]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por PPE, vítima, tipificação ou equipe..."
                      className="h-10 w-full rounded-lg border border-border bg-background/35 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-emerald-500/50"
                    />
                  </label>

                  <FilterSelect
                    icon={Filter}
                    value={entityFilter}
                    onChange={setEntityFilter}
                    ariaLabel="Filtrar por tipo de registro"
                  >
                    <option value="todos">Todos os tipos</option>
                    <option value="inquerito">Inquéritos</option>
                    <option value="representacao">Representações</option>
                  </FilterSelect>

                  <FilterSelect
                    icon={Users}
                    value={teamFilter}
                    onChange={setTeamFilter}
                    ariaLabel="Filtrar por equipe"
                  >
                    <option value="todas">Todas as equipes</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </FilterSelect>

                  <FilterSelect
                    icon={CalendarDays}
                    value={dueFilter}
                    onChange={setDueFilter}
                    ariaLabel="Filtrar por prazo"
                  >
                    <option value="todos">Todos os prazos</option>
                    <option value="vencidos">Vencidos</option>
                    <option value="hoje">Vence hoje</option>
                    <option value="3dias">Próximos 3 dias</option>
                    <option value="7dias">Próximos 7 dias</option>
                    <option value="sem-data">Sem data</option>
                  </FilterSelect>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect
                    icon={ArrowDownUp}
                    value={sortBy}
                    onChange={setSortBy}
                    ariaLabel="Ordenar alertas"
                    className="w-[185px]"
                  >
                    <option value="urgencia">Mais urgentes</option>
                    <option value="prazo">Prazo mais próximo</option>
                    <option value="identificacao">Identificação</option>
                    <option value="equipe">Equipe</option>
                  </FilterSelect>
                  <span className="px-2 text-xs text-muted-foreground">
                    {filteredAlerts.length} resultado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadAlerts()}
                    disabled={loading}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/35 text-muted-foreground transition-colors hover:border-emerald-500/45 hover:text-emerald-300 disabled:opacity-50"
                    title="Atualizar alertas"
                    aria-label="Atualizar alertas"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="p-10 text-center">
                <FileSearch className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">Nenhum alerta encontrado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste os filtros ou atualize os dados do módulo.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <div className="min-w-[1180px]">
                    <div className="grid grid-cols-[145px_190px_minmax(200px,1.1fr)_minmax(270px,1.6fr)_minmax(180px,1fr)_180px_70px] border-b border-border bg-muted/20 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <span>Criticidade</span>
                      <span>Procedimento / PPE</span>
                      <span>Vítima / alvo</span>
                      <span>Tipificação</span>
                      <span>Status / equipe</span>
                      <span>Prazo</span>
                      <span className="text-center">Ação</span>
                    </div>

                    {pagedAlerts.map((alert) => {
                      const dueDelta = getDueDeltaInfo(alert.dueLabel);
                      const severity = severityMeta[alert.severity];
                      return (
                        <article
                          key={alert.id}
                          className={`grid min-h-[100px] grid-cols-[145px_190px_minmax(200px,1.1fr)_minmax(270px,1.6fr)_minmax(180px,1fr)_180px_70px] items-center border-b border-l-2 border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-emerald-400/[0.035] ${severity.border}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${severity.dot}`} />
                            <span
                              className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase ${severity.badge}`}
                            >
                              {severity.label}
                            </span>
                          </div>

                          <div className="min-w-0 pr-4">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {alert.identifier}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{alert.module}</p>
                            <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                              <AlertCircle className="mr-1 inline h-3 w-3" />
                              {alert.action}
                            </p>
                          </div>

                          <div className="min-w-0 pr-4">
                            <p className="line-clamp-2 text-sm text-foreground">
                              {alert.principal}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              Equipe: {alert.team}
                            </p>
                          </div>

                          <div className="min-w-0 pr-4">
                            <p className="line-clamp-2 text-sm text-foreground">
                              {alert.typeLabel}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{alert.title}</p>
                          </div>

                          <div className="min-w-0 pr-4">
                            <p className="flex items-center gap-2 text-sm text-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                              <span className="truncate">{alert.status}</span>
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              Equipe: {alert.team}
                            </p>
                          </div>

                          <div className="pr-4">
                            <p className="flex items-center gap-2 text-sm text-foreground">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDueDate(alert.dueLabel)}
                            </p>
                            {dueDelta ? (
                              <p className={`mt-1 text-xs font-semibold ${dueDelta.className}`}>
                                {dueDelta.label}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex justify-center">{renderOpenButton(alert)}</div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="divide-y divide-border lg:hidden">
                  {pagedAlerts.map((alert) => {
                    const dueDelta = getDueDeltaInfo(alert.dueLabel);
                    const severity = severityMeta[alert.severity];
                    return (
                      <article key={alert.id} className={`border-l-2 p-4 ${severity.border}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${severity.dot}`} />
                              <span
                                className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase ${severity.badge}`}
                              >
                                {severity.label}
                              </span>
                            </div>
                            <h3 className="mt-3 text-base font-semibold">{alert.identifier}</h3>
                            <p className="text-xs text-muted-foreground">
                              {alert.module} · {alert.typeLabel}
                            </p>
                          </div>
                          {renderOpenButton(alert, true)}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              Vítima / alvo
                            </p>
                            <p className="mt-1">{alert.principal}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              Status / equipe
                            </p>
                            <p className="mt-1">{alert.status}</p>
                            <p className="text-xs text-muted-foreground">{alert.team}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              Prazo
                            </p>
                            <p className="mt-1">{formatDueDate(alert.dueLabel)}</p>
                            {dueDelta ? (
                              <p className={`text-xs font-semibold ${dueDelta.className}`}>
                                {dueDelta.label}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              Ação sugerida
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{alert.action}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1">
                    <PaginationButton
                      label="Primeira página"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </PaginationButton>
                    <PaginationButton
                      label="Página anterior"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </PaginationButton>
                    {paginationItems.map((item) =>
                      typeof item === "number" ? (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`h-9 min-w-9 rounded-md border px-2 text-xs font-semibold transition-colors ${
                            item === safeCurrentPage
                              ? "border-emerald-400/70 bg-emerald-400/12 text-emerald-300"
                              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          {item}
                        </button>
                      ) : (
                        <span key={item} className="px-1 text-xs text-muted-foreground">
                          ...
                        </span>
                      ),
                    )}
                    <PaginationButton
                      label="Próxima página"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </PaginationButton>
                    <PaginationButton
                      label="Última página"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </PaginationButton>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="relative">
                      <span className="sr-only">Itens por página</span>
                      <select
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        className="h-9 appearance-none rounded-lg border border-border bg-background/35 pl-3 pr-8 text-xs outline-none focus:border-emerald-500/50"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size} por página
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground" />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Exibindo {filteredAlerts.length === 0 ? 0 : pageStart + 1}–
                      {Math.min(pageStart + pageSize, filteredAlerts.length)} de{" "}
                      {filteredAlerts.length}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
  tone: "red" | "sky" | "violet";
}) {
  const toneClasses = {
    red: "text-red-400",
    sky: "text-sky-300",
    violet: "text-violet-300",
  } as const;

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-background/25 px-4 py-3">
      <Icon className={`h-6 w-6 shrink-0 ${toneClasses[tone]}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  ariaLabel,
  className = "",
  children,
}: {
  icon: typeof Filter;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`relative block ${className}`}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-10 w-full appearance-none rounded-lg border border-border bg-background/35 pl-9 pr-8 text-xs outline-none transition-colors focus:border-emerald-500/50"
      >
        {children}
      </select>
      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground" />
    </label>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-emerald-500/45 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}
