import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
export const Route = createFileRoute("/veiculos/adulterados")({
  component: () => (
    <LazyVehicleListRoute
      preset={{
        title: "Adulterados",
        subtitle: "Veículos com sinais de adulteração registrados.",
        situation: "adulterado",
      }}
    />
  ),
});
