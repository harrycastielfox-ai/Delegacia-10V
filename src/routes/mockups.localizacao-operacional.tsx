import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Crosshair,
  House,
  Layers3,
  MapPin,
  Navigation,
  Plus,
  Radar,
  RadioTower,
  Route as RouteIcon,
  Search,
  Shield,
  UserRoundSearch,
  UsersRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export const Route = createFileRoute("/mockups/localizacao-operacional")({
  head: () => ({
    meta: [{ title: "Mockup — Localização Operacional | SIPI" }],
  }),
  component: LocalizacaoOperacionalMockup,
});

type SectionId =
  | "overview"
  | "diligencias"
  | "mapa"
  | "chegadas"
  | "relatorios"
  | "pessoas"
  | "enderecos"
  | "rotas"
  | "registros"
  | "vinculos";
type StatusId = "todos" | "deslocamento" | "local" | "aguardando" | "concluida";

type Operation = {
  id: string;
  type: string;
  destination: string;
  reference: string;
  neighborhood: string;
  team: string;
  agents: number;
  time: string;
  eta: string;
  status: Exclude<StatusId, "todos">;
};

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    id: SectionId;
    label: string;
    icon: typeof Radar;
    badge?: string;
  }>;
}> = [
  {
    label: "Operação",
    items: [
      { id: "overview", label: "Visão Geral", icon: Radar },
      { id: "diligencias", label: "Diligências", icon: RouteIcon, badge: "7" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { id: "pessoas", label: "Pessoas / Alvos", icon: UserRoundSearch },
      { id: "enderecos", label: "Endereços", icon: House },
      { id: "rotas", label: "Rotas salvas", icon: RouteIcon },
    ],
  },
];

const SECTION_COPY: Record<SectionId, { title: string; description: string; eyebrow: string }> = {
  overview: {
    eyebrow: "Centro de coordenação",
    title: "Localização Operacional",
    description: "Acompanhe diligências, rotas e equipes em campo.",
  },
  diligencias: {
    eyebrow: "Controle de campo",
    title: "Diligências",
    description: "Distribuição, andamento e prioridade das ordens externas.",
  },
  mapa: {
    eyebrow: "Inteligência territorial",
    title: "Mapa operacional",
    description: "Visualize diligências, equipes, pontos de interesse e trajetos ativos.",
  },
  chegadas: {
    eyebrow: "Controle de presença",
    title: "Chegadas ao local",
    description: "Registre horários, permanência e conclusão das ações em campo.",
  },
  relatorios: {
    eyebrow: "Documentação operacional",
    title: "Relatórios de campo",
    description: "Consolide resultados, observações e evidências das diligências.",
  },
  pessoas: {
    eyebrow: "Cadastros operacionais",
    title: "Pessoas / Alvos",
    description: "Organize pessoas relacionadas e alvos vinculados às ordens externas.",
  },
  enderecos: {
    eyebrow: "Cadastros operacionais",
    title: "Endereços",
    description: "Mantenha locais de interesse e referências para futuras diligências.",
  },
  rotas: {
    eyebrow: "Cadastros operacionais",
    title: "Rotas salvas",
    description: "Reutilize trajetos frequentes, pontos de passagem e rotas de apoio.",
  },
  registros: {
    eyebrow: "Cadastros operacionais",
    title: "Registros fotográficos",
    description: "Consulte imagens produzidas em diligências e organize suas referências.",
  },
  vinculos: {
    eyebrow: "Cadastros operacionais",
    title: "Vínculo com procedimentos",
    description: "Relacione diligências e registros aos procedimentos policiais do SIPI.",
  },
};

const OPERATIONS: Operation[] = [
  {
    id: "DLG-2026-0876",
    type: "Verificação",
    destination: "Comércio — Região Central",
    reference: "Próximo à praça principal",
    neighborhood: "Centro",
    team: "Equipe Alfa-07",
    agents: 3,
    time: "09:15",
    eta: "09:42",
    status: "deslocamento",
  },
  {
    id: "DLG-2026-0891",
    type: "Patrulhamento",
    destination: "Escola Municipal",
    reference: "Acesso pela avenida lateral",
    neighborhood: "Jardim América",
    team: "Equipe Bravo-12",
    agents: 4,
    time: "10:05",
    eta: "10:28",
    status: "deslocamento",
  },
  {
    id: "DLG-2026-0892",
    type: "Intimação",
    destination: "Residência",
    reference: "Imóvel de esquina",
    neighborhood: "Vila Verde",
    team: "Equipe Charlie-03",
    agents: 2,
    time: "10:30",
    eta: "—",
    status: "aguardando",
  },
  {
    id: "DLG-2026-0893",
    type: "Apoio a outra unidade",
    destination: "Unidade de Saúde",
    reference: "Entrada de serviço",
    neighborhood: "São Miguel",
    team: "Equipe Delta-09",
    agents: 3,
    time: "11:15",
    eta: "11:36",
    status: "local",
  },
  {
    id: "DLG-2026-0868",
    type: "Levantamento",
    destination: "Área comercial",
    reference: "Galeria norte",
    neighborhood: "Boa Vista",
    team: "Equipe Eco-05",
    agents: 2,
    time: "08:10",
    eta: "08:34",
    status: "concluida",
  },
];

const STATUS_STYLE: Record<Exclude<StatusId, "todos">, { label: string; className: string }> = {
  deslocamento: {
    label: "Em deslocamento",
    className: "border-operational/35 bg-operational/10 text-operational",
  },
  local: {
    label: "No local",
    className: "border-success/35 bg-success/10 text-success",
  },
  aguardando: {
    label: "Aguardando",
    className: "border-warning/35 bg-warning/10 text-warning",
  },
  concluida: {
    label: "Concluída",
    className: "border-info/30 bg-info/10 text-info",
  },
};

const ROAD_LINES = [
  { top: "12%", left: "-5%", width: "72%", rotate: "8deg" },
  { top: "20%", left: "32%", width: "78%", rotate: "-11deg" },
  { top: "36%", left: "-8%", width: "67%", rotate: "-6deg" },
  { top: "48%", left: "40%", width: "72%", rotate: "9deg" },
  { top: "66%", left: "-4%", width: "82%", rotate: "4deg" },
  { top: "81%", left: "28%", width: "80%", rotate: "-7deg" },
  { top: "-8%", left: "17%", width: "68%", rotate: "78deg" },
  { top: "4%", left: "42%", width: "74%", rotate: "92deg" },
  { top: "2%", left: "67%", width: "72%", rotate: "79deg" },
  { top: "8%", left: "83%", width: "55%", rotate: "96deg" },
];

const ROUTE_SEGMENTS = [
  { top: "29%", left: "13%", width: "18%", rotate: "21deg" },
  { top: "38%", left: "28%", width: "18%", rotate: "-17deg" },
  { top: "42%", left: "43%", width: "17%", rotate: "11deg" },
  { top: "50%", left: "57%", width: "17%", rotate: "31deg" },
  { top: "59%", left: "71%", width: "13%", rotate: "-32deg" },
];

function LocalizacaoOperacionalMockup() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [statusFilter, setStatusFilter] = useState<StatusId>("todos");
  const [selectedId, setSelectedId] = useState(OPERATIONS[0].id);
  const [search, setSearch] = useState("");
  const [routeHighlighted, setRouteHighlighted] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const selected = OPERATIONS.find((operation) => operation.id === selectedId) ?? OPERATIONS[0];
  const section = SECTION_COPY[activeSection];

  const filteredOperations = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return OPERATIONS.filter((operation) => {
      const statusMatches = statusFilter === "todos" || operation.status === statusFilter;
      const searchMatches =
        !normalized ||
        [
          operation.id,
          operation.destination,
          operation.neighborhood,
          operation.team,
          operation.type,
        ].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized));
      return statusMatches && searchMatches;
    });
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-background font-display text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <div className="flex h-[94px] items-center gap-3 border-b border-sidebar-border px-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-operational/35 bg-operational/10 text-operational shadow-[0_0_22px_color-mix(in_oklab,var(--operational)_12%,transparent)]">
              <RouteIcon className="h-6 w-6" />
            </div>
            <div>
              <strong className="block text-base tracking-[0.14em]">SIPI</strong>
              <span className="block text-[9px] text-operational/70">Localização Operacional</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto p-3" aria-label="Navegação do mockup">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-operational/65">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[11px] font-medium transition ${
                          active
                            ? "border-operational/40 bg-operational/10 text-operational shadow-[inset_3px_0_0_var(--operational)]"
                            : "border-transparent text-foreground hover:border-border hover:bg-sidebar-accent hover:text-foreground"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${active ? "text-operational" : "text-muted-foreground"}`}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-operational/40 bg-operational/10 px-1 text-[9px] font-bold text-operational">
                            {item.badge}
                          </span>
                        ) : active ? (
                          <ArrowRight className="h-3 w-3 text-operational" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-operational/20 bg-operational/5 text-operational">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <strong className="block truncate text-[10px] uppercase tracking-wider">
                    Operações Centro
                  </strong>
                  <span className="text-[9px] text-muted-foreground">Ambiente de demonstração</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 xl:px-7">
          <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-operational">
                {section.eyebrow}
              </p>
              <h1 className="text-2xl font-extrabold uppercase tracking-[0.04em] sm:text-[28px]">
                {section.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-[10px] text-muted-foreground sm:flex">
                <RadioTower className="h-3.5 w-3.5 text-success" />
                Atualizado agora
              </span>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-operational/55 bg-operational/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-operational transition hover:bg-operational/20"
              >
                <Plus className="h-4 w-4" /> Nova diligência
              </button>
            </div>
          </header>

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Diligências ativas"
              value="8"
              helper="Em andamento"
              icon={ClipboardList}
              tone="cyan"
              active={statusFilter === "todos"}
              onClick={() => setStatusFilter("todos")}
            />
            <MetricCard
              label="Em deslocamento"
              value="3"
              helper="A caminho do local"
              icon={CarFront}
              tone="cyan"
              active={statusFilter === "deslocamento"}
              onClick={() => setStatusFilter("deslocamento")}
            />
            <MetricCard
              label="No local"
              value="2"
              helper="Equipe em diligência"
              icon={MapPin}
              tone="emerald"
              active={statusFilter === "local"}
              onClick={() => setStatusFilter("local")}
            />
            <MetricCard
              label="Concluídas hoje"
              value="12"
              helper="Até o momento"
              icon={CheckCircle2}
              tone="blue"
              active={statusFilter === "concluida"}
              onClick={() => setStatusFilter("concluida")}
            />
          </section>

          <section className="mb-4 grid min-h-[510px] gap-3 xl:grid-cols-[minmax(0,1fr)_370px]">
            <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground focus-within:border-operational/40">
                  <Search className="h-4 w-4" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar diligência, local ou equipe..."
                    className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <MockSelect
                  label="Status"
                  value={statusFilter === "todos" ? "Todos" : STATUS_STYLE[statusFilter].label}
                />
                <MockSelect label="Equipe" value="Todas" />
                <MockSelect label="Período" value="Hoje" icon={CalendarDays} />
              </div>

              <MapCanvas
                selected={selected}
                zoom={zoom}
                routeHighlighted={routeHighlighted}
                layersOpen={layersOpen}
                onZoomIn={() => setZoom((current) => Math.min(1.2, current + 0.05))}
                onZoomOut={() => setZoom((current) => Math.max(0.9, current - 0.05))}
                onToggleLayers={() => setLayersOpen((current) => !current)}
                onSelectOperation={setSelectedId}
              />
            </div>

            <OperationPanel
              operation={selected}
              routeHighlighted={routeHighlighted}
              onToggleRoute={() => setRouteHighlighted((current) => !current)}
            />
          </section>

          <OperationsTable
            operations={filteredOperations}
            selectedId={selectedId}
            onSelect={(operation) => {
              setSelectedId(operation.id);
              setRouteHighlighted(true);
            }}
            onClearFilters={() => {
              setStatusFilter("todos");
              setSearch("");
            }}
          />
        </main>
      </div>

      {newOpen ? <NewDiligenceDialog onClose={() => setNewOpen(false)} /> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Radar;
  tone: "cyan" | "emerald" | "blue";
  active: boolean;
  onClick: () => void;
}) {
  const tones = {
    cyan: "border-operational/25 text-operational bg-operational/10",
    emerald: "border-success/25 text-success bg-success/10",
    blue: "border-info/25 text-info bg-info/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-operational/40 ${
        active
          ? "border-operational/55 shadow-[0_0_24px_color-mix(in_oklab,var(--operational)_14%,transparent)]"
          : "border-border"
      }`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </span>
          <strong className="mt-1 block text-3xl font-extrabold text-foreground">{value}</strong>
          <small className="text-[10px] text-muted-foreground">{helper}</small>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}

