import { Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAppProfile } from "@/components/AppProfileContext";
import { canViewVehicles } from "@/lib/authz";

export default function VehiclesModuleFrame() {
  return (
    <AppLayout module="veiculos">
      <VehiclesModuleContent />
    </AppLayout>
  );
}

function VehiclesModuleContent() {
  const profile = useAppProfile();

  if (!canViewVehicles(profile)) {
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-warning/30 bg-card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">Acesso restrito</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seu perfil não possui autorização para consultar o módulo de Veículos Apreendidos.
        </p>
      </section>
    );
  }

  return (
    <div className="vehicle-module min-h-full">
      <Outlet />
    </div>
  );
}
