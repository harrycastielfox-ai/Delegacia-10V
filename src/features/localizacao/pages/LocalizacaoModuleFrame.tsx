import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppProfileContext } from "@/components/AppProfileContext";
import { getCurrentProfile, getSession, logout } from "@/lib/auth";
import { canViewLocalizacao, isAuthorized, type UserProfile } from "@/lib/authz";
import { LocalizacaoMobileNavigation } from "../components/LocalizacaoMobileNavigation";
import { LocalizacaoSidebar } from "../components/LocalizacaoSidebar";

export default function LocalizacaoModuleFrame() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

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
          if (!cancelled) {
            navigate({ to: "/login", search: { erro: "profile_missing" } as never, replace: true });
          }
          return;
        }

        if (currentProfile.status_autorizacao === "bloqueado") {
          await logout();
          if (!cancelled) {
            navigate({ to: "/login", search: { erro: "access_blocked" } as never, replace: true });
          }
          return;
        }

        if (!isAuthorized(currentProfile)) {
          if (!cancelled) navigate({ to: "/aguardando-autorizacao", replace: true });
          return;
        }

        if (!canViewLocalizacao(currentProfile)) {
          if (!cancelled) navigate({ to: "/modulos", replace: true });
          return;
        }

        if (!cancelled) setProfile(currentProfile);
      } catch (error) {
        console.error("[LocalizacaoModuleFrame] Falha ao validar sessão/perfil", error);
        if (!cancelled) {
          navigate({
            to: "/login",
            search: { erro: "profile_load_failed" } as never,
            replace: true,
          });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Carregando sessão...</p>
      </div>
    );
  }

  return (
    <AppProfileContext.Provider value={profile}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <LocalizacaoSidebar profile={profile} />
        <LocalizacaoMobileNavigation profile={profile} />
        <main className="localizacao-module-main min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-20 md:p-6 lg:px-7 lg:py-5">
          <div className="localizacao-module mx-auto w-full max-w-[1760px]">
            <Outlet />
          </div>
        </main>
      </div>
    </AppProfileContext.Provider>
  );
}
