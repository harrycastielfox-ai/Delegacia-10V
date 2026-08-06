import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AgendaRouteFallback } from "@/features/agenda/components/AgendaRouteFallback";

const AgendaDiaPage = lazy(() => import("@/features/agenda/pages/AgendaDiaPage"));

export const Route = createFileRoute("/agenda/")({
  component: () => (
    <Suspense fallback={<AgendaRouteFallback />}>
      <AgendaDiaPage />
    </Suspense>
  ),
});
