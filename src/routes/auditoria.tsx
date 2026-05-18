import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentProfile } from "@/lib/auth";
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
              const executorName = event.executor_nome || event.executor_login || event.executor_email || event.executor_user_id;
              const executorEmail = event.executor_email || "—";
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

              return (
                <article key={event.id} className="rounded-xl border border-primary/20 bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-background/80">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-sm font-semibold text-primary">
                        {avatarInitials || "?"}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">{executorName}</p>
                        <p className="truncate text-xs text-muted-foreground">{executorEmail}</p>
                        {executorRole ? <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80">{executorRole}</p> : null}
                      </div>
                    </div>
                    <p className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ação</p>
                      <p className="mt-1 break-words font-medium">{friendlyAction}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Módulo</p>
                      <p className="mt-1 break-words">{event.modulo}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Entidade / alvo</p>
                      <p className="mt-1 break-words font-mono text-xs text-primary">{event.entidade}{event.entidade_id ? `/${event.entidade_id}` : ""}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card/50 p-3 sm:col-span-2 xl:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Descrição</p>
                      <p className="mt-1 break-words text-muted-foreground">{event.descricao || "Sem descrição"}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
