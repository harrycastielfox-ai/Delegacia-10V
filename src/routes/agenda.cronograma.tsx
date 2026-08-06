import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AgendaRouteFallback } from "@/features/agenda/components/AgendaRouteFallback";

const CronogramaPage = lazy(() => import("@/features/agenda/pages/CronogramaPage"));

export const Route = createFileRoute("/agenda/cronograma")({
  component: () => (
    <Suspense fallback={<AgendaRouteFallback />}>
      <CronogramaPage />
    </Suspense>
  ),
});
