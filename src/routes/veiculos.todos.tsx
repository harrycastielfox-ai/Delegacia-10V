import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/todos")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Todos os Veículos",
        subtitle: "Consulta completa da base de veículos cadastrados.",
      }}
    />
  ),
});
