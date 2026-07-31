import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { VehicleRouteFallback } from "@/features/vehicles/components/VehicleRouteFallback";

const VehicleOverviewPage = lazy(() => import("@/features/vehicles/pages/VehicleOverviewPage"));
export const Route = createFileRoute("/veiculos/")({
  component: () => (
    <Suspense fallback={<VehicleRouteFallback />}>
      <VehicleOverviewPage />
    </Suspense>
  ),
});
