import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/recuperados")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Recuperados",
        subtitle: "Veículos recuperados e vinculados a registros policiais.",
        situation: "recuperado",
      }}
    />
  ),
});
