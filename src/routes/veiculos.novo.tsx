import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { VehicleRouteFallback } from "@/features/vehicles/components/VehicleRouteFallback";
const VehicleNewPage = lazy(() => import("@/features/vehicles/pages/VehicleNewPage"));
export const Route = createFileRoute("/veiculos/novo")({
  component: () => (
    <Suspense fallback={<VehicleRouteFallback />}>
      <VehicleNewPage />
    </Suspense>
  ),
});
