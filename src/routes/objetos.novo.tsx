import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ObjectRouteFallback } from "@/features/objects/components/ObjectRouteFallback";
const ObjectNewPage = lazy(() => import("@/features/objects/pages/ObjectNewPage"));
export const Route = createFileRoute("/objetos/novo")({
  component: () => (
    <Suspense fallback={<ObjectRouteFallback />}>
      <ObjectNewPage />
    </Suspense>
  ),
});
