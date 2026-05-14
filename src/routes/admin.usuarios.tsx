import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, Users, UserCheck, UserMinus, UserCog, Clock3 } from "lucide-react";
import { getCurrentProfile, getProfileAvatarPublicUrl, getSession } from "@/lib/auth";
import { canManageUsers, type UserProfile } from "@/lib/authz";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuariosPage,
});

function AdminUsuariosPage() {
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await getSession();
        if (!session) {
          if (!cancelled) navigate({ to: "/login", replace: true });
          return;
        }

        const currentProfile = await getCurrentProfile();
        if (!currentProfile) {
          if (!cancelled) navigate({ to: "/modulos", replace: true });
          return;
        }

        if (!canManageUsers(currentProfile)) {
          if (!cancelled) setHasAccess(false);
          return;
        }

        if (!cancelled) setHasAccess(true);
      } catch (authError) {
        console.error("[AdminUsuariosPage] Erro ao validar acesso", authError);
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
    if (!hasAccess) {
      setLoadingUsers(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const { data, error: listError } = await supabase
          .from("profiles")
          .select("id,nome,email,login,avatar_path,cargo,status_autorizacao,created_at,updated_at")
          .order("created_at", { ascending: false });

        if (listError) throw listError;

        if (!cancelled) setUsuarios((data ?? []) as UserProfile[]);
      } catch (fetchError) {
        console.error("[AdminUsuariosPage] Erro ao listar usuários", fetchError);
        if (!cancelled) setError("Não foi possível carregar os usuários no momento.");
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  const pendentes = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "aguardando"), [usuarios]);
  const autorizados = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "autorizado").length, [usuarios]);
  const bloqueados = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "bloqueado").length, [usuarios]);
  const administradores = useMemo(() => usuarios.filter((user) => user.cargo === "admin").length, [usuarios]);

  if (checkingAccess) return <PageState title="Verificando permissões..." />;

  if (!hasAccess) {
    return (
      <section className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/80 p-8 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
            </div>
            <h1 className="text-2xl font-bold">Acesso restrito</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Esta área administrativa é permitida apenas para usuários com perfil de Admin ou Delegado.
          </p>
          <Link
            to="/modulos"
            className="mt-6 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
          >
            Voltar para módulos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_30px_rgba(34,197,94,0.09)]">
          <h1 className="text-2xl font-bold tracking-wide">Administração de Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">Controle de acesso, cargos e autorizações do SIPI</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={Users} label="Total de usuários" value={usuarios.length} />
          <SummaryCard icon={Clock3} label="Aguardando autorização" value={pendentes.length} />
          <SummaryCard icon={UserCheck} label="Autorizados" value={autorizados} />
          <SummaryCard icon={UserMinus} label="Bloqueados" value={bloqueados} />
          <SummaryCard icon={UserCog} label="Administradores" value={administradores} />
        </section>

        <UsersSection
          title="Solicitações pendentes de acesso"
          description="Usuários que aguardam autorização inicial para uso do sistema."
          loading={loadingUsers}
          error={error}
          users={pendentes}
          showReadOnlyActions
        />

        <UsersSection
          title="Todos os usuários"
          description="Relação completa de perfis cadastrados no SIPI."
          loading={loadingUsers}
          error={error}
          users={usuarios}
        />
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <article className="rounded-xl border border-border bg-card/80 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </article>
  );
}

function UsersSection({
  title,
  description,
  loading,
  error,
  users,
  showReadOnlyActions = false,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  users: UserProfile[];
  showReadOnlyActions?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {loading ? <PageState title="Carregando usuários..." /> : null}
      {!loading && error ? <PageError message={error} /> : null}
      {!loading && !error && users.length === 0 ? <PageState title="Nenhum usuário encontrado nesta seção." /> : null}

      {!loading && !error && users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1">Usuário</th>
                <th className="px-2 py-1">E-mail</th>
                <th className="px-2 py-1">Login</th>
                <th className="px-2 py-1">Cargo</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Criado em</th>
                {showReadOnlyActions ? <th className="px-2 py-1">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="rounded-lg border border-border/70 bg-background/70">
                  <td className="px-2 py-2">
                    <UserIdentity profile={user} />
                  </td>
                  <td className="px-2 py-2">{user.email}</td>
                  <td className="px-2 py-2">{user.login}</td>
                  <td className="px-2 py-2 capitalize">{user.cargo}</td>
                  <td className="px-2 py-2 capitalize">{user.status_autorizacao}</td>
                  <td className="px-2 py-2">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td>
                  {showReadOnlyActions ? (
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button disabled className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-muted-foreground">
                          Autorizar (em breve)
                        </button>
                        <button disabled className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-muted-foreground">
                          Bloquear (em breve)
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function UserIdentity({ profile }: { profile: UserProfile }) {
  const avatarUrl = getProfileAvatarPublicUrl(profile.avatar_path);
  const initial = (profile.nome?.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img src={avatarUrl} alt={`Avatar de ${profile.nome}`} className="h-10 w-10 rounded-full border border-primary/30 object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-xs font-bold text-primary">
          {initial}
        </div>
      )}
      <div>
        <div className="font-medium">{profile.nome}</div>
      </div>
    </div>
  );
}

function PageState({ title }: { title: string }) {
  return <p className="py-6 text-sm text-muted-foreground">{title}</p>;
}

function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />
      {message}
    </div>
  );
}
