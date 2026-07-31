import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, RotateCcw, Search } from "lucide-react";
import { listVehiclesPage } from "@/lib/repositories/vehiclesRepository";
import { VehicleEmptyState } from "../components/VehicleEmptyState";
import { VehicleStatusBadge } from "../components/VehicleStatusBadge";
import {
  OCCURRENCE_TYPES,
  VEHICLE_PAGE_SIZE,
  VEHICLE_SITUATION_FILTER_LABELS,
  VEHICLE_TYPE_LABELS,
  displayVehicleValue,
  formatVehicleDate,
} from "../vehicleConstants";
import { useDebouncedValue } from "../useDebouncedValue";
import type {
  VehicleListFilters,
  VehicleListRecord,
  VehicleSituation,
  VehicleSituationFilter,
  VehicleType,
} from "../vehicleTypes";

export type VehicleListPreset = {
  title: string;
  subtitle: string;
  vehicleType?: VehicleType;
  situation?: VehicleSituation;
  initialSituation?: VehicleSituationFilter;
  initialPendingIdentification?: boolean;
};

type Cursor = NonNullable<VehicleListFilters["cursor"]>;

export default function VehicleListPage({ preset }: { preset: VehicleListPreset }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [showFilters, setShowFilters] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(preset.vehicleType ?? "");
  const [situation, setSituation] = useState<VehicleSituationFilter | "">(
    preset.situation ?? preset.initialSituation ?? "",
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
  const [rawRows, setRawRows] = useState<VehicleListRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cursor = cursorStack[pageIndex] ?? null;
  const filtersKey = JSON.stringify({
    debouncedSearch,
    vehicleType,
    situation,
    occurrenceType,
    status,
    custodyLocation,
    startDate,
    endDate,
    pendingIdentification,
  });

  useEffect(() => {
    setVehicleType(preset.vehicleType ?? "");
    setSituation(preset.situation ?? preset.initialSituation ?? "");
    setPendingIdentification(preset.initialPendingIdentification ?? false);
  }, [
    preset.initialPendingIdentification,
    preset.initialSituation,
    preset.situation,
    preset.vehicleType,
  ]);

  useEffect(() => {
    setCursorStack([null]);
    setPageIndex(0);
  }, [filtersKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void listVehiclesPage({
      search: debouncedSearch,
      vehicleType: vehicleType || null,
      situation: situation || null,
      occurrenceType: occurrenceType || null,
      status: status || null,
      custodyLocation: custodyLocation || null,
      startDate: startDate || null,
      endDate: endDate || null,
      pendingIdentification: pendingIdentification ? true : null,
      cursor,
      limit: VEHICLE_PAGE_SIZE + 1,
    })
      .then((data) => {
        if (cancelled) return;
        setRawRows(data);
        if (data[0]) setTotal(Number(data[0].total_count ?? 0));
        else if (pageIndex === 0) setTotal(0);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os veículos agora.");
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
    occurrenceType,
    pageIndex,
    pendingIdentification,
    situation,
    startDate,
    status,
    vehicleType,
  ]);

  const rows = useMemo(() => rawRows.slice(0, VEHICLE_PAGE_SIZE), [rawRows]);
  const hasNext = rawRows.length > VEHICLE_PAGE_SIZE;
  const startRecord = total === 0 ? 0 : pageIndex * VEHICLE_PAGE_SIZE + 1;
  const endRecord = Math.min(
    pageIndex * VEHICLE_PAGE_SIZE + rows.length,
    total || Number.MAX_SAFE_INTEGER,
  );
  const hasFilters = Boolean(
    search ||
    (!preset.vehicleType && vehicleType) ||
    (!preset.situation && situation) ||
    occurrenceType ||
    status ||
    custodyLocation ||
    startDate ||
    endDate ||
    pendingIdentification,
  );

  function clearFilters() {
    setSearch("");
    setVehicleType(preset.vehicleType ?? "");
    setSituation(preset.situation ?? "");
    setOccurrenceType("");
    setStatus("");
    setCustodyLocation("");
    setStartDate("");
    setEndDate("");
    setPendingIdentification(false);
  }

  function openVehicle(id: string) {
    navigate({ to: "/veiculos/$vehicleId", params: { vehicleId: id } });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-info">VEÍCULOS APREENDIDOS</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{preset.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{preset.subtitle}</p>
        </div>
        {preset.vehicleType ? (
          <Link
            to="/veiculos/novo"
            className="hidden items-center gap-2 rounded-xl bg-info px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 md:inline-flex"
          >
            <Plus className="h-4 w-4" /> Novo Veículo
          </Link>
        ) : null}
      </header>

      <section className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar veículos</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar placa, chassi, Renavam, motor, marca, modelo, B.O. ou envolvido..."
              className="h-12 w-full rounded-xl border border-border/90 bg-background/70 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-info/55"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:border-info/40 hover:bg-info/5"
          >
            <Filter className="h-4 w-4 text-info" /> {showFilters ? "Ocultar filtros" : "Filtros"}
          </button>
        </div>

        {showFilters ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {!preset.vehicleType ? (
              <select
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value as VehicleType | "")}
                className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
              >
                <option value="">Todos os tipos</option>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : null}
            {!preset.situation ? (
              <select
                value={situation}
                onChange={(event) =>
                  setSituation(event.target.value as VehicleSituationFilter | "")
                }
                className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
              >
                <option value="">Todas as situações</option>
                {Object.entries(VEHICLE_SITUATION_FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={occurrenceType}
              onChange={(event) => setOccurrenceType(event.target.value)}
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm"
            >
              <option value="">Todos os tipos de ocorrência</option>
              {OCCURRENCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Status operacional"
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
            />
            <input
              value={custodyLocation}
              onChange={(event) => setCustodyLocation(event.target.value)}
              placeholder="Local de custódia"
              className="h-11 rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus:border-info/50"
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
                className="accent-[var(--info)]"
              />{" "}
              Pendência de identificação
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm hover:border-info/40"
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
        <table className="w-full min-w-[1120px] table-fixed text-sm">
          <thead className="bg-muted/25 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="w-[13%] px-4 py-3 text-left">Identificação</th>
              <th className="w-[10%] px-3 py-3 text-left">Tipo</th>
              <th className="w-[19%] px-3 py-3 text-left">Marca / Modelo</th>
              <th className="w-[9%] px-3 py-3 text-left">Cor</th>
              <th className="w-[10%] px-3 py-3 text-left">Placa</th>
              <th className="w-[13%] px-3 py-3 text-left">Situação</th>
              <th className="w-[13%] px-3 py-3 text-left">Procedimento</th>
              <th className="w-[13%] px-3 py-3 text-left">Local / depósito</th>
              <th className="w-[10%] px-4 py-3 text-right">Atualização</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <VehicleEmptyState />
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Carregando veículos...
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => openVehicle(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") openVehicle(row.id);
                  }}
                  className="cursor-pointer border-t border-border/70 transition hover:bg-info/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info/60"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-info">
                    {row.internal_id}
                  </td>
                  <td className="px-3 py-3 text-xs">{VEHICLE_TYPE_LABELS[row.vehicle_type]}</td>
                  <td className="px-3 py-3">
                    <span className="block truncate font-semibold" title={row.brand_model ?? ""}>
                      {displayVehicleValue(row.brand_model)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {displayVehicleValue(row.color)}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold">
                    {displayVehicleValue(row.plate)}
                  </td>
                  <td className="px-3 py-3">
                    <VehicleStatusBadge situation={row.situation} />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="block truncate">
                      {displayVehicleValue(
                        [row.procedure_type, row.procedure_number].filter(Boolean).join(" ") ||
                          row.police_report_number,
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className="block truncate">
                      {displayVehicleValue(row.custody_location || row.storage_location)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatVehicleDate(row.updated_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando veículos...
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <VehicleEmptyState />
          </div>
        ) : null}
        {!loading &&
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openVehicle(row.id)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition active:border-info/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-info">{row.internal_id}</p>
                  <p className="mt-1 truncate font-semibold">
                    {displayVehicleValue(row.brand_model)}
                  </p>
                </div>
                <VehicleStatusBadge situation={row.situation} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>
                  Placa:{" "}
                  <strong className="font-mono text-foreground">
                    {displayVehicleValue(row.plate)}
                  </strong>
                </span>
                <span className="truncate text-right">
                  {displayVehicleValue(row.custody_location || row.storage_location)}
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
          <span className="min-w-9 text-center font-mono font-bold text-info">{pageIndex + 1}</span>
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
