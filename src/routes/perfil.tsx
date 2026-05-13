import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentProfile, getProfileAvatarPublicUrl, updateOwnAvatar } from "@/lib/auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — SIPI" },
      { name: "description", content: "Dados do usuário autenticado no SIPI." },
    ],
  }),
  loader: async () => {
    let profile = null;
    try {
      profile = await getCurrentProfile();
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code !== "PROFILE_NOT_FOUND") {
        throw error;
      }
    }
    return { profile };
  },
  component: PerfilPage,
});

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function PerfilPage() {
  const { profile } = Route.useLoaderData();
  const profileMissing = !profile;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPath, setAvatarPath] = useState(profile?.avatar_path ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const avatarUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    return getProfileAvatarPublicUrl(avatarPath);
  }, [avatarPath, previewUrl]);

  const initial = (profile?.nome?.trim().charAt(0) || "?").toUpperCase();

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Não informado";

  const openFilePicker = () => {
    if (isSavingAvatar) return;
    fileInputRef.current?.click();
  };

  const resetPendingAvatar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFeedback(null);

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Selecione apenas arquivos de imagem." });
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: "error", message: "A imagem deve ter no máximo 2MB." });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelAvatarChange = () => {
    setFeedback(null);
    resetPendingAvatar();
  };

  const saveAvatar = async () => {
    if (!selectedFile || isSavingAvatar) return;
    setIsSavingAvatar(true);
    setFeedback(null);

    try {
      if (!profile) throw new Error("PROFILE_NOT_FOUND");
      const newAvatarPath = await updateOwnAvatar(profile.id, selectedFile);
      setAvatarPath(newAvatarPath);
      window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: { avatarPath: newAvatarPath } }));
      resetPendingAvatar();
      setFeedback({ type: "success", message: "Foto de perfil atualizada com sucesso." });
    } catch (error) {
      console.error("[perfil] Erro ao atualizar foto de perfil", {
        userId: profile?.id ?? "unknown",
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        error,
      });
      setFeedback({
        type: "error",
        message: "Não foi possível salvar a foto agora. Tente novamente em instantes.",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };



  if (profileMissing) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-2xl space-y-4 rounded-xl border border-primary/25 bg-card/70 p-6">
          <h1 className="text-xl font-bold tracking-wide text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Não localizamos o perfil da sessão atual. Sua conta pode ter sido criada recentemente.
          </p>
          <p className="text-sm text-muted-foreground">
            Tente sair e entrar novamente. Se o problema continuar, contate um administrador.
          </p>
          <div>
            <Link to="/" className="text-sm font-medium text-primary underline">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="rounded-xl border border-primary/30 bg-card/80 p-5">
          <h1 className="text-xl font-bold tracking-wide text-foreground">Meu Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dados institucionais da sua conta no SIPI.</p>
        </div>

        <div className="rounded-xl border border-primary/25 bg-card/70 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openFilePicker}
              className="group relative h-20 w-20 overflow-hidden rounded-full border border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Alterar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={`Avatar de ${profile.nome}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/15 text-2xl font-bold text-primary">{initial}</div>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-[11px] font-medium text-white/0 transition group-hover:bg-black/30 group-hover:text-white/95 group-focus-visible:bg-black/30 group-focus-visible:text-white/95">
                Alterar foto
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
              aria-label="Selecionar nova foto de perfil"
            />

            <div className="min-w-0 space-y-2">
              <p className="text-lg font-semibold text-foreground">{profile.nome}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <button
                type="button"
                onClick={openFilePicker}
                className="text-xs font-medium text-primary/80 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingAvatar}
              >
                Alterar foto de perfil
              </button>

              {selectedFile ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveAvatar}
                    className="rounded-md border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingAvatar}
                  >
                    {isSavingAvatar ? "Salvando..." : "Salvar foto"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAvatarChange}
                    className="rounded-md border border-primary/25 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingAvatar}
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}

              {feedback ? (
                <p className={`text-xs ${feedback.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                  {feedback.message}
                </p>
              ) : null}
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
