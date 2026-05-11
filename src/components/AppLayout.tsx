import { AppSidebar } from "./AppSidebar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentProfile, getSession, logout } from "@/lib/auth";
import { isAuthorized } from "@/lib/authz";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await getSession();
      if (!session) {
        if (!cancelled) navigate({ to: "/login", replace: true });
        return;
      }
      try {
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
        if (!cancelled) setReady(true);
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

  if (!ready) return null;

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
