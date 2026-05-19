import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentProfile, getProfileAvatarPublicUrl } from "@/lib/auth";
import { canViewAuditoria } from "@/lib/authz";
import { listAuditoria, type AuditoriaEvent } from "@/lib/repositories/auditoriaRepository";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — SIPI" }] }),
  component: Auditoria,
});

function Auditoria() {
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditoriaEvent[]>([]);

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

  if (restricted) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="text-sm text-muted-foreground">Seu perfil não possui permissão para acessar Auditoria.</p><Link to="/modulos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Auditoria" subtitle="Registro completo de ações no sistema" showActions={false} />
      <div className="rounded-2xl border border-primary/20 bg-card/80 p-4 sm:p-5">
        {loading ? <p className="p-4 text-sm text-muted-foreground">Carregando eventos...</p> : null}
        {!loading && error ? <p className="p-4 text-sm text-warning">{error}</p> : null}
        {!loading && !error && events.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum evento de auditoria registrado até o momento.</p> : null}
        {!loading && !error && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => {
              const eventHref = getAuditEventHref(event);
              const isDeleteEvent = isDeleteAction(event.acao);
              const executorName = event.executor_nome || event.executor_login || event.executor_email || event.executor_user_id;
              const executorEmail = event.executor_email || "—";
              const executorAvatarUrl = getExecutorAvatarUrl(event);
              const executorRole = "executor_cargo" in event && typeof event.executor_cargo === "string" ? event.executor_cargo : null;
              const friendlyAction =
                "acao_formatada" in event && typeof event.acao_formatada === "string"
                  ? event.acao_formatada
                  : String(event.acao || "")
                      .replaceAll("_", " ")
                      .toLowerCase();
              const avatarSeed = (event.executor_nome || event.executor_login || event.executor_email || "?").trim();
              const avatarInitials = avatarSeed
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((chunk) => chunk.charAt(0))
                .join("")
                .toUpperCase();

              const cardBaseClassName = "rounded-xl border border-zinc-800/80 bg-[#080c0f] p-4 transition-colors";

              const cardContent = (
                <>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {executorAvatarUrl ? (
                        <img src={executorAvatarUrl} alt={`Avatar de ${executorName}`} className="h-11 w-11 shrink-0 rounded-full border border-primary/20 object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary/90">
                          {avatarInitials || "?"}
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">{executorName}</p>
                        <p className="truncate text-xs text-muted-foreground">{executorEmail}</p>
                        {executorRole ? <p className="text-[11px] uppercase tracking-[0.16em] text-primary/70">{executorRole}</p> : null}
                      </div>
                    </div>
                    <p className="shrink-0 rounded-md border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ação</p>
                      <p className="mt-1 break-words font-medium">{friendlyAction}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Módulo</p>
                      <p className="mt-1 break-words">{event.modulo}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Entidade / alvo</p>
                      <p className="mt-1 break-words font-mono text-xs text-primary/80">{event.entidade}{event.entidade_id ? `/${event.entidade_id}` : ""}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 sm:col-span-2 xl:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Descrição</p>
                      <p className="mt-1 break-words text-muted-foreground">{event.descricao || "Sem descrição"}</p>
                    </div>
                  </div>
                </>
              );

              if (!eventHref || isDeleteEvent) return <article key={event.id} className={cardBaseClassName}>{cardContent}</article>;

              return (
                <Link
                  key={event.id}
                  to={eventHref}
                  className={`${cardBaseClassName} block cursor-pointer hover:border-primary/30 hover:bg-[#0b1014]`}
                  title="Abrir item relacionado"
                  aria-label="Abrir item relacionado"
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

function isDeleteAction(action?: string | null) {
  const normalized = String(action || "").trim().toLowerCase();
  return normalized === "delete" || normalized.endsWith("_delete") || normalized.includes("exclu");
}

function getExecutorAvatarUrl(event: AuditoriaEvent): string | null {
  if (event.executor_avatar_url && String(event.executor_avatar_url).trim()) return String(event.executor_avatar_url).trim();
  if (event.executor_avatar_path && String(event.executor_avatar_path).trim()) return getProfileAvatarPublicUrl(String(event.executor_avatar_path).trim());
  return null;
}

function getAuditEventHref(event: AuditoriaEvent) {
  const entityId = event.entidade_id ? String(event.entidade_id).trim() : "";
  if (!entityId) return null;

  const normalize = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

  const modulo = normalize(event.modulo);
  const entidade = normalize(event.entidade);
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
