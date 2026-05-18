import { Outlet, createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertTriangle, ShieldAlert, Users, UserCheck, UserMinus, UserCog, Clock3 } from "lucide-react";
import { getCurrentProfile, getProfileAvatarPublicUrl, getSession } from "@/lib/auth";
import { canAtlasAssignRole, canEditUserAccess, canManageUsers, type AuthorizationStatus, type UserProfile, type UserRole } from "@/lib/authz";
import { logAuditoria } from "@/lib/repositories/auditoriaRepository";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuariosPage,
});

type EditableUserState = { cargo: UserRole; status: AuthorizationStatus };

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "membro", label: "Membro" },
  { value: "sipi_access", label: "SIPI Access" },
  { value: "atlas_access", label: "Atlas Access" },
  { value: "delegado", label: "Delegado" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS: Array<{ value: AuthorizationStatus; label: string }> = [
  { value: "aguardando", label: "Aguardando" },
  { value: "autorizado", label: "Autorizado" },
  { value: "bloqueado", label: "Bloqueado" },
];

function AdminUsuariosPage() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const showingUserDetail = currentPath !== "/admin/usuarios" && currentPath.startsWith("/admin/usuarios/");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [formState, setFormState] = useState<Record<string, EditableUserState>>({});
  const [loadingByUser, setLoadingByUser] = useState<Record<string, string | null>>({});
  const [feedbackByUser, setFeedbackByUser] = useState<Record<string, { kind: "success" | "error"; message: string }>>({});
  const getSupabaseErrorMessage = (issue: unknown, fallback: string) => {
    const code = typeof issue === "object" && issue !== null && "code" in issue ? String((issue as { code?: string }).code ?? "") : "";
    const message = typeof issue === "object" && issue !== null && "message" in issue ? String((issue as { message?: string }).message ?? "") : "";
    const normalized = message.toLowerCase();
    if (code === "PGRST202" || normalized.includes("rpc") || normalized.includes("function")) {
      return `${fallback}. RPC ausente ou indisponível no Supabase.`;
    }
    if (code === "42501" || normalized.includes("permission")) {
      return `${fallback}. Sem permissão na policy/RPC.`;
    }
    return fallback;
  };

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
        setCurrentProfile(currentProfile);
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
        const { data, error: listError } = await supabase.rpc("list_profiles_for_admin");
        if (listError) throw listError;
        const normalizedUsers = (data ?? []).map((user) => ({ ...user, updated_at: user.created_at })) as UserProfile[];
        if (cancelled) return;
        setUsuarios(normalizedUsers);
        setFormState((current) => {
          const next = { ...current };
          for (const user of normalizedUsers) {
            next[user.id] = {
              cargo: current[user.id]?.cargo ?? user.cargo,
              status: current[user.id]?.status ?? user.status_autorizacao,
            };
          }
          return next;
        });
      } catch (fetchError) {
        console.error("[AdminUsuariosPage] Erro ao listar usuários", fetchError);
        if (!cancelled) setError(getSupabaseErrorMessage(fetchError, "Não foi possível carregar os usuários no momento"));
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);


  const canEditTarget = (target: UserProfile, nextRole?: UserRole) => canEditUserAccess(currentProfile, target, nextRole);
  const allowedRolesForRequester = (target: UserProfile) => {
    if (currentProfile?.cargo !== "atlas_access") return ROLE_OPTIONS;
    if (!canEditTarget(target)) return [];
    return ROLE_OPTIONS.filter((opt) => canAtlasAssignRole(opt.value));
  };

  const updateUser = async (user: UserProfile, role: UserRole, status: AuthorizationStatus, actionLabel: string) => {
    if (!canEditTarget(user, role)) {
      setFeedbackByUser((current) => ({ ...current, [user.id]: { kind: "error", message: "Ação restrita a Delegado/Admin." } }));
      return;
    }
    setLoadingByUser((current) => ({ ...current, [user.id]: actionLabel }));
    setFeedbackByUser((current) => ({ ...current, [user.id]: { kind: "success", message: "" } }));
    const { error: updateError } = await supabase.rpc("admin_update_user_access", {
      target_user_id: user.id,
      new_role: role,
      new_status: status,
    });
    if (updateError) {
      setFeedbackByUser((current) => ({
        ...current,
        [user.id]: { kind: "error", message: getSupabaseErrorMessage(updateError, "Não foi possível salvar a alteração. Tente novamente") },
      }));
      setLoadingByUser((current) => ({ ...current, [user.id]: null }));
      return;
    }
    setUsuarios((current) => current.map((entry) => (entry.id === user.id ? { ...entry, cargo: role, status_autorizacao: status, updated_at: new Date().toISOString() } : entry)));
    setFormState((current) => ({ ...current, [user.id]: { cargo: role, status } }));
    setFeedbackByUser((current) => ({ ...current, [user.id]: { kind: "success", message: "Alterações salvas com sucesso." } }));
    try {
      const auditResult = await logAuditoria({
        acao: "admin_update",
        modulo: "admin_usuarios",
        entidade: "profile",
        entidade_id: user.id,
        descricao: "Alterou acesso de usuário",
        metadata: {
          target_login: user.login,
          target_email: user.email,
          cargo_anterior: user.cargo,
          cargo_novo: role,
          status_anterior: user.status_autorizacao,
          status_novo: status,
        },
      });
      if (auditResult.error) console.warn("[auditoria]", auditResult.error);
    } catch (auditError) {
      console.warn("[auditoria]", auditError);
    }
    setLoadingByUser((current) => ({ ...current, [user.id]: null }));
  };

  const pendentes = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "aguardando"), [usuarios]);
  const autorizados = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "autorizado").length, [usuarios]);
  const bloqueados = useMemo(() => usuarios.filter((user) => user.status_autorizacao === "bloqueado").length, [usuarios]);
  const administradores = useMemo(() => usuarios.filter((user) => user.cargo === "admin").length, [usuarios]);

  if (showingUserDetail) return <Outlet />;

  if (checkingAccess) return <PageState title="Verificando permissões..." />;
  if (!hasAccess) {
    return <section className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/80 p-8 shadow-2xl"><div className="mb-4 flex items-center gap-3"><div className="rounded-lg border border-warning/40 bg-warning/10 p-2"><ShieldAlert className="h-5 w-5 text-warning" /></div><h1 className="text-2xl font-bold">Acesso restrito</h1></div><p className="text-sm text-muted-foreground">Esta área exige perfil administrativo. Admin e Delegado possuem gestão completa; Atlas Access possui gestão limitada conforme as regras de acesso.</p><Link to="/modulos" className="mt-6 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20">Voltar para módulos</Link></div></section>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div><Link to="/modulos" className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"><ArrowLeft className="h-4 w-4" />Voltar</Link></div>
        <header className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_30px_rgba(34,197,94,0.09)]"><h1 className="text-2xl font-bold tracking-wide">Administração de Usuários</h1><p className="mt-1 text-sm text-muted-foreground">Controle de acesso, cargos e autorizações do SIPI</p></header>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={Users} label="Total de usuários" value={usuarios.length} />
          <SummaryCard icon={Clock3} label="Aguardando autorização" value={pendentes.length} />
          <SummaryCard icon={UserCheck} label="Autorizados" value={autorizados} />
          <SummaryCard icon={UserMinus} label="Bloqueados" value={bloqueados} />
          <SummaryCard icon={UserCog} label="Administradores" value={administradores} />
        </section>
        <UsersSection title="Solicitações pendentes de acesso" description="Usuários que aguardam autorização inicial para uso do sistema." loading={loadingUsers} error={error} users={pendentes} mode="pending" formState={formState} loadingByUser={loadingByUser} feedbackByUser={feedbackByUser} onRoleChange={(userId, role) => setFormState((cur) => ({ ...cur, [userId]: { cargo: role, status: cur[userId]?.status ?? "aguardando" } }))} onStatusChange={(userId, status) => setFormState((cur) => ({ ...cur, [userId]: { cargo: cur[userId]?.cargo ?? "membro", status } }))} onAuthorize={(user) => updateUser(user, formState[user.id]?.cargo ?? "membro", "autorizado", "authorize")} onBlock={(user) => updateUser(user, formState[user.id]?.cargo ?? "membro", "bloqueado", "block")} onSave={(user) => updateUser(user, formState[user.id]?.cargo ?? user.cargo, formState[user.id]?.status ?? user.status_autorizacao, "save")} currentProfile={currentProfile} canEditTarget={canEditTarget} allowedRolesForRequester={allowedRolesForRequester} />
        <UsersSection title="Todos os usuários" description="Relação completa de perfis cadastrados no SIPI." loading={loadingUsers} error={error} users={usuarios} mode="all" formState={formState} loadingByUser={loadingByUser} feedbackByUser={feedbackByUser} onRoleChange={(userId, role) => setFormState((cur) => ({ ...cur, [userId]: { cargo: role, status: cur[userId]?.status ?? "aguardando" } }))} onStatusChange={(userId, status) => setFormState((cur) => ({ ...cur, [userId]: { cargo: cur[userId]?.cargo ?? "membro", status } }))} onAuthorize={(user) => updateUser(user, formState[user.id]?.cargo ?? "membro", "autorizado", "authorize")} onBlock={(user) => updateUser(user, formState[user.id]?.cargo ?? "membro", "bloqueado", "block")} onSave={(user) => updateUser(user, formState[user.id]?.cargo ?? user.cargo, formState[user.id]?.status ?? user.status_autorizacao, "save")} currentProfile={currentProfile} canEditTarget={canEditTarget} allowedRolesForRequester={allowedRolesForRequester} />
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) { return <article className="rounded-xl border border-border bg-card/80 p-4"><div className="mb-2 flex items-center gap-2 text-primary"><Icon className="h-4 w-4" /><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div><div className="text-2xl font-bold">{value}</div></article>; }

