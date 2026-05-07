import { AppSidebar } from "./AppSidebar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentProfile, getSession } from "@/lib/auth";
import { isAuthorized } from "@/lib/authz";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const profile = await getCurrentProfile();
      if (!isAuthorized(profile)) {
        navigate({ to: "/aguardando-autorizacao" });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
