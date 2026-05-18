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
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <p className="p-4 text-sm text-muted-foreground">Carregando eventos...</p> : null}
        {!loading && error ? <p className="p-4 text-sm text-warning">{error}</p> : null}
        {!loading && !error && events.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum evento de auditoria registrado até o momento.</p> : null}
        {!loading && !error && events.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-bold">DATA / HORA</th>
                <th className="text-left px-4 py-3 font-bold">EXECUTOR</th>
                <th className="text-left px-4 py-3 font-bold">AÇÃO</th>
                <th className="text-left px-4 py-3 font-bold">MÓDULO</th>
                <th className="text-left px-4 py-3 font-bold">ENTIDADE / ALVO</th>
                <th className="text-left px-4 py-3 font-bold">DESCRIÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(event.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 font-semibold">{event.executor_nome || event.executor_login || event.executor_email || event.executor_user_id}</td>
                  <td className="px-4 py-3">{event.acao}</td>
                  <td className="px-4 py-3">{event.modulo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{event.entidade}{event.entidade_id ? `/${event.entidade_id}` : ""}</td>
                  <td className="px-4 py-3">{event.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </AppLayout>
  );
}
