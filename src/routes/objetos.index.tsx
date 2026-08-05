import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ObjectRouteFallback } from "@/features/objects/components/ObjectRouteFallback";

const ObjectOverviewPage = lazy(() => import("@/features/objects/pages/ObjectOverviewPage"));
export const Route = createFileRoute("/objetos/")({
  component: () => (
    <Suspense fallback={<ObjectRouteFallback />}>
      <ObjectOverviewPage />
    </Suspense>
  ),
});
