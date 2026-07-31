import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { VehicleRouteFallback } from "@/features/vehicles/components/VehicleRouteFallback";
const VehicleDetailsPage = lazy(() => import("@/features/vehicles/pages/VehicleDetailsPage"));
export const Route = createFileRoute("/veiculos/$vehicleId")({
  component: () => (
    <Suspense fallback={<VehicleRouteFallback />}>
      <VehicleDetailsPage />
    </Suspense>
  ),
});
