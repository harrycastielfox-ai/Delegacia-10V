import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AgendaRouteFallback } from "@/features/agenda/components/AgendaRouteFallback";

const AgendamentoEditarPage = lazy(() => import("@/features/agenda/pages/AgendamentoEditarPage"));

export const Route = createFileRoute("/agenda/editar/$agendamentoId")({
  component: () => (
    <Suspense fallback={<AgendaRouteFallback />}>
      <AgendamentoEditarPage />
    </Suspense>
  ),
});
