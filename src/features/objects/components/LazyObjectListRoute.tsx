import { lazy, Suspense } from "react";
import type { ObjectListPreset } from "../pages/ObjectListPage";
import { ObjectRouteFallback } from "./ObjectRouteFallback";

const ObjectListPage = lazy(() => import("../pages/ObjectListPage"));

export function LazyObjectListRoute({ preset }: { preset: ObjectListPreset }) {
  return (
    <Suspense fallback={<ObjectRouteFallback />}>
      <ObjectListPage preset={preset} />
    </Suspense>
  );
}
