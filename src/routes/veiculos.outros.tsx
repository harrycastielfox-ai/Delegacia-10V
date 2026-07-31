import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/outros")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Outros Veículos",
        subtitle: "Categorias que não se enquadram nos tipos principais.",
        vehicleType: "outro",
      }}
    />
  ),
});
