import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  MapPinCheck,
  Navigation,
  Plus,
  RadioTower,
  Search,
  SlidersHorizontal,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getDiligenciaById,
  getLocalizacaoOverviewStats,
  listDiligenciasPage,
} from "@/lib/repositories/localizacaoRepository";
import { DiligenciaStatusBadge } from "../components/DiligenciaStatusBadge";
import { MapaCanvas } from "../components/MapaCanvas";
import { OperacaoPanel } from "../components/OperacaoPanel";
import { TabletViaturaActions } from "../components/TabletViaturaActions";
import type {
  DiligenciaDetalhe,
  DiligenciaListRecord,
  LocalizacaoOverviewStats,
} from "../localizacaoTypes";

type OverviewFilter = "ativas" | "em_deslocamento" | "no_local" | "concluida";
type PeriodFilter = "todos" | "hoje";

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function LocalizacaoOverviewPage() {
  const [stats, setStats] = useState<LocalizacaoOverviewStats | null>(null);
  const [diligencias, setDiligencias] = useState<DiligenciaListRecord[]>([]);
  const [filter, setFilter] = useState<OverviewFilter>("ativas");
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("todas");
  const [period, setPeriod] = useState<PeriodFilter>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeVisible, setRouteVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabletControlsOpen, setTabletControlsOpen] = useState(false);
  const [viaturaMode, setViaturaMode] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DiligenciaDetalhe | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getLocalizacaoOverviewStats(), listDiligenciasPage({ pageSize: 50 })])
      .then(([overview, records]) => {
        if (cancelled) return;
        setStats(overview);
        setDiligencias(records);
        setSelectedId(records[0]?.id ?? null);
      })
      .catch((cause) => {
        console.error("[LocalizacaoOverviewPage] Falha ao carregar a visão geral", cause);
        if (!cancelled) setError("Não foi possível carregar a Visão Geral de Localização.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const teams = useMemo(
    () =>
      Array.from(
        new Set(
          diligencias.map((item) => item.equipe_nome).filter((value): value is string => !!value),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [diligencias],
  );

  const filtered = useMemo(() => {
    const target = search.trim().toLocaleLowerCase("pt-BR");
    return diligencias.filter((item) => {
      const statusMatches =
        filter === "ativas"
          ? item.status !== "concluida" && item.status !== "cancelada"
          : item.status === filter;
      const searchMatches =
        !target ||
        [item.codigo, item.destino, item.bairro ?? "", item.equipe_nome ?? ""].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(target),
        );
      const teamMatches = team === "todas" || item.equipe_nome === team;
      const periodMatches =
        period === "todos" || isToday(item.agendada_para ?? item.saida_em ?? item.chegada_em);
      return statusMatches && searchMatches && teamMatches && periodMatches;
    });
  }, [diligencias, filter, period, search, team]);

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 768px) and (max-width: 1279px) and (any-pointer: coarse)",
    );
    const syncMode = () => setViaturaMode(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  useEffect(() => {
    if (!viaturaMode || !selected) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void getDiligenciaById(selected.id)
      .then((detail) => {
        if (!cancelled) setSelectedDetail(detail);
      })
      .catch((cause) => {
        console.error("[LocalizacaoOverviewPage] Falha ao carregar o alvo selecionado", cause);
        if (!cancelled) setSelectedDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, viaturaMode]);

  function handleArrivalConfirmed(registeredAt: string) {
    if (!selected) return;
    setDiligencias((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, status: "no_local", chegada_em: registeredAt } : item,
      ),
    );
    setSelectedDetail((current) =>
      current ? { ...current, status: "no_local", chegada_em: registeredAt } : current,
    );
    setStats((current) =>
      current
        ? {
            ...current,
            no_local: current.no_local + 1,
            em_deslocamento:
              selected.status === "em_deslocamento"
                ? Math.max(0, current.em_deslocamento - 1)
                : current.em_deslocamento,
          }
        : current,
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <section className="localizacao-viatura-summary hidden" aria-label="Missão ativa da viatura">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-operational">
              Modo viatura
            </p>
            {selected ? <DiligenciaStatusBadge status={selected.status} /> : null}
          </div>
          <div className="mt-2 flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-operational/40 bg-operational/10 text-operational">
              <Navigation className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-mono text-xs text-operational">
                {selected?.codigo ?? "Nenhuma diligência ativa"}
              </strong>
              <span className="mt-0.5 block truncate text-base font-black">
                {selected?.destino ?? "Selecione uma operação para iniciar"}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{selected?.bairro ?? "Bairro não informado"}</span>
                <span className="inline-flex items-center gap-1">
                  <UserRoundSearch className="h-3.5 w-3.5 text-operational" />
                  {selectedDetail?.pessoa?.nome ?? "Pessoa não vinculada"}
                </span>
                <span>{selected?.equipe_nome ?? "Equipe não definida"}</span>
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTabletControlsOpen((open) => !open)}
          aria-expanded={tabletControlsOpen}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground"
        >
          <SlidersHorizontal className="h-4 w-4 text-operational" />
          {tabletControlsOpen ? "Fechar painel" : "Painel"}
        </button>
      </section>

      <header className="localizacao-tablet-header mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-operational">
            Centro de coordenação
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Localização Operacional
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Acompanhe diligências, rotas e equipes em campo.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <span className="hidden min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[10px] text-muted-foreground sm:inline-flex">
            <RadioTower className="h-3.5 w-3.5 text-success" /> Atualizado agora
          </span>
          <Link
            to="/localizacao/diligencias/nova"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-operational/60 bg-operational/10 px-4 text-xs font-black uppercase tracking-wide text-operational transition hover:bg-operational hover:text-[var(--operational-contrast)] sm:flex-none"
          >
            <Plus className="h-4 w-4" /> Nova diligência
          </Link>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div
        className={`localizacao-tablet-stats mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${
          tabletControlsOpen ? "localizacao-tablet-controls-open" : ""
        }`}
      >
        <OverviewStatCard
          label="Diligências ativas"
          value={loading ? "—" : (stats?.ativas ?? 0)}
          hint="Em andamento"
          icon={RadioTower}
          accent="var(--operational)"
          active={filter === "ativas"}
          onClick={() => setFilter("ativas")}
        />
        <OverviewStatCard
          label="Em deslocamento"
          value={loading ? "—" : (stats?.em_deslocamento ?? 0)}
          hint="A caminho do local"
          icon={Navigation}
          accent="var(--operational)"
          active={filter === "em_deslocamento"}
          onClick={() => setFilter("em_deslocamento")}
        />
        <OverviewStatCard
          label="No local"
          value={loading ? "—" : (stats?.no_local ?? 0)}
          hint="Equipe em diligência"
          icon={MapPinCheck}
          accent="var(--success)"
          active={filter === "no_local"}
          onClick={() => setFilter("no_local")}
        />
        <OverviewStatCard
          label="Concluídas hoje"
          value={loading ? "—" : (stats?.concluidas_hoje ?? 0)}
          hint="Até o momento"
          icon={CheckCircle2}
          accent="var(--info)"
          active={filter === "concluida"}
          onClick={() => setFilter("concluida")}
        />
      </div>

      <div className="grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={`localizacao-tablet-filters grid gap-2 border-b border-border p-3 md:grid-cols-2 2xl:grid-cols-[minmax(260px,1fr)_150px_160px_140px] ${
              tabletControlsOpen ? "localizacao-tablet-controls-open" : ""
            }`}
          >
            <label className="localizacao-filter-search relative block md:col-span-2 2xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar diligência, local ou equipe..."
                className="h-12 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-xs outline-none transition focus:border-operational/50"
              />
            </label>
            <FilterSelect
              label="Status"
              value={filter}
              onChange={(value) => setFilter(value as OverviewFilter)}
              options={[
                ["ativas", "Ativas"],
                ["em_deslocamento", "Em deslocamento"],
                ["no_local", "No local"],
                ["concluida", "Concluídas"],
              ]}
            />
            <FilterSelect
              label="Equipe"
              value={team}
              onChange={setTeam}
              options={[["todas", "Todas"], ...teams.map((item) => [item, item])]}
            />
            <FilterSelect
              label="Período"
              value={period}
              onChange={(value) => setPeriod(value as PeriodFilter)}
              options={[
                ["todos", "Todos"],
                ["hoje", "Hoje"],
              ]}
            />
          </div>
          {loading ? (
            <div className="localizacao-tablet-map flex min-h-[460px] items-center justify-center text-sm text-muted-foreground">
              Carregando mapa operacional...
            </div>
          ) : (
            <MapaCanvas
              diligencias={filtered}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item.id)}
              routeVisible={routeVisible}
              onRouteVisibleChange={setRouteVisible}
              showRouteToggle={false}
              className="localizacao-tablet-map min-h-[460px] rounded-none border-0"
            />
          )}
        </section>
        <div className="localizacao-operation-panel-slot h-full [&>aside]:h-full">
          <OperacaoPanel
            diligencia={selected}
            routeVisible={routeVisible}
            onToggleRoute={() => setRouteVisible((value) => !value)}
          />
        </div>
      </div>

      <TabletViaturaActions diligencia={selected} onArrivalConfirmed={handleArrivalConfirmed} />
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ "--overview-accent": accent } as CSSProperties}
      className={`localizacao-tablet-stat-card group min-h-[102px] rounded-xl border bg-card p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--overview-accent)]/60 ${
        active
          ? "border-[var(--overview-accent)] shadow-[0_0_22px_color-mix(in_oklab,var(--overview-accent)_12%,transparent)]"
          : "border-border"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="localizacao-tablet-stat-icon flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--overview-accent)]/30 bg-[var(--overview-accent)]/10 text-[var(--overview-accent)]">
          <Icon className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-2 flex items-baseline gap-2">
        <strong className="localizacao-tablet-stat-value block text-[26px] font-black leading-none tabular-nums text-foreground">
          {value}
        </strong>
        <span className="truncate text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="relative flex h-12 min-w-0 flex-col justify-center rounded-lg border border-border bg-background px-3 pr-8 transition focus-within:border-operational/50">
      <span className="pointer-events-none block text-[8px] font-bold uppercase leading-none tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="mt-1 h-4 min-w-0 w-full cursor-pointer appearance-none truncate bg-transparent p-0 text-[11px] font-bold leading-none text-foreground outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}