function UsersSection({ title, description, loading, error, users, mode, formState, loadingByUser, feedbackByUser, onRoleChange, onStatusChange, onAuthorize, onBlock, onSave, currentProfile, canEditTarget, allowedRolesForRequester }: { title: string; description: string; loading: boolean; error: string | null; users: UserProfile[]; mode: "pending" | "all"; formState: Record<string, EditableUserState>; loadingByUser: Record<string, string | null>; feedbackByUser: Record<string, { kind: "success" | "error"; message: string }>; onRoleChange: (userId: string, role: UserRole) => void; onStatusChange: (userId: string, status: AuthorizationStatus) => void; onAuthorize: (user: UserProfile) => void; onBlock: (user: UserProfile) => void; onSave: (user: UserProfile) => void; currentProfile: UserProfile | null; canEditTarget: (user: UserProfile, nextRole?: UserRole) => boolean; allowedRolesForRequester: (user: UserProfile) => Array<{ value: UserRole; label: string }>; }) {
  return <section className="rounded-2xl border border-border bg-card/80 p-5"><h2 className="text-lg font-semibold">{title}</h2><p className="mb-4 text-sm text-muted-foreground">{description}</p>{loading ? <PageState title="Carregando usuários..." /> : null}{!loading && error ? <PageError message={error} /> : null}{!loading && !error && users.length === 0 ? <PageState title="Nenhum usuário encontrado nesta seção." /> : null}{!loading && !error && users.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[950px] border-separate border-spacing-y-2 text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="px-2 py-1">Usuário</th><th className="px-2 py-1">E-mail</th><th className="px-2 py-1">Login</th><th className="px-2 py-1">Cargo</th><th className="px-2 py-1">Status</th><th className="px-2 py-1">Criado em</th><th className="px-2 py-1">Ações</th></tr></thead><tbody>{users.map((user) => {const isLoading = Boolean(loadingByUser[user.id]);const selectedRole = formState[user.id]?.cargo ?? user.cargo;const selectedStatus = formState[user.id]?.status ?? user.status_autorizacao;const feedback = feedbackByUser[user.id];const canEditUser = canEditTarget(user, selectedRole);const roleOptions = allowedRolesForRequester(user);return <tr key={user.id} className="rounded-lg border border-border/70 bg-background/70"><td className="px-2 py-2"><UserIdentity profile={user} /></td><td className="px-2 py-2">{user.email}</td><td className="px-2 py-2">{user.login}</td><td className="px-2 py-2"><select value={selectedRole} onChange={(event) => onRoleChange(user.id, event.target.value as UserRole)} disabled={isLoading || !canEditUser || roleOptions.length === 0} className="w-full rounded border border-border bg-background px-2 py-1">{roleOptions.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}</select>{currentProfile?.cargo === "atlas_access" && !canEditUser ? <p className="mt-1 text-[11px] text-muted-foreground">Ação restrita a Delegado/Admin.</p> : null}</td><td className="px-2 py-2">{mode === "all" ? <select value={selectedStatus} onChange={(event) => onStatusChange(user.id, event.target.value as AuthorizationStatus)} disabled={isLoading || !canEditUser} className="w-full rounded border border-border bg-background px-2 py-1">{STATUS_OPTIONS.map((statusOption) => <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>)}</select> : <span className="capitalize">{user.status_autorizacao}</span>}</td><td className="px-2 py-2">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td><td className="px-2 py-2"><div className="flex flex-wrap gap-2"><Link to="/admin/usuarios/$userId" params={{ userId: String(user.id) }} className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs hover:bg-primary/20">Ver perfil</Link>{mode === "pending" ? <><button onClick={() => onAuthorize(user)} disabled={isLoading || !canEditUser} className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs hover:bg-primary/20 disabled:opacity-60">Autorizar</button><button onClick={() => onBlock(user)} disabled={isLoading || !canEditUser} className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs hover:bg-destructive/20 disabled:opacity-60">Bloquear</button></> : <button onClick={() => onSave(user)} disabled={isLoading || !canEditUser} className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs hover:bg-primary/20 disabled:opacity-60">Salvar</button>}</div>{isLoading ? <p className="mt-1 text-xs text-muted-foreground">Salvando...</p> : null}{feedback?.message ? <p className={`mt-1 text-xs ${feedback.kind === "error" ? "text-destructive" : "text-emerald-400"}`}>{feedback.message}</p> : null}</td></tr>;})}</tbody></table></div> : null}</section>;
}

function UserIdentity({ profile }: { profile: UserProfile }) {
  const avatarUrl = getProfileAvatarPublicUrl(profile.avatar_path);
  const initial = (profile.nome?.trim().charAt(0) || "?").toUpperCase();
  return <div className="flex items-center gap-3">{avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${profile.nome}`} className="h-10 w-10 rounded-full border border-primary/30 object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-xs font-bold text-primary">{initial}</div>}<div><div className="font-medium">{profile.nome}</div></div></div>;
}

function PageState({ title }: { title: string }) { return <div className="rounded-lg border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">{title}</div>; }
function PageError({ message }: { message: string }) { return <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4" />{message}</div>; }
