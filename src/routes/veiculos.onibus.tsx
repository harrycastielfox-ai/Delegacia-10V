import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/onibus")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Ônibus",
        subtitle: "Ônibus cadastrados individualmente na base.",
        vehicleType: "onibus",
      }}
    />
  ),
});
