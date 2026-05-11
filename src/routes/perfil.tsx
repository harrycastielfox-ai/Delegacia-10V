import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentProfile, getProfileAvatarPublicUrl } from "@/lib/auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — SIPI" },
      { name: "description", content: "Dados do usuário autenticado no SIPI." },
    ],
  }),
  loader: async () => {
    const profile = await getCurrentProfile();
    if (!profile) {
      throw new Error("Perfil do usuário autenticado não encontrado.");
    }
    return { profile };
  },
  component: PerfilPage,
});

function PerfilPage() {
  const { profile } = Route.useLoaderData();
  const avatarUrl = getProfileAvatarPublicUrl(profile.avatar_path);
  const initial = (profile.nome?.trim().charAt(0) || "?").toUpperCase();

  const createdAt = profile.created_at
    ? new Date(profile.created_at).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Não informado";

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="rounded-xl border border-primary/30 bg-card/80 p-5">
          <h1 className="text-xl font-bold tracking-wide text-foreground">Meu Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dados institucionais da sua conta no SIPI.</p>
        </div>

        <div className="rounded-xl border border-primary/25 bg-card/70 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Avatar de ${profile.nome}`}
                className="h-20 w-20 rounded-full border border-primary/40 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-2xl font-bold text-primary">
                {initial}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground">{profile.nome}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Login" value={profile.login} />
          <InfoCard label="Cargo" value={profile.cargo} />
          <InfoCard label="Status de autorização" value={profile.status_autorizacao} />
          <InfoCard label="Data de criação" value={createdAt} />
        </div>
      </div>
    </AppLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-card/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  );
}
