import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AgendaRouteFallback } from "@/features/agenda/components/AgendaRouteFallback";

const AgendamentoDetalhePage = lazy(() => import("@/features/agenda/pages/AgendamentoDetalhePage"));

export const Route = createFileRoute("/agenda/$agendamentoId")({
  component: () => (
    <Suspense fallback={<AgendaRouteFallback />}>
      <AgendamentoDetalhePage />
    </Suspense>
  ),
});
