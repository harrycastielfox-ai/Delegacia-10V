import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ObjectRouteFallback } from "@/features/objects/components/ObjectRouteFallback";
const ObjectDetailsPage = lazy(() => import("@/features/objects/pages/ObjectDetailsPage"));
export const Route = createFileRoute("/objetos/$objectId")({
  component: () => (
    <Suspense fallback={<ObjectRouteFallback />}>
      <ObjectDetailsPage />
    </Suspense>
  ),
});