function MockSelect({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof CalendarDays;
}) {
  return (
    <button
      type="button"
      className="flex min-w-32 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-operational/30"
    >
      <span>
        <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-foreground">
          {Icon ? <Icon className="h-3 w-3 text-muted-foreground" /> : null}
          {value}
        </span>
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

function MapCanvas({
  selected,
  zoom,
  routeHighlighted,
  layersOpen,
  onZoomIn,
  onZoomOut,
  onToggleLayers,
  onSelectOperation,
}: {
  selected: Operation;
  zoom: number;
  routeHighlighted: boolean;
  layersOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLayers: () => void;
  onSelectOperation: (id: string) => void;
}) {
  return (
    <div className="relative min-h-[430px] flex-1 overflow-hidden bg-[var(--operational-map)]">
      <div
        className="absolute inset-0 origin-center transition-transform duration-300"
        style={{
          transform: `scale(${zoom})`,
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--operational) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--operational) 9%, transparent) 1px, transparent 1px), radial-gradient(circle at 76% 48%, color-mix(in oklab, var(--success) 16%, transparent), transparent 23%), radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--operational) 12%, transparent), transparent 27%)",
          backgroundSize: "34px 34px, 34px 34px, auto, auto",
        }}
      >
        {ROAD_LINES.map((line, index) => (
          <span
            key={`${line.top}-${line.left}`}
            className={`absolute h-px origin-left rounded-full ${index % 3 === 0 ? "bg-foreground/20" : "bg-foreground/12"}`}
            style={{
              top: line.top,
              left: line.left,
              width: line.width,
              transform: `rotate(${line.rotate})`,
            }}
          />
        ))}

        {routeHighlighted
          ? ROUTE_SEGMENTS.map((line) => (
              <span
                key={`${line.top}-${line.left}`}
                className="absolute h-[3px] origin-left rounded-full bg-operational shadow-[0_0_12px_color-mix(in_oklab,var(--operational)_75%,transparent)]"
                style={{
                  top: line.top,
                  left: line.left,
                  width: line.width,
                  transform: `rotate(${line.rotate})`,
                }}
              />
            ))
          : null}

        <MapLabel className="left-[18%] top-[17%]" label="Jardim das Flores" />
        <MapLabel className="left-[49%] top-[21%]" label="Centro" />
        <MapLabel className="left-[70%] top-[15%]" label="Boa Vista" />
        <MapLabel className="left-[31%] top-[69%]" label="Jardim América" />
        <MapLabel className="left-[8%] top-[70%]" label="São Miguel" />
        <MapLabel className="left-[76%] top-[70%]" label="Horizonte" />

        <MapMarker
          number="1"
          className="left-[14%] top-[29%]"
          active={selected.id === OPERATIONS[0].id}
          onClick={() => onSelectOperation(OPERATIONS[0].id)}
        />
        <MapMarker
          number="2"
          className="left-[34%] top-[67%]"
          active={selected.id === OPERATIONS[1].id}
          onClick={() => onSelectOperation(OPERATIONS[1].id)}
        />
        <MapMarker
          number="3"
          className="left-[78%] top-[61%]"
          active={selected.id === OPERATIONS[3].id}
          onClick={() => onSelectOperation(OPERATIONS[3].id)}
        />

        <div className="absolute left-[82%] top-[40%] -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/25" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-success/70 bg-success/15 text-success shadow-[0_0_30px_color-mix(in_oklab,var(--success)_45%,transparent)]">
            <MapPin className="h-6 w-6" />
          </span>
        </div>

        <span className="absolute left-[59%] top-[47%] flex h-8 w-8 items-center justify-center rounded-lg border border-operational/40 bg-card text-operational shadow-[0_0_16px_color-mix(in_oklab,var(--operational)_28%,transparent)]">
          <CarFront className="h-4 w-4" />
        </span>
      </div>

      <div className="absolute left-3 top-3 z-10 grid gap-1 rounded-lg border border-border/80 bg-background/90 p-1 shadow-xl backdrop-blur">
        <MapControl label="Aproximar" icon={ZoomIn} onClick={onZoomIn} />
        <MapControl label="Afastar" icon={ZoomOut} onClick={onZoomOut} />
        <MapControl label="Centralizar" icon={Crosshair} onClick={() => undefined} />
        <MapControl label="Camadas" icon={Layers3} onClick={onToggleLayers} active={layersOpen} />
      </div>

      {layersOpen ? (
        <div className="absolute left-14 top-3 z-20 w-48 rounded-lg border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Camadas do mapa
          </p>
          {["Rotas ativas", "Equipes", "Pontos operacionais"].map((layer) => (
            <div key={layer} className="flex items-center gap-2 py-1.5 text-[10px] text-foreground">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-operational/35 bg-operational/10 text-operational">
                <Check className="h-3 w-3" />
              </span>
              {layer}
            </div>
          ))}
        </div>
      ) : null}

      <div className="absolute bottom-3 right-3 rounded-lg border border-border/80 bg-background/90 p-3 text-[9px] text-muted-foreground shadow-xl backdrop-blur">
        <p className="mb-2 font-bold uppercase tracking-wider text-foreground">Legenda</p>
        <div className="grid gap-1.5">
          <Legend color="bg-operational" label="Em deslocamento" />
          <Legend color="bg-success" label="No local" />
          <Legend color="bg-warning" label="Aguardando" />
        </div>
      </div>
    </div>
  );
}

