import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/apreendidos")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Apreendidos",
        subtitle: "Veículos atualmente registrados em custódia.",
        situation: "apreendido",
      }}
    />
  ),
});
