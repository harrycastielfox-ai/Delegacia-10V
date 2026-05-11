import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, getSession, logout } from "@/lib/auth";
import { isAuthorized } from "@/lib/authz";

export const Route = createFileRoute("/aguardando-autorizacao")({ component: PendingAuthorizationPage });

function PendingAuthorizationPage() {
  const navigate = useNavigate();

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
        if (isAuthorized(profile)) {
          if (!cancelled) navigate({ to: "/modulos", replace: true });
        }
      } catch {
        if (!cancelled) navigate({ to: "/login", search: { erro: "profile_load_failed" } as never, replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <div className="min-h-screen flex items-center justify-center p-4"><div className="max-w-md border rounded-xl p-6 space-y-4 bg-card">
    <h1 className="text-xl font-bold">Sua conta está aguardando autorização.</h1>
    <p className="text-sm text-muted-foreground">Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.</p>
    <Button onClick={async ()=>{await logout(); navigate({to:"/login", replace: true});}}>Sair</Button>
  </div></div>;
}
