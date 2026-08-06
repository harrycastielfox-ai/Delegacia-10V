import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AgendaRouteFallback } from "@/features/agenda/components/AgendaRouteFallback";

const AgendamentoNovoPage = lazy(() => import("@/features/agenda/pages/AgendamentoNovoPage"));

export const Route = createFileRoute("/agenda/novo")({
  component: () => (
    <Suspense fallback={<AgendaRouteFallback />}>
      <AgendamentoNovoPage />
    </Suspense>
  ),
});
