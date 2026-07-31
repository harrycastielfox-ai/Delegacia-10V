import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/bicicletas")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Bicicletas",
        subtitle: "Bicicletas motorizadas e não motorizadas.",
        vehicleType: "bicicleta",
      }}
    />
  ),
});
