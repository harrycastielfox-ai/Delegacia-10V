import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { VehicleRouteFallback } from "@/features/vehicles/components/VehicleRouteFallback";
const VehicleReportsPage = lazy(() => import("@/features/vehicles/pages/VehicleReportsPage"));
export const Route = createFileRoute("/veiculos/relatorios")({
  component: () => (
    <Suspense fallback={<VehicleRouteFallback />}>
      <VehicleReportsPage />
    </Suspense>
  ),
});
