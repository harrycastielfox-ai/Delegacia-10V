import { Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAppProfile } from "@/components/AppProfileContext";
import { canViewObjects } from "@/lib/authz";

export default function ObjectsModuleFrame() {
  return (
    <AppLayout module="objetos">
      <ObjectsModuleContent />
    </AppLayout>
  );
}

function ObjectsModuleContent() {
  const profile = useAppProfile();

  if (!canViewObjects(profile)) {
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-warning/30 bg-card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">Acesso restrito</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seu perfil não possui autorização para consultar o módulo de Objetos Apreendidos.
        </p>
      </section>
    );
  }

  return (
    <div className="object-module min-h-full">
      <Outlet />
    </div>
  );
}
