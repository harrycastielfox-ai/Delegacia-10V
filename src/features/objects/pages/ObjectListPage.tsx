import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, RotateCcw, Search } from "lucide-react";
import { useAppProfile } from "@/components/AppProfileContext";
import { canCreateObjects } from "@/lib/authz";
import { listObjectsPage } from "@/lib/repositories/objectsRepository";
import { ObjectEmptyState } from "../components/ObjectEmptyState";
import { ObjectStatusBadge } from "../components/ObjectStatusBadge";
import {
  OBJECT_OCCURRENCE_TYPES,
  OBJECT_PAGE_SIZE,
  OBJECT_SITUATION_FILTER_LABELS,
  OBJECT_TYPE_LABELS,
  displayObjectValue,
  formatObjectDate,
} from "../objectConstants";
import type {
  ObjectListFilters,
  ObjectListRecord,
  ObjectSituation,
  ObjectSituationFilter,
  ObjectType,
} from "../objectTypes";

export type ObjectListPreset = {
  initialObjectType?: ObjectType;
  initialSituation?: ObjectSituationFilter;
  initialPendingIdentification?: boolean;
};

type Cursor = NonNullable<ObjectListFilters["cursor"]>;

export default function ObjectListPage({ preset }: { preset: ObjectListPreset }) {
  const navigate = useNavigate();
  const profile = useAppProfile();
  const canCreate = canCreateObjects(profile);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [objectType, setObjectType] = useState<ObjectType | "">(preset.initialObjectType ?? "");
  const [situation, setSituation] = useState<ObjectSituation | ObjectSituationFilter | "">(
    preset.initialSituation ?? "",
  );
  const [occurrenceType, setOccurrenceType] = useState("");
  const [status, setStatus] = useState("");
  const [custodyLocation, setCustodyLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pendingIdentification, setPendingIdentification] = useState(
    preset.initialPendingIdentification ?? false,
  );
  const [cursorStack, setCursorStack] = useState<Array<Cursor | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [rawRows, setRawRows] = useState<ObjectListRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setObjectType(preset.initialObjectType ?? "");
    setSituation(preset.initialSituation ?? "");
    setPendingIdentification(preset.initialPendingIdentification ?? false);
  }, [preset.initialObjectType, preset.initialPendingIdentification, preset.initialSituation]);

  const cursor = cursorStack[pageIndex] ?? null;
  const filtersKey = JSON.stringify({
    debouncedSearch,
    objectType,
    situation,
    occurrenceType,
    status,
    custodyLocation,
    startDate,
    endDate,
    pendingIdentification,
  });

  useEffect(() => {
    setCursorStack([null]);
    setPageIndex(0);
  }, [filtersKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void listObjectsPage({
      search: debouncedSearch,
      objectType: objectType || null,
      situation: situation || null,
      occurrenceType: occurrenceType || null,
      status: status || null,
      custodyLocation: custodyLocation || null,
      startDate: startDate || null,
      endDate: endDate || null,
      pendingIdentification: pendingIdentification ? true : null,
      cursor,
      limit: OBJECT_PAGE_SIZE + 1,
    })
      .then((data) => {
        if (cancelled) return;
        setRawRows(data);
        if (data[0]) setTotal(Number(data[0].total_count ?? 0));
        else if (pageIndex === 0) setTotal(0);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os objetos agora.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    cursor,
    custodyLocation,
    debouncedSearch,
    endDate,
    objectType,
    occurrenceType,
    pageIndex,
    pendingIdentification,
    situation,
    startDate,
    status,
  ]);

  const rows = useMemo(() => rawRows.slice(0, OBJECT_PAGE_SIZE), [rawRows]);
  const hasNext = rawRows.length > OBJECT_PAGE_SIZE;
  const startRecord = total === 0 ? 0 : pageIndex * OBJECT_PAGE_SIZE + 1;
  const endRecord = Math.min(
    pageIndex * OBJECT_PAGE_SIZE + rows.length,
    total || Number.MAX_SAFE_INTEGER,
  );
  const hasFilters = Boolean(
    search ||
    objectType ||
    situation ||
    occurrenceType ||
    status ||
    custodyLocation ||
    startDate ||
    endDate ||
    pendingIdentification,
  );

  function clearFilters() {
    setSearch("");
    setObjectType("");
    setSituation("");
    setOccurrenceType("");
    setStatus("");
    setCustodyLocation("");
    setStartDate("");
    setEndDate("");
    setPendingIdentification(false);
  }

  function openObject(row: ObjectListRecord) {
    navigate({ to: "/objetos/$objectId", params: { objectId: row.id } });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-warning">OBJETOS APREENDIDOS</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Todos os Objetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta completa da base de objetos apreendidos cadastrados.
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/objetos/novo"
            className="hidden items-center gap-2 rounded-xl border border-warning/60 bg-warning/10 px-5 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/20 md:inline-flex"
          >
            <Plus className="h-4 w-4" /> Novo Objeto
          </Link>
        ) : null}
      </header>

      <section className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar objetos</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar descrição, marca, série, calibre, B.O. ou envolvido..."
              className="h-12 w-full rounded-xl border border-border/90 bg-background/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-warning/55"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:border-warning/40 hover:bg-warning/5"
          >
            <Filter className="h-4 w-4 text-warning" />{" "}
            {showFilters ? "Ocultar filtros" : "Filtros"}
          </button>
        </div>

        {showFilters ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={objectType}
              onChange={(event) => setObjectType(event.target.value as ObjectType | "")}
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
            >
              <option value="">Todas as categorias</option>
              {Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={situation}
              onChange={(event) =>
                setSituation(event.target.value as ObjectSituation | ObjectSituationFilter | "")
              }
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
            >
              <option value="">Todas as situações</option>
              {Object.entries(OBJECT_SITUATION_FILTER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={occurrenceType}
              onChange={(event) => setOccurrenceType(event.target.value)}
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
            >
              <option value="">Todos os tipos de ocorrência</option>
              {OBJECT_OCCURRENCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Status operacional"
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-warning/50"
            />
            <input
              value={custodyLocation}
              onChange={(event) => setCustodyLocation(event.target.value)}
              placeholder="Local de custódia"
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-warning/50"
            />
            <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-xs text-muted-foreground">
              <span>De</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 min-w-0 bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-xs text-muted-foreground">
              <span>Até</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 min-w-0 bg-transparent text-sm text-foreground outline-none"
              />
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm">
              <input
                type="checkbox"
                checked={pendingIdentification}
                onChange={(event) => setPendingIdentification(event.target.checked)}
                className="accent-[var(--warning)]"
              />{" "}
              Pendência de identificação
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm hover:border-warning/40"
              >
                <RotateCcw className="h-4 w-4" /> Limpar filtros
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card/90 shadow-[0_10px_40px_rgba(0,0,0,0.2)] md:block">
        <table className="w-full min-w-[1080px] table-fixed text-sm">
          <thead className="bg-muted/25 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="w-[12%] px-4 py-3 text-left">Código</th>
              <th className="w-[12%] px-3 py-3 text-left">Categoria</th>
              <th className="w-[24%] px-3 py-3 text-left">Descrição</th>
              <th className="w-[7%] px-3 py-3 text-right">Qtd.</th>
              <th className="w-[14%] px-3 py-3 text-left">Situação</th>
              <th className="w-[13%] px-3 py-3 text-left">Procedimento</th>
              <th className="w-[13%] px-3 py-3 text-left">Custódia</th>
              <th className="w-[9%] px-4 py-3 text-right">Atualização</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <ObjectEmptyState />
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Carregando objetos...
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir o objeto ${row.internal_id}`}
                  onClick={() => openObject(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openObject(row);
                    }
                  }}
                  className="cursor-pointer border-t border-border/70 transition hover:bg-warning/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warning/60"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-warning">
                    {row.internal_id}
                  </td>
                  <td className="px-3 py-3 text-xs">{OBJECT_TYPE_LABELS[row.object_type]}</td>
                  <td className="px-3 py-3">
                    <span className="block truncate font-semibold" title={row.description}>
                      {row.description}
                    </span>
                    {row.brand_model ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.brand_model}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-3">
                    <ObjectStatusBadge situation={row.situation} />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="block truncate">
                      {displayObjectValue(
                        [row.procedure_type, row.procedure_number].filter(Boolean).join(" ") ||
                          row.police_report_number,
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className="block truncate">
                      {displayObjectValue(row.custody_location || row.storage_location)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatObjectDate(row.updated_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando objetos...
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <ObjectEmptyState />
          </div>
        ) : null}
        {!loading &&
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openObject(row)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition active:border-warning/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-warning">{row.internal_id}</p>
                  <p className="mt-1 truncate font-semibold">{row.description}</p>
                </div>
                <ObjectStatusBadge situation={row.situation} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>
                  Qtd.: <strong className="text-foreground">{row.quantity}</strong>
                </span>
                <span className="truncate text-right">
                  {displayObjectValue(row.custody_location || row.storage_location)}
                </span>
              </div>
            </button>
          ))}
      </div>

      <footer className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {total > 0
            ? `Exibindo ${startRecord}–${endRecord} de ${total} registro(s)`
            : "Nenhum registro"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pageIndex === 0 || loading}
            onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 font-semibold text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="min-w-9 text-center font-mono font-bold text-warning">
            {pageIndex + 1}
          </span>
          <button
            type="button"
            disabled={!hasNext || loading}
            onClick={() => {
              const last = rows.at(-1);
              if (!last) return;
              const nextCursor = { updatedAt: last.updated_at, id: last.id };
              setCursorStack((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
              setPageIndex((value) => value + 1);
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 font-semibold text-foreground disabled:opacity-40"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
