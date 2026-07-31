import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/automoveis")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Automóveis",
        subtitle: "Automóveis cadastrados na base de veículos.",
        vehicleType: "automovel",
      }}
    />
  ),
});