function MapLabel({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={`absolute text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${className}`}
    >
      {label}
    </span>
  );
}

function MapMarker({
  number,
  className,
  active,
  onClick,
}: {
  number: string;
  className: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Selecionar ponto ${number}`}
      className={`absolute z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-lg transition hover:scale-110 ${className} ${
        active
          ? "border-operational bg-operational text-[var(--operational-contrast)] shadow-[0_0_14px_color-mix(in_oklab,var(--operational)_45%,transparent)]"
          : "border-operational/70 bg-card text-operational"
      }`}
    >
      {number}
    </button>
  );
}

function MapControl({
  label,
  icon: Icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: typeof ZoomIn;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
        active
          ? "bg-operational/15 text-operational"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <i className={`h-1.5 w-5 rounded-full ${color}`} /> {label}
    </span>
  );
}

function OperationPanel({
  operation,
  routeHighlighted,
  onToggleRoute,
}: {
  operation: Operation;
  routeHighlighted: boolean;
  onToggleRoute: () => void;
}) {
  const status = STATUS_STYLE[operation.status];

  return (
    <article className="flex min-h-[510px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-operational">
          Operação em andamento
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <strong className="font-mono text-sm text-foreground">{operation.id}</strong>
          <StatusBadge status={operation.status} />
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/90 px-5">
        <PanelField label="Destino" value={operation.destination} />
        <PanelField label="Local de referência" value={operation.reference} />
        <div className="py-3.5">
          <span className="block text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Equipe responsável
          </span>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-operational/20 bg-operational/5 text-operational">
              <UsersRound className="h-4 w-4" />
            </span>
            <div>
              <strong className="block text-xs uppercase tracking-wider">{operation.team}</strong>
              <small className="text-[10px] text-muted-foreground">
                {operation.agents} agentes
              </small>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 py-3.5">
          <PanelField label="Saída" value={operation.time} compact />
          <PanelField label="Chegada estimada" value={operation.eta} compact />
        </div>
        <div className="py-4">
          <span className="block text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Progresso da diligência
          </span>
          <div className="relative mt-5 flex items-start justify-between">
            <span className="absolute left-4 right-4 top-3 h-px bg-accent" />
            <span className="absolute left-4 top-3 h-px w-[36%] bg-operational shadow-[0_0_8px_color-mix(in_oklab,var(--operational)_65%,transparent)]" />
            <ProgressPoint icon={CarFront} label="Saída" active />
            <ProgressPoint icon={Navigation} label="A caminho" active />
            <ProgressPoint icon={MapPin} label="No local" />
            <ProgressPoint icon={CheckCircle2} label="Concluída" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground transition hover:bg-accent"
        >
          Abrir detalhes
        </button>
        <button
          type="button"
          onClick={onToggleRoute}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition ${
            routeHighlighted
              ? "border-operational bg-operational text-[var(--operational-contrast)]"
              : "border-operational/40 bg-operational/10 text-operational"
          }`}
        >
          <RouteIcon className="h-4 w-4" /> {routeHighlighted ? "Ocultar rota" : "Traçar rota"}
        </button>
      </div>
    </article>
  );
}

