import { Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAppProfile } from "@/components/AppProfileContext";
import { canViewAgenda } from "@/lib/authz";

export default function AgendaModuleFrame() {
  return (
    <AppLayout module="agenda">
      <AgendaModuleContent />
    </AppLayout>
  );
}

function AgendaModuleContent() {
  const profile = useAppProfile();

  if (!canViewAgenda(profile)) {
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-info/30 bg-card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">Acesso restrito</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seu perfil não possui autorização para consultar o Agendamento.
        </p>
      </section>
    );
  }

  return (
    <div className="agenda-module min-h-full">
      <Outlet />
    </div>
  );
}
