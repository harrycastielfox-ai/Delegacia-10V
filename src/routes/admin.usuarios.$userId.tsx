import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getCurrentProfile, getProfileAvatarPublicUrl, getSession } from "@/lib/auth";
import { canManageUsers, type UserProfile } from "@/lib/authz";
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
  const [notFound, setNotFound] = useState(false);

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
      setNotFound(false);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, login, avatar_path, cargo, status_autorizacao, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setTargetUser(null);
      } else {
        setTargetUser(data as UserProfile);
      }
      setLoadingUser(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, userId]);

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

  const avatarUrl = getProfileAvatarPublicUrl(targetUser?.avatar_path ?? null);
  const initial = (targetUser?.nome?.trim().charAt(0) || "?").toUpperCase();
  const createdAt = formatDate(targetUser?.created_at);
  const updatedAt = formatDate(targetUser?.updated_at);

  return (
    <PageShell>
      <section className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_30px_rgba(34,197,94,0.09)]">
        <Link to="/admin/usuarios" className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"><ArrowLeft className="h-4 w-4" />Voltar para usuários</Link>
        <h1 className="text-2xl font-bold tracking-wide">Perfil administrativo do usuário</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visualização institucional em modo somente leitura.</p>
      </section>

      {loadingUser ? <StateBox text="Carregando perfil do usuário..." /> : null}
      {!loadingUser && notFound ? <StateBox text="Perfil não encontrado para o identificador informado." /> : null}

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
            <p className="mt-2 text-sm text-muted-foreground">A auditoria individual será exibida aqui quando os eventos do sistema começarem a ser registrados.</p>
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
