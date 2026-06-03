import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Clock3, Database, FileSearch, Filter, Search, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentProfile, getProfileAvatarPublicUrl } from "@/lib/auth";
import { canViewAuditoria } from "@/lib/authz";
import { listAuditoria, type AuditoriaEvent } from "@/lib/repositories/auditoriaRepository";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — SIPI" }] }),
  component: Auditoria,
});

type ModuleFilter = "todos" | "inqueritos" | "representacoes" | "usuarios_admin" | "outros";
type ModuleCategory = Exclude<ModuleFilter, "todos">;

const FALLBACK = "—";
const MODULE_FILTERS: Array<{ id: ModuleFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "inqueritos", label: "Inquéritos" },
  { id: "representacoes", label: "Representações" },
  { id: "usuarios_admin", label: "Usuários/Admin" },
  { id: "outros", label: "Outros" },
];

function Auditoria() {
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditoriaEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("todos");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const currentProfile = await getCurrentProfile();
      const blocked = !canViewAuditoria(currentProfile);
      if (cancelled) return;
      setRestricted(blocked);
      if (blocked) {
        setLoading(false);
        return;
      }

      const result = await listAuditoria({ limit: 100 });
      if (cancelled) return;
      if (result.error) {
        const msg = result.error.message.toLowerCase();
        const code = (result.error.code ?? "").toLowerCase();
        const isPermissionError = msg.includes("insufficient_privilege") || msg.includes("permission") || code === "42501";
        const isRpcMissing = code === "pgrst202" || msg.includes("function") || msg.includes("rpc");
        if (import.meta.env.DEV) {
          console.warn("[auditoria][visual] Falha ao listar auditoria", {
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint,
            code: result.error.code,
          });
        }
        setError(
          isPermissionError
            ? "Você não possui permissão para visualizar os eventos de auditoria."
            : isRpcMissing
              ? "Função RPC não encontrada no Supabase."
              : "Falha ao carregar auditoria.",
        );
      } else {
        setEvents(result.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const summaryCards = useMemo(() => getSummaryCards(events), [events]);
  const filteredEvents = useMemo(() => filterAuditEvents(events, searchTerm, moduleFilter), [events, moduleFilter, searchTerm]);

  if (restricted) {
    return (
      <AppLayout>
        <div className="space-y-4 rounded-2xl border border-destructive/25 bg-card/70 p-5">
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Auditoria.</p>
          <Link to="/modulos" className="inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-muted/20">Voltar</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_18px_rgba(34,197,94,0.08)]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary/75">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Painel administrativo
              </p>
              <h1 className="text-3xl font-black tracking-tight">Auditoria</h1>
              <p className="text-sm text-muted-foreground">Registro completo de ações no sistema</p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary/80" aria-hidden="true" />
            Últimos {events.length} evento(s) carregados
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo da auditoria carregada">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-2xl border border-border/75 bg-card/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                    <p className={`text-2xl font-black tabular-nums ${card.valueClassName}`}>{card.value}</p>
                  </div>
                  <div className={`rounded-xl border p-2 ${card.iconClassName}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{card.caption}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border/75 bg-card/70 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por executor, email, ação, módulo, entidade, descrição ou data..."
                className="h-11 w-full rounded-xl border border-border/90 bg-background/70 py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Módulo
              </span>
              {MODULE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setModuleFilter(filter.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${moduleFilter === filter.id ? "border-primary/45 bg-primary/15 text-primary" : "border-border/80 bg-background/50 text-muted-foreground hover:border-primary/25 hover:text-foreground"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {!loading && !error ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Exibindo <span className="font-semibold text-foreground">{filteredEvents.length}</span> de <span className="font-semibold text-foreground">{events.length}</span> evento(s) carregados.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-primary/15 bg-card/60 p-3 sm:p-4">
          {loading ? <AuditState icon={Activity} title="Carregando eventos..." description="Consultando a listagem atual de auditoria." /> : null}
          {!loading && error ? <AuditState icon={ShieldCheck} title="Não foi possível carregar auditoria" description={error} tone="warning" /> : null}
          {!loading && !error && events.length === 0 ? <AuditState icon={Database} title="Nenhum evento de auditoria encontrado." description="Não há registros carregados para exibir neste momento." /> : null}
          {!loading && !error && events.length > 0 && filteredEvents.length === 0 ? <AuditState icon={Search} title="Nenhum evento de auditoria encontrado." description="Ajuste a busca ou os filtros locais para ver outros eventos carregados." /> : null}
          {!loading && !error && filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredEvents.map((event) => <AuditEventCard key={event.id} event={event} />)}
            </div>
          ) : null}
        </section>
      </div>
    </AppLayout>
  );
}

function AuditEventCard({ event }: { event: AuditoriaEvent }) {
  const eventHref = getAuditEventHref(event);
  const isDeleteEvent = isDeleteAction(event.acao);
  const executorName = getExecutorName(event);
  const executorEmail = getExecutorEmail(event);
  const executorAvatarUrl = getExecutorAvatarUrl(event);
  const executorRole = "executor_cargo" in event && typeof event.executor_cargo === "string" ? event.executor_cargo : null;
  const action = getFriendlyAction(event.acao);
  const moduleInfo = getModuleInfo(event);
  const target = getReadableTarget(event);
  const metadata = getMetadataPreview(event.metadata);
  const avatarInitials = getInitials(executorName === FALLBACK ? executorEmail : executorName);
  const timestamp = formatDateTime(event.created_at);
  const description = String(event.descricao || "").trim() || "Sem descrição";

  const cardBaseClassName = "rounded-xl border border-zinc-800/80 bg-[#080c0f] p-4 transition-colors shadow-[0_8px_28px_rgba(0,0,0,0.18)]";
  const cardContent = (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {executorAvatarUrl ? (
            <img src={executorAvatarUrl} alt={`Avatar de ${executorName}`} className="h-10 w-10 shrink-0 rounded-full border border-primary/25 object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-black text-primary/90">
              {avatarInitials || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground" title={executorName}>{executorName}</p>
            <p className="truncate text-xs text-muted-foreground" title={executorEmail}>{executorEmail}</p>
            {executorRole ? <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70" title={executorRole}>{executorRole}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${action.className}`}>{action.label}</span>
          <time className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs tabular-nums text-muted-foreground" dateTime={event.created_at}>
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {timestamp}
          </time>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{executorName}</span>
          <span className="text-muted-foreground">{action.sentence}</span>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${moduleInfo.className}`}>{moduleInfo.label}</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Alvo</p>
            <div className="mt-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground" title={target.fullLabel}>{target.label}</p>
              {target.shortId ? <p className="mt-0.5 truncate font-mono text-xs text-primary/80" title={target.fullId ?? target.shortId}>{target.shortId}</p> : <p className="mt-0.5 text-xs text-muted-foreground">ID não informado</p>}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Descrição</p>
            <p className="mt-1 break-words text-sm leading-6 text-foreground/85">{description}</p>
          </div>
        </div>

        {metadata.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {metadata.map((item) => (
              <span key={item.key} className="max-w-full rounded-md border border-zinc-800 bg-zinc-950/45 px-2.5 py-1 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground/80">{item.key}:</span> <span className="break-words">{item.value}</span>
              </span>
            ))}
          </div>
        ) : hasMetadata(event.metadata) ? <p className="text-xs text-muted-foreground">Metadados disponíveis.</p> : null}
      </div>
    </>
  );

  if (!eventHref || isDeleteEvent) return <article className={cardBaseClassName}>{cardContent}</article>;

  return (
    <Link
      to={eventHref}
      className={`${cardBaseClassName} block cursor-pointer hover:border-primary/30 hover:bg-[#0b1014]`}
      title="Abrir item relacionado"
      aria-label="Abrir item relacionado"
    >
      {cardContent}
    </Link>
  );
}

function AuditState({ icon: Icon, title, description, tone = "default" }: { icon: typeof Activity; title: string; description: string; tone?: "default" | "warning" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/35 px-4 py-10 text-center">
      <div className={`rounded-2xl border p-3 ${tone === "warning" ? "border-warning/30 bg-warning/10 text-warning" : "border-primary/25 bg-primary/10 text-primary"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-foreground">{title}</p>
        <p className={`text-sm ${tone === "warning" ? "text-warning" : "text-muted-foreground"}`}>{description}</p>
      </div>
    </div>
  );
}

function getSummaryCards(events: AuditoriaEvent[]) {
  const inqueritos = events.filter((event) => getModuleCategory(event) === "inqueritos").length;
  const representacoes = events.filter((event) => getModuleCategory(event) === "representacoes").length;
  const updates = events.filter((event) => isUpdateAction(event.acao)).length;
  const createDelete = events.filter((event) => isCreateAction(event.acao) || isDeleteAction(event.acao)).length;

  return [
    { label: "Total carregado", value: events.length, caption: "Eventos retornados pela listagem atual", icon: Database, valueClassName: "text-primary", iconClassName: "border-primary/25 bg-primary/10 text-primary" },
    { label: "Inquéritos", value: inqueritos, caption: "Ações ligadas a inquéritos", icon: FileSearch, valueClassName: "text-info", iconClassName: "border-info/25 bg-info/10 text-info" },
    { label: "Representações", value: representacoes, caption: "Ações ligadas a representações", icon: FileSearch, valueClassName: "text-purple-300", iconClassName: "border-purple-400/25 bg-purple-500/10 text-purple-300" },
    { label: "Edições", value: updates, caption: "Atualizações/alterações registradas", icon: Activity, valueClassName: "text-warning", iconClassName: "border-warning/25 bg-warning/10 text-warning" },
    { label: "Criação/Exclusão", value: createDelete, caption: "Criações ou exclusões carregadas", icon: UserCog, valueClassName: "text-foreground", iconClassName: "border-border bg-muted/20 text-muted-foreground" },
  ];
}

function filterAuditEvents(events: AuditoriaEvent[], searchTerm: string, moduleFilter: ModuleFilter) {
  const normalizedSearch = normalizeText(searchTerm);
  return events.filter((event) => {
    const matchesModule = moduleFilter === "todos" || getModuleCategory(event) === moduleFilter;
    if (!matchesModule) return false;
    if (!normalizedSearch) return true;
    return getSearchableText(event).includes(normalizedSearch);
  });
}

function getSearchableText(event: AuditoriaEvent) {
  return normalizeText([
    event.executor_nome,
    event.executor_email,
    event.executor_login,
    event.executor_user_id,
    event.acao,
    getFriendlyAction(event.acao).label,
    event.modulo,
    event.entidade,
    event.entidade_id,
    event.descricao,
    formatDateTime(event.created_at),
  ].filter(Boolean).join(" "));
}

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFriendlyAction(action?: string | null) {
  const normalized = normalizeText(action).replace(/\s+/g, "_");
  if (normalized === "create" || normalized === "insert" || normalized === "criar") return { label: "Criou", sentence: "criou", className: "border-primary/30 bg-primary/15 text-primary" };
  if (normalized === "update" || normalized === "edit" || normalized === "editar" || normalized.includes("update")) return { label: "Editou", sentence: "editou", className: "border-info/30 bg-info/15 text-info" };
  if (normalized === "delete" || normalized === "soft_delete" || normalized.includes("delete") || normalized.includes("exclu")) return { label: "Excluiu", sentence: "excluiu", className: "border-destructive/30 bg-destructive/15 text-destructive" };
  if (normalized === "login" || normalized.includes("login") || normalized.includes("acesso")) return { label: "Acessou", sentence: "acessou", className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300" };
  const fallback = String(action || "").replaceAll("_", " ").trim().toLowerCase() || "ação";
  return { label: capitalize(fallback), sentence: fallback, className: "border-border/80 bg-muted/20 text-muted-foreground" };
}

function isCreateAction(action?: string | null) {
  const normalized = normalizeText(action);
  return normalized === "create" || normalized === "insert" || normalized.includes("cria");
}

function isUpdateAction(action?: string | null) {
  const normalized = normalizeText(action);
  return normalized === "update" || normalized === "edit" || normalized.includes("update") || normalized.includes("edit");
}

function isDeleteAction(action?: string | null) {
  const normalized = normalizeText(action);
  return normalized === "delete" || normalized === "soft_delete" || normalized.endsWith("_delete") || normalized.includes("exclu");
}

function getModuleCategory(event: AuditoriaEvent): ModuleCategory {
  const target = `${normalizeText(event.modulo)}|${normalizeText(event.entidade)}`;
  if (target.includes("inquerito")) return "inqueritos";
  if (target.includes("representacao")) return "representacoes";
  if (target.includes("usuario") || target.includes("admin") || target.includes("profile")) return "usuarios_admin";
  return "outros";
}

function getModuleInfo(event: AuditoriaEvent) {
  const category = getModuleCategory(event);
  const labels: Record<ModuleCategory, { label: string; className: string }> = {
    inqueritos: { label: "Inquéritos", className: "border-info/30 bg-info/15 text-info" },
    representacoes: { label: "Representações", className: "border-purple-400/30 bg-purple-500/10 text-purple-300" },
    usuarios_admin: { label: "Usuários/Admin", className: "border-warning/30 bg-warning/10 text-warning" },
    outros: { label: event.modulo ? capitalize(String(event.modulo).replaceAll("_", " ")) : "Outros", className: "border-border/80 bg-muted/20 text-muted-foreground" },
  };
  return labels[category];
}

function getReadableTarget(event: AuditoriaEvent) {
  const normalizedEntity = normalizeText(event.entidade);
  const label = getEntityLabel(normalizedEntity, event.entidade);
  const fullId = event.entidade_id ? String(event.entidade_id).trim() : null;
  return {
    label,
    fullId,
    fullLabel: fullId ? `${label} ${fullId}` : label,
    shortId: fullId ? shortenId(fullId) : null,
  };
}

function getEntityLabel(normalizedEntity: string, rawEntity?: string | null) {
  if (normalizedEntity.includes("inquerito")) return "Inquérito";
  if (normalizedEntity.includes("representacao")) return "Representação";
  if (normalizedEntity.includes("admin") && normalizedEntity.includes("usuario")) return "Usuário/Admin";
  if (normalizedEntity.includes("profile") || normalizedEntity.includes("usuario")) return "Usuário";
  return rawEntity ? capitalize(String(rawEntity).replaceAll("_", " ")) : "Alvo não informado";
}

function shortenId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getMetadataPreview(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata)
    .filter(([, value]) => isPrimitiveMetadata(value))
    .slice(0, 3)
    .map(([key, value]) => ({ key: capitalize(key.replaceAll("_", " ")), value: formatMetadataValue(value) }));
}

function hasMetadata(metadata: Record<string, unknown> | null | undefined) {
  return Boolean(metadata && typeof metadata === "object" && Object.keys(metadata).length > 0);
}

function isPrimitiveMetadata(value: unknown) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") return FALLBACK;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  const text = String(value);
  return text.length > 42 ? `${text.slice(0, 39)}...` : text;
}

function getExecutorName(event: AuditoriaEvent) {
  return String(event.executor_nome || event.executor_login || event.executor_email || event.executor_user_id || FALLBACK).trim();
}

function getExecutorEmail(event: AuditoriaEvent) {
  return String(event.executor_email || event.executor_login || FALLBACK).trim();
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0))
    .join("")
    .toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return FALLBACK;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR");
}

function capitalize(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return FALLBACK;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function getExecutorAvatarUrl(event: AuditoriaEvent): string | null {
  if (event.executor_avatar_url && String(event.executor_avatar_url).trim()) return String(event.executor_avatar_url).trim();
  if (event.executor_avatar_path && String(event.executor_avatar_path).trim()) return getProfileAvatarPublicUrl(String(event.executor_avatar_path).trim());
  return null;
}

function getAuditEventHref(event: AuditoriaEvent) {
  const entityId = event.entidade_id ? String(event.entidade_id).trim() : "";
  if (!entityId) return null;

  const modulo = normalizeText(event.modulo).replace(/\s+/g, "_");
  const entidade = normalizeText(event.entidade).replace(/\s+/g, "_");
  const target = `${modulo}|${entidade}`;

  if (["|inqueritos", "|inquerito", "inqueritos|", "inquerito|", "inqueritos|inqueritos", "inqueritos|inquerito"].includes(target)) {
    return `/inqueritos/${entityId}`;
  }
  if (["|representacoes", "|representacao", "representacoes|", "representacao|", "representacoes|representacoes", "representacoes|representacao"].includes(target)) {
    return `/representacoes/${entityId}`;
  }
  if (["|profiles", "|admin_usuarios", "admin_usuarios|", "usuarios|profiles", "administracao|profiles"].includes(target)) {
    return `/admin/usuarios/${entityId}`;
  }

  return null;
}
