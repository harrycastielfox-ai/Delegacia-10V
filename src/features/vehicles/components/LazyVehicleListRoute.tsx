import { lazy, Suspense } from "react";
import type { VehicleListPreset } from "../pages/VehicleListPage";
import { VehicleRouteFallback } from "./VehicleRouteFallback";

const VehicleListPage = lazy(() => import("../pages/VehicleListPage"));

export function LazyVehicleListRoute({ preset }: { preset: VehicleListPreset }) {
  return (
    <Suspense fallback={<VehicleRouteFallback />}>
      <VehicleListPage preset={preset} />
    </Suspense>
  );
}
