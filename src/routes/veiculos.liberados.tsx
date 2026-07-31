import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/liberados")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Liberados / Devolvidos",
        subtitle: "Veículos com saída ou devolução registrada.",
        situation: "liberado",
      }}
    />
  ),
});
