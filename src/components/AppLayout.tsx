import { AppSidebar } from "./AppSidebar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentProfile, getSession, logout } from "@/lib/auth";
import { isAuthorized, type UserProfile } from "@/lib/authz";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
          if (!cancelled) navigate({ to: "/login", search: { erro: "profile_missing" } as never, replace: true });
          return;
        }
        if (profile.status_autorizacao === "bloqueado") {
          await logout();
          if (!cancelled) navigate({ to: "/login", search: { erro: "access_blocked" } as never, replace: true });
          return;
        }
        if (!isAuthorized(profile)) {
          if (!cancelled) navigate({ to: "/aguardando-autorizacao", replace: true });
          return;
        }
        if (!cancelled) {
          setProfile(profile);
          setReady(true);
        }
      } catch (error) {
        console.error("[AppLayout] Falha ao carregar profile", error);
        if (!cancelled) {
          navigate({ to: "/login", search: { erro: "profile_load_failed" } as never, replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    const onProfileAvatarUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarPath?: string }>;
      const avatarPath = customEvent.detail?.avatarPath;
      if (!avatarPath) return;

      setProfile((current) => (current ? { ...current, avatar_path: avatarPath } : current));
    };

    window.addEventListener("profile-avatar-updated", onProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener("profile-avatar-updated", onProfileAvatarUpdated as EventListener);
    };
  }, []);

  if (!ready || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar profile={profile} />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
