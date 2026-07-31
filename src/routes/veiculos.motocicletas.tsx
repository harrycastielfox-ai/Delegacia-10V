import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/motocicletas")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Motocicletas",
        subtitle: "Motocicletas cadastradas na base de veículos.",
        vehicleType: "motocicleta",
      }}
    />
  ),
});