function PanelField({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "py-3.5"}>
      <span className="block text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-1 block text-xs font-medium text-foreground">{value}</strong>
    </div>
  );
}

function ProgressPoint({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof CarFront;
  label: string;
  active?: boolean;
}) {
  return (
    <span className="relative z-10 flex w-16 flex-col items-center gap-2 text-center">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          active
            ? "border-operational bg-card text-operational shadow-[0_0_12px_color-mix(in_oklab,var(--operational)_24%,transparent)]"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <small
        className={`text-[7px] uppercase tracking-wider ${active ? "text-operational" : "text-muted-foreground"}`}
      >
        {label}
      </small>
    </span>
  );
}

function StatusBadge({ status }: { status: Exclude<StatusId, "todos"> }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function OperationsTable({
  operations,
  selectedId,
  onSelect,
  onClearFilters,
}: {
  operations: Operation[];
  selectedId: string;
  onSelect: (operation: Operation) => void;
  onClearFilters: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]">Próximas diligências</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Selecione uma linha para atualizar o mapa.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-operational/85 transition-colors hover:text-operational">
          Ver todas <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {operations.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">ID</th>
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">Destino</th>
                <th className="px-4 py-2.5 font-semibold">Bairro</th>
                <th className="px-4 py-2.5 font-semibold">Equipe</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Horário</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {operations.slice(0, 4).map((operation) => (
                <tr
                  key={operation.id}
                  onClick={() => onSelect(operation)}
                  className={`cursor-pointer border-b border-border/80 text-[10px] transition last:border-b-0 hover:bg-operational/5 ${
                    operation.id === selectedId ? "bg-operational/[0.06]" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-mono text-operational">{operation.id}</td>
                  <td className="px-4 py-3 uppercase text-muted-foreground">{operation.type}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{operation.destination}</td>
                  <td className="px-4 py-3 text-muted-foreground">{operation.neighborhood}</td>
                  <td className="px-4 py-3 uppercase tracking-wider text-foreground">
                    {operation.team}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={operation.status} />
                  </td>
                  <td className="px-4 py-3 text-foreground">{operation.time}</td>
                  <td className="px-4 py-3 text-operational">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center p-6 text-center">
          <Search className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Nenhuma diligência encontrada.</p>
          <button
            onClick={onClearFilters}
            className="mt-2 text-[10px] font-bold uppercase text-operational"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </section>
  );
}

function NewDiligenceDialog({ onClose }: { onClose: () => void }) {
  const [created, setCreated] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mockup-dialog-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-operational/25 bg-card p-5 shadow-[0_0_60px_color-mix(in_oklab,var(--operational)_16%,transparent)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-operational">
              Cadastro rápido
            </p>
            <h2 id="mockup-dialog-title" className="mt-1 text-xl font-bold uppercase">
              Nova diligência
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Demonstração de fluxo — nenhum dado será salvo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-success/25 bg-success/5 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <strong className="mt-3 text-sm uppercase tracking-wider">Fluxo demonstrado</strong>
            <p className="mt-1 text-xs text-muted-foreground">
              A diligência fictícia foi adicionada ao mockup.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg bg-operational px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--operational-contrast)]"
            >
              Voltar ao painel
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <MockField icon={ClipboardList} label="Tipo" value="Verificação de endereço" />
            <MockField icon={Building2} label="Destino" value="Local a confirmar" />
            <MockField icon={MapPin} label="Bairro" value="Centro" />
            <MockField icon={UsersRound} label="Equipe" value="Equipe disponível" />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setCreated(true)}
                className="rounded-lg bg-operational px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--operational-contrast)]"
              >
                Simular cadastro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MockField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <Icon className="h-4 w-4 text-operational" />
      <span className="min-w-0 flex-1">
        <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <input
          defaultValue={value}
          className="mt-0.5 w-full bg-transparent text-xs text-foreground outline-none"
        />
      </span>
    </label>
  );
}
