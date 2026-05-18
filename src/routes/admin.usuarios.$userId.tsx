import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getCurrentProfile, getProfileAvatarPublicUrl, getSession } from "@/lib/auth";
import { canManageUsers, type UserProfile } from "@/lib/authz";
import { listAuditoriaByUser, type AuditoriaEvent } from "@/lib/repositories/auditoriaRepository";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/usuarios/$userId")({
  component: AdminUserProfilePage,
});

function AdminUserProfilePage() {
  const navigate = useNavigate();
  const { userId } = Route.useParams();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "not_found" | "forbidden" | "rpc_unavailable" | "error">("idle");
  const [auditoriaLoading, setAuditoriaLoading] = useState(false);
  const [auditoriaError, setAuditoriaError] = useState<string | null>(null);
  const [auditoriaEvents, setAuditoriaEvents] = useState<AuditoriaEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getSession();
        if (!session) {
          if (!cancelled) navigate({ to: "/login", replace: true });
          return;
        }
        const profile = await getCurrentProfile();
        if (!profile) {
          if (!cancelled) navigate({ to: "/modulos", replace: true });
          return;
        }
        if (!cancelled) setHasAccess(canManageUsers(profile));
      } catch (error) {
        console.error("[AdminUserProfilePage] Erro ao validar sessão", error);
        if (!cancelled) navigate({ to: "/modulos", replace: true });
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    void (async () => {
      setLoadingUser(true);
      setRequestState("idle");
      const { data, error } = await supabase.rpc("list_profiles_for_admin");
      if (cancelled) return;

      if (error) {
        const code = String(error.code ?? "");
        const normalized = String(error.message ?? "").toLowerCase();
        if (code === "42501" || normalized.includes("permission")) {
          setRequestState("forbidden");
        } else if (code === "PGRST202" || normalized.includes("function") || normalized.includes("rpc")) {
          setRequestState("rpc_unavailable");
        } else {
          setRequestState("error");
        }
        setTargetUser(null);
        setLoadingUser(false);
        return;
      }

      const users = (data ?? []) as UserProfile[];
      const found = users.find((profile) => String(profile.id) === String(userId)) ?? null;
      if (!found) {
        setRequestState("not_found");
        setTargetUser(null);
      } else {
        setTargetUser(found);
      }
      setLoadingUser(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, userId]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    void (async () => {
      setAuditoriaLoading(true);
      setAuditoriaError(null);
      const result = await listAuditoriaByUser(userId, { limit: 20 });
      if (cancelled) return;
      if (result.error) {
        const normalized = result.error.toLowerCase();
        if (normalized.includes("insufficient_privilege") || normalized.includes("permission")) {
          setAuditoriaError("Sem permissão para visualizar os eventos de auditoria deste usuário.");
        } else {
          setAuditoriaError("Não foi possível carregar a auditoria individual no momento.");
        }
        setAuditoriaEvents([]);
      } else {
        setAuditoriaEvents(result.data);
      }
      setAuditoriaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, userId]);

  const statusMessage = useMemo(() => {
    if (requestState === "not_found") return "Perfil não encontrado para o identificador informado.";
    if (requestState === "forbidden") return "Você não tem permissão para visualizar este perfil nesta operação administrativa.";
    if (requestState === "rpc_unavailable") return "Não foi possível consultar o perfil agora: RPC administrativa indisponível no Supabase.";
    if (requestState === "error") return "Falha ao carregar o perfil administrativo no momento. Tente novamente.";
    return null;
  }, [requestState]);

  const avatarUrl = getProfileAvatarPublicUrl(targetUser?.avatar_path ?? null);
  const initial = (targetUser?.nome?.trim().charAt(0) || "?").toUpperCase();
  const createdAt = formatDate(targetUser?.created_at);
  const updatedAt = formatDate(targetUser?.updated_at);

  if (checkingAccess) {
    return <PageShell><StateBox text="Verificando permissões..." /></PageShell>;
  }

  if (!hasAccess) {
    return (
      <PageShell>
        <section className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-2"><ShieldAlert className="h-5 w-5 text-warning" /></div>
            <h1 className="text-2xl font-bold">Acesso restrito</h1>
          </div>
          <p className="text-sm text-muted-foreground">Esta área é permitida somente para perfis com permissão de administração de usuários (gestão completa para Admin/Delegado e limitada para Atlas Access).</p>
          <Link to="/modulos" className="mt-6 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20">Voltar para módulos</Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_30px_rgba(34,197,94,0.09)]">
        <Link to="/admin/usuarios" className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"><ArrowLeft className="h-4 w-4" />Voltar para usuários</Link>
        <h1 className="text-2xl font-bold tracking-wide">Perfil administrativo do usuário</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visualização institucional em modo somente leitura.</p>
      </section>

      {loadingUser ? <StateBox text="Carregando perfil do usuário..." /> : null}
      {!loadingUser && statusMessage ? <StateBox text={statusMessage} /> : null}

      {!loadingUser && targetUser ? (
        <>
          <section className="rounded-2xl border border-border bg-card/80 p-6">
            <div className="flex items-center gap-4">
              {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${targetUser.nome}`} className="h-20 w-20 rounded-full border border-primary/30 object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-2xl font-bold text-primary">{initial}</div>}
              <div>
                <p className="text-xl font-semibold">{targetUser.nome}</p>
                <p className="text-sm text-muted-foreground">{targetUser.email}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard label="Login" value={targetUser.login} />
            <InfoCard label="Cargo" value={targetUser.cargo} />
            <InfoCard label="Status de autorização" value={targetUser.status_autorizacao} />
            <InfoCard label="Data de criação" value={createdAt} />
            {targetUser.updated_at ? <InfoCard label="Atualizado em" value={updatedAt} /> : null}
          </section>

          <section className="rounded-2xl border border-border bg-card/80 p-6">
            <h2 className="text-lg font-semibold">Auditoria individual</h2>
            {auditoriaLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando eventos de auditoria...</p> : null}
            {!auditoriaLoading && auditoriaError ? <p className="mt-2 text-sm text-warning">{auditoriaError}</p> : null}
            {!auditoriaLoading && !auditoriaError && auditoriaEvents.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum evento de auditoria registrado para este usuário.</p> : null}
            {!auditoriaLoading && !auditoriaError && auditoriaEvents.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1">Data/Hora</th>
                      <th className="px-2 py-1">Ação</th>
                      <th className="px-2 py-1">Módulo</th>
                      <th className="px-2 py-1">Entidade</th>
                      <th className="px-2 py-1">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaEvents.map((event) => (
                      <tr key={event.id} className="rounded-lg border border-primary/20 bg-background/60">
                        <td className="px-2 py-2">{formatDate(event.created_at)}</td>
                        <td className="px-2 py-2">{event.acao}</td>
                        <td className="px-2 py-2">{event.modulo}</td>
                        <td className="px-2 py-2">{event.entidade}</td>
                        <td className="px-2 py-2">{event.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6">{children}</div></main>;
}

function StateBox({ text }: { text: string }) {
  return <section className="rounded-2xl border border-border bg-card/80 p-6 text-sm text-muted-foreground">{text}</section>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-primary/20 bg-card/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p></div>;
}

function formatDate(value?: string) {
  if (!value) return "Não informado";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}
