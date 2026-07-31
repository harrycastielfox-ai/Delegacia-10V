import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/caminhoes")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Caminhões",
        subtitle: "Caminhões e suas características de veículo pesado.",
        vehicleType: "caminhao",
      }}
    />
  ),
});
