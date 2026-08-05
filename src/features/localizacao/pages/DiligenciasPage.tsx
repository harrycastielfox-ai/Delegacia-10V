import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  MapPinCheck,
  Navigation,
  Plus,
  RadioTower,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  getLocalizacaoOverviewStats,
  listDiligenciasPage,
} from "@/lib/repositories/localizacaoRepository";
import { DILIGENCIA_STATUS_LABELS, DILIGENCIA_TIPO_LABELS } from "../localizacaoConstants";
import type {
  DiligenciaListRecord,
  DiligenciaStatus,
  DiligenciaTipo,
  LocalizacaoOverviewStats,
} from "../localizacaoTypes";
import { DiligenciasTable } from "../components/DiligenciasTable";

const PAGE_SIZE = 10;

export default function DiligenciasPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DiligenciaStatus | "todos" | "ativas">("todos");
  const [tipo, setTipo] = useState<DiligenciaTipo | "">("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<DiligenciaListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<LocalizacaoOverviewStats | null>(null);

  useEffect(() => {
    void getLocalizacaoOverviewStats()
      .then(setSummary)
      .catch((cause) => {
        console.error("[DiligenciasPage] Falha ao carregar resumo", cause);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status, tipo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listDiligenciasPage({
      busca: search || undefined,
      status,
      tipo: tipo || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) {
          setRecords(result);
          setError("");
        }
      })
      .catch((cause) => {
        console.error("[DiligenciasPage] Falha ao carregar diligências", cause);
        if (!cancelled) {
          setRecords([]);
          setError("Não foi possível carregar as diligências.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, status, tipo]);

  const total = records[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visibleRecords = useMemo(
    () =>
      records.length > PAGE_SIZE
        ? records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        : records,
    [page, records],
  );
  const hasFilters = Boolean(searchInput || status !== "todos" || tipo);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("todos");
    setTipo("");
    setPage(1);
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Diligências"
          subtitle="Distribuição, andamento e prioridade das ordens externas."
          showActions={false}
        />
        <Link
          to="/localizacao/diligencias/nova"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-4 py-2.5 text-sm font-bold text-[var(--operational-contrast)] transition hover:-translate-y-0.5 hover:shadow-[0_0_22px_color-mix(in_oklab,var(--operational)_28%,transparent)]"
        >
          <Plus className="h-4 w-4" /> Nova diligência
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryButton
          label="Ativas"
          value={summary?.ativas ?? "—"}
          hint="Ordens abertas"
          icon={RadioTower}
          active={status === "ativas"}
          onClick={() => setStatus("ativas")}
        />
        <SummaryButton
          label="Em deslocamento"
          value={summary?.em_deslocamento ?? "—"}
          hint="Equipes a caminho"
          icon={Navigation}
          active={status === "em_deslocamento"}
          onClick={() => setStatus("em_deslocamento")}
        />
        <SummaryButton
          label="No local"
          value={summary?.no_local ?? "—"}
          hint="Presença confirmada"
          icon={MapPinCheck}
          active={status === "no_local"}
          onClick={() => setStatus("no_local")}
          tone="success"
        />
        <SummaryButton
          label="Concluídas hoje"
          value={summary?.concluidas_hoje ?? "—"}
          hint="Finalizadas no dia"
          icon={CheckCircle2}
          active={status === "concluida"}
          onClick={() => setStatus("concluida")}
          tone="info"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(240px,1fr)_220px_250px_auto]">
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-operational/50">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar código, equipe ou destino"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as DiligenciaStatus | "todos" | "ativas")
            }
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-operational/50"
            aria-label="Filtrar por status"
          >
            <option value="todos">Todos os status</option>
            <option value="ativas">Somente ativas</option>
            {Object.entries(DILIGENCIA_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as DiligenciaTipo | "")}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-operational/50"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(DILIGENCIA_TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilterX className="h-4 w-4" /> Limpar
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
            Carregando diligências...
          </div>
        ) : (
          <DiligenciasTable
            diligencias={visibleRecords}
            onSelect={(item) =>
              navigate({
                to: "/localizacao/diligencias/$diligenciaId",
                params: { diligenciaId: item.id },
              })
            }
            onClearFilters={hasFilters ? clearFilters : undefined}
          />
        )}

        <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{total ? `${total} diligência(s) encontrada(s)` : "Nenhum registro"}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-24 text-center text-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SummaryButton({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
  tone = "operational",
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof RadioTower;
  active: boolean;
  onClick: () => void;
  tone?: "operational" | "success" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-success border-success/35 bg-success/5"
      : tone === "info"
        ? "text-info border-info/35 bg-info/5"
        : "text-operational border-operational/35 bg-operational/5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border bg-card p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,.18)] ${active ? toneClass : "border-border"}`}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <small className="block text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </small>
          <strong className={`mt-2 block text-2xl font-black ${active ? "" : "text-foreground"}`}>
            {value}
          </strong>
          <small className="mt-1 block text-[10px] text-muted-foreground">{hint}</small>
        </span>
        <i className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon className="h-4 w-4 transition group-hover:scale-110" />
        </i>
      </span>
    </button>
  );
}
