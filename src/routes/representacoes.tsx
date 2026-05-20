import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Search, Filter, Activity } from "lucide-react";
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

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const STATUS_FILTER_CUMPRIDAS = "__status_cumpridas__";
const STATUS_FILTER_PENDENTES = "__status_pendentes__";
const TIPO_FILTER_NAO_INFORMADO = "__tipo_nao_informado__";
const TIPO_FILTER_MEDIDA_PROTETIVA = "__tipo_medida_protetiva__";
const isMedidaProtetivaAlias = (value: string) => {
  const n = normalizeText(value).replace(/-/g, " ");
  return ["medida protetiva", "medidas protetivas", "protetiva", "medidas protetivas de urgencia"].includes(n);
};

const getStatusBadgeClass = (status?: string) => {
  const statusN = normalizeText(status);

  if (statusN.includes("indefer")) return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (statusN.includes("cumprid") || (statusN.includes("defer") && !statusN.includes("indefer"))) {
    return "border-emerald-400/30 bg-emerald-500/12 text-emerald-200";
  }
  if (statusN.includes("pend") || statusN.includes("aguard")) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
  if (statusN.includes("analis")) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (statusN.includes("elabor")) return "border-emerald-400/25 bg-emerald-500/8 text-emerald-100";

  return "border-slate-500/35 bg-slate-500/10 text-slate-200";
};

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
  const [representacoes, setRepresentacoes] = useState<RepresentacaoRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);

  const isCumpridaStatus = (status?: string) => normalizeText(status).includes("cumprid");
  const isIndeferidaStatus = (status?: string) => normalizeText(status).includes("indefer");
  const isDeferidaStatus = (status?: string) => {
    const statusN = normalizeText(status);
    return statusN.includes("defer") && !statusN.includes("indefer");
  };
  const isPendenteStatus = (status?: string) => {
    const statusN = normalizeText(status);
    return (
      !statusN ||
      statusN.includes("pend") ||
      statusN.includes("analis") ||
      statusN.includes("elabor") ||
      statusN.includes("aguard") ||
      statusN.includes("enviad")
    );
  };

  useEffect(() => {
    if (!isRepresentacoesIndex) return;

    (async () => {
      try {
        const currentProfile = await getCurrentProfile();
        if (!canViewRepresentacoes(currentProfile)) {
          setRestricted(true);
          return;
        }
        setRestricted(false);
        setLoading(true);
        setError("");
        setRepresentacoes(await listRepresentacoes());
      } catch {
        setError("Não foi possível carregar representações agora.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isRepresentacoesIndex]);

  useEffect(() => {
    if (!isRepresentacoesIndex) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const tipo = params.get("tipo");
    const di = params.get("dataInicial");
    const df = params.get("dataFinal");
    if (status) setStatusFilter(status);
    if (tipo) setTipoFilter(isMedidaProtetivaAlias(tipo) ? TIPO_FILTER_MEDIDA_PROTETIVA : tipo);
    if (di && /^\d{4}-\d{2}-\d{2}$/u.test(di)) setDataInicial(di);
    if (df && /^\d{4}-\d{2}-\d{2}$/u.test(df)) setDataFinal(df);
  }, [isRepresentacoesIndex, location.pathname]);

  const filtered = useMemo(() => {
    const s = normalizeText(searchTerm);
    const isFallbackSearch =
      ["nao informado", "nao informados", "vazio", "sem informacao", "sem valor"].includes(s);
    const statusFilterN = normalizeText(statusFilter);
    const tipoFilterN = normalizeText(tipoFilter);

    const normalizeDateInput = (value: string, asEndOfDay: boolean) => {
      if (!value) return null;
      const [year, month, day] = value.split("-").map(Number);
      if (!year || !month || !day) return null;
      if (asEndOfDay) return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
      return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    };

    const parseRecordDate = (value?: string | null) => {
      if (!value) return null;
      const valueN = value.trim();
      if (!valueN) return null;

      const br = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(valueN);
      if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0, 0);

      const iso = /^(\d{4})-(\d{2})-(\d{2})/u.exec(valueN);
      if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0);

      const parsed = new Date(valueN);
      if (!Number.isNaN(parsed.getTime())) {
        return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0, 0);
      }

      return null;
    };

    const startDate = normalizeDateInput(dataInicial, false);
    const endDate = normalizeDateInput(dataFinal, true);
    const hasDateRange = Boolean(startDate || endDate);

    return representacoes.filter((r) => {
      const tableFields = [
        { raw: r.numero_ppe, fallback: "—" },
        { raw: r.vitima, fallback: "—" },
        { raw: r.investigado, fallback: "—" },
        { raw: r.tipo, fallback: "Não informado" },
        { raw: r.processo_judicial, fallback: "—" },
        { raw: r.status, fallback: "—" },
      ];

      const matchesSearch =
        !s ||
        tableFields.some(({ raw, fallback }) => {
          const rawN = normalizeText(String(raw ?? ""));
          const fallbackN = normalizeText(fallback);
          if (rawN.includes(s) || fallbackN.includes(s)) return true;
          if (isFallbackSearch && (!rawN || fallbackN === "—" || fallbackN === "nao informado")) return true;
          return false;
        });

      if (!matchesSearch) return false;

      if (statusFilter === STATUS_FILTER_CUMPRIDAS && !isCumpridaStatus(r.status)) return false;
      if (statusFilter === STATUS_FILTER_PENDENTES && !isPendenteStatus(r.status)) return false;
      if (statusFilterN !== "todos" && ![STATUS_FILTER_CUMPRIDAS, STATUS_FILTER_PENDENTES].includes(statusFilter) && normalizeText(r.status) !== statusFilterN) return false;

      if (tipoFilter === TIPO_FILTER_NAO_INFORMADO) {
        if (normalizeText(r.tipo)) return false;
      } else if (tipoFilter === TIPO_FILTER_MEDIDA_PROTETIVA) {
        if (!normalizeText(r.tipo).includes("protetiv")) return false;
      } else if (tipoFilterN !== "todos" && normalizeText(r.tipo) !== tipoFilterN) {
        return false;
      }

      if (!hasDateRange) return true;
      const recordDate = parseRecordDate(r.data_representacao);
      if (recordDate === null) return false;
      if (startDate !== null && recordDate < startDate) return false;
      if (endDate !== null && recordDate > endDate) return false;
      return true;
    });
  }, [representacoes, searchTerm, statusFilter, tipoFilter, dataInicial, dataFinal]);

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(representacoes.map((r) => (r.status || "").trim()).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [representacoes]);

  const tipoOptions = useMemo(() => {
    const values = Array.from(new Set(representacoes.map((r) => (r.tipo || "").trim()).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [representacoes]);

  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter !== "todos" || tipoFilter !== "todos" || dataInicial || dataFinal);

  const stats = useMemo(() => {
    const total = representacoes.length;
    const cumpridas = representacoes.filter((r) => isCumpridaStatus(r.status)).length;
    const indeferidas = representacoes.filter((r) => isIndeferidaStatus(r.status)).length;
    const deferidas = representacoes.filter((r) => isDeferidaStatus(r.status)).length;
    const pendentes = representacoes.filter((r) => isPendenteStatus(r.status)).length;

    const grouped = representacoes.reduce<
      Record<string, { tipo: string; total: number; deferidas: number; cumpridas: number }>
    >((acc, r) => {
      const tipo = (r.tipo || "").trim() || "Não informado";
      if (!acc[tipo]) {
        acc[tipo] = { tipo, total: 0, deferidas: 0, cumpridas: 0 };
      }

      acc[tipo].total += 1;
      if (isDeferidaStatus(r.status)) acc[tipo].deferidas += 1;
      if (isCumpridaStatus(r.status)) acc[tipo].cumpridas += 1;
      return acc;
    }, {});

    const porTipo = Object.values(grouped).sort((a, b) => b.total - a.total);
    const taxaDeferimento = total > 0 ? (deferidas / total) * 100 : 0;

    return {
      total,
      deferidas,
      cumpridas,
      indeferidas,
      pendentes,
      porTipo,
      taxaDeferimento,
    };
  }, [representacoes]);

  if (!isRepresentacoesIndex) return <Outlet />;
  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Representações.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const summaryCards = [
    { label: "TOTAL", value: stats.total, hint: "Representações", tone: "var(--info)" },
    { label: "DEFERIDAS", value: stats.deferidas, hint: "Pedidos acolhidos", tone: "var(--success)" },
    { label: "CUMPRIDAS", value: stats.cumpridas, hint: "Medidas cumpridas", tone: "var(--primary)" },
    { label: "INDEFERIDAS", value: stats.indeferidas, hint: "Pedidos rejeitados", tone: "var(--destructive)" },
    { label: "PENDENTES", value: stats.pendentes, hint: "Em acompanhamento", tone: "var(--warning)" },
  ];

  const resetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setTipoFilter("todos");
    setDataInicial("");
    setDataFinal("");
  };

  const handleStatusShortcut = (target: "todos" | "deferida" | "indeferida" | "cumpridas" | "pendentes") => {
    setTipoFilter("todos");
    if (target === "todos") {
      resetAllFilters();
      return;
    }
    if (target === "deferida") return setStatusFilter("Deferida");
    if (target === "indeferida") return setStatusFilter("Indeferida");
    if (target === "cumpridas") return setStatusFilter(STATUS_FILTER_CUMPRIDAS);
    if (target === "pendentes") return setStatusFilter(STATUS_FILTER_PENDENTES);
  };

  const isStatusShortcutActive = (target: "todos" | "deferida" | "indeferida" | "cumpridas" | "pendentes") => {
    if (target === "todos") return statusFilter === "todos" && tipoFilter === "todos" && !searchTerm.trim() && !dataInicial && !dataFinal;
    if (target === "deferida") return normalizeText(statusFilter) === "deferida";
    if (target === "indeferida") return normalizeText(statusFilter) === "indeferida";
    if (target === "cumpridas") return statusFilter === STATUS_FILTER_CUMPRIDAS;
    return statusFilter === STATUS_FILTER_PENDENTES;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Representações Judiciais</h1>
            <p className="mt-1 text-sm text-muted-foreground">Medidas requeridas ao Poder Judiciário</p>
          </div>
        </div>
        <Link
          to="/nova-representacao"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Cadastrar Representação
        </Link>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            type="button"
            key={card.label}
            onClick={() => {
              if (card.label === "TOTAL") return handleStatusShortcut("todos");
              if (card.label === "DEFERIDAS") return handleStatusShortcut("deferida");
              if (card.label === "CUMPRIDAS") return handleStatusShortcut("cumpridas");
              if (card.label === "INDEFERIDAS") return handleStatusShortcut("indeferida");
              return handleStatusShortcut("pendentes");
            }}
            title={`Filtrar por ${card.label.toLowerCase()}`}
            aria-label={`Filtrar por ${card.label.toLowerCase()}`}
            className={`stat-card stat-card-border rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/20 ${isStatusShortcutActive(card.label === "TOTAL" ? "todos" : card.label === "DEFERIDAS" ? "deferida" : card.label === "CUMPRIDAS" ? "cumpridas" : card.label === "INDEFERIDAS" ? "indeferida" : "pendentes") ? "ring-1 ring-primary/40" : ""} cursor-pointer`}
            style={{ ["--stat-color" as never]: card.tone }}
          >
            <p className="text-[10px] font-bold tracking-[0.15em]" style={{ color: card.tone }}>{card.label}</p>
            <p className="mt-2 text-3xl font-bold leading-none tracking-tight tabular-nums" style={{ color: card.tone }}>
              {card.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card xl:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-xs font-bold tracking-[0.15em] text-success">POR TIPO DE REPRESENTAÇÃO</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/25 text-[10px] tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">TIPO</th>
                  <th className="px-4 py-3 text-right font-bold">TOTAL</th>
                  <th className="px-4 py-3 text-right font-bold">DEFERIDAS</th>
                  <th className="px-4 py-3 text-right font-bold">CUMPRIDAS</th>
                  <th className="px-4 py-3 text-right font-bold">% SUCESSO</th>
                </tr>
              </thead>
              <tbody>
                {stats.porTipo.map((item) => {
                  const sucesso = item.total > 0 ? (item.deferidas / item.total) * 100 : 0;
                  return (
                    <tr
                      key={item.tipo}
                      onClick={() => {
                        setStatusFilter("todos");
                        setTipoFilter(item.tipo === "Não informado" ? TIPO_FILTER_NAO_INFORMADO : item.tipo);
                      }}
                      title={`Filtrar por ${item.tipo}`}
                      aria-label={`Filtrar por ${item.tipo}`}
                      className={`border-t border-border transition-colors duration-200 hover:bg-success/10 cursor-pointer ${tipoFilter === (item.tipo === "Não informado" ? TIPO_FILTER_NAO_INFORMADO : item.tipo) ? "bg-success/10" : ""}`}
                    >
                      <td className="px-4 py-3">{item.tipo}</td>
                      <td className="px-4 py-3 text-right">{item.total}</td>
                      <td className="px-4 py-3 text-right text-success">{item.deferidas}</td>
                      <td className="px-4 py-3 text-right text-primary">{item.cumpridas}</td>
                      <td className="px-4 py-3 text-right text-warning">{formatPercent(sucesso)}</td>
                    </tr>
                  );
                })}
                {stats.porTipo.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma representação cadastrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-xs font-bold tracking-[0.15em] text-warning">STATUS GERAL</h2>
          </div>
          <div className="space-y-2 p-5 text-sm">
            <button type="button" onClick={() => handleStatusShortcut("todos")} title="Mostrar todas as representações" aria-label="Mostrar todas as representações" className={`flex w-full items-center justify-between border-b border-border pb-2 text-left hover:bg-muted/20 cursor-pointer ${isStatusShortcutActive("todos") ? "rounded px-1 ring-1 ring-primary/40" : ""}`}><span className="text-muted-foreground">Total de pedidos</span><strong>{stats.total}</strong></button>
            <button type="button" onClick={() => handleStatusShortcut("cumpridas")} title="Filtrar por cumpridas" aria-label="Filtrar por cumpridas" className={`flex w-full items-center justify-between border-b border-border pb-2 text-left hover:bg-muted/20 cursor-pointer ${isStatusShortcutActive("cumpridas") ? "rounded px-1 ring-1 ring-primary/40" : ""}`}><span className="text-muted-foreground">Cumpridas</span><strong className="text-primary">{stats.cumpridas}</strong></button>
            <button type="button" onClick={() => handleStatusShortcut("pendentes")} title="Filtrar por pendentes" aria-label="Filtrar por pendentes" className={`flex w-full items-center justify-between border-b border-border pb-2 text-left hover:bg-muted/20 cursor-pointer ${isStatusShortcutActive("pendentes") ? "rounded px-1 ring-1 ring-primary/40" : ""}`}><span className="text-muted-foreground">Pendentes</span><strong className="text-warning">{stats.pendentes}</strong></button>
            <button type="button" onClick={() => handleStatusShortcut("indeferida")} title="Filtrar por indeferidas" aria-label="Filtrar por indeferidas" className={`flex w-full items-center justify-between text-left hover:bg-muted/20 cursor-pointer ${isStatusShortcutActive("indeferida") ? "rounded px-1 ring-1 ring-primary/40" : ""}`}><span className="text-muted-foreground">Indeferidas</span><strong className="text-destructive">{stats.indeferidas}</strong></button>
            <button type="button" onClick={() => handleStatusShortcut("deferida")} title="Filtrar por deferidas" aria-label="Filtrar por deferidas" className={`mt-4 w-full rounded-lg border border-success/20 bg-success/5 p-3 text-left hover:bg-success/10 cursor-pointer ${isStatusShortcutActive("deferida") ? "ring-1 ring-success/40" : ""}`}>
              <p className="text-sm text-muted-foreground">Taxa de deferimento</p>
              <p className="text-3xl font-semibold text-success">{formatPercent(stats.taxaDeferimento)}</p>
            </button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por PPE, vítima, investigado, tipo, processo ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-border/90 bg-background/70 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/50"
            />
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium transition hover:bg-accent"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? "Ocultar filtros" : "Filtros"}</span>
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
            >
              <option value="todos">Status: todos</option>
              <option value={STATUS_FILTER_CUMPRIDAS}>Status: cumpridas</option>
              <option value={STATUS_FILTER_PENDENTES}>Status: pendentes</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
            >
              <option value="todos">Tipo: todos</option>
              <option value={TIPO_FILTER_NAO_INFORMADO}>Tipo: não informado</option>
              {tipoOptions.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="representacoes-date-input h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
            />
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="representacoes-date-input h-11 rounded-xl border border-border/90 bg-background/70 px-3 text-sm outline-none transition focus:border-primary/50"
            />
            {hasActiveFilters && (
              <button
                onClick={() => {
                  resetAllFilters();
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background/70 px-3 text-sm font-medium transition hover:bg-accent md:col-span-4"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
        <style>{`
          .representacoes-date-input::-webkit-calendar-picker-indicator {
            opacity: 0.9;
            cursor: pointer;
            filter: brightness(0) saturate(100%) invert(72%) sepia(79%) saturate(746%) hue-rotate(74deg) brightness(105%) contrast(102%);
            transition: filter 0.2s ease, opacity 0.2s ease;
          }

          .representacoes-date-input:hover::-webkit-calendar-picker-indicator {
            opacity: 1;
            filter: brightness(0) saturate(100%) invert(78%) sepia(88%) saturate(835%) hue-rotate(72deg) brightness(112%) contrast(105%);
          }
        `}</style>
        <p className="mt-3 text-xs text-muted-foreground">
          {filtered.length} de {representacoes.length} representações
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
        <div className="border-b border-border bg-muted/20 px-4 py-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          REPRESENTAÇÕES CADASTRADAS
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/25 text-[10px] tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">PPE</th>
                <th className="text-left px-4 py-3 font-bold">VÍTIMA</th>
                <th className="text-left px-4 py-3 font-bold">INVESTIGADO</th>
                <th className="text-left px-4 py-3 font-bold">TIPO</th>
                <th className="text-left px-4 py-3 font-bold">PROCESSO</th>
                <th className="text-left px-4 py-3 font-bold">DATA</th>
                <th className="text-left px-4 py-3 font-bold">STATUS</th>
                <th className="text-right px-4 py-3 font-bold">AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/70 transition-colors duration-200 hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{r.numero_ppe || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs">{r.vitima || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs">{r.investigado || "—"}</td>
                  <td className="max-w-[250px] truncate px-4 py-3 text-xs">{r.tipo || "Não informado"}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs">{r.processo_judicial || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.data_representacao || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(r.status)}`}>
                      {r.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        navigate({
                          to: "/representacoes/$representacaoId",
                          params: { representacaoId: r.id },
                        })
                      }
                      className="inline-flex min-h-8 items-center justify-center rounded-lg border border-info/40 bg-info/15 px-3.5 py-1.5 text-xs font-semibold text-info transition hover:bg-info/25 hover:text-info/90"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && representacoes.length > 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Nenhum resultado para a busca informada.
                  </td>
                </tr>
              )}
              {!loading && representacoes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Nenhuma representação cadastrada ainda.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-center text-muted-foreground">
                    Carregando representações...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
