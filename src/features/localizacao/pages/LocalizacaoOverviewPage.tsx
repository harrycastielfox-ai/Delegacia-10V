import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, House, Plus, RadioTower, UsersRound, type LucideIcon } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { getLocalizacaoOverviewStats } from "@/lib/repositories/localizacaoRepository";
import type { RoadRoute } from "@/lib/roadRouting";
import { ContatoPanel } from "../components/ContatoPanel";
import { MapaCanvas } from "../components/MapaCanvas";
import { PessoaDetailsDialog } from "../components/PessoaDetailsDialog";
import type { LocalizacaoOverviewStats, PessoaDetalheRecord } from "../localizacaoTypes";

export default function LocalizacaoOverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LocalizacaoOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routeVisible, setRouteVisible] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<PessoaDetalheRecord | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [detailsPersonId, setDetailsPersonId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getLocalizacaoOverviewStats()
      .then((overview) => {
        if (!cancelled) setStats(overview);
      })
      .catch((cause) => {
        console.error("[LocalizacaoOverviewPage] Falha ao carregar a visão geral", cause);
        if (!cancelled) setError("Não foi possível carregar a Visão Geral de Contatos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-operational">
            Centro de coordenação
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Contato Operacional
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Mapa de contatos: clique na foto de um perfil para ver os dados e traçar a rota.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <span className="hidden min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[10px] text-muted-foreground sm:inline-flex">
            <RadioTower className="h-3.5 w-3.5 text-success" /> Atualizado agora
          </span>
          <Link
            to="/localizacao/pessoas"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-operational/60 bg-operational/10 px-4 text-xs font-black uppercase tracking-wide text-operational transition hover:bg-operational hover:text-[var(--operational-contrast)] sm:flex-none"
          >
            <Plus className="h-4 w-4" /> Novo contato
          </Link>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OverviewStatCard
          label="Pessoas cadastradas"
          value={loading ? "—" : (stats?.pessoas_cadastradas ?? 0)}
          hint="Contatos no mapa"
          icon={UsersRound}
          accent="var(--operational)"
        />
        <OverviewStatCard
          label="Endereços cadastrados"
          value={loading ? "—" : (stats?.enderecos_cadastrados ?? 0)}
          hint="Locais registrados"
          icon={House}
          accent="var(--operational)"
        />
        <OverviewStatCard
          label="Fotos recentes"
          value={loading ? "—" : (stats?.fotos_30_dias ?? 0)}
          hint="Últimos 30 dias"
          icon={Camera}
          accent="var(--info)"
        />
      </div>

      <div className="grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_370px]">
        <MapaCanvas
          routeVisible={routeVisible}
          onRouteVisibleChange={setRouteVisible}
          showRouteToggle={false}
          onSelectedPersonChange={setSelectedPerson}
          onRouteChange={(nextRoute, nextState) => {
            setRoute(nextRoute);
            setRouteState(nextState);
          }}
          className="min-h-[460px] xl:min-h-[calc(100vh-260px)]"
        />
        <ContatoPanel
          person={selectedPerson}
          route={route}
          routeState={routeState}
          routeVisible={routeVisible}
          onToggleRoute={() => setRouteVisible((value) => !value)}
          onViewDetails={() => selectedPerson && setDetailsPersonId(selectedPerson.id)}
        />
      </div>

      {detailsPersonId ? (
        <PessoaDetailsDialog
          personId={detailsPersonId}
          onClose={() => setDetailsPersonId(null)}
          onEdit={() => {
            setDetailsPersonId(null);
            void navigate({ to: "/localizacao/pessoas" });
          }}
        />
      ) : null}
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div
      style={{ "--overview-accent": accent } as CSSProperties}
      className="min-h-[102px] rounded-xl border border-border bg-card p-3.5"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--overview-accent)]/30 bg-[var(--overview-accent)]/10 text-[var(--overview-accent)]">
          <Icon className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-2 flex items-baseline gap-2">
        <strong className="block text-[26px] font-black leading-none tabular-nums text-foreground">
          {value}
        </strong>
        <span className="truncate text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </div>
  );
}
